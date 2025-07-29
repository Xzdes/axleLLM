// packages/axle-llm/core/config-loader.js
// Этот модуль отвечает за одну единственную вещь:
// безопасно загрузить и вернуть объект манифеста из приложения пользователя.

const path = require('path');
const fs = require('fs');

/**
 * Загружает manifest.js из корневой папки приложения пользователя.
 * @param {string} appPath - Абсолютный путь к приложению.
 * @returns {object} - Объект манифеста.
 */
function loadManifest(appPath) {
  const manifestPath = path.join(appPath, 'manifest.js');

  // Перед загрузкой очищаем кэш `require`, чтобы hot-reloader
  // всегда получал самую свежую версию файла.
  try {
    delete require.cache[require.resolve(manifestPath)];
    const manifest = require(manifestPath);
    return manifest;
  } catch (error) {
    console.error(`[ConfigLoader] CRITICAL: Failed to load manifest from ${manifestPath}.`);
    // Пробрасываем ошибку наверх, чтобы движок мог ее поймать и остановить запуск.
    throw error;
  }
}

module.exports = {
  loadManifest,
};