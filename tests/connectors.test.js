// tests/connectors.test.js

const path = require('path');

// Путь к нашему менеджеру коннекторов
const { ConnectorManager } = require('../packages/axle-llm/core/connector-manager');

// Вспомогательные функции
function log(message, data) {
    console.log(`\n[LOG] ${message}`);
    if (data !== undefined) {
        console.log(JSON.stringify(data, null, 2));
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
    'Connectors: in-memory connector should read initial state and write new data': {
        options: {
            manifest: {
                connectors: { 
                    viewState: { type: 'in-memory', initialState: { filter: 'none', query: '' } } 
                }
            }
        },
        async run(appPath) {
            const manifest = require(path.join(appPath, 'manifest.js'));
            const manager = new ConnectorManager(appPath, manifest);
            await manager.init();

            const connector = manager.getConnector('viewState');
            check(connector, 'Connector "viewState" should be initialized.');
            
            let currentState = await connector.read();
            check(currentState.filter === 'none', 'Initial state should match the one defined in manifest.');
            
            const newState = { filter: 'active', query: 'test' };
            await connector.write(newState);
            
            currentState = await connector.read();
            check(currentState.filter === 'active', 'Data should be updated in memory.');
            check(JSON.stringify(newState) === JSON.stringify(currentState), 'Read data should be equal to the written data.');
        }
    },

    'Connectors: wise-json connector should handle persistence': {
        options: {
            manifest: {
                connectors: {
                    products: { type: 'wise-json', collection: 'test_products' }
                }
            }
        },
        async run(appPath) {
            const manifest = require(path.join(appPath, 'manifest.js'));
            const newData = { items: [{ id: 1, name: 'Milk' }], total: 1 };
            
            // --- Фаза 1: Запись ---
            log('Phase 1: Writing data...');
            const manager1 = new ConnectorManager(appPath, manifest);
            await manager1.init();
            const connector1 = manager1.getConnector('products');
            await connector1.write(newData);

            // --- Фаза 2: Чтение в новом экземпляре ---
            log('Phase 2: Simulating app restart and reading data...');
            // Создаем НОВЫЙ менеджер, чтобы он ничего не знал о предыдущем.
            const manager2 = new ConnectorManager(appPath, manifest);
            await manager2.init();
            const connector2 = manager2.getConnector('products');
            const reloadedData = await connector2.read();
            
            log('Reloaded data:', reloadedData);
            check(reloadedData.items.length === 1, 'Data should be persisted to disk.');
            check(reloadedData.items[0].name === 'Milk', 'Persisted data should be correct.');
        }
    },

    'Connectors: wise-json connector should apply migrations on read': {
        options: {
            // Опции не нужны, мы создадим манифесты прямо в тесте
        },
        async run(appPath) {
            const oldData = { items: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob', status: 'active' }] };
            const oldManifest = { connectors: { users: { type: 'wise-json', collection: 'mig_users' } } };

            // --- Фаза 1: Записываем данные в "старом" формате ---
            log('Phase 1: Writing data with old schema...');
            const manager1 = new ConnectorManager(appPath, oldManifest);
            await manager1.init();
            await manager1.getConnector('users').write(oldData);
            
            // --- Фаза 2: Читаем данные с "новым" манифестом, содержащим правила миграции ---
            log('Phase 2: Reading data with new manifest containing migration rules...');
            const newManifest = {
                connectors: {
                    users: {
                        type: 'wise-json',
                        collection: 'mig_users',
                        migrations: [{ "if_not_exists": "status", "set": { "status": "pending" } }]
                    }
                }
            };
            const manager2 = new ConnectorManager(appPath, newManifest);
            await manager2.init();
            const migratedData = await manager2.getConnector('users').read();

            log('Migrated data:', migratedData);
            const alice = migratedData.items.find(u => u.id === 1);
            const bob = migratedData.items.find(u => u.id === 2);

            check(alice.status === 'pending', 'User Alice should have "status" field added by migration.');
            check(bob.status === 'active', 'User Bob\'s status should remain unchanged.');
        }
    }
};