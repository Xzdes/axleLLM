// packages/axle-llm/main.js

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { createServerInstance } = require('./core/server');
const { loadManifest } = require('./core/config-loader');
const getPort = require('get-port'); // ★★★ ВОТ ОНО! Простой и надежный require ★★★

const isDev = process.argv.includes('--dev');
const appPath = isDev ? process.argv[2] : (path.basename(app.getAppPath()).endsWith('.asar') ? path.dirname(app.getAppPath()) : app.getAppPath());

if (!appPath) {
  console.error('[axle-main] Critical: Application path could not be determined. Exiting.');
  process.exit(1);
}

const manifest = loadManifest(appPath);

function setupBridge(win) {
  ipcMain.handle('axle:bridge-call', async (event, api, args) => {
    if (win.isDestroyed()) return;
    const [apiGroup, apiMethod] = api.split('.');
    if (!apiGroup || !apiMethod) throw new Error(`[axle-bridge] Invalid API format: ${api}`);
    const isDialogAllowed = manifest.bridge?.dialogs?.[apiMethod] === true;
    const isShellAllowed = manifest.bridge?.shell?.[apiMethod] === true;
    const isCustomAllowed = manifest.bridge?.custom?.[apiGroup] && typeof require(path.join(appPath, 'app', 'bridge', manifest.bridge.custom[apiGroup]))[apiMethod] === 'function';
    if (!isDialogAllowed && !isShellAllowed && !isCustomAllowed) throw new Error(`[axle-bridge] API call blocked: '${api}' is not whitelisted.`);
    switch (apiGroup) {
      case 'dialogs': return await dialog[apiMethod](win, args);
      case 'shell':
        if(apiMethod === 'openExternal'){ await shell.openExternal(args.url); return { success: true }; }
        throw new Error(`[axle-bridge] Unknown method '${apiMethod}' in API group '${apiGroup}'.`);
      case 'custom':
        const [_, moduleAlias, methodName] = api.split('.');
        const modulePath = path.join(appPath, 'app', 'bridge', manifest.bridge.custom[moduleAlias]);
        const customModule = require(modulePath);
        return await customModule[methodName](...(args || []));
      default:
        throw new Error(`[axle-bridge] Unknown API group: '${apiGroup}'.`);
    }
  });
}

async function createWindow() {
  console.log('[axle-main] 1. Starting createWindow function...');
  const launchConfig = manifest.launch || {};
  const windowConfig = launchConfig.window || {};
  const config = { width: 1024, height: 768, devtools: false, ...windowConfig };
  
  console.log('[axle-main] 2. Creating BrowserWindow...');
  const win = new BrowserWindow({
    width: config.width,
    height: config.height,
    title: launchConfig.title || 'axleLLM Application',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'core', 'preload.js'),
    },
  });

  win.on('ready-to-show', () => {
    console.log('[axle-main] 6. Window is ready to show. Making it visible.');
    win.show();
  });

  setupBridge(win);

  try {
    console.log('[axle-main] 3. Creating server instance...');
    const dbPath = isDev ? path.join(appPath, 'axle-db-data') : path.join(app.getPath('userData'), 'axle-db-data');
    const { httpServer } = await createServerInstance(appPath, manifest, { dbPath });
    
    const port = await getPort();
    const host = '127.0.0.1';
    
    httpServer.on('error', (err) => { 
        console.error('[axle-main] HTTP Server runtime error:', err);
        dialog.showErrorBox('Server Runtime Error', err.stack || err.message);
        app.quit();
    });

    httpServer.listen(port, host, async () => {
        const serverUrl = `http://${host}:${port}`;
        console.log(`[axle-main] 4. Internal server is listening on ${serverUrl}`);
        console.log(`[axle-main] 5. Loading URL into window...`);
        try {
          await win.loadURL(serverUrl);
          console.log('[axle-main] 7. URL loaded successfully.');
        } catch (loadError) {
          console.error(`[axle-main] CRITICAL: Failed to load URL ${serverUrl}`, loadError);
          dialog.showErrorBox('Failed to Load', `Could not load the application URL.\n\n${loadError.message}`);
          app.quit();
        }
    });

  } catch (error) {
    console.error('[axle-main] CRITICAL: Failed to create internal server or window:', error);
    dialog.showErrorBox('Startup Error', `Failed to start internal server:\n\n${error.message}`);
    app.quit();
  }

  if (isDev && config.devtools) {
    win.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});