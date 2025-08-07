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

  _getAllStyles() {
    let allStyles = '';
    const allComponentNames = Object.keys(this.manifest.components || {});
    for (const name of allComponentNames) {
      const style = this.assetLoader.getStyleForComponent(name);
      if (style) {
        allStyles += `<style data-component-name="${name}">${style}</style>\n`;
      }
    }
    return allStyles;
  }

  async renderView(routeConfig, dataContext, reqUrl) {
    const layoutName = routeConfig.layout;
    if (!layoutName) throw new Error(`[Renderer] Route config is missing 'layout' property.`);
    
    const LayoutComponent = this._loadCompiledComponent(layoutName);
    if (!LayoutComponent) return `<html><body>Error: Layout component could not be loaded.</body></html>`;
    
    // Разделяем данные: user отдельно, connectorData отдельно.
    const { user, ...connectorData } = dataContext;
    
    const props = {
      data: connectorData, // В props.data идут только данные коннекторов
      user: user,
      globals: this.manifest.globals || {},
      url: this._getUrlContext(reqUrl),
    };

    const injectedComponentTypes = {};
    if (routeConfig.inject) {
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
    
    const finalProps = { ...props, components: injectedComponentTypes };
    const appHtml = ReactDOMServer.renderToString(React.createElement(LayoutComponent, finalProps));
    
    const renderedStyles = this._getAllStyles();
    // ★★★ ИЗМЕНЕНИЕ: Передаем весь контекст в _getThemeStyles ★★★
    const themeStyles = this._getThemeStyles(dataContext);

    const finalHtml = `<!DOCTYPE html>
<html lang="en">
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
      // ★★★ ИЗМЕНЕНИЕ: Сериализуем только connectorData ★★★
      window.__INITIAL_DATA__ = ${JSON.stringify(connectorData)};
    </script>
    <script src="/public/bundle.js"></script>
</body>
</html>`;

    return finalHtml;
  }
  
  // ★★★ НАЧАЛО КЛЮЧЕВЫХ ИЗМЕНЕНИЙ ★★★
  _getThemeStyles(dataContext) {
    const themesConfig = this.manifest.themes;
    if (!themesConfig || Object.keys(themesConfig).length === 0) {
      return '';
    }

    // 1. Определяем, какую тему использовать.
    // Пытаемся взять из данных 'settings.currentTheme'.
    const currentThemeName = dataContext?.settings?.currentTheme || Object.keys(themesConfig)[0];
    
    // 2. Выбираем объект с переменными для этой темы.
    // Если тема с таким именем не найдена, используем первую доступную как фолбэк.
    const themeVariables = themesConfig[currentThemeName] || themesConfig[Object.keys(themesConfig)[0]];

    const cssVariables = Object.entries(themeVariables)
      .map(([key, value]) => `  ${key}: ${value};`)
      .join('\n');
      
    return `<style id="axle-theme-variables">\n:root {\n${cssVariables}\n}\n</style>`;
  }
  // ★★★ КОНЕЦ КЛЮЧЕВЫХ ИЗМЕНЕНИЙ ★★★

  _getUrlContext(reqUrl) {
    if (!reqUrl) return { pathname: '/', query: {} };
    const url = new URL(reqUrl.toString(), 'http://localhost');
    return { pathname: url.pathname, query: Object.fromEntries(url.searchParams) };
  }
}

module.exports = { Renderer };