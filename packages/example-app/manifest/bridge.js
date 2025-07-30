// packages/example-app/manifest/bridge.js
module.exports = {
  "dialogs": {
    "showMessageBox": true,
    "showOpenDialog": true,
    // ★★★ РАЗРЕШАЕМ НОВЫЙ ВЫЗОВ (КЛИЕНТСКИЙ МОСТ) ★★★
    "showSaveDialog": true
  },
  "printer": {},
  "shell": {
    "openExternal": true
  },
  // ★★★ РЕГИСТРИРУЕМ НАШ НОВЫЙ МОДУЛЬ (СЕРВЕРНЫЙ МОСТ) ★★★
  "custom": {
    "fileUtils": "file-utils.js"
  }
};