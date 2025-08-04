// packages/axle-llm/core/renderer.js
const path = require('path');
const React = require('react');
const ReactDOMServer = require('react-dom/server');
const util = require('util');

class Renderer {
  constructor(assetLoader, manifest, appPath) {
    this.assetLoader = assetLoader;
    this.manifest = manifest;
    this.appPath = appPath;
  }

  _loadCompiledComponent(componentName) {
    const baseName = componentName.replace(/\.jsx?$/, '');
    const componentPath = path.join(this.appPath, '.axle-build', `${baseName}.js`);
    try {
      delete require.cache[require.resolve(componentPath)];
      const componentModule = require(componentPath);
      return componentModule.default || componentModule;
    } catch (error) {
      console.error(`[Renderer-LOG] CRITICAL: Failed to load compiled component '${componentName}' from ${componentPath}.`);
      throw error;
    }
  }

  async renderView(routeConfig, dataContext, reqUrl) {
    const layoutName = routeConfig.layout;
    if (!layoutName) throw new Error(`[Renderer] Route config is missing 'layout' property.`);
    
    const LayoutComponent = this._loadCompiledComponent(layoutName);
    if (!LayoutComponent) return `<html><body>Error: Layout component could not be loaded.</body></html>`;
    
    // Отделяем пользователя от данных коннекторов для передачи в props
    const { user, ...connectorData } = dataContext;
    
    const props = {
      data: connectorData,
      user: user,
      globals: this.manifest.globals || {},
      url: this._getUrlContext(reqUrl),
    };

    const injectedComponentTypes = {};
    const allComponentNames = new Set([layoutName]);

    if (routeConfig.inject) {
      for (const placeholder in routeConfig.inject) {
        const componentName = routeConfig.inject[placeholder];
        if (componentName) {
          const InjectedComponent = this._loadCompiledComponent(componentName);
          if (InjectedComponent) {
            injectedComponentTypes[placeholder] = InjectedComponent;
            allComponentNames.add(componentName);
          }
        }
      }
    }
    
    const finalProps = { ...props, components: injectedComponentTypes };
    const appHtml = ReactDOMServer.renderToString(React.createElement(LayoutComponent, finalProps));
    
    const renderedStyles = Array.from(allComponentNames).map(name => {
        const style = this.assetLoader.getStyleForComponent(name);
        return style ? `<style data-component-name="${name}">${style}</style>` : null;
    }).filter(Boolean).join('\n');

    // ★★★ НАЧАЛО ИЗМЕНЕНИЙ ★★★
    // Мы вставляем скрипт инициализации ПЕРЕД загрузкой основного бандла.
    const finalHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${this.manifest.launch.title || 'AxleLLM App'}</title>
    ${this._getThemeStyles()}
    ${renderedStyles}
</head>
<body>
    <div id="root">${appHtml}</div>
    <script>
      // Эта строка гарантирует, что объект существует ДО загрузки бандла.
      // Это решает ошибку "Cannot set properties of undefined (setting '...')".
      window.axle = { components: {} };
      
      // Сохраняем все данные, включая пользователя, для клиента.
      // Это понадобится для правильного обновления компонентов.
      window.__INITIAL_DATA__ = ${JSON.stringify(dataContext)}
    </script>
    <script src="/public/bundle.js"></script>
</body>
</html>`;
    // ★★★ КОНЕЦ ИЗМЕНЕНИЙ ★★★

    return finalHtml;
  }
  
  _getThemeStyles() {
    const themesConfig = this.manifest.themes;
    if (themesConfig && themesConfig.default) {
      const cssVariables = Object.entries(themesConfig.default).map(([key, value]) => `  ${key}: ${value};`).join('\n');
      return `<style id="axle-theme-variables">\n:root {\n${cssVariables}\n}\n</style>`;
    }
    return '';
  }

  _getUrlContext(reqUrl) {
    if (!reqUrl) return { pathname: '/', query: {} };
    // Используем полный URL для корректного парсинга
    const url = new URL(reqUrl.toString(), 'http://localhost');
    return { pathname: url.pathname, query: Object.fromEntries(url.searchParams) };
  }
}

module.exports = { Renderer };