// tests/request-handler.test.js
const path = require('path');
const http = require('http');
const { Readable } = require('stream');
const fs = require('fs/promises');
const esbuild = require('esbuild');

const { RequestHandler } = require('../packages/axle-llm/core/request-handler');
const { ConnectorManager } = require('../packages/axle-llm/core/connector-manager');
const { AssetLoader } = require('../packages/axle-llm/core/asset-loader');
const { Renderer } = require('../packages/axle-llm/core/renderer');

function log(message, data) {
    console.log(`\n[LOG] ${message}`);
    if (data !== undefined) console.log(JSON.stringify(data, null, 2));
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

function createMockHttp(method, url, headers = {}, body = '') {
    const req = Readable.from(JSON.stringify(body));
    req.method = method;
    req.url = url;
    req.headers = { host: 'localhost:3000', 'content-type': 'application/json', ...headers };
    
    const res = new http.ServerResponse(req);
    const chunks = [];
    
    const resultPromise = new Promise((resolve) => {
        res.on('finish', () => {
            resolve({
                statusCode: res.statusCode,
                headers: res.getHeaders(),
                body: Buffer.concat(chunks).toString('utf8')
            });
        });
        const originalEnd = res.end;
        res.end = (chunk, encoding, cb) => {
             if(chunk) chunks.push(Buffer.from(chunk || ''));
             originalEnd.call(res, chunk, encoding, cb);
        };
    });
    
    return { req, res, resultPromise };
}

async function setupEnvironment(appPath) {
    const manifest = require(path.join(appPath, 'manifest.js'));
    const connectorManager = new ConnectorManager(appPath, manifest);
    await connectorManager.init();
    const assetLoader = new AssetLoader(appPath, manifest);
    const renderer = new Renderer(assetLoader, manifest, appPath); 
    const requestHandler = new RequestHandler(manifest, connectorManager, assetLoader, renderer, appPath);
    await requestHandler.init(); 
    return { requestHandler, manifest };
}

module.exports = {
    'RequestHandler: Should handle a view request and an action request': {
        options: {
            manifest: {
                launch: { title: "Handler Test" },
                components: { 'mainLayout': {}, 'testPage': {} },
                connectors: { 'counter': { type: 'in-memory', initialState: { value: 10 } } },
                routes: {
                    'GET /': { type: 'view', layout: 'mainLayout', reads: ['counter'] },
                    'POST /action/increment': { 
                        type: 'action', 
                        reads: ['counter'], 
                        writes: ['counter'],
                        update: 'testPage',
                        steps: [{ "set": "data.counter.value", "to": "data.counter.value + 1" }]
                    }
                },
                bridge: {}
            },
            files: {
                'app/components/main-layout.jsx': `
                    import React from 'react';
                    export default function MainLayout({ data }) {
                        return <div>Counter is {data.counter.value}</div>;
                    }`
            }
        },
        async run(appPath) {
            const componentsDir = path.join(appPath, 'app', 'components');
            const outDir = path.join(appPath, '.axle-build');
            await fs.mkdir(outDir, { recursive: true });
            await esbuild.build({
                entryPoints: { 'mainLayout': path.join(componentsDir, 'main-layout.jsx') },
                outdir: outDir,
                platform: 'node',
                format: 'cjs',
                bundle: true, external: ['react'], jsx: 'transform',
                jsxFactory: 'React.createElement'
            });

            const { requestHandler } = await setupEnvironment(appPath);

            log('--- Testing: GET / (View Request) ---');
            let { req, res, resultPromise } = createMockHttp('GET', '/');
            await requestHandler.handle(req, res);
            let response = await resultPromise;
            
            check(response.statusCode === 200, 'Should return 200 for a valid view route.');
            check(response.headers['content-type'].includes('text/html'), 'Content-Type should be text/html.');
            check(response.body.includes('Counter is 10'), 'Rendered HTML should contain the initial data.', response.body);

            log('--- Testing: POST /action/increment (Action Request) ---');
            ({ req, res, resultPromise } = createMockHttp('POST', '/action/increment', {}, {}));
            await requestHandler.handle(req, res);
            response = await resultPromise;

            check(response.statusCode === 200, 'Should return 200 for a valid action route.');
            check(response.headers['content-type'].includes('application/json'), 'Content-Type should be application/json.');
            
            const payload = JSON.parse(response.body);
            log('Action response payload:', payload);

            check(payload.update === 'testPage', 'Update payload should target the correct component.');
            check(payload.props.data.counter.value === 11, 'Action should have incremented the counter value in the response props.');
        }
    }
};