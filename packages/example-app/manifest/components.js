// packages/example-app/manifest/components.js
module.exports = {
  "mainLayout": {
    "template": "main-layout.jsx",
    "style": "main-layout.css",
    "schema": {
      "requires": ["settings"]
    }
  },
  
  "authLayout": {
    "template": "auth-layout.jsx",
    "style": "auth-layout.css"
  },
  
  "cashierPage": {
    "template": "cashier-page.jsx",
    "style": "cashier-page.css"
  },
  
  "header": {
    "template": "header.jsx",
    "schema": { "requires": ["user"] }
  },
  
  "loginForm": {
    "template": "login-form.jsx"
  },
  
  "registerForm": {
    "template": "register-form.jsx"
  },
  
  "receipt": {
    "template": "receipt.jsx",
    "style": "receipt.css",
    "schema": { "requires": ["receipt"] }
  },
  
  "positionsList": {
    "template": "positions-list.jsx",
    "style": "positions-list.css",
    "schema": { "requires": ["positions", "viewState"] }
  }
};