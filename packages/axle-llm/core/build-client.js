// packages/axle-llm/core/build-client.js
const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const appPath = process.cwd();
const outDir = path.join(appPath, 'public');
const clientComponentsDir = path.join(appPath, '.axle-build-client');
const entryPoint = path.resolve(__dirname, '..', 'client', 'index.js');

async function runClientBuild() {
    const isWatchMode = process.argv.includes('--watch');
    console.log(`[axle-client-build] Starting final client bundle assembly... ${isWatchMode ? '(watch mode)' : ''}`);

    try {
        await fs.promises.mkdir(outDir, { recursive: true });

        // Базовая конфигурация для основного бандла движка
        const buildOptions = {
            entryPoints: [entryPoint],
            bundle: true,
            platform: 'browser',
            format: 'iife',
            sourcemap: true,
            define: { 'process.env.NODE_ENV': `"${isWatchMode ? 'development' : 'production'}"` },
            write: false, // Мы не пишем файл сразу, а обрабатываем его в памяти
        };

        // Функция, которая собирает и склеивает все вместе
        const assembleBundle = async () => {
            console.log('[axle-client-build] Assembling final bundle...');
            const result = await esbuild.build(buildOptions);
            
            if (result.errors.length > 0) {
                console.error('[axle-client-build] 🚨 Core engine build failed.');
                return;
            }

            let finalContent = result.outputFiles[0].text;
            
            // Добавляем неймспейс
            finalContent += '\nwindow.axle = window.axle || { components: {} };\n';

            // Добавляем скомпилированные компоненты
            if (fs.existsSync(clientComponentsDir)) {
                const componentFiles = fs.readdirSync(clientComponentsDir).filter(f => f.endsWith('.js'));
                for (const file of componentFiles) {
                    const componentName = path.basename(file, '.js');
                    const componentContent = fs.readFileSync(path.join(clientComponentsDir, file), 'utf-8');
                    const script = `
// --- Component: ${componentName} ---
(function() {
  const exports = {};
  const module = { exports };
  ${componentContent.replace('var axleComponent =', 'module.exports =')}
  if (module.exports) {
    window.axle.components['${componentName}'] = module.exports.default || module.exports;
  }
})();
`;
                    finalContent += script;
                }
                console.log(`[axle-client-build] Injected ${componentFiles.length} component definitions.`);
            }

            // Записываем итоговый файл
            fs.writeFileSync(path.join(outDir, 'bundle.js'), finalContent);
            console.log('[axle-client-build] ✅ Final bundle written to disk.');
        };

        // Первичная сборка
        await assembleBundle();
        console.log('// CLIENT-BUILD-COMPLETE //'); // Отправляем сигнал оркестратору

        if (isWatchMode) {
            // В режиме watch, нам нужно следить и за файлами движка, и за скомпилированными компонентами
            const engineFilesWatcher = esbuild.context({ ...buildOptions, write: true, outfile: path.join(outDir, 'bundle.js') });
            await engineFilesWatcher.watch();
            console.log('[axle-client-build] Watching for engine file changes...');
            
            // Просто пересобираем бандл, когда меняются компоненты
            fs.watch(clientComponentsDir, async (eventType, filename) => {
                if (filename && filename.endsWith('.js')) {
                    console.log(`[axle-client-build] Detected change in components: ${filename}. Re-assembling bundle...`);
                    await assembleBundle();
                    console.log(`[axle-client-build] ✨ Bundle re-assembled.`);
                }
            });
        }

    } catch (error) {
        console.error('[axle-client-build] 🚨 Client build process failed to start:', error);
        process.exit(1);
    }
}

// Убедимся, что точка входа существует
async function createClientEntryPoint() {
    const entryPointPath = entryPoint;
    const engineClientPath = './engine-client.js';
    const content = `
// Главная точка входа. Здесь мы импортируем React, чтобы esbuild его сбандлил.
import React from 'react';
import ReactDOM from 'react-dom/client';

window.React = React;
window.ReactDOM = ReactDOM;

// Запускаем сам движок
import '${engineClientPath}';
`;
    const clientDir = path.dirname(entryPointPath);
    if (!fs.existsSync(clientDir)) { fs.mkdirSync(clientDir, { recursive: true }); }
    if (!fs.existsSync(entryPointPath)) {
        fs.writeFileSync(entryPointPath, content.trim(), 'utf-8');
    }
}


async function main() {
    await createClientEntryPoint();
    await runClientBuild();
}

main();