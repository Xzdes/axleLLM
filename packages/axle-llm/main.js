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
  appPath = app.getAppPath();
}

if (!appPath) {
  console.error('[axle-main] Critical: Application path was not provided or could not be determined. Exiting.');
  if (app && typeof app.isPackaged === 'boolean' && !app.isPackaged) {
      dialog.showErrorBox('Critical Error', 'Application path was not provided. Exiting.');
  }
  process.exit(1);
}
const manifest = loadManifest(appPath);

function setupBridge(win) {
  ipcMain.handle('axle:bridge-call', async (event, api, args) => {
    console.log(`[axle-bridge] Received call for API: ${api} with args:`, args);
    
    if (win.isDestroyed()) return;

    const [apiGroup, apiMethod] = api.split('.');
    if (!apiGroup || !apiMethod) {
      throw new Error(`[axle-bridge] Invalid API format: ${api}`);
    }

    const isAllowed = manifest.bridge?.[apiGroup]?.[apiMethod] === true;
    if (!isAllowed) {
      throw new Error(`[axle-bridge] API call blocked by manifest: '${api}' is not whitelisted.`);
    }

    switch (apiGroup) {
      case 'dialogs':
        switch (apiMethod) {
          case 'showMessageBox':
            return await dialog.showMessageBox(win, args);
          case 'showOpenDialog':
            return await dialog.showOpenDialog(win, args);
          default:
            throw new Error(`[axle-bridge] Unknown method '${apiMethod}' in API group '${apiGroup}'.`);
        }
      case 'shell':
        switch (apiMethod) {
          case 'openExternal':
            await shell.openExternal(args.url);
            return { success: true };
          default:
            throw new Error(`[axle-bridge] Unknown method '${apiMethod}' in API group '${apiGroup}'.`);
        }
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
    // ★★★ НАЧАЛО ФИНАЛЬНОГО ИСПРАВЛЕНИЯ ★★★
    let dbPath;
    if (isDev) {
      // В режиме разработки используем локальную папку, которую наполняет seed.js
      dbPath = path.join(appPath, 'axle-db-data');
    } else {
      // В собранном приложении используем папку данных пользователя
      dbPath = path.join(app.getPath('userData'), 'axle-db-data');
    }

    // Передаем вычисленный путь при создании экземпляра сервера.
    const { httpServer } = await createServerInstance(appPath, manifest, { dbPath });
    // ★★★ КОНЕЦ ФИНАЛЬНОГО ИСПРАВЛЕНИЯ ★★★
    
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