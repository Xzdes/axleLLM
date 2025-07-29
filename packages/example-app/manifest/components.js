// packages/example-app/manifest/components.js
module.exports = {
  // --- Макеты (Layouts) ---
  "mainLayout": "main-layout.html",
  "authLayout": { "template": "auth-layout.html" },

  // --- Страницы (Pages) ---
  "cashierPage": { "template": "cashier-page.html" },

  // --- Компоненты (Components) ---
  "header": "header.html", // ★ ИЗМЕНЕНИЕ: Регистрируем новый компонент шапки
  "loginForm": { "template": "login-form.html" },
  "registerForm": { "template": "register-form.html" },
  "receipt": { "template": "receipt.html", "style": "receipt.css" },
  "positionsList": { "template": "positionsList.html", "style": "positionsList.css" }
};