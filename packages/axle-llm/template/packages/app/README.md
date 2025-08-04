# axleLLM Engine v3.0: The Symbiotic React Framework

**axleLLM** is a declarative engine based on Node.js, Electron, and **React** for creating native, cross-platform desktop applications. Its architecture is specifically engineered for symbiotic collaboration between a **Human and a Large Language Model (LLM)**, shifting the development paradigm from writing imperative code to architecting intelligent, self-analyzing systems.

With `axleLLM`, the entire application—from data sources and UI components to OS integration and business logic—is defined in declarative JavaScript files within the `manifest/` directory. This approach elevates the LLM from a simple code generator to a true **System Architect** that designs, debugs, and extends robust and secure applications.

*   **Repository:** [https://github.com/Xzdes/axleLLM](https://github.com/Xzdes/axleLLM)
*   **NPM Package:** [https://www.npmjs.com/package/axle-llm](https://www.npmjs.com/package/axle-llm)

---

## 🚀 Quick Start: First Application in 60 Seconds

Creating a new native desktop application is a deterministic, three-step process. Prerequisite: Node.js must be installed.

1.  **Create a New Application**
    Execute the following command in any directory:
    ```bash
    npx axle-llm new my-desktop-app
    ```

2.  **Navigate and Install Dependencies**
    ```bash
    cd my-desktop-app
    npm install
    ```

3.  **Launch in Development Mode**
    ```bash
    npm run dev
    ```
Execution will complete when a native application window appears. The environment is now running with hot-reloading and a built-in architectural validator.

---

## 🏛️ Project Structure Overview

The `npx axle-llm new` command generates a monorepo structure. All architectural work is to be performed within the `app` and `manifest` directories of the `packages/app` workspace.

```
my-desktop-app/
├── app/
│   ├── actions/      # Imperative JS modules for complex, reusable logic.
│   ├── bridge/       # Custom Node.js modules for OS-level interaction.
│   └── components/   # All React components (.jsx) and their stylesheets (.css).
│
├── manifest/
│   ├── bridge.js     # Whitelist for permitted native OS functions.
│   ├── components.js # Registry for all UI components.
│   ├── connectors.js # Definition of all data sources.
│   └── routes/       # The application's core logic: views and actions.
│
├── manifest.js       # Root manifest: window settings, themes, global variables.
└── package.json      # Project dependencies and scripts.
```

---

## 📖 Architectural Blueprint: The `manifest` Directory

The `manifest` directory is the brain of an `axleLLM` application. The engine automatically discovers and composes all files within this directory. The architect's role is to describe *what* the application does within these files.

### Core Manifest Sections

| Section      | Description                                                                 |
| :----------- | :-------------------------------------------------------------------------- |
| **`launch`**   | Configures the main application window (in `manifest.js`).                  |
| **`themes`**   | A declarative theming system via CSS variables (in `manifest.js`).          |
| **`globals`**  | Global variables accessible in UI components via `props.globals` (in `manifest.js`). |
| **`connectors`** | Declares all data sources (`wise-json-db`, `in-memory`).                    |
| **`components`** | Registers React components (.jsx) and defines their **Data Schemas (`schema`)**. |
| **`bridge`**   | Whitelists all OS functions and custom server-side modules accessible to the application. |
| **`routes`**   | The application's brain. Links URLs and `action`s to UI and business logic. |

### Business Logic via `steps`

All business logic within the `routes` section is described as a sequential array of `steps`. This is a secure, declarative method for defining complex logic.

**Available Step Operations:**

| Step Signature                                           | Description                                                                              |
| :------------------------------------------------------- | :--------------------------------------------------------------------------------------- |
| `{ "set": "path.to.key", "to": "expression" }`             | Assigns a value to a variable in the execution context.                                  |
| `{ "if": "condition", "then": [...], "else": [...] }`      | Conditional branching of the logic flow.                                                 |
| `{ "run": "scriptName" }`                                 | Executes a JS file from `app/actions/` for complex logic (with side-effects).            |
| `{ "run:set": "path", "handler": "script", "with": [...] }` | Executes a pure function from `app/actions/` and stores its return value.                |
| `{ "action:run": { "name": "routeName" } }`                 | Invokes another `action` route, enabling the creation of reusable subroutines.         |
| `{ "bridge:call": { ... } }`                               | Invokes a Native Bridge function (either Client-Side or Server-Side).                    |
| `{ "try": [...], "catch": [...] }`                          | Enables error handling and recovery within the logic flow.                               |
| `{ "log": "message" }` / `{ "log:value": "path" }`          | **Declarative Debugging.** Outputs a message or a variable's value to the server console. |
| `{ "client:redirect": "'/path'" }`                         | Performs client-side SPA navigation.                                                     |

---

## 🔬 The Intelligent Validator and Component Schemas

Before launching, `axleLLM` **validates** the entire application architecture. The built-in "Super Validator" analyzes all manifest files for logical consistency. By using **Component Schemas**, the engine understands "data contracts" and prevents data-related errors at design time.

*Schema Example in `manifest/components.js`:*
```javascript
"receipt": { 
  "template": "receipt.jsx", // Reference to the JSX file
  "style": "receipt.css",
  "schema": {
    // The validator will enforce that any route using this component
    // must provide the 'receipt' connector in its 'reads' section.
    "requires": ["receipt"],
    // This section serves as documentation for the LLM.
    "variables": {
      "props.data.receipt.items": "Array<{name, price}>"
    }
  }
}
```

---

## 🏛️ The Intelligent Native Bridge

The Bridge is the single, strictly controlled channel for interacting with the operating system, secured by a whitelist in `manifest/bridge.js`.

**1. Client-Side Bridge (OS UI):** Manages dialogs and the OS shell. It can be interactive.

*Interactive Call Example:*```javascript
"steps": [
  // 1. Pause execution, show a save file dialog to the user.
  {
    "bridge:call": {
      "api": "dialogs.showSaveDialog",
      "await": true, // <--- This flag is critical.
      "resultTo": "context.saveDialogResult"
    }
  },
  // 2. This step will only execute AFTER the user has closed the dialog.
  { "if": "!context.saveDialogResult.canceled", "then": [ /* ... */ ] }
]
```

**2. Server-Side Bridge (Custom Node.js Modules):** Integrates any complex Node.js logic (file system access, hardware interaction, third-party APIs) from the `app/bridge/` directory.

```javascript
// manifest/bridge.js
"custom": { "fileUtils": "file-utils.js" },

// manifest/routes/some.routes.js
"POST /save-file": {
  "type": "action",
  "steps": [{
    "bridge:call": {
      "api": "custom.fileUtils.saveTextFile",
      "args": "['./report.txt', body.text]"
    }
  }]
}
