// packages/axle-llm/core/preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Мы создаем безопасный "мост" между изолированным миром рендерера (веб-страницей)
// и главным процессом Electron.
// ★★★ ГЛАВНОЕ ИСПРАВЛЕНИЕ: Мы используем ДРУГОЕ имя, чтобы не конфликтовать с основным движком ★★★
contextBridge.exposeInMainWorld('axleBridge', {
  /**
   * Асинхронно вызывает нативную функцию, зарегистрированную в main.js.
   * @param {string} api - Имя API, как оно указано в манифесте (например, 'dialogs.showMessageBox').
   * @param {object} args - Аргументы для функции.
   * @returns {Promise<any>} - Результат выполнения нативной функции.
   */
  call: (api, args) => ipcRenderer.invoke('axle:bridge-call', api, args)
});