// packages/example-app/manifest/components.js
module.exports = {
  // --- Макеты (Layouts) ---
  "mainLayout": "main-layout.html",
  "authLayout": { "template": "auth-layout.html" },

  // --- Страницы (Pages) ---
  "cashierPage": { "template": "cashier-page.html" },

  // --- Компоненты (Components) ---
  "header": "header.html",
  "loginForm": { "template": "login-form.html" },
  "registerForm": { "template": "register-form.html" },
  
  // ★★★ НАЧАЛО НОВОЙ ФУНКЦИОНАЛЬНОСТИ ★★★
  "receipt": { 
    "template": "receipt.html", 
    "style": "receipt.css",
    "schema": {
      // Этот компонент заявляет, что для его работы ОБЯЗАТЕЛЬНО
      // нужен коннектор 'receipt', доступный как data.receipt в шаблоне.
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
  // ★★★ КОНЕЦ НОВОЙ ФУНКЦИОНАЛЬНОСТИ ★★★

  "positionsList": { 
    "template": "positionsList.html", 
    "style": "positionsList.css",
    "schema": {
      // Этот компонент требует ДВА коннектора
      "requires": ["positions", "viewState"]
    }
  }
};