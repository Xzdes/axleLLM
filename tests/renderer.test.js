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
        .map(f => path.join(componentsDir, f));

      log('Found JSX entry points:', entryPoints);

      if (entryPoints.length > 0) {
        if (!fs.existsSync(outDir)) await fs.promises.mkdir(outDir, { recursive: true });
        
        log('Compiling JSX components with esbuild...');
        await esbuild.build({
            entryPoints,
            outdir: outDir,
            platform: 'node',
            format: 'cjs',
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
                connectors: { user: { type: 'in-memory', initialState: { name: 'Alice' } } },
                components: { 'main-layout': {}, 'header': {}, 'home-page': {} },
                routes: { 'GET /': { type: 'view', layout: 'main-layout', reads: ['user'], inject: { header: 'header', pageContent: 'home-page' } } }
            },
            files: {
                'app/components/main-layout.jsx': `
                    import React from 'react';
                    const util = require('util');
                    export default function MainLayout(props) {
                        console.log('--- PROPS INSIDE MainLayout ---', util.inspect(Object.keys(props), { colors: true }));
                        const { header: HeaderComponent, pageContent: PageComponent } = props.components;
                        return (
                            <div id="layout">
                                <h1>Layout</h1>
                                {HeaderComponent && <HeaderComponent {...props} />}
                                {PageComponent && <PageComponent {...props} />}
                            </div>
                        );
                    }`,
                'app/components/header.jsx': `
                    import React from 'react';
                    const util = require('util');
                    export default function Header(props) {
                        console.log('--- PROPS INSIDE Header ---', util.inspect(props, { depth: 3, colors: true }));
                        const { data } = props;
                        return <header>Welcome, {data && data.user ? data.user.name : 'USER_NOT_FOUND'}</header>;
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
            const dataContext = await connectorManager.getContext(routeConfig.reads);
            const html = await renderer.renderView(routeConfig, dataContext, null);
            log('Rendered View HTML:', html);
            
            check(html.includes('<title>Test App</title>'), 'Should render the correct page title.');
            
            const headerRegex = /<header>Welcome,.*Alice<\/header>/;
            check(headerRegex.test(html), 'Should render the injected header with correct props.', html);

            check(html.includes('<main>Home Page Content</main>'), 'Should render the injected page content.');
        }
    },

    'Renderer: Should correctly include component styles and theme variables': {
        options: {
            manifest: {
                launch: { title: 'Styled App' },
                themes: { default: { '--main-color': 'blue' } },
                connectors: {},
                components: { 'main-layout': { style: 'main.css' }, 'card': { style: 'card.css' } },
                routes: { 'GET /': { type: 'view', layout: 'main-layout', inject: { pageContent: 'card' } } }
            },
            files: {
                'app/components/main-layout.jsx': `
                    import React from 'react';
                    export default function MainLayout(props) {
                        const { pageContent: PageContentComponent } = props.components;
                        return <div>{PageContentComponent && <PageContentComponent {...props} />}</div>;
                    }`,
                'app/components/card.jsx': `
                    import React from 'react';
                    export default function Card() {
                        return <div className="card">Card</div>
                    }`,
                'app/components/main.css': `body { font-family: sans-serif; }`,
                'app/components/card.css': `.card { color: var(--main-color); }`
            }
        },
        async run(appPath) {
            log('Starting test: "Should correctly include component styles..."');
            const { manifest, renderer } = await setupRendererTest(appPath);
            const html = await renderer.renderView(manifest.routes['GET /'], {}, null);
            log('Rendered Styled HTML:', html);
            
            check(html.includes('<style id="axle-theme-variables">'), 'Should include the theme variables style tag.');
            check(html.includes('--main-color: blue;'), 'Should include the correct theme variable.');
        }
    }
};