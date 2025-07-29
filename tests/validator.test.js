// tests/validator.test.js

const path = require('path');

// Путь к нашему валидатору внутри движка
const validateManifest = require('../packages/axle-llm/core/validator');

// Вспомогательные функции для логирования и проверки.
// Мы можем держать их в каждом тестовом файле для простоты.
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

// Экспортируем объект, где каждый ключ - это отдельный тестовый сценарий.
module.exports = {
    'Validator: A valid manifest should pass': {
        options: {
            manifest: {
                launch: {},
                components: { main: 'main.html' },
                connectors: { db: { type: 'in-memory', initialState: {} } },
                routes: { 'GET /': { type: 'view', layout: 'main', reads: ['db'] } }
            },
            files: {
                'app/components/main.html': '<div>Hello</div>'
            }
        },
        async run(appPath) {
            const manifest = require(path.join(appPath, 'manifest.js'));
            log('Running validation for a valid manifest...');
            const issues = validateManifest(manifest, appPath);
            log('Validation issues found:', issues);
            check(issues.length === 0, 'Expected 0 issues for a valid manifest.');
        }
    },

    'Validator: Missing required sections should fail': {
        options: {
            manifest: {
                // Специально "забываем" добавить 'routes' и 'launch'
                components: { main: 'main.html' },
                connectors: { db: { type: 'in-memory', initialState: {} } },
            },
            files: {} 
        },
        async run(appPath) {
            const manifest = require(path.join(appPath, 'manifest.js'));
            log('Running validation for a manifest with missing sections...');
            const issues = validateManifest(manifest, appPath);
            log('Validation issues found:', issues);
            check(issues.length > 0, 'Expected at least one issue.');
            check(
                issues.some(issue => issue.level === 'error' && issue.message.includes("'routes' is missing")),
                'Expected an error about the missing "routes" section.'
            );
        }
    },

    'Validator: Connector with missing type should fail': {
        options: {
            manifest: {
                launch: {},
                components: {},
                connectors: { 
                    db: { initialState: {} } // Специально "забываем" 'type'
                },
                routes: {}
            },
            files: {}
        },
        async run(appPath) {
            const manifest = require(path.join(appPath, 'manifest.js'));
            log('Running validation for a connector with no type...');
            const issues = validateManifest(manifest, appPath);
            log('Validation issues found:', issues);
            check(issues.length > 0, 'Expected at least one issue.');
            const issue = issues[0];
            check(issue.level === 'error', 'Issue level should be "error".');
            check(
                issue.message.includes("missing the required 'type' property"),
                'Error message should mention the missing "type" property.'
            );
        }
    },

    'Validator: Typo in component name should provide a suggestion': {
        options: {
            manifest: {
                launch: {},
                components: { myComponent: 'my.html' },
                connectors: {},
                routes: {
                    // Специально делаем опечатку 'myComponant' вместо 'myComponent'
                    'GET /': { type: 'view', layout: 'myComponant' } 
                }
            },
            files: {
                'app/components/my.html': '<div></div>'
            }
        },
        async run(appPath) {
            const manifest = require(path.join(appPath, 'manifest.js'));
            log('Running validation for a manifest with a typo...');
            const issues = validateManifest(manifest, appPath);
            log('Validation issues found:', issues);
            const relevantIssue = issues.find(issue => issue.category.includes('GET /'));
            check(relevantIssue, 'An issue for the route "GET /" should exist.');
            check(
                relevantIssue.suggestion.includes("Did you mean 'myComponent'?"),
                'Expected a suggestion for the typo.',
                relevantIssue.suggestion
            );
        }
    }
};