// tests/validator.test.js

const path = require('path');

// Путь к нашему валидатору внутри движка
const validateManifest = require('../packages/axle-llm/core/validator');

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
    'Validator: A valid manifest should pass': {
        options: {
            manifest: {
                launch: {},
                components: { main: 'main.html' },
                connectors: { db: { type: 'in-memory', initialState: {} } },
                routes: { 'GET /': { type: 'view', layout: 'main', reads: ['db'] } },
                bridge: {}
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
                    db: { initialState: {} }
                },
                routes: {},
                bridge: {}
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
                    'GET /': { type: 'view', layout: 'myComponant' } 
                },
                bridge: {}
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
    },

    'Validator: Component schema should fail if a required connector is missing in route reads': {
        options: {
            manifest: {
                launch: {},
                connectors: { 'user-data': { type: 'in-memory' } }, // Нет initialState -> будет warning
                components: {
                    'layout': 'layout.html',
                    'profile': {
                        template: 'profile.html',
                        schema: {
                            requires: ['user-data']
                        }
                    }
                },
                routes: {
                    'GET /profile': {
                        type: 'view',
                        layout: 'layout',
                        reads: [], 
                        inject: { 'content': 'profile' }
                    }
                },
                bridge: {}
            },
            files: {
                'app/components/layout.html': '<div><atom-inject into="content"></atom-inject></div>',
                'app/components/profile.html': '<h1>{{ data.user-data.name }}</h1>'
            }
        },
        async run(appPath) {
            const manifest = require(path.join(appPath, 'manifest.js'));
            log('Running validation for a route missing a required connector...');
            const issues = validateManifest(manifest, appPath);
            log('Validation issues found:', issues);
            
            check(issues.length > 0, 'Expected at least one validation issue.');

            // ★★★ НАЧАЛО КЛЮЧЕВОГО ИСПРАВЛЕНИЯ ★★★
            // Ищем конкретную ошибку, а не просто берем первую
            const schemaError = issues.find(issue => 
                issue.level === 'error' && 
                issue.message.includes("requires connector 'user-data'")
            );
            
            check(schemaError, 'An error about the missing connector should be found.');
            if (schemaError) {
                check(schemaError.category.includes('GET /profile'), 'The issue should be related to the correct route.');
                check(
                    schemaError.message.includes("Component 'profile' requires connector 'user-data'"),
                    'The error message should correctly identify the component and the missing connector.',
                    schemaError.message
                );
            }
            // ★★★ КОНЕЦ КЛЮЧЕВОГО ИСПРАВЛЕНИЯ ★★★
        }
    },

    'Validator: Component schema should pass if all required connectors are present': {
        options: {
            manifest: {
                launch: {},
                connectors: { 'user-data': { type: 'in-memory', initialState: {} } },
                components: {
                    'layout': {
                        template: 'layout.html',
                        schema: { requires: ['user-data'] } 
                    }
                },
                routes: {
                    'GET /': {
                        type: 'view',
                        layout: 'layout',
                        reads: ['user-data']
                    }
                },
                bridge: {}
            },
            files: {
                'app/components/layout.html': '<h1>{{ data.user-data.name }}</h1>'
            }
        },
        async run(appPath) {
            const manifest = require(path.join(appPath, 'manifest.js'));
            log('Running validation for a route with a correctly provided connector...');
            const issues = validateManifest(manifest, appPath);
            log('Validation issues found:', issues);

            check(issues.length === 0, 'Expected zero issues for a correctly configured route.');
        }
    }
};