// tests/request-handler.test.js
const path = require('path');
const http = require('http');
const { Readable } = require('stream');

const { RequestHandler } = require('../packages/axle-llm/core/request-handler');
const { ConnectorManager } = require('../packages/axle-llm/core/connector-manager');
const { AssetLoader } = require('../packages/axle-llm/core/asset-loader');
const { Renderer } = require('../packages/axle-llm/core/renderer');
const { AuthEngine } = require('../packages/axle-llm/core/auth-engine');

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
    const renderer = new Renderer(assetLoader, manifest, connectorManager);
    const requestHandler = new RequestHandler(manifest, connectorManager, assetLoader, renderer, appPath);
    // Вручную вызываем init, так как полного цикла запуска нет
    await requestHandler.init(); 
    return { requestHandler };
}

module.exports = {
    'RequestHandler: Should correctly handle various request scenarios': {
        options: {
            manifest: {
                launch: {},
                components: { 'main': 'main.html' },
                connectors: {},
                routes: {
                    'GET /': { type: 'view', layout: 'main' },
                    'POST /action/doSomething': { type: 'action', steps: [] }
                }
            },
            files: {
                'app/components/main.html': '<div></div>'
            }
        },
        async run(appPath) {
            const { requestHandler } = await setupEnvironment(appPath);

            log('--- Testing: 404 Not Found ---');
            let { req, res, resultPromise } = createMockHttp('GET', '/nonexistent-page');
            await requestHandler.handle(req, res);
            let response = await resultPromise;
            log('Response:', response);
            check(response.statusCode === 404, 'Should return 404 for a route that does not exist.');

            log('--- Testing: Wrong Method ---');
            ({ req, res, resultPromise } = createMockHttp('POST', '/'));
            await requestHandler.handle(req, res);
            response = await resultPromise;
            log('Response:', response);
            check(response.statusCode === 404, 'Should return 404 for an existing route with the wrong method.');
        }
    }
};