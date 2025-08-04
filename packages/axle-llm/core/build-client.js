// packages/axle-llm/core/build-client.js
const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

// Этот скрипт всегда запускается из директории пользовательского приложения
const appPath = process.cwd();
const outDir = path.join(appPath, 'public');

// Точка входа для всего нашего клиентского приложения
const entryPoint = path.resolve(__dirname, '..', 'client', 'engine-client.js');

async function runClientBuild() {
    const isWatchMode = process.argv.includes('--watch');
    console.log(`[axle-client-build] Starting client bundle build... ${isWatchMode ? '(watch mode)' : ''}`);

    try {
        await fs.promises.mkdir(outDir, { recursive: true });

        // Флаг, чтобы сигнал о завершении отправлялся только один раз
        let isFirstBuild = true;

        const buildReporterPlugin = {
            name: 'axle-client-build-reporter',
            setup(build) {
                // Выполняется после каждой сборки (или пересборки в watch-режиме)
                build.onEnd(result => {
                    const outputPath = path.join(outDir, 'bundle.js');
                    if (result.errors.length > 0) {
                        // esbuild сам выведет ошибки в stderr, если logLevel не 'silent'
                        console.error('[axle-client-build] 🚨 Client bundle build failed.');
                        return;
                    }

                    if (fs.existsSync(outputPath)) {
                        // --- Вставка глобальных React и ReactDOM ---
                        let content = fs.readFileSync(outputPath, 'utf8');
                        const prefix = `
var React = require('react');
var ReactDOM = require('react-dom/client');
window.React = React;
window.ReactDOM = ReactDOM;
`;
                        content += '\nwindow.axle = { components: {} };\n';
                        fs.writeFileSync(outputPath, prefix + content);
                        // --- Конец вставки ---

                        if (isFirstBuild) {
                            // Отправляем сигнал только при первой успешной сборке
                            console.log('// CLIENT-BUILD-COMPLETE //');
                            isFirstBuild = false; // Сбрасываем флаг
                        } else {
                            // Лог для последующих пересборок в watch-режиме
                            console.log(`[axle-client-build] ✨ Client bundle rebuild complete.`);
                        }
                    }
                });
            },
        };

        const buildOptions = {
            entryPoints: [entryPoint],
            outfile: path.join(outDir, 'bundle.js'),
            bundle: true,
            platform: 'browser',
            format: 'iife',
            sourcemap: true,
            define: { 'process.env.NODE_ENV': `"${isWatchMode ? 'development' : 'production'}"` },
            inject: [path.resolve(__dirname, 'react-shim.js')],
            plugins: [buildReporterPlugin],
            // Подавляем стандартные логи esbuild, так как наш плагин теперь управляет выводом
            logLevel: 'silent', 
        };
        
        if (isWatchMode) {
            const ctx = await esbuild.context(buildOptions);
            await ctx.watch();
            console.log('[axle-client-build] Watching for client file changes...');
        } else {
            await esbuild.build(buildOptions);
        }

    } catch (error) {
        console.error('[axle-client-build] 🚨 Client bundle build process failed to start:', error);
        process.exit(1);
    }
}

// Вспомогательная функция для создания shim-файла
async function createShimFile() {
    const shimPath = path.resolve(__dirname, 'react-shim.js');
    const content = `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nexport { React, ReactDOM };`;
    try {
        await fs.promises.access(shimPath);
    } catch {
        await fs.promises.writeFile(shimPath, content, 'utf-8');
    }
}

async function main() {
    await createShimFile();
    await runClientBuild();
}

main();