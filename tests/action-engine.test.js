// tests/action-engine.test.js

const path = require('path');
const { ActionEngine } = require('../packages/axle-llm/core/action-engine');
const { AssetLoader } = require('../packages/axle-llm/core/asset-loader');

function log(message, data) {
    console.log(`\n[LOG] ${message}`);
    if (data !== undefined) {
        const replacer = (key, value) =>
            typeof value === 'bigint' ? value.toString() : value;
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

module.exports = {
    'ActionEngine: Step "set" should correctly modify context': {
        options: {},
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

    'ActionEngine: Step "run:set" should execute a handler and set its return value': {
        options: {
            manifest: {},
            files: {
                'app/actions/formatName.js': `module.exports = (firstName, lastName) => { return \`\${lastName}, \${firstName}\`; };`
            }
        },
        async run(appPath) {
            const manifest = require(path.join(appPath, 'manifest.js'));
            const assetLoader = new AssetLoader(appPath, manifest);
            const initialContext = { data: { user: { first: 'John', last: 'Doe' } } };
            const engine = new ActionEngine(initialContext, appPath, assetLoader, null);
            const steps = [
                { "run:set": "data.user.formattedName", "handler": "formatName", "with": "[data.user.first, data.user.last]" }
            ];
            await engine.run(steps);
            const finalContext = engine.context;
            log('Final context for run:set test:', finalContext);
            check(finalContext.data.user.formattedName === 'Doe, John', 'Should correctly format name using multiple arguments.');
        }
    },

    'ActionEngine: Step "bridge:call" with "await" should pause execution': {
        options: { manifest: { bridge: { dialogs: { showOpenDialog: true } } } },
        async run(appPath) {
            const initialContext = { data: {}, context: {}, _internal: {} };
            const engine = new ActionEngine(initialContext, appPath, null, null);
            const awaitableStep = {
                "bridge:call": {
                    "api": "dialogs.showOpenDialog",
                    "await": true,
                    "resultTo": "context.openResult"
                }
            };
            const steps = [
                { "set": "context.status", "to": "'started'" },
                awaitableStep,
                { "set": "context.status", "to": "'finished'" } 
            ];
            await engine.run(steps);
            const finalContext = engine.context;
            log('Final context after awaitable call:', finalContext);
            
            check(finalContext.context.status === 'started', 'Execution should stop after the awaitable call.');
            check(finalContext._internal.interrupt === true, 'Interrupt flag should be set to true.');
            check(finalContext._internal.awaitingBridgeCall, 'awaitingBridgeCall object should be set.');
            check(finalContext._internal.awaitingBridgeCall.details.api === 'dialogs.showOpenDialog', 'Awaiting call details should be correct.');
            check(finalContext._internal.awaitingBridgeCall.resultTo === 'context.openResult', 'Awaiting call result path should be correct.');
            check(JSON.stringify(finalContext._internal.lastStep) === JSON.stringify(awaitableStep), 'The last executed step should be the awaitable one.');
        }
    }
};