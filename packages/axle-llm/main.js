// packages/axle-llm/main.js

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { createServerInstance } = require('./core/server');
const { loadManifest } = require('./core/config-loader');
const getPort = require('get-port');

const isDev = process.argv.includes('--dev');

// ★★★ НАПОРИСТОЕ ИСПРАВЛЕНИЕ: ЖЕЛЕЗОБЕТОННЫЙ ПУТЬ ★★★
// Эта логика будет работать и в режиме разработки, и в упакованном приложении.
// app.getAppPath() в упакованном приложении указывает на корень архива app.asar,
// где лежат все файлы нашего приложения. Это именно то, что нам нужно.
const appPath = isDev 
  ? process.argv[2] // В режиме dev мы передаем путь как аргумент
  : app.getAppPath(); // В упакованном приложении берем корень app.asar

if (!appPath) {
  dialog.showErrorBox('Critical Error', 'Application path could not be determined. Exiting.');
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
    
    if (!isDialogAllowed && !isShellAllowed && !isCustomAllowed) {
      throw new Error(`[axle-bridge] API call blocked: '${api}' is not whitelisted.`);
    }

    switch (apiGroup) {
      case 'dialogs': return await dialog[apiMethod](win, args);
      case 'shell':
        if(apiMethod === 'openExternal'){ await shell.openExternal(args.url || args); return { success: true }; }
        throw new Error(`[axle-bridge] Unknown method '${apiMethod}' in API group '${apiGroup}'.`);
      case 'custom':
        const [_, moduleAlias, methodName] = api.split('.');
        const modulePath = path.join(appPath, 'app', 'bridge', manifest.bridge.custom[moduleAlias]);
        const customModule = require(modulePath);
        return await customModule[methodName](...(Array.isArray(args) ? args : [args]));
      default:
        throw new Error(`[axle-bridge] Unknown API group: '${apiGroup}'.`);
    }
  });
}

async function createWindow() {
  const launchConfig = manifest.launch || {};
  const windowConfig = launchConfig.window || {};
  const config = { width: 1024, height: 768, devtools: false, ...windowConfig };
  
  const win = new BrowserWindow({
    width: config.width, height: config.height,
    title: launchConfig.title || 'axleLLM Application',
    show: false,
    webPreferences: { preload: path.join(__dirname, 'core', 'preload.js') },
  });

  win.on('ready-to-show', () => { win.show(); });

  setupBridge(win);

  try {
    const dbPath = app.isPackaged 
        ? path.join(app.getPath('userData'), 'axle-db-data') 
        : path.join(appPath, 'axle-db-data');
        
    const { httpServer } = await createServerInstance(appPath, manifest, { dbPath });
    const port = await getPort();
    const host = '127.0.0.1';
    
    httpServer.listen(port, host, async () => {
        const serverUrl = `http://${host}:${port}`;
        await win.loadURL(serverUrl);
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
app.on('window-all-closed', () => { if (process.platform !== 'darwin') { app.quit(); } });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) { createWindow(); } });