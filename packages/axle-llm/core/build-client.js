// packages/axle-llm/core/build-client.js
const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const appPath = process.cwd();
const outDir = path.join(appPath, 'public');
// ★★★ Используем новую, правильную точку входа ★★★
const entryPoint = path.resolve(__dirname, '..', 'client', 'index.js'); 

async function runClientBuild() {
    const isWatchMode = process.argv.includes('--watch');
    console.log(`[axle-client-build] Starting client bundle build... ${isWatchMode ? '(watch mode)' : ''}`);

    try {
        await fs.promises.mkdir(outDir, { recursive: true });

        // Флаг, чтобы сигнал о завершении отправлялся только один раз в режиме --watch
        let isFirstBuild = true;

        const buildOptions = {
            entryPoints: [entryPoint],
            outfile: path.join(outDir, 'bundle.js'),
            bundle: true,
            platform: 'browser',
            format: 'iife', // Самовызывающаяся функция, чтобы не загрязнять глобальный scope
            sourcemap: true,
            define: { 'process.env.NODE_ENV': `"${isWatchMode ? 'development' : 'production'}"` },
            // Убираем все старые "хаки": inject, banner, footer.
            // Вся логика теперь находится в точке входа (entryPoint).
        };

        const onBuildEnd = (result) => {
            if (result.errors.length > 0) {
                console.error('[axle-client-build] 🚨 Client bundle build failed. See errors above.');
                // esbuild сам выведет детальные ошибки в stderr
                return;
            }
            
            if (isFirstBuild) {
                console.log('[axle-client-build] ✅ Initial client bundle complete.');
                // Отправляем сигнал оркестратору commands.js
                console.log('// CLIENT-BUILD-COMPLETE //');
                isFirstBuild = false;
            } else {
                console.log(`[axle-client-build] ✨ Client bundle rebuild complete.`);
            }
        };

        if (isWatchMode) {
            const ctx = await esbuild.context({
                ...buildOptions,
                // Добавляем плагин для вывода логов ПОСЛЕ каждой пересборки
                plugins: [{
                    name: 'watch-reporter',
                    setup(build) {
                        build.onEnd(onBuildEnd);
                    },
                }],
            });
            await ctx.watch();
            console.log('[axle-client-build] Watching for client file changes...');
        } else {
            const result = await esbuild.build(buildOptions);
            onBuildEnd(result);
        }

    } catch (error) {
        console.error('[axle-client-build] 🚨 Client bundle build process failed to start:', error);
        process.exit(1);
    }
}

// Убедимся, что новая точка входа существует. Если нет - создадим ее.
async function createClientEntryPoint() {
    const entryPointPath = entryPoint;
    const engineClientPath = './engine-client.js'; // Относительный путь для import
    const content = `
// This is the new main entry point for the client bundle.
// It ensures React is bundled and exposed globally before the engine runs.
import React from 'react';
import ReactDOM from 'react-dom/client';

// Make React and ReactDOM globally available for the engine and components.
window.React = React;
window.ReactDOM = ReactDOM;
window.axle = { components: {} }; // Initialize the component namespace.

// Now that globals are set, run the actual engine logic.
import '${engineClientPath}';
`;
    const clientDir = path.dirname(entryPointPath);
    if (!fs.existsSync(clientDir)) {
        fs.mkdirSync(clientDir, { recursive: true });
    }
    if (!fs.existsSync(entryPointPath)) {
        fs.writeFileSync(entryPointPath, content.trim(), 'utf-8');
        console.log(`[axle-client-build] Created client entry point at ${entryPointPath}`);
    }
}

async function main() {
    await createClientEntryPoint();
    await runClientBuild();
}

main();