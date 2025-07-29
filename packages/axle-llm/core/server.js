// packages/axle-llm/core/server.js

const http = require('http');
// ИЗМЕНЕНИЕ: Мы импортируем не весь модуль, а конкретную функцию из него.
// В новых версиях пакета `get-port` основной экспорт - это объект.
const { default: getPort } = require('get-port');

const { ConnectorManager } = require('./connector-manager');
const { AssetLoader } = require('./asset-loader');
const { Renderer } = require('./renderer');
const { RequestHandler } = require('./request-handler');
const { SocketEngine } = require('./socket-engine');

async function startServer(appPath, manifest) {
  try {
    console.log('[axle-server] Initializing engine components...');

    const connectorManager = new ConnectorManager(appPath, manifest);
    await connectorManager.init();

    const assetLoader = new AssetLoader(appPath, manifest);
    
    const renderer = new Renderer(assetLoader, manifest, connectorManager);

    const requestHandler = new RequestHandler(
      manifest,
      connectorManager,
      assetLoader,
      renderer,
      appPath
    );
    await requestHandler.init();

    const httpServer = http.createServer(requestHandler.handle.bind(requestHandler));

    const socketEngine = new SocketEngine(httpServer, manifest, connectorManager);
    
    requestHandler.setSocketEngine(socketEngine);
    
    console.log('[axle-server] All components initialized.');

    // Теперь `getPort()` будет настоящей функцией, и ошибки не будет.
    const port = await getPort();
    const host = '127.0.0.1';

    return new Promise((resolve, reject) => {
      httpServer.listen(port, host, () => {
        const serverUrl = `http://${host}:${port}`;
        console.log(`[axle-server] Internal web server is running on ${serverUrl}`);
        resolve(serverUrl);
      });
      httpServer.on('error', (err) => {
        console.error('[axle-server] Failed to start internal server.');
        reject(err);
      });
    });

  } catch (error) {
    console.error('[axle-server] Critical error during engine startup.');
    throw error;
  }
}

module.exports = {
  startServer,
};