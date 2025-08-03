// packages/axle-llm/core/build.js
const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const appPath = process.cwd();
const componentsDir = path.join(appPath, 'app', 'components');
const outDir = path.join(appPath, '.axle-build');

function findFilesByExtension(startPath, extension) {
    let results = [];
    if (!fs.existsSync(startPath)) return [];
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
    console.log('[axle-build] Starting initial build...');
    try {
        if (fs.existsSync(outDir)) await fs.promises.rm(outDir, { recursive: true, force: true });
        await fs.promises.mkdir(outDir, { recursive: true });

        const entryPoints = findFilesByExtension(componentsDir, '.jsx');
        if (entryPoints.length === 0) {
            console.log('[axle-build] No .jsx components found.');
            await fs.promises.writeFile(path.join(outDir, '.keep'), '');
            console.log('// BUILD-COMPLETE //');
            if (!process.argv.includes('--watch')) return;
        }

        const isWatchMode = process.argv.includes('--watch');

        const buildOptions = {
            entryPoints: entryPoints,
            outdir: outDir,
            bundle: false,
            platform: 'node',
            format: 'cjs',
            // ★★★ ПРИВОДИМ В СООТВЕТСТВИЕ С ТЕСТАМИ ★★★
            jsx: 'transform',
            jsxFactory: 'React.createElement',
            jsxFragment: 'React.Fragment',
            logLevel: 'silent',
            plugins: [
                {
                    name: 'axle-build-reporter',
                    setup(build) {
                        let isFirstBuild = true;
                        build.onEnd(result => {
                            if (result.errors.length > 0) {
                                console.error('[axle-build] 🚨 Build failed:', result.errors);
                            } else {
                                const componentCount = entryPoints.length;
                                if (isFirstBuild) {
                                    console.log(`[axle-build] ✅ Initial build complete. ${componentCount} component(s) compiled.`);
                                    console.log('// BUILD-COMPLETE //');
                                    if (isWatchMode) {
                                       console.log('[axle-build] Watching for changes...');
                                    }
                                    isFirstBuild = false;
                                } else {
                                    console.log(`[axle-build] ✨ Rebuild complete. ${componentCount} component(s) updated.`);
                                }
                            }
                        });
                    },
                },
            ],
        };

        if (isWatchMode) {
            const ctx = await esbuild.context(buildOptions);
            await ctx.watch();
        } else {
            await esbuild.build(buildOptions);
        }

    } catch (error) {
        console.error('[axle-build] 🚨 Build process failed to start:', error);
        process.exit(1);
    }
}

runBuild();