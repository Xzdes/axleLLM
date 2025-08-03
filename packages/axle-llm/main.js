// packages/axle-llm/main.js

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { createServerInstance } = require('./core/server');
const { loadManifest } = require('./core/config-loader');
const { default: getPort } = require('get-port');

const isDev = process.argv.includes('--dev');

let appPath;
if (isDev) {
  appPath = process.argv[2]; 
} else {
  // Корректное определение пути для упакованного приложения
  appPath = app.getAppPath();
  // Если приложение упаковано в asar, реальный appPath - это директория выше
  if (path.basename(appPath).endsWith('.asar')) {
      appPath = path.dirname(appPath);
  }
}

if (!appPath) {
  const errorMsg = '[axle-main] Critical: Application path was not provided or could not be determined. Exiting.';
  console.error(errorMsg);
  if (app && app.isReady()) {
      dialog.showErrorBox('Critical Error', 'Application path could not be determined. Exiting.');
  }
  process.exit(1);
}

// ★★★ ГЛАВНОЕ ИСПРАВЛЕНИЕ ★★★
// Мы загружаем ПОЛНЫЙ манифест ОДИН раз при старте главного процесса.
// Этот объект `manifest` теперь содержит абсолютно все, включая роуты из папки.
const manifest = loadManifest(appPath);

function setupBridge(win) {
  ipcMain.handle('axle:bridge-call', async (event, api, args) => {
    console.log(`[axle-bridge] Received call for API: ${api} with args:`, args);
    
    if (win.isDestroyed()) return;

    const [apiGroup, apiMethod] = api.split('.');
    if (!apiGroup || !apiMethod) {
      throw new Error(`[axle-bridge] Invalid API format: ${api}`);
    }

    const isDialogAllowed = manifest.bridge?.dialogs?.[apiMethod] === true;
    const isShellAllowed = manifest.bridge?.shell?.[apiMethod] === true;
    const isCustomAllowed = manifest.bridge?.custom?.[apiGroup] && typeof require(path.join(appPath, 'app', 'bridge', manifest.bridge.custom[apiGroup]))[apiMethod] === 'function';

    if (!isDialogAllowed && !isShellAllowed && !isCustomAllowed) {
      throw new Error(`[axle-bridge] API call blocked by manifest: '${api}' is not whitelisted or does not exist.`);
    }

    switch (apiGroup) {
      case 'dialogs':
        return await dialog[apiMethod](win, args);
      case 'shell':
        if(apiMethod === 'openExternal'){
            await shell.openExternal(args.url);
            return { success: true };
        }
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

if (isDev) {
  try {
    require('electron-reloader')(module, {
      watch: [
        path.join(appPath, 'manifest.js'),
        path.join(appPath, 'manifest/**/*.js'),
        path.join(appPath, 'app/**/*')
      ]
    });
    console.log('[axle-main] Hot-reloading enabled.');
  } catch (err) {
    console.warn('[axle-main] Could not enable hot-reloading:', err.message);
  }
}

async function createWindow() {
  console.log('[axle-main] Creating application window...');
  const launchConfig = manifest.launch || {};
  const windowConfig = launchConfig.window || {};
  const defaultConfig = { width: 1024, height: 768, devtools: false };
  const config = { ...defaultConfig, ...windowConfig };
  
  const win = new BrowserWindow({
    width: config.width,
    height: config.height,
    title: launchConfig.title || 'axleLLM Application',
    webPreferences: {
      preload: path.join(__dirname, 'core', 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  setupBridge(win);

  try {
    let dbPath;
    if (isDev) {
      dbPath = path.join(appPath, 'axle-db-data');
    } else {
      dbPath = path.join(app.getPath('userData'), 'axle-db-data');
    }

    // ★★★ И МЫ ПЕРЕДАЕМ ЭТОТ ПОЛНОСТЬЮ СОБРАННЫЙ МАНИФЕСТ НАПРЯМУЮ В СЕРВЕР ★★★
    // Сервер больше не будет пытаться читать файлы сам, он получит готовую конфигурацию.
    const { httpServer } = await createServerInstance(appPath, manifest, { dbPath });
    
    const port = await getPort();
    const host = '127.0.0.1';
    
    httpServer.listen(port, host, () => {
        const serverUrl = `http://${host}:${port}`;
        console.log(`[axle-main] Internal server is listening on ${serverUrl}`);
        win.loadURL(serverUrl);
    });
    httpServer.on('error', (err) => { 
        console.error('[axle-main] HTTP Server error:', err);
        throw err; 
    });

  } catch (error) {
    console.error('[axle-main] Failed to create or start internal server:', error);
    if (app.isReady()) {
      dialog.showErrorBox('Startup Error', `Failed to start internal server:\n\n${error.message}`);
    }
    app.quit();
  }

  if (isDev && config.devtools) {
    win.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});