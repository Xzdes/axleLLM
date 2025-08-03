// packages/axle-llm/core/asset-loader.js
const fs = require('fs');
const path = require('path');

class AssetLoader {
  constructor(appPath, manifest) {
    this.appPath = appPath;
    this.manifest = manifest;
    
    this.components = {};
    this.actions = {};
    this.bridgeModules = {};

    this.loadAll();
  }

  loadAll() {
    console.log('[AssetLoader] Caching all application assets...');
    this._loadComponents();
    this._loadActions();
    this._loadBridgeModules();
    console.log('[AssetLoader] Asset caching complete.');
  }

  _loadComponents() {
    const componentsConfig = this.manifest.components || {};
    const componentsDir = path.join(this.appPath, 'app', 'components');

    for (const name in componentsConfig) {
      const config = componentsConfig[name];
      const componentData = { template: null, style: null };

      let templateFilename, styleFilename;

      if (typeof config === 'string') {
        templateFilename = config;
      } else if (typeof config === 'object' && config.template) {
        templateFilename = config.template;
        styleFilename = config.style;
      } else {
        console.warn(`[AssetLoader] WARN: Invalid component definition for '${name}'. Skipping.`);
        continue;
      }
      
      const templatePath = path.join(componentsDir, templateFilename);

      try {
        // ★★★ НАЧАЛО ФИНАЛЬНОГО ИСПРАВЛЕНИЯ ★★★
        const htmlContent = fs.readFileSync(templatePath, 'utf-8');
        
        // Просто сохраняем весь HTML-контент как шаблон.
        // Renderer сам разберется со стилями.
        componentData.template = htmlContent;

        // Если в манифесте указан отдельный файл стилей, загружаем его.
        if (styleFilename) {
            const stylePath = path.join(componentsDir, styleFilename);
            try {
                componentData.style = fs.readFileSync(stylePath, 'utf-8');
            } catch (e) {
                console.warn(`[AssetLoader] WARN: Style file not found at ${stylePath}`);
            }
        }
        // ★★★ КОНЕЦ ФИНАЛЬНОГО ИСПРАВЛЕНИЯ ★★★
      } catch (error) {
        throw new Error(`[AssetLoader] CRITICAL: Template file not found for component '${name}' at path: ${templatePath}`);
      }
      
      this.components[name] = componentData;
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
          this.actions[actionName] = require(actionPath);
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
        this.bridgeModules[moduleName] = require(modulePath);
      } catch (error) {
        throw new Error(`[AssetLoader] CRITICAL: Failed to load bridge module '${moduleName}' from ${modulePath}. Error: ${error.message}`);
      }
    }
  }

  getComponent(name) {
    return this.components[name];
  }

  getAction(name) {
    return this.actions[name];
  }

  getBridgeModule(name) {
    return this.bridgeModules[name];
  }
}

module.exports = {
  AssetLoader,
};