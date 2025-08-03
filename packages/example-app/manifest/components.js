// packages/example-app/manifest/components.js
module.exports = {
  // --- Макеты (Layouts) ---
  "mainLayout": "main-layout.html",
  "authLayout": "auth-layout.html", // Можно упростить, т.к. стили встроены

  // --- Страницы (Pages) ---
  "cashierPage": "cashier-page.html", // Упрощаем, новая логика сама найдет стили

  // --- Компоненты (Components) ---
  "header": "header.html",
  "loginForm": "login-form.html",
  "registerForm": "register-form.html",
  
  // Компоненты с отдельными CSS файлами остаются как есть
  "receipt": { 
    "template": "receipt.html", 
    "style": "receipt.css",
    "schema": {
      "requires": ["receipt"]
    }
  },
  "positionsList": { 
    "template": "positionsList.html", 
    "style": "positionsList.css",
    "schema": {
      "requires": ["positions", "viewState"]
    }
  }
};