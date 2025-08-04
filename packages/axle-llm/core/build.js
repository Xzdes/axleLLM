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
        // Очистка и создание директорий
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
            console.log('// BUILD-COMPLETE //'); // Сигнал даже если нет компонентов
            return;
        }

        const isWatchMode = process.argv.includes('--watch');

        // Общий плагин для логирования и отправки сигнала
        const buildReporterPlugin = (buildType) => ({
            name: `axle-${buildType}-reporter`,
            setup(build) {
                let isFirstBuild = true;
                build.onEnd(result => {
                    if (result.errors.length > 0) {
                        console.error(`[axle-build] 🚨 ${buildType} build failed.`);
                    } else {
                        if (isFirstBuild) {
                            console.log(`[axle-build] ✅ Initial ${buildType} build complete. ${entryPoints.length} component(s) compiled.`);
                            // Сигнал отправляется только после серверной сборки
                            if (buildType === 'Server') {
                                console.log('// BUILD-COMPLETE //');
                            }
                            isFirstBuild = false;
                        } else {
                            console.log(`[axle-build] ✨ ${buildType} rebuild complete.`);
                        }
                    }
                });
            },
        });

        // Конфигурация для СЕРВЕРА
        const serverOptions = {
            entryPoints,
            outdir: serverOutDir,
            platform: 'node',
            format: 'cjs',
            jsx: 'transform',
            jsxFactory: 'React.createElement',
            jsxFragment: 'React.Fragment',
            logLevel: 'silent',
            plugins: [buildReporterPlugin('Server')]
        };
        
        // Конфигурация для КЛИЕНТА
        const clientOptions = {
            entryPoints,
            outdir: clientOutDir,
            bundle: true, // Бандлим зависимости
            platform: 'browser',
            format: 'iife',
            globalName: 'axleComponent',
            jsx: 'transform',
            jsxFactory: 'React.createElement',
            jsxFragment: 'React.Fragment',
            external: ['react', 'react-dom'], // React/ReactDOM будут в window
            logLevel: 'silent',
            plugins: [buildReporterPlugin('Client')]
        };

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