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
      
      // NEW: Generic static file handling for the client bundle.
      // We assume esbuild places the output in a `/public` directory in the user's app.
      if (url.pathname === '/public/bundle.js') {
        const bundlePath = path.join(this.appPath, 'public', 'bundle.js');
        try {
          const scriptContent = fs.readFileSync(bundlePath, 'utf-8');
          this._sendResponse(res, 200, scriptContent, 'application/javascript');
        } catch (e) {
            console.error(`[RequestHandler] Could not find client bundle at ${bundlePath}`);
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
        this._sendResponse(res, 200, { redirect: redirectUrl }, 'application/json');
        return;
      }
      
      if (routeConfig.type === 'view') {
        const dataContext = await this.connectorManager.getContext(routeConfig.reads || []);
        const html = await this.renderer.renderView(routeConfig, dataContext, url);
        this._sendResponse(res, 200, html, 'text/html; charset=utf-8');
      } else if (routeConfig.type === 'action') {
        const body = await this._parseBody(req);
        const socketId = req.headers['x-socket-id'] || null;
        const initialContext = { user, body, socketId, routeName: routeConfig.key };
        await this.runAction(initialContext, req, res);
      }
    } catch (error) {
      console.error(`[RequestHandler] Error processing request ${req.method} ${req.url}:`, error);
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
        console.error(`[RequestHandler] ActionEngine failed for route '${context.routeName}'.`, engineError.message);
        if (res && !res.headersSent) {
            const errorPayload = { error: 'Action execution failed', details: engineError.message };
            this._sendResponse(res, 500, errorPayload, 'application/json');
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
      // NEW LOGIC: Instead of rendering HTML, we prepare props for the React component.
      const componentName = routeConfig.update;
      const componentConfig = this.manifest.components[componentName];
      const requiredConnectors = componentConfig?.schema?.requires || [];
      
      const props = {
        data: {},
        globals: this.manifest.globals || {},
        url: this.renderer._getUrlContext(req ? new URL(req.url, `http://${req.headers.host}`) : null)
      };

      // Populate props.data with only the data the component needs.
      for (const connectorName of requiredConnectors) {
          if(finalContext.data[connectorName]) {
            props.data[connectorName] = finalContext.data[connectorName];
          }
      }

      responsePayload = {
        update: componentName,
        props: props,
      };
    }
    
    if (res && !res.headersSent) {
      if (sessionCookie) {
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
    if (res.headersSent) return;
    const body = (typeof data === 'object' && data !== null) ? JSON.stringify(data) : String(data);
    res.writeHead(statusCode, { 
        'Content-Type': contentType, 
        'Content-Length': Buffer.byteLength(body) 
    }).end(body);
  }
}

module.exports = { RequestHandler };