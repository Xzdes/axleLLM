// tests/action-engine.test.js

const path = require('path');

// Пути к модулям ядра
const { ActionEngine } = require('../packages/axle-llm/core/action-engine');
const { AssetLoader } = require('../packages/axle-llm/core/asset-loader');
const { RequestHandler } = require('../packages/axle-llm/core/request-handler');
const { ConnectorManager } = require('../packages/axle-llm/core/connector-manager');
const { Renderer } = require('../packages/axle-llm/core/renderer');

// ★★★ КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ ЗДЕСЬ ★★★
// "Обучаем" нашу лог-функцию работать с BigInt.
function log(message, data) {
    console.log(`\n[LOG] ${message}`);
    if (data !== undefined) {
        const replacer = (key, value) =>
            typeof value === 'bigint' ? value.toString() : value;
        console.log(JSON.stringify(data, replacer, 2));
    }
}
// ★★★ КОНЕЦ ИСПРАВЛЕНИЯ ★★★

function check(condition, description, actual) {
    if (condition) {
        console.log(`  ✅ OK: ${description}`);
    } else {
        console.error(`  ❌ FAILED: ${description}`);
        if (actual !== undefined) console.error('     ACTUAL VALUE:', actual);
        throw new Error(`Assertion failed: ${description}`);
    }
}

module.exports = {
    'ActionEngine: Step "set" should correctly modify context': {
        options: {}, // Файлы не нужны, тест работает в памяти
        async run(appPath) {
            const initialContext = { data: { cart: { items: [], total: 0 } } };
            const engine = new ActionEngine(initialContext, appPath, null, null);

            const steps = [
                { "set": "data.cart.total", "to": "150.50" },
                { "set": "context.newItem", "to": "{ id: 1, name: 'Product' }" },
                { "set": "data.cart.items", "to": "data.cart.items.concat([context.newItem])" }
            ];

            await engine.run(steps);
            const finalContext = engine.context;
            log('Final context:', finalContext);
            
            check(finalContext.data.cart.total === 150.50, 'Step "set" should assign a simple value.');
            check(finalContext.data.cart.items.length === 1, 'Step "set" should add an item to an array.');
            check(finalContext.data.cart.items[0].name === 'Product', 'The added item should be correct.');
        }
    },

    'ActionEngine: Step "if/then/else" should work correctly': {
        options: {},
        async run(appPath) {
            const initialContext = { data: { user: { role: 'guest' } } };
            const engine = new ActionEngine(initialContext, appPath, null, null);

            const steps = [{
                "if": "data.user.role === 'admin'",
                "then": [{ "set": "context.access", "to": "'granted'" }],
                "else": [{ "set": "context.access", "to": "'denied'" }]
            }];

            await engine.run(steps);
            const finalContext = engine.context;
            log('Final context:', finalContext);
            
            check(finalContext.context.access === 'denied', 'The "else" block should be executed when condition is false.');
        }
    },

    'ActionEngine: Step "run" should execute an external action file': {
        options: {
            manifest: {},
            files: {
                'app/actions/myTestAction.js': `module.exports = (ctx, body) => { ctx.data.sum = body.a + body.b; };`
            }
        },
        async run(appPath) {
            const manifest = require(path.join(appPath, 'manifest.js'));
            const assetLoader = new AssetLoader(appPath, manifest);
            const initialContext = { data: {}, body: { a: 5, b: 10 } };
            const engine = new ActionEngine(initialContext, appPath, assetLoader, null);

            const steps = [{ "run": "myTestAction" }];
            await engine.run(steps);
            const finalContext = engine.context;
            log('Final context:', finalContext);
            
            check(finalContext.data.sum === 15, 'Step "run" should execute code from an external file and modify context.');
        }
    },

    'ActionEngine: Step "action:run" should call another action': {
        options: {
            manifest: {
                routes: {
                    "calculateTotal": {
                        "type": "action", "internal": true,
                        "steps": [{ "set": "data.cart.total", "to": "data.cart.items.reduce((sum, item) => sum + item.price, 0)" }]
                    },
                    "POST /addItem": {
                        "type": "action",
                        "steps": [
                            { "set": "data.cart.items", "to": "data.cart.items.concat([{ price: body.price }])" },
                            { "action:run": { "name": "calculateTotal" } }
                        ]
                    }
                }
            }
        },
        async run(appPath) {
            const manifest = require(path.join(appPath, 'manifest.js'));
            const connectorManager = new ConnectorManager(appPath, manifest);
            await connectorManager.init();
            const assetLoader = new AssetLoader(appPath, manifest);
            const renderer = new Renderer(assetLoader, manifest, connectorManager);
            const requestHandler = new RequestHandler(manifest, connectorManager, assetLoader, renderer, appPath);

            const initialContext = {
                data: { cart: { items: [{ price: 100 }], total: 100 } },
                body: { price: 50 }
            };
            
            const engine = new ActionEngine(initialContext, appPath, assetLoader, requestHandler);

            const routeConfig = manifest.routes['POST /addItem'];
            await engine.run(routeConfig.steps);
            const finalContext = engine.context;
            log('Final context:', finalContext);

            check(finalContext.data.cart.items.length === 2, 'The parent action should add an item to the cart.');
            check(finalContext.data.cart.total === 150, 'The internal action "calculateTotal" should have recalculated the total correctly.');
        }
    }
};