// tests/renderer.test.js

const path = require('path');

const { Renderer } = require('../packages/axle-llm/core/renderer');
const { AssetLoader } = require('../packages/axle-llm/core/asset-loader');
const { ConnectorManager } = require('../packages/axle-llm/core/connector-manager');

function log(message, data) {
    console.log(`\n[LOG] ${message}`);
    if (data !== undefined) {
        const replacer = (key, value) => typeof value === 'bigint' ? value.toString() : value;
        console.log(JSON.stringify(data, replacer, 2));
    }
}
function check(condition, description, actual) {
    if (condition) {
        console.log(`  ✅ OK: ${description}`);
    } else {
        console.error(`  ❌ FAILED: ${description}`);
        if (actual !== undefined) console.error('     ACTUAL VALUE:', actual);
        throw new Error(`Assertion failed: ${description}`);
    }
}

async function setupEnvironment(appPath) {
    const manifest = require(path.join(appPath, 'manifest.js'));
    const connectorManager = new ConnectorManager(appPath, manifest);
    await connectorManager.init();
    const assetLoader = new AssetLoader(appPath, manifest);
    const renderer = new Renderer(assetLoader, manifest, connectorManager);
    return { manifest, renderer };
}

module.exports = {
    'Renderer: Basic variable rendering': {
        options: { manifest: { components: { 'hello': 'hello.html' } }, files: { 'app/components/hello.html': '<h1>Hello, {{name}}!</h1>' } },
        async run(appPath) {
            const { renderer } = await setupEnvironment(appPath);
            const { html } = await renderer.renderComponent('hello', { name: 'World' });
            log('Received HTML:', html);
            check(/<h1[^>]*>Hello, World!<\/h1>/.test(html), 'Rendered HTML should contain "<h1>Hello, World!</h1>"');
        }
    },
    'Renderer: atom-if with false condition should remove element': {
        options: { manifest: { components: { 'conditional': 'conditional.html' } }, files: { 'app/components/conditional.html': '<div><p atom-if="show">You should not see this.</p></div>' } },
        async run(appPath) {
            const { renderer } = await setupEnvironment(appPath);
            const { html } = await renderer.renderComponent('conditional', { show: false });
            log('Received HTML:', html);
            check(!html.includes('You should not see this'), 'Element with false atom-if condition should be removed.', html);
        }
    },
    'Renderer: atom-if with true condition should keep element and remove attribute': {
        options: { manifest: { components: { 'conditional': 'conditional.html' } }, files: { 'app/components/conditional.html': '<div><p atom-if="user.isAdmin">Welcome, Admin!</p></div>' } },
        async run(appPath) {
            const { renderer } = await setupEnvironment(appPath);
            const { html } = await renderer.renderComponent('conditional', { user: { isAdmin: true } });
            log('Received HTML:', html);
            check(html.includes('Welcome, Admin!'), 'Element with true atom-if condition should be kept.', html);
            check(!html.includes('atom-if'), 'The atom-if attribute itself should be removed.', html);
        }
    },
    'Renderer: Scoped CSS should be applied': {
        options: { manifest: { components: { 'card': { template: 'card.html', style: 'card.css' } } }, files: { 'app/components/card.html': '<div><h3>Title</h3></div>', 'app/components/card.css': ':host { border: 1px solid red; } h3 { color: blue; }' } },
        async run(appPath) {
            const { renderer } = await setupEnvironment(appPath);
            const { html, styles } = await renderer.renderComponent('card', {});
            log('Received HTML:', html); log('Received Styles:', styles);
            const componentIdMatch = html.match(/data-component-id="([^"]+)"/);
            check(componentIdMatch, 'HTML should have a data-component-id attribute.');
            const scopeSelector = `[data-component-id="${componentIdMatch[1]}"]`;
            const normalizedStyles = styles.replace(/\s+/g, ' ');
            check(normalizedStyles.includes(`${scopeSelector} { border: 1px solid red; }`), 'CSS rule for :host should be scoped.', normalizedStyles);
            check(normalizedStyles.includes(`${scopeSelector} h3`), 'CSS rule for h3 should be scoped.', normalizedStyles);
        }
    },

    'Renderer: View rendering should inject components and styles': {
        options: {
            manifest: {
                launch: {},
                components: {
                    'layout': 'layout.html',
                    'header': { template: 'header.html', style: 'header.css' },
                },
                routes: { 'GET /': { type: 'view', layout: 'layout', inject: { 'headerPlaceholder': 'header' } } }
            },
            files: {
                'app/components/layout.html': '<html><head></head><body><atom-inject into="headerPlaceholder"></atom-inject></body></html>',
                'app/components/header.html': '<header>My App</header>',
                'app/components/header.css': 'header { background: #eee; }',
            }
        },
        async run(appPath) {
            const { manifest, renderer } = await setupEnvironment(appPath);
            const finalHtml = await renderer.renderView(manifest.routes['GET /'], {}, null);
            log('Received final page HTML:', finalHtml);
            
            check(
                /<header[^>]*>My App<\/header>/.test(finalHtml), 
                'Header component should be injected into layout.'
            );
            
            check(
                /<style data-component-name="header">/.test(finalHtml), 
                'Style tag for header should be added to head.'
            );
        }
    },
    
    // ★★★ НОВЫЙ ТЕСТ ★★★
    'Renderer: Theming system should inject CSS variables into the root': {
        options: {
            manifest: {
                launch: {},
                components: { 'layout': 'layout.html' },
                routes: { 'GET /': { type: 'view', layout: 'layout' } },
                themes: {
                    default: {
                        "--main-color": "#336699",
                        "--font-size": "16px"
                    }
                }
            },
            files: {
                'app/components/layout.html': '<html><head></head><body>Page</body></html>',
            }
        },
        async run(appPath) {
            const { manifest, renderer } = await setupEnvironment(appPath);
            const finalHtml = await renderer.renderView(manifest.routes['GET /'], {}, null);
            log('Received final page HTML with theme:', finalHtml);

            check(
                finalHtml.includes('<style id="axle-theme-variables">'),
                'A style tag for theme variables should be present.'
            );
            check(
                finalHtml.includes(':root {'),
                'The style tag should contain a :root selector.'
            );
            check(
                finalHtml.includes('--main-color: #336699;'),
                'The CSS variable for main color should be correctly injected.'
            );
             check(
                finalHtml.includes('--font-size: 16px;'),
                'The CSS variable for font size should be correctly injected.'
            );
        }
    }
};