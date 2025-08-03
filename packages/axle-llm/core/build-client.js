// packages/axle-llm/core/build-client.js
const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs'); // <--- ИСПРАВЛЕНИЕ ЗДЕСЬ! Убираем '/promises'

// This script is also run from the user's app directory
const appPath = process.cwd();
const outDir = path.join(appPath, 'public');

// The entry point for our entire client-side application
const entryPoint = path.resolve(__dirname, '..', 'client', 'engine-client.js');

async function runClientBuild() {
    console.log('[axle-client-build] Starting client bundle build...');
    try {
        await fs.promises.mkdir(outDir, { recursive: true });

        // This is a plugin for esbuild to expose React and ReactDOM globally
        // so our client-side hydration and rendering can find them without imports.
        const exposeGlobalsPlugin = {
            name: 'expose-globals',
            setup(build) {
                build.onEnd(result => {
                    const outputPath = path.join(outDir, 'bundle.js');
                    if (result.errors.length === 0 && fs.existsSync(outputPath)) {
                        let content = fs.readFileSync(outputPath, 'utf8');
                        const prefix = `
var React = require('react');
var ReactDOM = require('react-dom/client');
window.React = React;
window.ReactDOM = ReactDOM;
`;
                        // A placeholder for dynamically loading user components
                        content += '\nwindow.axle = { components: {} };\n'; 
                        fs.writeFileSync(outputPath, prefix + content);
                    }
                });
            },
        };

        const buildOptions = {
            entryPoints: [entryPoint],
            outfile: path.join(outDir, 'bundle.js'),
            bundle: true,
            platform: 'browser',
            format: 'iife', // Immediately-invoked Function Expression, safe for browsers
            sourcemap: true,
            define: { 'process.env.NODE_ENV': `"${process.argv.includes('--watch') ? 'development' : 'production'}"` },
            inject: [path.resolve(__dirname, 'react-shim.js')],
            plugins: [exposeGlobalsPlugin],
        };

        const isWatchMode = process.argv.includes('--watch');

        if (isWatchMode) {
            console.log('[axle-client-build] Running in watch mode...');
            const ctx = await esbuild.context(buildOptions);
            await ctx.watch();
        } else {
            await esbuild.build(buildOptions);
            console.log(`[axle-client-build] ✅ Client bundle complete.`);
        }

    } catch (error) {
        console.error('[axle-client-build] 🚨 Client bundle build failed:', error);
        process.exit(1);
    }
}

// We need a shim file for esbuild's inject feature. Let's create it if it doesn't exist.
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