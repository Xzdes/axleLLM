// packages/example-app/manifest.js

const connectors = require('./manifest/connectors.js');
const components = require('./manifest/components.js');
const bridge = require('./manifest/bridge.js');

module.exports = {
  launch: {
    title: "Атомарная Касса (axleLLM)",
    window: { width: 1366, height: 768, devtools: true }
  },
  themes: {
    // ★★★ НАЧАЛО ИЗМЕНЕНИЙ ★★★
    "light": {
      "--primary-bg": "#f0f2f5",
      "--secondary-bg": "#FFFFFF",
      "--text-color": "#1a1a1a",
      "--header-height": "60px",
      "--border-color": "#dee2e6",
      "--border-radius": "8px"
    },
    "dark": {
      "--primary-bg": "#18191a",
      "--secondary-bg": "#242526",
      "--text-color": "#e4e6eb",
      "--header-height": "60px",
      "--border-color": "#3a3b3c",
      "--border-radius": "8px"
    }
    // ★★★ КОНЕЦ ИЗМЕНЕНИЙ ★★★
  },
  globals: {
    appName: "Атомарная Касса",
    appVersion: "1.0.0-axle"
  },
  auth: {
    userConnector: 'user', 
    identityField: 'login',
    passwordField: 'passwordHash'
  },
  sockets: {
    "receipt-updates": {
      "watch": "receipt",
      "emit": { "event": "receipt-changed", "payload": "receipt" }
    }
  },
  // Эти строки остаются без изменений
  connectors: connectors,
  components: components,
  bridge: bridge,
  routes: {},
};