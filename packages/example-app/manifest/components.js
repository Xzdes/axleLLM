// packages/example-app/manifest/components.js
module.exports = {
  "main-layout": {
    template: "main-layout.jsx"
  },
  "auth-layout": {
    template: "auth-layout.jsx",
    style: "auth-layout.css"
  },
  "cashier-page": {
    template: "cashier-page.jsx",
    style: "cashier-page.css"
  },
  "header": {
    template: "header.jsx",
    schema: { "requires": ["user"] }
  },
  "login-form": {
    template: "login-form.jsx"
  },
  "register-form": {
    template: "register-form.jsx"
  },
  "receipt": {
    template: "receipt.jsx",
    style: "receipt.css",
    schema: { "requires": ["receipt"] }
  },
  "positions-list": {
    template: "positions-list.jsx",
    style: "positions-list.css",
    schema: { "requires": ["positions", "viewState"] }
  }
};