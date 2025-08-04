// packages/axle-llm/core/server.js
const http = require('http');
const { ConnectorManager } = require('./connector-manager');
const { AssetLoader } = require('./asset-loader');
const { Renderer } = require('./renderer');
const { RequestHandler } = require('./request-handler');
const { SocketEngine } = require('./socket-engine');

/**
 * Создает полный экземпляр веб-сервера со всеми зависимостями,
 * но НЕ запускает его прослушивание.
 * @param {string} appPath - Абсолютный путь к приложению пользователя.
 * @param {object} manifest - Загруженный объект манифеста.
 * @param {object} [options={}] - Дополнительные опции.
 * @param {string} [options.dbPath] - Путь для хранения базы данных.
 * @returns {Promise<{httpServer: http.Server}>}
 */
async function createServerInstance(appPath, manifest, options = {}) {
  try {
    console.log('[axle-server] Initializing engine components...');
    
    console.log('[axle-server] -> Initializing ConnectorManager...');
    const connectorManager = new ConnectorManager(appPath, manifest, { dbPath: options.dbPath });
    await connectorManager.init();
    
    console.log('[axle-server] -> Initializing AssetLoader...');
    const assetLoader = new AssetLoader(appPath, manifest);
    
    console.log('[axle-server] -> Initializing Renderer...');
    // ★★★ НАЧАЛО ИСПРАВЛЕНИЯ ★★★
    // Третьим аргументом должен быть appPath, а не connectorManager.
    const renderer = new Renderer(assetLoader, manifest, appPath);
    // ★★★ КОНЕЦ ИСПРАВЛЕНИЯ ★★★
    
    console.log('[axle-server] -> Initializing RequestHandler...');
    const requestHandler = new RequestHandler(
      manifest, connectorManager, assetLoader, renderer, appPath
    );
    await requestHandler.init();
    
    console.log('[axle-server] -> Creating HTTP Server...');
    const httpServer = http.createServer(requestHandler.handle.bind(requestHandler));
    
    console.log('[axle-server] -> Initializing SocketEngine...');
    const socketEngine = new SocketEngine(httpServer, manifest, connectorManager);
    requestHandler.setSocketEngine(socketEngine);
    
    console.log('[axle-server] ✅ All components initialized successfully.');
    
    // Возвращаем ГОТОВЫЙ, но НЕ ЗАПУЩЕННЫЙ сервер.
    // Тот, кто вызвал эту функцию, сам решит, на каком порту его запустить.
    return { httpServer };
  } catch (error) {
    console.error('[axle-server] CRITICAL error during engine components initialization.');
    throw error;
  }
}

module.exports = {
  createServerInstance,
};