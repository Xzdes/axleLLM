// packages/axle-llm/core/renderer.js
const Mustache = require('./mustache');
const posthtml = require('posthtml');

class Renderer {
  constructor(assetLoader, manifest, connectorManager) {
    this.assetLoader = assetLoader;
    this.manifest = manifest;
    this.connectorManager = connectorManager;
  }

  async renderView(routeConfig, dataContext, reqUrl) {
    const layoutName = routeConfig.layout;
    if (!layoutName) throw new Error(`[Renderer] No layout specified for route.`);
    const finalRenderContext = { ...dataContext, globals: this.manifest.globals || {}, url: this._getUrlContext(reqUrl) };
    
    const { html, styles } = await this._renderComponentRecursive(layoutName, finalRenderContext, routeConfig.inject || {});
    
    let finalHtml = html;
    
    // ★★★ НОВАЯ ФУНКЦИОНАЛЬНОСТЬ: ВНЕДРЕНИЕ ТЕМЫ ★★★
    let themeStyleTag = '';
    if (this.manifest.themes && this.manifest.themes.default) {
      const variables = this.manifest.themes.default;
      const cssVariables = Object.entries(variables)
        .map(([key, value]) => `  ${key}: ${value};`)
        .join('\n');
      
      if (cssVariables) {
        themeStyleTag = `<style id="axle-theme-variables">\n:root {\n${cssVariables}\n}\n</style>`;
      }
    }
    // ★★★ КОНЕЦ НОВОЙ ФУНКЦИОНАЛЬНОСТИ ★★★

    if (styles.length > 0 || themeStyleTag) {
      const componentStyleTags = styles.map(s => `<style data-component-name="${s.name}">${s.css}</style>`).join('\n');
      const allStyleTags = [themeStyleTag, componentStyleTags].filter(Boolean).join('\n');
      finalHtml = finalHtml.replace('</head>', `${allStyleTags}\n</head>`);
    }

    const clientScriptTag = `<script src="/engine-client.js"></script>`;
    finalHtml = finalHtml.replace('</body>', `${clientScriptTag}\n</body>`);

    return finalHtml;
  }

  async renderComponent(componentName, dataContext, reqUrl) {
    const finalRenderContext = { ...dataContext, globals: this.manifest.globals || {}, url: this._getUrlContext(reqUrl) };
    const { html, styles } = await this._renderComponentRecursive(componentName, finalRenderContext, {});
    return {
      html,
      styles: styles.map(s => s.css).join('\n'),
      componentName
    };
  }

  async _renderComponentRecursive(componentName, dataContext, injectConfig) {
    const componentAsset = this.assetLoader.getComponent(componentName);
    if (!componentAsset) throw new Error(`[Renderer] Component asset '${componentName}' not found.`);
    let template = componentAsset.template;
    const collectedStyles = [];
    const componentId = `c-${Math.random().toString(36).substring(2, 9)}`;
    if (componentAsset.style) {
      const scopedCss = this._scopeCss(componentAsset.style, componentId);
      collectedStyles.push({ name: componentName, css: scopedCss });
    }
    const placeholders = template.match(/<atom-inject into="([^"]+)"><\/atom-inject>/g) || [];
    for (const placeholder of placeholders) {
      const placeholderName = placeholder.match(/into="([^"]+)"/)[1];
      const childComponentName = injectConfig[placeholderName];
      if (childComponentName) {
        const childResult = await this._renderComponentRecursive(childComponentName, dataContext, injectConfig);
        template = template.replace(placeholder, childResult.html);
        collectedStyles.push(...childResult.styles);
      }
    }
    let html = Mustache.render(template, dataContext);
    const posthtmlPlugins = [ this._createAtomIfPlugin(dataContext), this._createAddComponentIdPlugin(componentId) ];
    const result = await posthtml(posthtmlPlugins).process(html);
    html = result.html;
    return { html, styles: collectedStyles };
  }
  
  _getUrlContext(reqUrl) {
    if (!reqUrl) return { pathname: '/', query: {} };
    return { pathname: reqUrl.pathname, query: Object.fromEntries(reqUrl.searchParams) };
  }
  
  _scopeCss(css, scopeId) {
    const scopeAttr = `[data-component-id="${scopeId}"]`;
    const cssWithoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
    
    return cssWithoutComments.split('}').filter(rule => rule.trim()).map(rule => {
        const [selectors, body] = rule.split('{');
        const scopedSelectors = selectors.split(',')
            .map(selector => {
                const trimmed = selector.trim();
                if (trimmed.startsWith(':host')) {
                    return trimmed.replace(/:host/g, scopeAttr);
                }
                return `${scopeAttr} ${trimmed}`;
            })
            .join(', ');
        return `${scopedSelectors} {${body}}`;
    }).join('\n');
  }

  _createAtomIfPlugin(dataContext) {
    return (tree) => {
      tree.match({ attrs: { 'atom-if': true } }, (node) => {
        const condition = node.attrs['atom-if'];
        let result = false;
        try {
          const func = new Function(...Object.keys(dataContext), `return ${condition};`);
          result = !!func(...Object.values(dataContext));
        } catch (e) { /* ignore */ }
        if (result) {
          delete node.attrs['atom-if'];
          return node;
        } else {
          return '';
        }
      });
      return tree;
    };
  }
  
  _createAddComponentIdPlugin(componentId) {
    return (tree) => {
      let rootNodeFound = false;
      tree.walk((node) => {
        if (!rootNodeFound && typeof node === 'object' && node.tag) {
          node.attrs = node.attrs || {};
          node.attrs['data-component-id'] = componentId;
          rootNodeFound = true;
        }
        return node;
      });
      return tree;
    };
  }
}

module.exports = { Renderer };