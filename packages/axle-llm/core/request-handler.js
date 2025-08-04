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
        this._sendResponse(res, 200, html, 'text/html; charset=utf-8'); // <-- Правильный тип контента для HTML
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
        if (internalActions.loginUser) sessionCookie = await this.authEngine.createSessionCookie(internalActions.loginUser);
        if (internalActions.logout) sessionCookie = await this.authEngine.clearSessionCookie(req);
    }
    
    for (const key of (routeConfig.writes || [])) {
      if (finalContext.data[key]) {
        await this.connectorManager.getConnector(key).write(finalContext.data[key]);
        if (this.socketEngine) await this.socketEngine.notifyOnWrite(key, finalContext.socketId);
      }
    }

    let responsePayload = {};
    if (internalActions.redirect) {
      responsePayload.redirect = internalActions.redirect;
    } else if (routeConfig.update) {
      const componentName = routeConfig.update;
      
      // ★★★ НАЧАЛО ФИНАЛЬНОГО ИСПРАВЛЕНИЯ ★★★
      // 1. Находим родительский view-роут, чтобы понять, какой полный набор данных был у страницы.
      const parentViewRoute = this._findParentViewRouteForComponent(componentName);
      const allAvailableConnectors = parentViewRoute ? parentViewRoute.reads || [] : [];
      
      // 2. Собираем ПОЛНЫЙ и АКТУАЛЬНЫЙ набор данных для страницы.
      const propsData = {};
      for (const connectorName of allAvailableConnectors) {
          if(finalContext.data[connectorName]) {
            propsData[connectorName] = finalContext.data[connectorName];
          }
      }

      responsePayload = {
        update: componentName,
        props: {
            data: propsData, // <-- Теперь здесь ВСЕ данные, которые были на странице
            user: finalContext.user,
            globals: this.manifest.globals || {},
            url: this.renderer._getUrlContext(req ? new URL(req.url, `http://${req.headers.host}`) : null)
        },
      };
      // ★★★ КОНЕЦ ФИНАЛЬНОГО ИСПРАВЛЕНИЯ ★★★
    }
    
    if (res && !res.headersSent) {
      if (sessionCookie) res.setHeader('Set-Cookie', sessionCookie);
      this._sendResponse(res, 200, responsePayload, 'application/json');
    } 
  }

  _findParentViewRouteForComponent(componentName) {
    for (const key in this.manifest.routes) {
        const route = this.manifest.routes[key];
        if (route.type === 'view') {
            const injectedComponents = Object.values(route.inject || {});
            if (route.layout === componentName || injectedComponents.includes(componentName)) {
                return route;
            }
        }
    }
    // Ищем компонент в качестве дочернего для другого компонента (задел на будущее)
    for (const name in this.manifest.components) {
        const config = this.manifest.components[name];
        if (config.inject && Object.values(config.inject).includes(componentName)) {
            return this._findParentViewRouteForComponent(name);
        }
    }
    return null;
  }

  _findRoute(method, pathname) {
    const key = `${method} ${pathname}`;
    if (this.manifest.routes[key]) {
      this.manifest.routes[key].key = key;
      return this.manifest.routes[key];
    }
    return null;
  }

  _parseBody(req) {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (e) { reject(e); }
      });
      req.on('error', err => reject(err));
    });
  }

  _sendResponse(res, statusCode, data, contentType = 'text/plain') {
    if (res.headersSent) {
      return;
    }
    // ★★★ ИСПРАВЛЕНИЕ: Отправляем данные как есть, если это не объект. JSON.stringify только для объектов.
    const body = (typeof data === 'object' && data !== null) ? JSON.stringify(data) : String(data);
    res.writeHead(statusCode, { 
        'Content-Type': contentType, 
        'Content-Length': Buffer.byteLength(body) 
    }).end(body);
  }
}

module.exports = { RequestHandler };