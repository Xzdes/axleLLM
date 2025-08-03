// packages/axle-llm/core/config-loader.js
const path = require('path');
const fs = require('fs');

/**
 * A robust manifest loader that supports both a monolithic manifest.js (for tests)
 * and a split file structure (for development).
 */
function loadManifest(appPath) {
  const manifestPath = path.join(appPath, 'manifest.js');
  const manifestDir = path.join(appPath, 'manifest');

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`[ConfigLoader] CRITICAL: manifest.js not found at ${manifestPath}`);
  }

  try {
    // 1. Always load the root manifest file.
    delete require.cache[require.resolve(manifestPath)];
    const finalManifest = require(manifestPath);

    // 2. Conditionally load parts from the /manifest directory only if they are not
    //    already defined in the root manifest.js. This makes testing much easier.

    if (!finalManifest.connectors) {
      const connectorsPath = path.join(manifestDir, 'connectors.js');
      if (fs.existsSync(connectorsPath)) {
        delete require.cache[require.resolve(connectorsPath)];
        finalManifest.connectors = require(connectorsPath);
      } else {
        finalManifest.connectors = {};
      }
    }

    if (!finalManifest.components) {
      const componentsPath = path.join(manifestDir, 'components.js');
      if (fs.existsSync(componentsPath)) {
        delete require.cache[require.resolve(componentsPath)];
        finalManifest.components = require(componentsPath);
      } else {
        finalManifest.components = {};
      }
    }

    if (!finalManifest.bridge) {
      const bridgePath = path.join(manifestDir, 'bridge.js');
      if (fs.existsSync(bridgePath)) {
        delete require.cache[require.resolve(bridgePath)];
        finalManifest.bridge = require(bridgePath);
      } else {
        finalManifest.bridge = {};
      }
    }

    // Routes are special: we merge them if they don't exist, to support the multi-file structure.
    if (!finalManifest.routes || Object.keys(finalManifest.routes).length === 0) {
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
      finalManifest.routes = collectedRoutes;
    }
    
    return finalManifest;

  } catch (error) {
    console.error(`[ConfigLoader] CRITICAL: Failed to process manifest files.`);
    // Re-throw to make sure the calling process knows about the failure.
    throw error;
  }
}

module.exports = {
  loadManifest,
};