// packages/axle-llm/main.js

const { app, BrowserWindow } = require('electron');
const path = require('path');
const { createServerInstance } = require('./core/server');
const { loadManifest } = require('./core/config-loader');
const { default: getPort } = require('get-port');

const isDev = process.argv.includes('--dev');
const appPath = process.argv[2]; 
if (!appPath) {
  console.error('[axle-main] Critical: Application path was not provided. Exiting.');
  process.exit(1);
}
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
  const defaultConfig = { width: 1024, height: 768, devtools: false };
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
    // 1. Создаем экземпляр сервера, но не запускаем.
    const { httpServer } = await createServerInstance(appPath, manifest);
    
    // 2. Находим свободный порт.
    const port = await getPort();
    const host = '127.0.0.1';
    
    // 3. Запускаем прослушивание сервера на этом порту.
    httpServer.listen(port, host, () => {
        const serverUrl = `http://${host}:${port}`;
        console.log(`[axle-main] Internal server is listening on ${serverUrl}`);
        // 4. Только после успешного запуска загружаем URL в окно.
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