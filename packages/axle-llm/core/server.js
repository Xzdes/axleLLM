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
    // ★★★ ИЗМЕНЕНИЕ: Пробрасываем опции в ConnectorManager ★★★
    const connectorManager = new ConnectorManager(appPath, manifest, { dbPath: options.dbPath });
    await connectorManager.init();
    const assetLoader = new AssetLoader(appPath, manifest);
    const renderer = new Renderer(assetLoader, manifest, connectorManager);
    const requestHandler = new RequestHandler(
      manifest, connectorManager, assetLoader, renderer, appPath
    );
    await requestHandler.init();
    const httpServer = http.createServer(requestHandler.handle.bind(requestHandler));
    const socketEngine = new SocketEngine(httpServer, manifest, connectorManager);
    requestHandler.setSocketEngine(socketEngine);
    console.log('[axle-server] All components initialized.');
    
    // Возвращаем ГОТОВЫЙ, но НЕ ЗАПУЩЕННЫЙ сервер.
    // Тот, кто вызвал эту функцию, сам решит, на каком порту его запустить.
    return { httpServer };
  } catch (error) {
    console.error('[axle-server] Critical error during engine components initialization.');
    throw error;
  }
}

module.exports = {
  createServerInstance,
};