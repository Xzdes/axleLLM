// packages/axle-llm/core/asset-loader.js
const fs = require('fs');
const path = require('path');
const posthtml = require('posthtml');

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
      let htmlContent;

      try {
        htmlContent = fs.readFileSync(templatePath, 'utf-8');
      } catch (error) {
        throw new Error(`[AssetLoader] CRITICAL: Template file not found for component '${name}' at path: ${templatePath}`);
      }
      
      let extractedStyle = '';
      
      // Создаем плагин, который использует правильный метод tree.walk()
      const styleExtractorPlugin = (tree) => {
        // tree.walk() проходит по каждому узлу в HTML-дереве
        tree.walk((node) => {
          // Если узел существует и является тегом <style>
          if (node && node.tag === 'style') {
            // Мы забираем его содержимое
            extractedStyle += (node.content || []).join('').trim();
            // И "удаляем" узел из дерева, чтобы он не попал в финальный HTML-шаблон
            node.tag = false; // Эффективный способ удалить тег
            node.content = null;
          }
          return node; // Возвращаем узел (измененный или нет)
        });
        return tree;
      };

      // Синхронно обрабатываем HTML, применяя наш плагин
      const result = posthtml([styleExtractorPlugin]).process(htmlContent, { sync: true });
      
      // result.html теперь содержит HTML БЕЗ тегов <style>
      componentData.template = result.html;

      // Логика определения, какой стиль использовать:
      if (styleFilename && styleFilename !== templateFilename) {
        // 1. Если указан отдельный .css файл, используем его
        const stylePath = path.join(componentsDir, styleFilename);
        try {
          componentData.style = fs.readFileSync(stylePath, 'utf-8');
        } catch (error) {
          console.warn(`[AssetLoader] WARN: Style file not found for component '${name}' at path: ${stylePath}.`);
        }
      } else if (extractedStyle) {
        // 2. Иначе, если мы извлекли стили из <style>, используем их
        componentData.style = extractedStyle;
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