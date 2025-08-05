// packages/axle-llm/main.js

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { createServerInstance } = require('./core/server');
const { loadManifest } = require('./core/config-loader');
const getPort = require('get-port');

const isDev = process.argv.includes('--dev');

const appPath = isDev 
  ? process.argv[2]
  : app.getAppPath();

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
    
    const bridgeManifest = manifest.bridge || {};
    const isDialogAllowed = bridgeManifest.dialogs?.[apiMethod] === true;
    const isShellAllowed = bridgeManifest.shell?.[apiMethod] === true;
    // ★★★ НАЧАЛО ИЗМЕНЕНИЙ (1/3) ★★★
    const isWindowAllowed = bridgeManifest.window?.[apiMethod] === true;
    // ★★★ КОНЕЦ ИЗМЕНЕНИЙ (1/3) ★★★
    const isCustomAllowed = bridgeManifest.custom?.[apiGroup] && typeof require(path.join(appPath, 'app', 'bridge', bridgeManifest.custom[apiGroup]))[apiMethod] === 'function';
    
    if (!isDialogAllowed && !isShellAllowed && !isCustomAllowed && !isWindowAllowed) {
      throw new Error(`[axle-bridge] API call blocked: '${api}' is not whitelisted.`);
    }

    switch (apiGroup) {
      case 'dialogs': return await dialog[apiMethod](win, args);
      case 'shell':
        if(apiMethod === 'openExternal'){ await shell.openExternal(args.url || args); return { success: true }; }
        throw new Error(`[axle-bridge] Unknown method '${apiMethod}' in API group '${apiGroup}'.`);
      
      // ★★★ НАЧАЛО ИЗМЕНЕНИЙ (2/3) ★★★
      // Добавляем новую группу API для управления окном
      case 'window':
        switch (apiMethod) {
          case 'minimize': win.minimize(); return { success: true };
          case 'maximize': win.isMaximized() ? win.unmaximize() : win.maximize(); return { success: true };
          case 'close': win.close(); return { success: true };
          default: throw new Error(`[axle-bridge] Unknown method '${apiMethod}' in API group 'window'.`);
        }
      // ★★★ КОНЕЦ ИЗМЕНЕНИЙ (2/3) ★★★

      case 'custom':
        const [_, moduleAlias, methodName] = api.split('.');
        const modulePath = path.join(appPath, 'app', 'bridge', bridgeManifest.custom[moduleAlias]);
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
  
  // Устанавливаем умные дефолты
  const config = { 
    width: 1024, 
    height: 768, 
    devtools: false, 
    frame: true, // По умолчанию рамка есть
    titleBarStyle: 'default', // Стандартный title bar
    ...windowConfig 
  };
  
  const win = new BrowserWindow({
    width: config.width, 
    height: config.height,
    title: launchConfig.title || 'axleLLM Application',
    show: false,
    // ★★★ НАЧАЛО ИЗМЕНЕНИЙ (3/3) ★★★
    // Применяем новые настройки из манифеста
    frame: config.frame,
    titleBarStyle: config.titleBarStyle,
    // Для кастомных title bar'ов на Windows нужны эти опции
    ...(config.titleBarStyle === 'hidden' && process.platform === 'win32' && {
      titleBarOverlay: {
        color: config.titleBarColor || '#ffffff',
        symbolColor: config.titleBarSymbolColor || '#000000',
        height: config.titleBarHeight || 32
      }
    }),
    // ★★★ КОНЕЦ ИЗМЕНЕНИЙ (3/3) ★★★
    webPreferences: { 
      preload: path.join(__dirname, 'core', 'preload.js'),
      // Управляем DevTools через webPreferences для большей безопасности
      devtools: isDev && config.devtools 
    },
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

  // Логика открытия DevTools остается прежней, но теперь она надежнее,
  // так как управляется через webPreferences.
  if (isDev && config.devtools) {
    win.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') { app.quit(); } });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) { createWindow(); } });