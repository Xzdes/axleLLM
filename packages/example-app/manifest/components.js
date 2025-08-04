// packages/example-app/manifest/components.js
module.exports = {
  // Главный layout приложения. Использует main-layout.jsx.
  "mainLayout": {
    "template": "main-layout.jsx"
  },
  
  // Layout для страниц аутентификации (вход и регистрация).
  "authLayout": {
    "template": "auth-layout.jsx",
    "style": "auth-layout.css"
  },
  
  // Основная страница приложения ("экран кассира").
  "cashierPage": {
    "template": "cashier-page.jsx",
    "style": "cashier-page.css"
  },
  
  // Компонент хедера (шапки) приложения.
  "header": {
    "template": "header.jsx",
    "schema": { "requires": ["user"] }
  },
  
  // Компонент с формой входа.
  "loginForm": {
    "template": "login-form.jsx"
  },
  
  // Компонент с формой регистрации.
  "registerForm": {
    "template": "register-form.jsx"
  },
  
  // Компонент чека (правая колонка).
  "receipt": {
    "template": "receipt.jsx",
    "style": "receipt.css",
    "schema": { "requires": ["receipt"] }
  },
  
  // Компонент списка товаров (левая колонка).
  "positionsList": {
    "template": "positions-list.jsx",
    "style": "positions-list.css",
    "schema": { "requires": ["positions", "viewState"] }
  }
};