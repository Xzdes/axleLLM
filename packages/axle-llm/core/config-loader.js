// packages/axle-llm/core/config-loader.js
const path = require('path');
const fs = require('fs');

/**
 * "Умный" загрузчик манифеста.
 * 1. Загружает корневой manifest.js.
 * 2. Автоматически сканирует папку /manifest и подгружает все части.
 * 3. Собирает их в единый, полный объект манифеста.
 */
function loadManifest(appPath) {
  const manifestPath = path.join(appPath, 'manifest.js');
  const manifestDir = path.join(appPath, 'manifest');

  try {
    // Очищаем кэш для hot-reload
    delete require.cache[require.resolve(manifestPath)];
    
    // Загружаем корневой манифест (с launch, globals и т.д.)
    const rootManifest = require(manifestPath);
    
    // Сканируем папку manifest/ и автоматически подгружаем все части
    const parts = ['connectors', 'components', 'routes', 'bridge'];
    for (const part of parts) {
      const partPath = path.join(manifestDir, `${part}.js`);
      if (fs.existsSync(partPath)) {
        delete require.cache[require.resolve(partPath)];
        rootManifest[part] = require(partPath);
      }
    }

    return rootManifest;

  } catch (error) {
    console.error(`[ConfigLoader] CRITICAL: Failed to load manifest from ${manifestPath}.`);
    throw error;
  }
}

module.exports = {
  loadManifest,
};