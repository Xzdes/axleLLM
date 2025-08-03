// packages/axle-llm/core/config-loader.js
const path = require('path');
const fs = require('fs');

/**
 * Финальная, отказоустойчивая версия загрузчика манифеста.
 * Он собирает новый объект конфигурации с нуля, избегая проблем с кэшем require.
 */
function loadManifest(appPath) {
  const manifestPath = path.join(appPath, 'manifest.js');
  const manifestDir = path.join(appPath, 'manifest');

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`[ConfigLoader] CRITICAL: manifest.js not found at ${manifestPath}`);
  }

  try {
    // 1. Очищаем кэш и загружаем корневой файл manifest.js
    delete require.cache[require.resolve(manifestPath)];
    const rootConfig = require(manifestPath);

    // 2. Явно загружаем каждую часть по отдельности
    const connectorsPath = path.join(manifestDir, 'connectors.js');
    delete require.cache[require.resolve(connectorsPath)];
    const connectors = fs.existsSync(connectorsPath) ? require(connectorsPath) : {};

    const componentsPath = path.join(manifestDir, 'components.js');
    delete require.cache[require.resolve(componentsPath)];
    const components = fs.existsSync(componentsPath) ? require(componentsPath) : {};

    const bridgePath = path.join(manifestDir, 'bridge.js');
    delete require.cache[require.resolve(bridgePath)];
    const bridge = fs.existsSync(bridgePath) ? require(bridgePath) : {};

    // 3. Собираем все роуты из папки manifest/routes/
    const collectedRoutes = {};
    const routesDir = path.join(manifestDir, 'routes');
    if (fs.existsSync(routesDir) && fs.lstatSync(routesDir).isDirectory()) {
      const routeFiles = fs.readdirSync(routesDir).filter(file => file.endsWith('.js'));
      for (const file of routeFiles) {
        const routeFilePath = path.join(routesDir, file);
        delete require.cache[require.resolve(routeFilePath)];
        Object.assign(collectedRoutes, require(routeFilePath));
      }
    }

    // 4. Собираем финальный, чистый объект манифеста
    const finalManifest = {
      ...rootConfig, // Берем launch, globals, auth, etc. из корневого файла
      connectors,
      components,
      bridge,
      routes: collectedRoutes, // Вставляем собранные роуты
    };
    
    return finalManifest;

  } catch (error) {
    console.error(`[ConfigLoader] CRITICAL: Failed to process manifest files.`);
    throw error;
  }
}

module.exports = {
  loadManifest,
};