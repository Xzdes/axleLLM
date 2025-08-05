// packages/app/manifest/bridge.js

module.exports = {
  /**
   * Секция для управления стандартными диалоговыми окнами Electron.
   * `true` означает, что вызов этой функции разрешен.
   */
  "dialogs": {
    "showMessageBox": true,
    "showOpenDialog": false, // Оставляем выключенным для безопасности
    "showSaveDialog": false  // Оставляем выключенным для безопасности
  },
  
  /**
   * Секция для управления системной оболочкой.
   */
  "shell": {
    "openExternal": false // По умолчанию запрещаем открывать ссылки
  },
  
  /**
   * Секция для регистрации ваших собственных серверных
   * Node.js модулей из папки /app/bridge/.
   */
  "custom": {}
};