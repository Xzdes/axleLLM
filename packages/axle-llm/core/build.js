// packages/axle-llm/core/build.js
const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const appPath = process.cwd();
const componentsDir = path.join(appPath, 'app', 'components');
const serverOutDir = path.join(appPath, '.axle-build');
const clientOutDir = path.join(appPath, '.axle-build-client'); 

function findFilesByExtension(startPath, extension) {
    if (!fs.existsSync(startPath)) return [];
    let results = [];
    const files = fs.readdirSync(startPath);
    for (const file of files) {
        const filename = path.join(startPath, file);
        const stat = fs.lstatSync(filename);
        if (stat.isDirectory()) {
            results = results.concat(findFilesByExtension(filename, extension));
        } else if (filename.endsWith(extension)) {
            results.push(filename);
        }
    }
    return results;
}

async function runBuild() {
    console.log('[axle-build] Starting unified build (server & client components)...');
    try {
        await Promise.all([
            fs.promises.rm(serverOutDir, { recursive: true, force: true }),
            fs.promises.rm(clientOutDir, { recursive: true, force: true })
        ]);
        await Promise.all([
            fs.promises.mkdir(serverOutDir, { recursive: true }),
            fs.promises.mkdir(clientOutDir, { recursive: true })
        ]);

        const entryPoints = findFilesByExtension(componentsDir, '.jsx');
        if (entryPoints.length === 0) {
            console.log('[axle-build] No .jsx components found.');
            if (process.argv.includes('--watch')) {
                 console.log('// BUILD-COMPLETE //');
            }
            return;
        }

        const isWatchMode = process.argv.includes('--watch');

        let serverBuildDone = false;
        let clientBuildDone = false;
        let initialBuildSignaled = false;

        const signalIfReady = () => {
            if (serverBuildDone && clientBuildDone && !initialBuildSignaled) {
                console.log('// BUILD-COMPLETE //');
                initialBuildSignaled = true;
            }
        }

        // --- КОНФИГУРАЦИЯ ДЛЯ СЕРВЕРА (без изменений) ---
        const serverOptions = {
            entryPoints,
            outdir: serverOutDir,
            platform: 'node',
            format: 'cjs',
            jsx: 'transform',
            jsxFactory: 'React.createElement',
            jsxFragment: 'React.Fragment',
            plugins: [{
                name: 'server-reporter',
                setup(build) {
                    build.onEnd(result => {
                        if (result.errors.length === 0) {
                           console.log(`[axle-build] ✅ Server components build complete.`);
                           if(!isWatchMode || !serverBuildDone) {
                                serverBuildDone = true;
                                signalIfReady();
                           }
                        } else {
                            console.error('[axle-build] 🚨 Server components build failed.');
                        }
                    });
                },
            }],
        };

        // ★★★ НАЧАЛО ИСПРАВЛЕНИЙ: КОНФИГУРАЦИЯ ДЛЯ КЛИЕНТА ★★★

        // Этот плагин решает проблему "Dynamic require of 'react' is not supported".
        // Он перехватывает импорты 'react' и 'react-dom/client' и заменяет их
        // кодом, который обращается к глобальным window.React и window.ReactDOM.
        const reactGlobalsPlugin = {
            name: 'react-globals',
            setup(build) {
                // Перехватываем попытку найти 'react'
                build.onResolve({ filter: /^react$/ }, args => ({
                    path: args.path,
                    namespace: 'react-global',
                }));
                
                // Перехватываем попытку найти 'react-dom/client'
                build.onResolve({ filter: /^react-dom\/client$/ }, args => ({
                    path: args.path,
                    namespace: 'react-dom-global',
                }));

                // Генерируем "виртуальный" модуль для react
                build.onLoad({ filter: /.*/, namespace: 'react-global' }, () => ({
                    contents: 'module.exports = window.React;',
                    loader: 'js',
                }));

                // Генерируем "виртуальный" модуль для react-dom
                build.onLoad({ filter: /.*/, namespace: 'react-dom-global' }, () => ({
                    contents: 'module.exports = window.ReactDOM;',
                    loader: 'js',
                }));
            },
        };

        const clientOptions = {
            entryPoints,
            outdir: clientOutDir,
            bundle: true,
            platform: 'browser',
            format: 'iife',
            globalName: 'axleComponent',
            jsx: 'transform',
            jsxFactory: 'React.createElement',
            jsxFragment: 'React.Fragment',
            // УБИРАЕМ 'external', так как плагин теперь управляет этим.
            plugins: [
                reactGlobalsPlugin, // <-- ДОБАВЛЯЕМ НАШ ПЛАГИН
                {
                    name: 'client-reporter',
                    setup(build) {
                         build.onEnd(result => {
                            if (result.errors.length === 0) {
                                console.log(`[axle-build] ✅ Client components build complete.`);
                                if(!isWatchMode || !clientBuildDone) {
                                    clientBuildDone = true;
                                    signalIfReady();
                               }
                            } else {
                                console.error('[axle-build] 🚨 Client components build failed.');
                            }
                        });
                    },
                }
            ],
        };

        // ★★★ КОНЕЦ ИСПРАВЛЕНИЙ ★★★

        if (isWatchMode) {
            console.log('[axle-build] Starting watchers for server and client component builds...');
            const serverCtx = await esbuild.context(serverOptions);
            const clientCtx = await esbuild.context(clientOptions);
            await Promise.all([serverCtx.watch(), clientCtx.watch()]);
            console.log('[axle-build] Watching for component changes...');
        } else {
            await Promise.all([
                esbuild.build(serverOptions),
                esbuild.build(clientOptions)
            ]);
        }
    } catch (error) {
        console.error('[axle-build] 🚨 Build process failed to start:', error);
        process.exit(1);
    }
}

runBuild();