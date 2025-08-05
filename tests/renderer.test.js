// tests/renderer.test.js

const path = require('path');
const fs = require('fs');
const React = require('react');
const util = require('util');

const { Renderer } = require('../packages/axle-llm/core/renderer');
const { AssetLoader } = require('../packages/axle-llm/core/asset-loader');
const { ConnectorManager } = require('../packages/axle-llm/core/connector-manager');
const { loadManifest } = require('../packages/axle-llm/core/config-loader');
const esbuild = require('esbuild');

// --- Test Utilities ---
function log(message, data) {
    console.log(`\n[Test-LOG] ${message}`);
    if (data !== undefined) {
        console.log(util.inspect(data, { depth: 5, colors: true }));
    }
}

function check(condition, description, actual) {
    if (condition) {
        console.log(`  ✅ OK: ${description}`);
    } else {
        console.error(`  ❌ FAILED: ${description}`);
        if (actual !== undefined) console.error('     ACTUAL VALUE:', util.inspect(actual, { depth: 5, colors: true }));
        throw new Error(`Assertion failed: ${description}`);
    }
}

async function setupRendererTest(appPath) {
    log('Setting up test environment at:', appPath);
    const componentsDir = path.join(appPath, 'app', 'components');
    const outDir = path.join(appPath, '.axle-build');
    
    if (fs.existsSync(componentsDir)) {
      const entryPoints = (await fs.promises.readdir(componentsDir))
        .filter(f => f.endsWith('.jsx'))
        .reduce((acc, file) => {
            const baseName = path.basename(file, '.jsx');
            const camelCaseName = baseName.replace(/-(\w)/g, (_, char) => char.toUpperCase());
            acc[camelCaseName] = path.join(componentsDir, file);
            return acc;
        }, {});

      log('Found JSX entry points:', entryPoints);

      if (Object.keys(entryPoints).length > 0) {
        if (!fs.existsSync(outDir)) await fs.promises.mkdir(outDir, { recursive: true });
        
        log('Compiling JSX components with esbuild...');
        await esbuild.build({
            entryPoints,
            outdir: outDir,
            platform: 'node',
            format: 'cjs',
            bundle: true,
            external: ['react'],
            jsx: 'transform',
            jsxFactory: 'React.createElement',
            jsxFragment: 'React.Fragment'
        });
        log('JSX compilation complete.');
      }
    }

    log('Loading manifest...');
    const manifest = loadManifest(appPath);
    log('Initializing ConnectorManager...');
    const connectorManager = new ConnectorManager(appPath, manifest);
    await connectorManager.init();
    log('Initializing AssetLoader...');
    const assetLoader = new AssetLoader(appPath, manifest);
    log('Initializing Renderer...');
    const renderer = new Renderer(assetLoader, manifest, appPath);
    return { manifest, renderer, connectorManager };
}

module.exports = {
    'Renderer: Should render a full view with layout and injected components': {
        options: {
            manifest: {
                launch: { title: 'Test App' },
                connectors: { appState: { type: 'in-memory', initialState: { theme: 'dark' } } },
                components: { 
                    'mainLayout': {}, 
                    'header': {}, 
                    'homePage': {} 
                },
                routes: { 
                    'GET /': { type: 'view', layout: 'mainLayout', reads: ['appState'], inject: { header: 'header', pageContent: 'homePage' } } 
                }
            },
            files: {
                'app/components/main-layout.jsx': `
                    import React from 'react';
                    export default function MainLayout(props) {
                        const { header: HeaderComponent, pageContent: PageComponent } = props.components || {};
                        return (
                            <div id="layout">
                                <h1>Layout Theme: {props.data.appState.theme}</h1>
                                {HeaderComponent && <HeaderComponent {...props} />}
                                {PageComponent && <PageComponent {...props} />}
                            </div>
                        );
                    }`,
                'app/components/header.jsx': `
                    import React from 'react';
                    export default function Header({ user }) {
                        return <header>Welcome, {user ? user.name : 'USER_NOT_FOUND'}</header>;
                    }`,
                'app/components/home-page.jsx': `
                    import React from 'react';
                    export default function HomePage() {
                        return <main>Home Page Content</main>;
                    }`
            }
        },
        async run(appPath) {
            log('Starting test: "Should render a full view..."');
            const { manifest, renderer, connectorManager } = await setupRendererTest(appPath);
            const routeConfig = manifest.routes['GET /'];
            const connectorData = await connectorManager.getContext(routeConfig.reads);
            const fullDataContext = { ...connectorData, user: { name: 'Alice' } };
            
            const html = await renderer.renderView(routeConfig, fullDataContext, { pathname: '/', query: {} });

            log('Rendered View HTML:', html);
            check(html.includes('<title>Test App</title>'), 'Should render the correct page title.');
            
            const headerRegex = /<header>Welcome,.*Alice<\/header>/;
            check(headerRegex.test(html), 'Should render the injected header with correct user prop.', html);

            // ★★★ КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ ★★★
            // Используем регулярное выражение, чтобы игнорировать комментарии и пробелы
            const contentRegex = /<h1>Layout Theme:.*dark<\/h1>/;
            check(contentRegex.test(html), 'Should render data from regular connectors.', html);
            // ★★★ КОНЕЦ ИСПРАВЛЕНИЯ ★★★

            check(html.includes('<main>Home Page Content</main>'), 'Should render the injected page content.');
            check(html.includes('window.__INITIAL_DATA__ = {"appState":{"theme":"dark"}}'), 'Should correctly serialize only connector data to the client script.');
        }
    }
};