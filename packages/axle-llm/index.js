// packages/axle-llm/index.js

// 1. Импортирует функции из ваших основных модулей
const { runDev, runStart, runPackage } = require('./core/commands');
const { createServerInstance } = require('./core/server'); // В вашем коде может быть startServer, суть та же
const { loadManifest } = require('./core/config-loader');

/**
 * Эта функция предназначена в основном для тестов.
 * Она позволяет запустить ТОЛЬКО серверную часть вашего приложения
 * (HTTP-сервер, коннекторы, рендерер) без запуска окна Electron.
 */
async function createServer(appPath, options = {}) {
    // Эта проверка — ключевая. Код внутри выполнится, только если
    // переменная окружения установлена в 'test'.
    if (process.env.NODE_ENV === 'test') {
        const manifest = loadManifest(appPath);
        // Запускает сервер и возвращает его экземпляр, чтобы
        // тестовый скрипт мог отправлять на него запросы.
        const { httpServer } = await createServerInstance(appPath, manifest, options);
        return { server: httpServer };
    }
    
    // В обычном режиме эта функция ничего не делает.
    console.log("createServer is intended for testing purposes in the current setup.");
}

// 2. Экспортирует (делает публичными) эти функции
module.exports = {
    createServer,
    runDev,
    runStart,
    runPackage
};