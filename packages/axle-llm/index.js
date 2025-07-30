// packages/axle-llm/index.js
// Этот файл является главной "точкой входа" для нашего NPM-пакета.
// Когда кто-то пишет `require('axle-llm')`, он получает то, что
// экспортируется из этого файла.

const { runDev, runStart, runPackage } = require('./core/commands');
const { startServer } = require('./core/server');
const { loadManifest } = require('./core/config-loader');

/**
 * Создает и запускает внутренний HTTP-сервер.
 * Используется в основном для тестов или для сценариев, где не нужен UI.
 * @param {string} appPath - Путь к приложению.
 * @param {object} options - Опции.
 * @returns {Promise<{server: http.Server}>}
 */
async function createServer(appPath, options = {}) {
    // В тестах нам нужен только работающий HTTP-сервер, без запуска Electron.
    // Переменная окружения `NODE_ENV` - стандартный способ управлять таким поведением.
    if (process.env.NODE_ENV === 'test') {
        const manifest = loadManifest(appPath);
        // `startServer` возвращает URL, но для тестов нам нужен сам экземпляр сервера.
        // Мы переделаем `startServer`, чтобы он возвращал и то, и другое.
        // А пока симулируем возврат объекта.
        const { httpServer } = await startServer(appPath, manifest, options);
        return { server: httpServer };
    }
    
    // В реальном приложении эта функция могла бы запускать Electron,
    // но мы уже вынесли эту логику в `commands.js` и `main.js`.
    console.log("createServer is intended for testing purposes in the current setup.");
}

module.exports = {
    createServer,
    runDev,
    runStart,
    runPackage
};