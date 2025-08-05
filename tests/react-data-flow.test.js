// tests/react-data-flow.test.js

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

async function setupReactTest(appPath) {
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

      if (Object.keys(entryPoints).length > 0) {
        if (!fs.existsSync(outDir)) await fs.promises.mkdir(outDir, { recursive: true });
        
        await esbuild.build({
            entryPoints,
            outdir: outDir,
            platform: 'node', format: 'cjs', bundle: true,
            external: ['react'], jsx: 'transform',
            jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment'
        });
      }
    }

    const manifest = loadManifest(appPath);
    const connectorManager = new ConnectorManager(appPath, manifest);
    await connectorManager.init();
    const assetLoader = new AssetLoader(appPath, manifest);
    const renderer = new Renderer(assetLoader, manifest, appPath);
    return { manifest, renderer, connectorManager };
}

module.exports = {
    'React Integration: Should correctly render all data types and boundary cases': {
        options: {
            manifest: {
                launch: { title: "React Stress Test" },
                globals: { appName: "StressTestApp" },
                connectors: { 
                    boundaryData: { 
                        type: 'in-memory', 
                        initialState: {
                            string: 'Simple String',
                            number: 123.45,
                            bool_true: true,
                            bool_false: false,
                            val_null: null,
                            val_undefined: undefined,
                            empty_obj: {},
                            empty_arr: [],
                            special_chars: 'String with "quotes" and \\slashes\\',
                            nested_obj: { level1: { level2: 'Deep Value' } },
                            arr_of_obj: [ { id: 1, name: 'Item 1'}, { id: 2, name: 'Item 2'} ]
                        } 
                    } 
                },
                components: { 
                    'mainLayout': {}, 
                    'stressTestPage': { schema: { requires: ['boundaryData'] } }
                },
                routes: { 
                    'GET /': { 
                        type: 'view', 
                        layout: 'mainLayout', 
                        reads: ['boundaryData'], 
                        inject: { 'pageContent': 'stressTestPage' } 
                    } 
                }
            },
            files: {
                'app/components/main-layout.jsx': `
                    import React from 'react';
                    export default function MainLayout(props) {
                        const { pageContent: PageComponent } = props.components || {};
                        return <div id="layout-wrapper">{PageComponent && <PageComponent {...props} />}</div>;
                    }`,
                'app/components/stress-test-page.jsx': `
                    import React from 'react';
                    export default function StressTestPage({ globals, user, data }) {
                        const d = data.boundaryData || {};
                        return (
                            <div>
                                <h1 data-testid="global-appName">{globals.appName}</h1>
                                <h2 data-testid="user-name">User: {user.name}</h2>
                                
                                <div data-testid="string-test">{d.string}</div>
                                <div data-testid="number-test">{d.number}</div>
                                
                                {d.bool_true && <div data-testid="bool-true-test">Conditional Block Rendered</div>}
                                {d.bool_false && <div data-testid="bool-false-test">THIS SHOULD NOT RENDER</div>}
                                
                                <div data-testid="null-test">{d.val_null}</div>
                                <div data-testid="undefined-test">{d.val_undefined}</div>
                                <div data-testid="empty-obj-test">{JSON.stringify(d.empty_obj)}</div>
                                <div data-testid="empty-arr-test">{JSON.stringify(d.empty_arr)}</div>
                                
                                <div data-testid="special-chars-test">{d.special_chars}</div>
                                <div data-testid="nested-obj-test">{d.nested_obj.level1.level2}</div>
                                
                                <ul data-testid="array-loop-test">
                                    {d.arr_of_obj.map(item => <li key={item.id}>{item.name}</li>)}
                                </ul>
                            </div>
                        );
                    }`
            }
        },
        async run(appPath) {
            log('Starting React data flow stress test...');
            const { manifest, renderer, connectorManager } = await setupReactTest(appPath);
            const routeConfig = manifest.routes['GET /'];
            const connectorData = await connectorManager.getContext(routeConfig.reads);
            const fullDataContext = { ...connectorData, user: { name: 'TestUser' } };
            
            const html = await renderer.renderView(routeConfig, fullDataContext, {});

            log('Rendered Stress Test HTML:', html);
            
            // --- Assertions ---
            check(html.includes('<h1 data-testid="global-appName">StressTestApp</h1>'), 'Should render globals correctly.');
            check(html.includes('<h2 data-testid="user-name">User: <!-- -->TestUser</h2>'), 'Should render user data correctly.');
            check(html.includes('<div data-testid="string-test">Simple String</div>'), 'Should render a simple string.');
            check(html.includes('<div data-testid="number-test">123.45</div>'), 'Should render a number.');
            check(html.includes('<div data-testid="bool-true-test">Conditional Block Rendered</div>'), 'Should render content based on a true boolean.');
            check(!html.includes('THIS SHOULD NOT RENDER'), 'Should NOT render content based on a false boolean.');
            check(html.match(/<div data-testid="null-test"><\/div>/), 'Should render null as an empty element.');
            check(html.match(/<div data-testid="undefined-test"><\/div>/), 'Should render undefined as an empty element.');
            check(html.includes('<div data-testid="empty-obj-test">{}</div>'), 'Should render an empty object.');
            check(html.includes('<div data-testid="empty-arr-test">[]</div>'), 'Should render an empty array.');
            
            // ★★★ КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ ★★★
            // Проверяем строку с УЧЕТОМ экранирования HTML
            check(html.includes('<div data-testid="special-chars-test">String with &quot;quotes&quot; and \\slashes\\</div>'), 'Should handle special characters correctly by HTML-escaping them.');
            // ★★★ КОНЕЦ ИСПРАВЛЕНИЯ ★★★

            check(html.includes('<div data-testid="nested-obj-test">Deep Value</div>'), 'Should access and render nested object properties.');
            check(html.includes('<li>Item 1</li><li>Item 2</li>'), 'Should loop over an array of objects and render them.');
            check(html.includes('window.__INITIAL_DATA__'), 'Final HTML should contain the initial data script.');
        }
    }
};