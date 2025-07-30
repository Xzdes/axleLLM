// packages/example-app/manifest/bridge.js
module.exports = {
  "dialogs": {
    "showMessageBox": true,
    // ★★★ РАЗРЕШАЕМ НОВЫЙ ВЫЗОВ ★★★
    "showOpenDialog": true
  },
  "printer": {},
  "shell": {
    // ★★★ РАЗРЕШАЕМ НОВЫЙ ВЫЗОВ ★★★
    "openExternal": true
  },
  "custom": {}
};