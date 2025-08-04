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
      
      // Обработка статического файла клиентского бандла
      if (url.pathname === '/public/bundle.js') {
        const bundlePath = path.join(this.appPath, 'public', 'bundle.js');
        try {
          const scriptContent = fs.readFileSync(bundlePath, 'utf-8');
          console.log('[RequestHandler] Serving client bundle.');
          this._sendResponse(res, 200, scriptContent, 'application/javascript');
        } catch (e) {
            console.error(`[RequestHandler] CRITICAL: Could not find client bundle at ${bundlePath}`);
            this._sendResponse(res, 404, 'Client bundle not found.');
        }
        return;
      }

      const routeConfig = this._findRoute(req.method, url.pathname);
      if (!routeConfig) { 
        console.log(`[RequestHandler] No route found for ${req.method} ${url.pathname}. Sending 404.`);
        return this._sendResponse(res, 404, 'Not Found'); 
      }
      console.log(`[RequestHandler] Route found: '${routeConfig.key}', type: '${routeConfig.type}'`);
      
      const user = this.authEngine ? await this.authEngine.getUserFromRequest(req) : null;
      console.log(`[RequestHandler] User status: ${user ? `Logged in as ${user.login}` : 'Not authenticated'}`);
      
      // ★★★ НАЧАЛО: ИСПРАВЛЕННАЯ ЛОГИКА АВТОРИЗАЦИИ ★★★
      if (routeConfig.auth?.required && !user) {
        const redirectUrl = routeConfig.auth.failureRedirect || '/login';

        // Если это запрос СТРАНИЦЫ (view), делаем настоящий HTTP-редирект (код 302).
        // Это исправляет проблему с отображением JSON.
        if (routeConfig.type === 'view') {
          console.log(`[RequestHandler] Unauthenticated access to protected view route. Performing HTTP 302 redirect to ${redirectUrl}`);
          this.authEngine.redirect(res, redirectUrl);
          return;
        }
        
        // Если это запрос ДЕЙСТВИЯ (action), отправляем JSON, чтобы клиентский JS его обработал.
        if (routeConfig.type === 'action') {
          console.log(`[RequestHandler] Unauthenticated access to protected action. Sending JSON redirect to ${redirectUrl}`);
          this._sendResponse(res, 200, { redirect: redirectUrl }, 'application/json');
          return;
        }
      }
      // ★★★ КОНЕЦ ИСПРАВЛЕНИЙ ★★★
      
      if (routeConfig.type === 'view') {
        console.log(`[RequestHandler] Preparing to render view for route '${routeConfig.key}'...`);
        const dataContext = await this.connectorManager.getContext(routeConfig.reads || []);
        const html = await this.renderer.renderView(routeConfig, dataContext, url);
        this._sendResponse(res, 200, html, 'text/html; charset=utf-8');
      } else if (routeConfig.type === 'action') {
        console.log(`[RequestHandler] Preparing to run action for route '${routeConfig.key}'...`);
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

    console.log(`[RequestHandler-runAction] Running action '${context.routeName}'...`);
    const dataContext = context.data || await this.connectorManager.getContext(routeConfig.reads || []);
    const executionContext = { ...context, data: dataContext };
    const engine = new ActionEngine(executionContext, this.appPath, this.assetLoader, this);
    
    try {
        await engine.run(routeConfig.steps || []);
    } catch (engineError) {
        console.error(`[RequestHandler-runAction] ActionEngine failed for route '${context.routeName}'. Error:`, engineError.message);
        if (res && !res.headersSent) {
            const errorPayload = { error: 'Action execution failed', details: engineError.message };
            this._sendResponse(res, 500, errorPayload, 'application/json');
        }
        return;
    }
    
    if (routeConfig.internal) {
      console.log(`[RequestHandler-runAction] Internal action '${context.routeName}' finished.`);
      return { data: engine.context.data };
    }
    
    await this._finalizeAction(engine, routeConfig, req, res);
  }

  async _finalizeAction(engine, routeConfig, req, res) {
    console.log(`[RequestHandler-finalizeAction] Finalizing action for route '${routeConfig.key}'...`);
    const finalContext = engine.context;
    const internalActions = finalContext._internal || {};
    let sessionCookie = null;

    if (this.authEngine) {
        if (internalActions.loginUser) {
          console.log(`[RequestHandler-finalizeAction] Creating session cookie for user: ${internalActions.loginUser.login}`);
          sessionCookie = await this.authEngine.createSessionCookie(internalActions.loginUser);
        }
        if (internalActions.logout) {
          console.log(`[RequestHandler-finalizeAction] Clearing session cookie.`);
          sessionCookie = await this.authEngine.clearSessionCookie(req);
        }
    }
    
    for (const key of (routeConfig.writes || [])) {
      if (finalContext.data[key]) {
        console.log(`[RequestHandler-finalizeAction] Writing data to connector: '${key}'`);
        await this.connectorManager.getConnector(key).write(finalContext.data[key]);
        if (this.socketEngine) {
            await this.socketEngine.notifyOnWrite(key, finalContext.socketId);
        }
      }
    }

    let responsePayload = {};
    if (internalActions.redirect) {
      responsePayload.redirect = internalActions.redirect;
      console.log(`[RequestHandler-finalizeAction] Preparing JSON response with redirect to: ${responsePayload.redirect}`);
    } else if (routeConfig.update) {
      const componentName = routeConfig.update;
      const componentConfig = this.manifest.components[componentName];
      const requiredConnectors = componentConfig?.schema?.requires || [];
      
      const props = {
        data: {},
        globals: this.manifest.globals || {},
        url: this.renderer._getUrlContext(req ? new URL(req.url, `http://${req.headers.host}`) : null)
      };

      for (const connectorName of requiredConnectors) {
          if(finalContext.data[connectorName]) {
            props.data[connectorName] = finalContext.data[connectorName];
          }
      }

      responsePayload = {
        update: componentName,
        props: props,
      };
      console.log(`[RequestHandler-finalizeAction] Preparing JSON response to update component: '${componentName}'`);
    } else {
        console.log(`[RequestHandler-finalizeAction] Action has no redirect or update. Sending empty JSON response.`);
    }
    
    if (res && !res.headersSent) {
      if (sessionCookie) {
        console.log('[RequestHandler-finalizeAction] Setting session cookie in response headers.');
        res.setHeader('Set-Cookie', sessionCookie);
      }
      this._sendResponse(res, 200, responsePayload, 'application/json');
    } 
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
      console.warn('[RequestHandler-sendResponse] Headers already sent, cannot send response.');
      return;
    }
    const body = (typeof data === 'object' && data !== null) ? JSON.stringify(data) : String(data);
    console.log(`[RequestHandler-sendResponse] <-- Sending response: ${statusCode} ${contentType}`);
    res.writeHead(statusCode, { 
        'Content-Type': contentType, 
        'Content-Length': Buffer.byteLength(body) 
    }).end(body);
  }
}

module.exports = { RequestHandler };