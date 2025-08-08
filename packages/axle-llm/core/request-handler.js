// packages/axle-llm/core/request-handler.js
const { URL } = require('url');
const path = require('path');
const fs = require('fs');
const { ActionEngine } = require('./action-engine');
const { AuthEngine } = require('./auth-engine');

const MIME_TYPES = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.woff': 'font/woff', '.woff2': 'font/woff2',
};

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

  setSocketEngine(socketEngine) { this.socketEngine = socketEngine; }
  
  async handle(req, res) {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      console.log(`\n[RequestHandler] --> Handling request: ${req.method} ${url.pathname}`);
      
      // ★★★ НАЧАЛО КЛЮЧЕВОГО ИСПРАВЛЕНИЯ: Надежная обработка статических файлов ★★★
      if (url.pathname.startsWith('/public/')) {
        const publicDir = path.join(this.appPath, 'public');
        const safeFilePath = path.normalize(path.join(this.appPath, url.pathname));

        // Проверка безопасности, чтобы нельзя было выйти за пределы папки /public
        if (!safeFilePath.startsWith(publicDir)) {
          this._sendResponse(res, 403, 'Forbidden');
          return;
        }

        try {
          // Асинхронно читаем файл
          const fileContent = await fs.promises.readFile(safeFilePath);
          const ext = path.extname(safeFilePath);
          const contentType = MIME_TYPES[ext] || 'application/octet-stream';
          this._sendResponse(res, 200, fileContent, contentType);
          return; // Важно: завершаем обработку здесь
        } catch (error) {
          if (error.code === 'ENOENT') {
            // Если файл не найден, явно отдаем 404
            this._sendResponse(res, 404, `Static file not found: ${url.pathname}`);
          } else {
            // Другие ошибки (например, нет прав на чтение)
            console.error(`[RequestHandler] Error serving static file ${safeFilePath}:`, error);
            this._sendResponse(res, 500, 'Internal Server Error');
          }
          return; // Важно: завершаем обработку здесь
        }
      }
      // ★★★ КОНЕЦ КЛЮЧЕВОГО ИСПРАВЛЕНИЯ ★★★

      const routeConfig = this._findRoute(req.method, url.pathname);
      if (!routeConfig) { 
        this._sendResponse(res, 404, `Route Not Found: ${req.method} ${url.pathname}`);
        return; 
      }
      
      const user = this.authEngine ? await this.authEngine.getUserFromRequest(req) : null;
      
      if (routeConfig.auth?.required && !user) {
        const redirectUrl = routeConfig.auth.failureRedirect || '/login';
        if (routeConfig.type === 'view') { this.authEngine.redirect(res, redirectUrl); return; }
        if (routeConfig.type === 'action') { this._sendResponse(res, 200, { redirect: redirectUrl }, 'application/json'); return; }
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
      if (res && !res.headersSent) { this._sendResponse(res, 500, 'Internal Server Error'); }
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
        console.error(`[RequestHandler] Action engine failed for route '${context.routeName}':`, engineError);
        if (res && !res.headersSent) this._sendResponse(res, 500, { error: 'Action execution failed', details: engineError.message }, 'application/json');
        return;
    }
    
    const finalContext = engine.context;
    
    if (finalContext._internal?.awaitingBridgeCall) {
        const continuation = async (resultFromClient) => {
            console.log(`[RequestHandler] Continuing action '${context.routeName}' after awaitable call.`);
            
            const { resultTo, step } = finalContext._internal.awaitingBridgeCall;
            if (resultTo) engine._setValue(resultTo, resultFromClient);
            
            engine.context._internal.interrupt = false;
            engine.context._internal.resumingFrom = step;

            await engine.run(routeConfig.steps || []);
            
            const payload = await this._prepareFinalResponse(engine, routeConfig, req);
            this.socketEngine.sendToClient(finalContext.socketId, { type: 'action_response', payload });
        };
        
        const httpResponsePayload = this.socketEngine.registerContinuation(finalContext.socketId, finalContext._internal.awaitingBridgeCall.details, continuation);
        this._sendResponse(res, 200, httpResponsePayload, 'application/json');
        return;
    }
    
    if (routeConfig.internal) { return { data: engine.context.data }; }
    
    await this._finalizeAction(engine, routeConfig, req, res);
  }

  async _finalizeAction(engine, routeConfig, req, res) {
    const finalContext = engine.context;
    let sessionCookie = null;

    if (this.authEngine) {
        if (finalContext._internal?.loginUser) sessionCookie = await this.authEngine.createSessionCookie(finalContext._internal.loginUser);
        if (finalContext._internal?.logout) sessionCookie = await this.authEngine.clearSessionCookie(req);
    }
    
    for (const key of (routeConfig.writes || [])) {
      if (finalContext.data[key]) {
        await this.connectorManager.getConnector(key).write(finalContext.data[key]);
        if (this.socketEngine) await this.socketEngine.notifyOnWrite(key, finalContext.socketId);
      }
    }
    
    const responsePayload = await this._prepareFinalResponse(engine, routeConfig, req);
    if (res && !res.headersSent) {
      if (sessionCookie) res.setHeader('Set-Cookie', sessionCookie);
      this._sendResponse(res, 200, responsePayload, 'application/json');
    }
  }

  async _prepareFinalResponse(engine, routeConfig, req) {
    const finalContext = engine.context;
    const internal = finalContext._internal || {};
    let responsePayload = {};
    
    if (internal.redirect) {
        responsePayload.redirect = internal.redirect;
    } else if (routeConfig.update) {
        const parentViewRoute = this._findParentViewRouteForComponent(routeConfig.update);
        const layoutComponent = parentViewRoute ? parentViewRoute.layout : routeConfig.update;
        const reads = parentViewRoute ? parentViewRoute.reads : routeConfig.reads;

        const data = await this.connectorManager.getContext(reads || []);
        
        responsePayload.update = layoutComponent; 
        
        const props = {
          data: data,
          user: finalContext.user,
          globals: this.manifest.globals || {},
          url: this.renderer._getUrlContext(req ? new URL(req.url, `http://${req.headers.host}`) : null),
          components: this.renderer._getInjectedComponentTypes(parentViewRoute)
        };
        responsePayload.props = props;
    }
    
    if (internal.bridgeCalls) responsePayload.bridgeCalls = internal.bridgeCalls;
    
    return responsePayload;
  }

  _findParentViewRouteForComponent(componentName) {
    for (const key in this.manifest.routes) {
      const route = this.manifest.routes[key];
      if (route.type === 'view') {
        if (route.layout === componentName || Object.values(route.inject || {}).includes(componentName)) {
           route.key = key;
           return route;
        }
      }
    }
    return null;
  }
  
  _findRoute(method, pathname) {
    const key = `${method} ${pathname}`;
    const route = this.manifest.routes[key] || this.manifest.routes[`GET ${pathname}`] || null;
    if (route) {
      route.key = key;
    }
    return route;
  }

  _parseBody(req) {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', () => { try { resolve(body ? JSON.parse(body) : {}); } catch (e) { resolve({}); } });
      req.on('error', err => reject(err));
    });
  }

  _sendResponse(res, statusCode, data, contentType = 'text/plain') {
    if (res.headersSent) return;
    const body = (typeof data === 'object' && data !== null && !Buffer.isBuffer(data)) ? JSON.stringify(data) : data;
    res.writeHead(statusCode, { 'Content-Type': contentType, 'Content-Length': Buffer.byteLength(body) }).end(body);
  }
}

module.exports = { RequestHandler };