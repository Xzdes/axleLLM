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

  /**
   * Loads a compiled component from the .axle-build directory.
   * @param {string} componentName - The name of the component.
   * @returns {React.ComponentType | null} - The React component.
   */
  _loadCompiledComponent(componentName) {
    const componentPath = path.join(this.appPath, '.axle-build', `${componentName}.js`);
    try {
      // Clean cache to allow for hot-reloading during development
      delete require.cache[require.resolve(componentPath)];
      const componentModule = require(componentPath);
      // Handles both `export default Component` and `module.exports = Component`
      return componentModule.default || componentModule;
    } catch (error) {
      console.error(`[Renderer] Failed to load compiled component '${componentName}' from ${componentPath}.`);
      console.error('Did you forget to run the build process? (e.g., `npm run build` or `npm run watch`)');
      console.error('Original Error:', error);
      return null;
    }
  }

  /**
   * Renders a full view for a given route, including layout and injected parts.
   * @param {object} routeConfig - The route configuration from the manifest.
   * @param {object} dataContext - The data fetched from connectors.
   * @param {URL} reqUrl - The request URL object.
   * @returns {Promise<string>} - The final HTML string for the entire page.
   */
  async renderView(routeConfig, dataContext, reqUrl) {
    const layoutName = routeConfig.layout;
    if (!layoutName) {
      throw new Error(`[Renderer] No layout specified for route.`);
    }

    const LayoutComponent = this._loadCompiledComponent(layoutName);
    if (!LayoutComponent) {
      return `<html><body>Error: Layout component '${layoutName}' could not be loaded.</body></html>`;
    }

    const injectedComponents = {};
    const renderedStyles = new Set();
    const allComponentNames = new Set([layoutName]);

    // Prepare injected components as props for the Layout
    if (routeConfig.inject) {
      for (const placeholder in routeConfig.inject) {
        const componentName = routeConfig.inject[placeholder];
        if (componentName) {
          const InjectedComponent = this._loadCompiledComponent(componentName);
          if (InjectedComponent) {
            injectedComponents[placeholder] = React.createElement(InjectedComponent);
            allComponentNames.add(componentName);
          }
        }
      }
    }

    // Collect all unique styles for the components being rendered
    allComponentNames.forEach(name => {
      const style = this.assetLoader.getStyleForComponent(name);
      if (style) {
        renderedStyles.add(`<style data-component-name="${name}">${style}</style>`);
      }
    });

    // Prepare the full props for the layout component
    const props = {
      ...injectedComponents, // e.g., { pageContent: <HomePage /> }
      data: dataContext,
      globals: this.manifest.globals || {},
      url: this._getUrlContext(reqUrl),
    };

    // Render the React component tree to an HTML string
    const appHtml = ReactDOMServer.renderToString(React.createElement(LayoutComponent, props));

    // Assemble the final HTML document
    let finalHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${this.manifest.launch.title || 'AxleLLM App'}</title>
    ${this._getThemeStyles()}
    ${Array.from(renderedStyles).join('\n')}
</head>
<body>
    <div id="root">${appHtml}</div>
    <script>window.__INITIAL_DATA__ = ${JSON.stringify(dataContext)}</script>
    <script src="/engine-client.js"></script>
</body>
</html>`;

    return finalHtml;
  }
  
  /**
   * Generates a <style> tag for the global theme variables.
   * @returns {string} - The style tag string.
   */
  _getThemeStyles() {
      const themesConfig = this.manifest.themes;
      if (themesConfig && themesConfig.default) {
        const themeVariables = themesConfig.default;
        if (themeVariables) {
          const cssVariables = Object.entries(themeVariables).map(([key, value]) => `  ${key}: ${value};`).join('\n');
          if (cssVariables) {
            return `<style id="axle-theme-variables">\n:root {\n${cssVariables}\n}\n</style>`;
          }
        }
      }
      return '';
  }

  /**
   * Creates a context object for the URL.
   * @param {URL | null} reqUrl - The request URL object.
   * @returns {object} - An object with pathname and query.
   */
  _getUrlContext(reqUrl) {
    if (!reqUrl) return { pathname: '/', query: {} };
    return { pathname: reqUrl.pathname, query: Object.fromEntries(reqUrl.searchParams) };
  }
}

module.exports = { 
  Renderer 
};