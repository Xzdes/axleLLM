// packages/example-app/manifest/components.js
module.exports = {
  // --- Макеты (Layouts) ---
  "mainLayout": "main-layout.html",
  "authLayout": { "template": "auth-layout.html" },

  // ★★★ НАЧАЛО ИСПРАВЛЕНИЯ ★★★
  // Мы явно указываем, что у этого компонента есть и шаблон, и стиль.
  // Так как у него нет отдельного CSS-файла, движок поймет,
  // что стили находятся внутри самого .html файла.
  "cashierPage": { 
    "template": "cashier-page.html",
    "style": "cashier-page.html" // Указываем тот же файл
  },
  // ★★★ КОНЕЦ ИСПРАВЛЕНИЯ ★★★

  // --- Компоненты (Components) ---
  "header": "header.html",
  "loginForm": { "template": "login-form.html" },
  "registerForm": { "template": "register-form.html" },
  
  "receipt": { 
    "template": "receipt.html", 
    "style": "receipt.css",
    "schema": {
      "requires": ["receipt"],
      "variables": {
        "data.receipt.statusMessage": "String (optional)",
        "data.receipt.items": "Array<{name, price, quantity}>",
        "data.receipt.itemCount": "Number",
        "data.receipt.total": "String (formatted number)",
        "data.receipt.discountPercent": "Number",
        "data.receipt.discount": "String (formatted number)",
        "data.receipt.finalTotal": "String (formatted number)"
      }
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