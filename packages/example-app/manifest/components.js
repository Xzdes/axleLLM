// packages/example-app/manifest/components.js
// This file registers all UI components and defines their data contracts.
// With the new React engine, 'template' is no longer needed. The engine
// assumes a compiled component file exists in .axle-build/{componentName}.js

module.exports = {
  // --- Layouts ---
  "main-layout": {
    // No schema needed, it just receives rendered children as props.
  },
  "auth-layout": {
    "style": "auth-layout.css"
  },

  // --- Pages ---
  "cashier-page": {
    "style": "cashier-page.css",
    // It doesn't directly use data, but it's a good practice to know it's a container.
  },

  // --- Components ---
  "header": {
    // The header needs access to globals and the user object.
    // The renderer provides globals and user automatically.
    "schema": {
      "requires": ["user"] // Explicitly state that the 'user' connector is needed
    }
  },

  "login-form": {
    // This component only uses the `url` prop, which is always provided by the renderer.
    // It doesn't need any data from connectors.
  },

  "register-form": {
    // Same as the login form.
  },
  
  "receipt": { 
    "style": "receipt.css",
    "schema": {
      "requires": ["receipt"] // This component REQUIRES the 'receipt' connector data.
    }
  },

  "positions-list": { 
    "style": "positionsList.css",
    "schema": {
      // This component REQUIRES both 'positions' and 'viewState' data.
      "requires": ["positions", "viewState"]
    }
  }
};