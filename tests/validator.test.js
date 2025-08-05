// tests/validator.test.js

const path = require('path');
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
                components: { 'mainLayout': { template: 'main-layout.jsx' } },
                connectors: { db: { type: 'in-memory', initialState: {} } },
                routes: { 'GET /': { type: 'view', layout: 'mainLayout', reads: ['db'] } },
                bridge: {}
            },
            files: {
                'app/components/main-layout.jsx': '<div>Hello</div>'
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

    'Validator: Component with camelCase name should require a kebab-case .jsx file': {
        options: {
            manifest: {
                launch: {},
                components: { 'mySuperComponent': {} },
                connectors: {},
                routes: { 'GET /': { type: 'view', layout: 'mySuperComponent' } },
                bridge: {}
            },
            files: {
                // Файл не создаем намеренно
            }
        },
        async run(appPath) {
            const manifest = require(path.join(appPath, 'manifest.js'));
            log('Running validation for component file existence...');
            const issues = validateManifest(manifest, appPath);
            log('Validation issues found:', issues);
            const fileIssue = issues.find(i => i.category === `Component 'mySuperComponent'`);
            check(fileIssue, 'Should find an issue for the missing component file.');
            check(fileIssue.message.includes(`component source file 'my-super-component.jsx'`), 'Error message should mention the expected kebab-case file name.', fileIssue.message);
        }
    },

    'Validator: Component schema should fail if a required connector is missing in route reads': {
        options: {
            manifest: {
                launch: {},
                connectors: { 'userData': { type: 'in-memory', initialState: {} } },
                components: {
                    'layout': { template: 'layout.jsx' },
                    'profilePage': {
                        template: 'profile-page.jsx',
                        schema: { requires: ['userData'] }
                    }
                },
                routes: {
                    'GET /profile': {
                        type: 'view',
                        layout: 'layout',
                        reads: [], // Намеренно не предоставляем 'userData'
                        inject: { 'pageContent': 'profilePage' }
                    }
                },
                bridge: {}
            },
            files: {
                'app/components/layout.jsx': '<div></div>',
                'app/components/profile-page.jsx': '<h1>{{ data.userData.name }}</h1>'
            }
        },
        async run(appPath) {
            const manifest = require(path.join(appPath, 'manifest.js'));
            log('Running validation for a route missing a required connector...');
            const issues = validateManifest(manifest, appPath);
            log('Validation issues found:', issues);
            
            const schemaError = issues.find(issue => 
                issue.level === 'error' && 
                issue.message.includes("requires connector 'userData'")
            );
            
            check(schemaError, 'An error about the missing connector should be found.');
            if (schemaError) {
                check(schemaError.category.includes('GET /profile'), 'The issue should be related to the correct route.');
                check(
                    schemaError.message.includes("Component 'profilePage' requires connector 'userData'"),
                    'The error message should correctly identify the component and the missing connector.',
                    schemaError.message
                );
            }
        }
    },
};