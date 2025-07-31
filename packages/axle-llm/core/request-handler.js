// packages/axle-llm/core/request-handler.js
const { URL, URLSearchParams } = require('url');
const path = require('path');
const fs = require('fs');
const cookie = require('cookie');
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
    if (this.manifest.auth) {
      this.authEngine = new AuthEngine(this.manifest, this.connectorManager);
      await this.authEngine.init();
    }
  }

  setSocketEngine(socketEngine) {
    this.socketEngine = socketEngine;
  }
  
  async handle(req, res) {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const isSpaRequest = req.headers['x-requested-with'] === 'axleLLM-SPA';
      if (url.pathname === '/engine-client.js') {
        const clientScriptPath = path.resolve(__dirname, '..', 'client', 'engine-client.js');
        const scriptContent = fs.readFileSync(clientScriptPath, 'utf-8');
        this._sendResponse(res, 200, scriptContent, 'application/javascript');
        return;
      }

      const routeConfig = this._findRoute(req.method, url.pathname);
      if (!routeConfig) { return this._sendResponse(res, 404, 'Not Found'); }
      
      const user = this.authEngine ? await this.authEngine.getUserFromRequest(req) : null;
      
      if (routeConfig.auth?.required && !user) {
        const redirectUrl = routeConfig.auth.failureRedirect || '/login';
        if (routeConfig.type === 'action' || isSpaRequest) {
            this._sendResponse(res, 200, { redirect: redirectUrl }, 'application/json');
        } else {
            this.authEngine.redirect(res, redirectUrl);
        }
        return;
      }
      
      if (routeConfig.type === 'view') {
        const dataContext = await this.connectorManager.getContext(routeConfig.reads || []);
        const renderContext = { data: dataContext, user, globals: this.manifest.globals, url: this.renderer._getUrlContext(url) };
        if (isSpaRequest) {
          const spaPayload = { title: this.manifest.launch.title, styles: [], injectedParts: {} };
          
          for (const placeholder in routeConfig.inject) {
              const componentToInject = routeConfig.inject[placeholder];
              const { html, styles } = await this.renderer._renderComponentRecursive(componentToInject, renderContext, routeConfig.inject);
              spaPayload.injectedParts[placeholder] = html;
              spaPayload.styles.push(...styles);
          }

          this._sendResponse(res, 200, spaPayload, 'application/json');
        } else {
          const html = await this.renderer.renderView(routeConfig, renderContext, url);
          this._sendResponse(res, 200, html, 'text/html; charset=utf-8');
        }
      } else if (routeConfig.type === 'action') {
        const body = await this._parseBody(req);
        const socketId = req.headers['x-socket-id'] || null;
        const initialContext = { user, body, socketId, routeName: routeConfig.key };
        
        await this.runAction(initialContext, req, res);
      }
    } catch (error) {
      console.error(`[RequestHandler] Error processing request ${req.method} ${req.url}:`, error);
      if (!res.headersSent) { this._sendResponse(res, 500, 'Internal Server Error'); }
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
        console.error(`[RequestHandler] ActionEngine failed for route '${context.routeName}'.`, engineError.message);
        
        if (res && !res.headersSent) {
            // Создаем простой объект для ответа и передаем только сообщение об ошибке.
            const errorPayload = { error: 'Action execution failed', details: engineError.message };
            this._sendResponse(res, 500, errorPayload, 'application/json');
        }
        return;
    }
    
    if (routeConfig.internal) {
      return { data: engine.context.data };
    }
    
    const internal = engine.context._internal || {};

    if (internal.awaitingBridgeCall) {
      if (!context.socketId) throw new Error("Awaitable bridge call requires a client with a valid socketId.");
      
      const continuation = async (bridgeResult) => {
        if (internal.awaitingBridgeCall.resultTo) {
          engine._setValue(internal.awaitingBridgeCall.resultTo, bridgeResult);
        }
        
        const lastStepIndex = (routeConfig.steps || []).findIndex(s => s['bridge:call'] && s['bridge:call'].await);
        const remainingSteps = (routeConfig.steps || []).slice(lastStepIndex + 1);

        delete engine.context._internal.interrupt;
        delete engine.context._internal.awaitingBridgeCall;
        
        await engine.run(remainingSteps);
        
        await this._finalizeAction(engine, routeConfig, req, null);
      };
      
      const httpResponsePayload = await this.socketEngine.registerContinuation(
          context.socketId, 
          internal.awaitingBridgeCall.details, 
          continuation
      );
      this._sendResponse(res, 200, httpResponsePayload, 'application/json');

    } else {
      await this._finalizeAction(engine, routeConfig, req, res);
    }
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
    
    if (routeConfig.internal) return finalContext;

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
      const currentUrl = req ? new URL(req.url, `http://${req.headers.host}`) : null;
      const renderContext = { data: finalContext.data, user: finalContext.user, globals: this.manifest.globals };
      responsePayload = await this.renderer.renderComponent(routeConfig.update, renderContext, currentUrl);
      
      const componentConfig = this.manifest.components[routeConfig.update];
      const componentRootId = componentConfig.rootId || routeConfig.update;
      responsePayload.targetSelector = `#${componentRootId}-container`;
    }
    
    if (internalActions.bridgeCalls) {
      responsePayload.bridgeCalls = internalActions.bridgeCalls;
    }

    if (res && !res.headersSent) {
      if (sessionCookie) {
        res.setHeader('Set-Cookie', sessionCookie);
      }
      this._sendResponse(res, 200, responsePayload, 'application/json');
    } 
    else if (routeConfig.update && finalContext.socketId) {
        this.socketEngine.sendToClient(finalContext.socketId, {
            type: 'html_update',
            payload: responsePayload
        });
    }
    
    return { data: finalContext.data };
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
      const contentType = req.headers['content-type'] || '';
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', () => {
        try {
          if (!body) return resolve({});
          if (contentType.includes('application/json')) return resolve(JSON.parse(body));
          if (contentType.includes('application/x-www-form-urlencoded')) return resolve(Object.fromEntries(new URLSearchParams(body).entries()));
          resolve({});
        } catch (e) { reject(e); }
      });
      req.on('error', err => reject(err));
    });
  }

  _sendResponse(res, statusCode, data, contentType = 'text/plain') {
    if (res.headersSent) return;
    

    // Гарантируем, что `data` становится строкой, если это объект.
    const body = (typeof data === 'object' && data !== null) ? JSON.stringify(data) : String(data);

    res.writeHead(statusCode, { 
        'Content-Type': contentType, 
        'Content-Length': Buffer.byteLength(body) 
    }).end(body);
  }
}

module.exports = { RequestHandler };