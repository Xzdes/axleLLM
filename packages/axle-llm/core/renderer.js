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
      // console.log(`[Renderer-LOG] Successfully loaded component '${componentName}'`);
      return componentModule.default || componentModule;
    } catch (error) {
      console.error(`[Renderer-LOG] CRITICAL: Failed to load compiled component '${componentName}' from ${componentPath}.`);
      throw error;
    }
  }

  async renderView(routeConfig, dataContext, reqUrl) {
    // console.log(`\n[Renderer-LOG] --- Starting renderView for layout: ${routeConfig.layout} ---`);
    const layoutName = routeConfig.layout;
    if (!layoutName) throw new Error(`[Renderer] Route config is missing 'layout' property.`);
    
    const LayoutComponent = this._loadCompiledComponent(layoutName);
    if (!LayoutComponent) return `<html><body>Error: Layout component could not be loaded.</body></html>`;

    // ★ ИЗМЕНЕНИЕ: dataContext теперь содержит и данные из коннекторов, и объект user.
    // Мы извлекаем пользователя и передаем его в props отдельно от `data`.
    const { user, ...connectorData } = dataContext;
    
    const props = {
      data: connectorData, // Только данные из коннекторов
      user: user,          // Пользователь как отдельный prop
      globals: this.manifest.globals || {},
      url: this._getUrlContext(reqUrl),
    };
    // console.log('[Renderer-LOG] Initial props object created:', util.inspect(props, { depth: 3, colors: true }));

    const injectedComponentTypes = {};
    const allComponentNames = new Set([layoutName]);

    if (routeConfig.inject) {
      // console.log('[Renderer-LOG] Injecting component types:', routeConfig.inject);
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
    
    const appElement = React.createElement(LayoutComponent, finalProps);
    // console.log('[Renderer-LOG] App element created. Starting ReactDOMServer.renderToString...');
    const appHtml = ReactDOMServer.renderToString(appElement);
    // console.log('[Renderer-LOG] renderToString complete.');
    
    const renderedStyles = Array.from(allComponentNames).map(name => {
        const style = this.assetLoader.getStyleForComponent(name);
        return style ? `<style data-component-name="${name}">${style}</style>` : null;
    }).filter(Boolean).join('\n');

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
    <script>window.__INITIAL_DATA__ = ${JSON.stringify(dataContext)}</script>
    <script src="/public/bundle.js"></script>
</body>
</html>`;

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
    const url = new URL(reqUrl.toString(), 'http://localhost');
    return { pathname: url.pathname, query: Object.fromEntries(url.searchParams) };
  }
}

module.exports = { Renderer };