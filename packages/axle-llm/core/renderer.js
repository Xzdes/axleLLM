// packages/axle-llm/core/renderer.js

const Mustache = require('./mustache');
const posthtml = require('posthtml');
const csstree = require('css-tree');

class Renderer {
  constructor(assetLoader, manifest, connectorManager) {
    this.assetLoader = assetLoader;
    this.manifest = manifest;
    this.connectorManager = connectorManager;
  }

  async renderView(routeConfig, dataContext, reqUrl) {
    const layoutName = routeConfig.layout;
    if (!layoutName) {
      throw new Error(`[Renderer] No layout specified for route.`);
    }

    const finalRenderContext = {
      ...dataContext,
      globals: this.manifest.globals || {},
      url: this._getUrlContext(reqUrl) 
    };

    const { html, styles } = await this._renderComponentRecursive(
      layoutName,
      finalRenderContext,
      routeConfig.inject || {}
    );

    let finalHtml = html;

    if (styles.length > 0) {
      const styleTags = styles.map(s => `<style data-component-name="${s.name}">${s.css}</style>`).join('\n');
      finalHtml = finalHtml.replace('</head>', `${styleTags}\n</head>`);
    }

    const clientScriptTag = `<script src="/engine-client.js"></script>`;
    finalHtml = finalHtml.replace('</body>', `${clientScriptTag}\n</body>`);

    return finalHtml;
  }

  async renderComponent(componentName, dataContext, reqUrl) {
    const finalRenderContext = {
      ...dataContext,
      globals: this.manifest.globals || {},
      url: this._getUrlContext(reqUrl)
    };
    
    const { html, styles } = await this._renderComponentRecursive(componentName, finalRenderContext, {});
    return {
      html,
      styles: styles.map(s => s.css).join('\n'),
      componentName
    };
  }

  async _renderComponentRecursive(componentName, dataContext, injectConfig) {
    const componentAsset = this.assetLoader.getComponent(componentName);
    if (!componentAsset) {
      throw new Error(`[Renderer] Component asset '${componentName}' not found.`);
    }

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

    const posthtmlPlugins = [
      this._createAtomIfPlugin(dataContext),
      this._createAddComponentIdPlugin(componentId)
    ];
    const result = await posthtml(posthtmlPlugins).process(html);
    html = result.html;

    return { html, styles: collectedStyles };
  }
  
  _getUrlContext(reqUrl) {
    if (!reqUrl) return { pathname: '/', query: {} };
    return {
      pathname: reqUrl.pathname,
      query: Object.fromEntries(reqUrl.searchParams)
    };
  }
  
  // ★★★ КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ ЗДЕСЬ (v4 - Финальная) ★★★
  _scopeCss(css, scopeId) {
    try {
        const ast = csstree.parse(css);
        const scopeAttr = `[data-component-id="${scopeId}"]`;
        
        csstree.walk(ast, {
            visit: 'Rule',
            enter: function(rule) {
                if (!rule.prelude || rule.prelude.type !== 'SelectorList') {
                    return;
                }

                // Преобразуем список селекторов в строку, обрабатываем и парсим обратно
                const originalSelectors = csstree.generate(rule.prelude);
                const scopedSelectors = originalSelectors.split(',')
                    .map(selectorString => {
                        const trimmedSelector = selectorString.trim();
                        if (trimmedSelector.startsWith(':host')) {
                            // Заменяем :host на наш атрибут
                            return trimmedSelector.replace(/:host/g, scopeAttr);
                        }
                        // Для всех остальных добавляем атрибут в начало
                        return `${scopeAttr} ${trimmedSelector}`;
                    })
                    .join(', ');

                // Заменяем старые селекторы на новые, обработанные
                rule.prelude = csstree.parse(scopedSelectors, { context: 'selectorList' });
            }
        });
        
        return csstree.generate(ast);
    } catch (e) {
        console.error(`[Renderer] Error scoping CSS for ${scopeId}:`, e);
        return css;
    }
  }

  _createAtomIfPlugin(dataContext) {
    return (tree) => {
      tree.match({ attrs: { 'atom-if': true } }, (node) => {
        const condition = node.attrs['atom-if'];
        let result = false;
        try {
          const func = new Function(...Object.keys(dataContext), `return ${condition};`);
          result = !!func(...Object.values(dataContext));
        } catch (e) {
          console.warn(`[Renderer] atom-if condition failed: "${condition}". Error: ${e.message}`);
          result = false;
        }
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

module.exports = {
  Renderer,
};