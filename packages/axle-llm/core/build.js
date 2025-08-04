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
            if (process.argv.includes('--watch')) console.log('// BUILD-COMPLETE //');
            return;
        }

        const entryPointsObject = entryPoints.reduce((acc, filePath) => {
            const baseName = path.basename(filePath, '.jsx');
            const camelCaseName = baseName.replace(/-(\w)/g, (_, char) => char.toUpperCase());
            acc[camelCaseName] = filePath;
            return acc;
        }, {});

        const isWatchMode = process.argv.includes('--watch');
        let serverBuildDone = false, clientBuildDone = false, initialBuildSignaled = false;
        const signalIfReady = () => {
            if (serverBuildDone && clientBuildDone && !initialBuildSignaled) {
                console.log('// BUILD-COMPLETE //');
                initialBuildSignaled = true;
            }
        };

        const commonOptions = {
            entryPoints: entryPointsObject,
            jsx: 'transform',
            jsxFactory: 'React.createElement',
            jsxFragment: 'React.Fragment',
        };

        const serverOptions = {
            ...commonOptions,
            // ★★★ НАПОРИСТОЕ ИСПРАВЛЕНИЕ ★★★
            // Мы говорим сборщику не просто транслировать файлы, а СОБИРАТЬ ИХ В БАНДЛ.
            // Это заставит его правильно обработать все внутренние `import`.
            bundle: true,
            // ★★★ КОНЕЦ ИСПРАВЛЕНИЯ ★★★
            outdir: serverOutDir,
            platform: 'node',
            format: 'cjs',
            // Мы должны явно указать, что React - это внешняя зависимость,
            // чтобы esbuild не пытался включить его в бандл.
            external: ['react', 'react-dom'],
            plugins: [{
                name: 'server-reporter',
                setup(build) {
                    build.onEnd(result => {
                        if (result.errors.length === 0) {
                           console.log(`[axle-build] ✅ Server components build complete.`);
                           if(!isWatchMode || !serverBuildDone) { serverBuildDone = true; signalIfReady(); }
                        } else { console.error('[axle-build] 🚨 Server components build failed.'); }
                    });
                },
            }],
        };

        const clientOptions = {
            ...commonOptions,
            outdir: clientOutDir,
            bundle: true,
            platform: 'browser',
            format: 'iife',
            globalName: 'axleComponent',
            define: {
                'React': 'window.React',
                'ReactDOM': 'window.ReactDOM'
            },
            plugins: [{
                name: 'client-reporter',
                setup(build) {
                     build.onEnd(result => {
                        if (result.errors.length === 0) {
                            console.log(`[axle-build] ✅ Client components build complete.`);
                            if(!isWatchMode || !clientBuildDone) { clientBuildDone = true; signalIfReady(); }
                        } else { console.error('[axle-build] 🚨 Client components build failed.'); }
                    });
                },
            }],
        };

        if (isWatchMode) {
            console.log('[axle-build] Starting watchers...');
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