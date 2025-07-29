// packages/example-app/manifest.js
// ИЗМЕНЕНИЕ: Мы используем стандартный `require` для сборки частей.
// Это стандартный и надежный подход в Node.js.

const connectors = require('./manifest/connectors.js');
const components = require('./manifest/components.js');
const bridge = require('./manifest/bridge.js');
const routes = require('./manifest/routes.js');

module.exports = {
  // --- Секция 1: Конфигурация Запуска и Окна ---
  launch: {
    title: "Атомарная Касса (axleLLM)",
    window: {
      width: 1366,
      height: 768,
      devtools: true
    }
  },

  // --- Секция 2: Глобальные Переменные ---
  globals: {
    appName: "Атомарная Касса",
    appVersion: "1.0.0-axle"
  },
  
  // --- Секция 3: Настройки Аутентификации ---
  auth: {
    userConnector: 'user', 
    identityField: 'login',
    passwordField: 'passwordHash'
  },
  
  // --- Секция 4: WebSocket для Real-time ---
  sockets: {
    "receipt-updates": {
      "watch": "receipt",
      "emit": {
        "event": "receipt-changed",
        "payload": "receipt"
      }
    }
  },

  // --- Секция 5: Подключение Модульных Частей ---
  
  connectors: connectors,
  components: components,
  bridge: bridge,
  routes: routes,
};