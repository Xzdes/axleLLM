// packages/example-app/manifest.js

const connectors = require('./manifest/connectors.js');
const components = require('./manifest/components.js');
const bridge = require('./manifest/bridge.js');
const settingsRoutes = require('./manifest/routes/settings.routes.js');
const authRoutes = require('./manifest/routes/auth.routes.js');
const cashierRoutes = require('./manifest/routes/cashier.routes.js');
const launch = require('./manifest/launch.js');

module.exports = {
  launch: {
    title: launch.title,
    window: launch.window,
    serve: launch.serve,
    build: launch.build,
    hydrate: {
      // Это указывает движку, как обновлять DOM при изменениях
      strategy: 'replace',
      rootSelector: '#root'
    }
  },
  themes: {
    "light": {
      "--primary-bg": "#ffffff",
      "--secondary-bg": "#f8f9fa",
      "--text-color": "#1a1a1a",
      "--text-secondary": "#6c757d",
      "--border-color": "#dee2e6",
      "--header-height": "60px",
      "--border-radius": "8px",
      "--accent-color": "#007bff",
      "--accent-hover": "#0056b3"
    },
    "dark": {
      "--primary-bg": "#1a1a1a",
      "--secondary-bg": "#2d2d2d",
      "--text-color": "#ffffff",
      "--text-secondary": "#b0b0b0",
      "--border-color": "#404040",
      "--header-height": "60px",
      "--border-radius": "8px",
      "--accent-color": "#3a8fff",
      "--accent-hover": "#1a6cd0"
    }
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
  // Регистрируем все компоненты и роуты
  connectors: connectors,
  components: components,
  bridge: bridge,
  routes: {
    ...authRoutes,
    ...cashierRoutes,
    ...settingsRoutes
  },
};