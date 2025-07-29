// packages/axle-llm/main.js

const { app, BrowserWindow } = require('electron');
const path = require('path');

const { startServer } = require('./core/server');
// ИЗМЕНЕНИЕ: Используем наш новый загрузчик
const { loadManifest } = require('./core/config-loader');

const isDev = process.argv.includes('--dev');

const appPath = process.argv[2]; 
if (!appPath) {
  console.error('[axle-main] Critical: Application path was not provided. Exiting.');
  process.exit(1);
}

// ИЗМЕНЕНИЕ: Используем наш новый загрузчик
const manifest = loadManifest(appPath);

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
  const defaultConfig = {
    width: 1024,
    height: 768,
    devtools: false
  };
  const config = { ...defaultConfig, ...windowConfig };

  const win = new BrowserWindow({
    width: config.width,
    height: config.height,
    title: launchConfig.title || 'axleLLM Application',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  try {
    const serverUrl = await startServer(appPath, manifest);
    console.log(`[axle-main] Internal server started. Loading URL: ${serverUrl}`);
    win.loadURL(serverUrl);
  } catch (error) {
    console.error('[axle-main] Failed to start internal server:', error);
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