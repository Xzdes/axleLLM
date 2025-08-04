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

        // ★★★ НАЧАЛО ИЗМЕНЕНИЙ: Правильная конфигурация esbuild ★★★

        // esbuild соберет React и ReactDOM в бандл благодаря 'inject' и 'bundle: true'.
        // Затем опция 'footer' добавит наш код в конец бандла, который безопасно
        // выставит уже сбандленные модули в глобальный scope.
        const buildOptions = {
            entryPoints: [entryPoint],
            outfile: path.join(outDir, 'bundle.js'),
            bundle: true,
            platform: 'browser',
            format: 'iife', // Immediately-invoked Function Expression, безопасно для браузера
            sourcemap: true,
            define: { 'process.env.NODE_ENV': `"${isWatchMode ? 'development' : 'production'}"` },
            inject: [path.resolve(__dirname, 'react-shim.js')],
            // Добавляем "подвал" к нашему бандлу. Этот JS-код выполнится в браузере.
            // React и ReactDOM к этому моменту уже будут доступны внутри IIFE-обертки бандла.
            footer: {
                js: 'window.React = React; window.ReactDOM = ReactDOM; window.axle = { components: {} };',
            },
        };
        
        if (isWatchMode) {
            const ctx = await esbuild.context(buildOptions);
            await ctx.watch();
            console.log('[axle-client-build] Watching for client file changes...');
            // В режиме --watch сигнал о завершении будет выведен в логах при первой сборке.
            // Мы будем слушать stdout в commands.js
        } else {
            await esbuild.build(buildOptions);
            console.log(`[axle-client-build] ✅ Client bundle complete.`);
        }
        
        // Сигнал для оркестратора в commands.js
        console.log('// CLIENT-BUILD-COMPLETE //');
        
        // ★★★ КОНЕЦ ИЗМЕНЕНИЙ ★★★

    } catch (error) {
        console.error('[axle-client-build] 🚨 Client bundle build process failed to start:', error);
        process.exit(1);
    }
}

// Вспомогательная функция для создания shim-файла, если его нет
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