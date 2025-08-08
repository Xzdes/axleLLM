// packages/axle-llm/core/renderer.js
const path = require('path');
const React = require('react');
const ReactDOMServer = require('react-dom/server');

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
      console.error(`[Renderer] CRITICAL: Failed to load compiled component '${componentName}' from ${componentPath}.`);
      throw error;
    }
  }

  // ★★★ НАЧАЛО ФИНАЛЬНОГО ИСПРАВЛЕНИЯ CSS ★★★
  // Радикально упрощаем. Больше никакой хрупкой изоляции.
  // Просто собираем все стили и вставляем их в <head>.
  _getAllStyles() {
    let allStyles = '';
    const componentsConfig = this.manifest.components || {};

    for (const name in componentsConfig) {
      const config = componentsConfig[name];
      if (config && config.style) {
        const cssContent = this.assetLoader.getStyleForComponent(name);
        if (cssContent) {
            allStyles += `<style data-component-name="${name}">\n${cssContent}\n</style>\n`;
        }
      }
    }
    return allStyles;
  }
  // ★★★ КОНЕЦ ФИНАЛЬНОГО ИСПРАВЛЕНИЯ CSS ★★★
  
  _getInjectedComponentTypes(routeConfig) {
      const injectedComponentTypes = {};
      if (routeConfig && routeConfig.inject) {
          for (const placeholder in routeConfig.inject) {
              const componentName = routeConfig.inject[placeholder];
              if (componentName) {
                  const InjectedComponent = this._loadCompiledComponent(componentName);
                  if (InjectedComponent) {
                      injectedComponentTypes[placeholder] = InjectedComponent;
                  }
              }
          }
      }
      return injectedComponentTypes;
  }
  
  async renderView(routeConfig, dataContext, reqUrl) {
    const layoutName = routeConfig.layout;
    if (!layoutName) throw new Error(`[Renderer] Route config is missing 'layout' property.`);
    
    const LayoutComponent = this._loadCompiledComponent(layoutName);
    if (!LayoutComponent) return `<html><body>Error: Layout component '${layoutName}' could not be loaded.</body></html>`;
    
    const { user, ...connectorData } = dataContext;
    
    const props = {
      data: connectorData,
      user: user,
      globals: this.manifest.globals || {},
      url: this._getUrlContext(reqUrl),
      components: this._getInjectedComponentTypes(routeConfig),
    };
    
    // Рендерим HTML как и раньше
    const appHtml = ReactDOMServer.renderToString(React.createElement(LayoutComponent, props));
    
    // Используем новый, надежный метод получения стилей
    const renderedStyles = this._getAllStyles();
    const themeStyles = this._getThemeStyles(dataContext);

    const finalHtml = `<!DOCTYPE html>
<html lang="en" data-theme="${dataContext?.settings?.currentTheme || 'light'}">
<head>
    <meta charset="UTF-8">
    <title>${this.manifest.launch.title || 'AxleLLM App'}</title>
    ${themeStyles}
    ${renderedStyles}
</head>
<body>
    <div id="root">${appHtml}</div>
    <script>
      window.axle = { components: {} };
      window.__INITIAL_DATA__ = ${JSON.stringify(connectorData)};
    </script>
    <script src="/public/bundle.js"></script>
</body>
</html>`;

    return finalHtml;
  }
  
  _getThemeStyles(dataContext) {
    const themesConfig = this.manifest.themes;
    if (!themesConfig || Object.keys(themesConfig).length === 0) return '';

    const currentThemeName = dataContext?.settings?.currentTheme || Object.keys(themesConfig)[0];
    const themeVariables = themesConfig[currentThemeName] || themesConfig[Object.keys(themesConfig)[0]];
    if (!themeVariables) return '';

    const cssVariables = Object.entries(themeVariables)
      .map(([key, value]) => `  ${key}: ${value};`)
      .join('\n');
      
    return `<style id="axle-theme-variables">\n:root {\n${cssVariables}\n}\n</style>`;
  }

  _getUrlContext(reqUrl) {
    if (!reqUrl) return { pathname: '/', query: {} };
    const url = new URL(reqUrl.toString(), 'http://localhost');
    return { pathname: url.pathname, query: Object.fromEntries(url.searchParams) };
  }
}

module.exports = { Renderer };