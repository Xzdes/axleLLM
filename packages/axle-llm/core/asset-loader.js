// packages/axle-llm/core/asset-loader.js
const fs = require('fs');
const path = require('path');

class AssetLoader {
  constructor(appPath, manifest) {
    this.appPath = appPath;
    this.manifest = manifest;
    
    // We only need to cache styles, actions, and bridge modules now.
    // React components are loaded dynamically by the Renderer from the .axle-build directory.
    this.styles = new Map();
    this.actions = new Map();
    this.bridgeModules = new Map();

    this.loadAll();
  }

  loadAll() {
    console.log('[AssetLoader] Caching application assets (styles, actions, bridge modules)...');
    this._loadComponentStyles();
    this._loadActions();
    this._loadBridgeModules();
    console.log('[AssetLoader] Asset caching complete.');
  }

  _loadComponentStyles() {
    const componentsConfig = this.manifest.components || {};
    const componentsDir = path.join(this.appPath, 'app', 'components');

    for (const name in componentsConfig) {
      const config = componentsConfig[name];
      
      // We only care about the 'style' property now.
      // The template is a .jsx file handled by the build process.
      if (typeof config === 'object' && config.style) {
        const styleFilename = config.style;
        const stylePath = path.join(componentsDir, styleFilename);
        
        try {
          const cssContent = fs.readFileSync(stylePath, 'utf-8');
          this.styles.set(name, cssContent);
        } catch (error) {
          console.warn(`[AssetLoader] WARN: Style file not found for component '${name}' at path: ${stylePath}`);
        }
      }
    }
  }

  _loadActions() {
    const actionsDir = path.join(this.appPath, 'app', 'actions');
    if (!fs.existsSync(actionsDir)) return;
    
    fs.readdirSync(actionsDir).forEach(file => {
      if (file.endsWith('.js')) {
        const actionName = path.basename(file, '.js');
        const actionPath = path.join(actionsDir, file);
        try {
          delete require.cache[require.resolve(actionPath)];
          const actionModule = require(actionPath);
          this.actions.set(actionName, actionModule);
        } catch (error) {
          throw new Error(`[AssetLoader] CRITICAL: Failed to load action script '${actionName}' from ${actionPath}. Error: ${error.message}`);
        }
      }
    });
  }

  _loadBridgeModules() {
    const bridgeConfig = this.manifest.bridge?.custom || {};
    const bridgeDir = path.join(this.appPath, 'app', 'bridge');

    if (Object.keys(bridgeConfig).length === 0 || !fs.existsSync(bridgeDir)) return;

    for (const moduleName in bridgeConfig) {
      const fileName = bridgeConfig[moduleName];
      const modulePath = path.join(bridgeDir, fileName);
      try {
        delete require.cache[require.resolve(modulePath)];
        const bridgeModule = require(modulePath);
        this.bridgeModules.set(moduleName, bridgeModule);
      } catch (error) {
        throw new Error(`[AssetLoader] CRITICAL: Failed to load bridge module '${moduleName}' from ${modulePath}. Error: ${error.message}`);
      }
    }
  }

  getStyleForComponent(name) {
    return this.styles.get(name);
  }

  getAction(name) {
    return this.actions.get(name);
  }

  getBridgeModule(name) {
    return this.bridgeModules.get(name);
  }
}

module.exports = {
  AssetLoader,
};