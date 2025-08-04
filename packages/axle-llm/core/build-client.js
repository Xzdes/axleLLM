// packages/axle-llm/core/build-client.js
const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const appPath = process.cwd();
const outDir = path.join(appPath, 'public');
const entryPoint = path.resolve(__dirname, '..', 'client', 'index.js');
const clientComponentsDir = path.join(appPath, '.axle-build-client');

async function runClientBuild() {
    const isWatchMode = process.argv.includes('--watch');
    console.log(`[axle-client-build] Starting final client bundle assembly... ${isWatchMode ? '(watch mode)' : ''}`);

    try {
        await fs.promises.mkdir(outDir, { recursive: true });

        const buildOptions = {
            entryPoints: [entryPoint],
            bundle: true,
            platform: 'browser',
            format: 'iife',
            sourcemap: true,
            write: false,
        };
        
        const assembleAndWriteBundle = async () => {
            try {
                const result = await esbuild.build(buildOptions);
                let finalContent = result.outputFiles[0].text;
                
                if (fs.existsSync(clientComponentsDir)) {
                    const componentFiles = fs.readdirSync(clientComponentsDir);
                    for (const file of componentFiles) {
                        if (file.endsWith('.js')) {
                            const componentName = path.basename(file, '.js');
                            const componentContent = fs.readFileSync(path.join(clientComponentsDir, file), 'utf-8');
                            
                            // ★★★ ГЛАВНОЕ ИСПРАВЛЕНИЕ ★★★
                            // Мы убираем лишнюю обертку (function() { ... })();
                            // Код компонента (который уже является IIFE и создает глобальную
                            // переменную `axleComponent`) и код регистрации вставляются напрямую.
                            // Это гарантирует, что `axleComponent` будет в глобальной области видимости.
                            const registrationScript = `
try {
  if (window.axleComponent) {
    window.axle.components['${componentName}'] = window.axleComponent.default || window.axleComponent;
  } else {
    console.error("Failed to register component '${componentName}': window.axleComponent was not defined.");
  }
} catch(e) { console.error('Error during component registration for ${componentName}:', e); }
`;
                            // Сначала вставляем код компонента, потом код регистрации.
                            finalContent += '\n' + componentContent + '\n' + registrationScript;
                        }
                    }
                }
                
                fs.writeFileSync(path.join(outDir, 'bundle.js'), finalContent);
                return true;
            } catch (e) {
                console.error('[axle-client-build] 🚨 Core engine build failed:', e);
                return false;
            }
        };

        let isFirstRun = true;
        const runAndSignal = async () => {
            if (await assembleAndWriteBundle() && isFirstRun) {
                console.log('// CLIENT-BUILD-COMPLETE //');
                isFirstRun = false;
            }
        };

        await runAndSignal();

        if (isWatchMode) {
            const watcherCallback = async () => {
                console.log(`[axle-client-build] Change detected. Re-assembling bundle...`);
                await assembleAndWriteBundle();
                console.log(`[axle-client-build] ✨ Bundle re-assembled.`);
            };
            fs.watch(path.resolve(__dirname, '..', 'client'), { recursive: true }, watcherCallback);
            if (fs.existsSync(clientComponentsDir)) {
                fs.watch(clientComponentsDir, watcherCallback);
            }
            console.log('[axle-client-build] Watching for engine and component changes...');
        }

    } catch (error) {
        console.error('[axle-client-build] 🚨 Client build process failed to start:', error);
        process.exit(1);
    }
}

async function main() {
    await runClientBuild();
}

main();