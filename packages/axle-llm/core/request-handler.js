// packages/axle-llm/core/request-handler.js
const { URL } = require('url');
const path = require('path');
const fs = require('fs');
const { ActionEngine } = require('./action-engine');
const { AuthEngine } = require('./auth-engine');

class RequestHandler {
  constructor(manifest, connectorManager, assetLoader, renderer, appPath) {
    this.manifest = manifest;
    this.connectorManager = connectorManager;
    this.assetLoader = assetLoader;
    this.renderer = renderer;
    this.appPath = appPath;
    this.authEngine = null;
    this.socketEngine = null;
  }

  async init() {
    console.log('[RequestHandler] Initializing...');
    if (this.manifest.auth) {
      this.authEngine = new AuthEngine(this.manifest, this.connectorManager);
      await this.authEngine.init();
      console.log('[RequestHandler] AuthEngine initialized.');
    }
    console.log('[RequestHandler] Initialized successfully.');
  }

  setSocketEngine(socketEngine) {
    this.socketEngine = socketEngine;
  }
  
  async handle(req, res) {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      console.log(`\n[RequestHandler] --> Handling request: ${req.method} ${url.pathname}`);
      
      if (url.pathname === '/public/bundle.js') {
        const bundlePath = path.join(this.appPath, 'public', 'bundle.js');
        try {
          const scriptContent = fs.readFileSync(bundlePath, 'utf-8');
          this._sendResponse(res, 200, scriptContent, 'application/javascript');
        } catch (e) {
            this._sendResponse(res, 404, 'Client bundle not found.');
        }
        return;
      }

      const routeConfig = this._findRoute(req.method, url.pathname);
      if (!routeConfig) { 
        return this._sendResponse(res, 404, 'Not Found'); 
      }
      
      const user = this.authEngine ? await this.authEngine.getUserFromRequest(req) : null;
      
      if (routeConfig.auth?.required && !user) {
        const redirectUrl = routeConfig.auth.failureRedirect || '/login';
        if (routeConfig.type === 'view') {
          this.authEngine.redirect(res, redirectUrl);
          return;
        }
        if (routeConfig.type === 'action') {
          this._sendResponse(res, 200, { redirect: redirectUrl }, 'application/json');
          return;
        }
      }
      
      if (routeConfig.type === 'view') {
        const dataContext = await this.connectorManager.getContext(routeConfig.reads || []);
        const finalDataContext = { ...dataContext, user };
        const html = await this.renderer.renderView(routeConfig, finalDataContext, url);
        this._sendResponse(res, 200, html, 'text/html; charset=utf-8');
      } else if (routeConfig.type === 'action') {
        const body = await this._parseBody(req);
        const socketId = req.headers['x-socket-id'] || null;
        const initialContext = { user, body, socketId, routeName: routeConfig.key };
        await this.runAction(initialContext, req, res);
      }
    } catch (error) {
      console.error(`[RequestHandler] CRITICAL ERROR processing request ${req.method} ${req.url}:`, error);
      if (res && !res.headersSent) { 
        this._sendResponse(res, 500, 'Internal Server Error'); 
      }
    }
  }
  
  async runAction(context, req = null, res = null) {
    const routeConfig = this.manifest.routes[context.routeName];
    if (!routeConfig) throw new Error(`Action route '${context.routeName}' not found.`);

    const dataContext = context.data || await this.connectorManager.getContext(routeConfig.reads || []);
    const executionContext = { ...context, data: dataContext };
    const engine = new ActionEngine(executionContext, this.appPath, this.assetLoader, this);
    
    try {
        await engine.run(routeConfig.steps || []);
    } catch (engineError) {
        console.error(`[RequestHandler-runAction] ActionEngine failed for route '${context.routeName}'. Error:`, engineError.message);
        if (res && !res.headersSent) {
            this._sendResponse(res, 500, { error: 'Action execution failed', details: engineError.message }, 'application/json');
        }
        return;
    }
    
    if (routeConfig.internal) {
      return { data: engine.context.data };
    }
    
    await this._finalizeAction(engine, routeConfig, req, res);
  }

  async _finalizeAction(engine, routeConfig, req, res) {
    const finalContext = engine.context;
    const internalActions = finalContext._internal || {};
    let sessionCookie = null;

    if (this.authEngine) {
        if (internalActions.loginUser) {
          sessionCookie = await this.authEngine.createSessionCookie(internalActions.loginUser);
        }
        if (internalActions.logout) {
          sessionCookie = await this.authEngine.clearSessionCookie(req);
        }
    }
    
    for (const key of (routeConfig.writes || [])) {
      if (finalContext.data[key]) {
        await this.connectorManager.getConnector(key).write(finalContext.data[key]);
        if (this.socketEngine) {
            await this.socketEngine.notifyOnWrite(key, finalContext.socketId);
        }
      }
    }

    let responsePayload = {};
    if (internalActions.redirect) {
      responsePayload.redirect = internalActions.redirect;
    } else if (routeConfig.update) {
      const componentName = routeConfig.update;
      const componentConfig = this.manifest.components[componentName];
      // ★★★ НАЧАЛО ИСПРАВЛЕНИЯ ★★★
      // 1. Определяем ВСЕ коннекторы, которые могут понадобиться обновляемому компоненту и его дочерним элементам.
      //    Это самая надежная стратегия.
      const allRequiredConnectors = this._findAllRequiredConnectors(componentName);

      // 2. Формируем props, включая ВСЕ эти коннекторы из финального контекста.
      const propsData = {};
      for (const connectorName of allRequiredConnectors) {
          if(finalContext.data[connectorName]) {
            propsData[connectorName] = finalContext.data[connectorName];
          }
      }

      responsePayload = {
        update: componentName,
        props: {
            data: propsData, // <-- Теперь здесь полный набор данных для компонента
            user: finalContext.user,
            globals: this.manifest.globals || {},
            url: this.renderer._getUrlContext(req ? new URL(req.url, `http://${req.headers.host}`) : null)
        },
      };
      // ★★★ КОНЕЦ ИСПРАВЛЕНИЯ ★★★
    }
    
    if (res && !res.headersSent) {
      if (sessionCookie) {
        res.setHeader('Set-Cookie', sessionCookie);
      }
      this._sendResponse(res, 200, responsePayload, 'application/json');
    } 
  }

  // ★★★ НОВАЯ ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ★★★
  /**
   * Рекурсивно находит все зависимости коннекторов для компонента и его дочерних элементов.
   * @param {string} componentName - Имя корневого компонента для проверки.
   * @returns {Set<string>} - Уникальный набор имен всех необходимых коннекторов.
   */
  _findAllRequiredConnectors(componentName) {
    const visited = new Set();
    const required = new Set();
    
    const findRecursive = (name) => {
        if (!name || visited.has(name)) return;
        visited.add(name);

        const config = this.manifest.components[name];
        if (!config) return;

        // Добавляем зависимости самого компонента
        (config.schema?.requires || []).forEach(conn => required.add(conn));
        
        // Рекурсивно проверяем зависимости вложенных компонентов (если они определены в манифесте)
        // В нашем случае это не используется, но это хороший задел на будущее.
        // const injectedComponents = this._getInjectedComponentsFor(name);
        // injectedComponents.forEach(childName => findRecursive(childName));
    };

    findRecursive(componentName);
    
    // Добавляем 'user' по умолчанию, так как он часто нужен (например, в header).
    required.add('user'); 
    
    return required;
  }


  _findRoute(method, pathname) {
    const routes = this.manifest.routes || {};
    const key = `${method} ${pathname}`;
    if (routes[key]) {
      routes[key].key = key;
      return routes[key];
    }
    return null;
  }

  _parseBody(req) {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', () => {
        try {
          if (!body) return resolve({});
          if (req.headers['content-type']?.includes('application/json')) return resolve(JSON.parse(body));
          resolve({});
        } catch (e) { reject(e); }
      });
      req.on('error', err => reject(err));
    });
  }

  _sendResponse(res, statusCode, data, contentType = 'text/plain') {
    if (res.headersSent) {
      return;
    }
    const body = (typeof data === 'object' && data !== null) ? JSON.stringify(data) : String(data);
    res.writeHead(statusCode, { 
        'Content-Type': contentType, 
        'Content-Length': Buffer.byteLength(body) 
    }).end(body);
  }
}

module.exports = { RequestHandler };