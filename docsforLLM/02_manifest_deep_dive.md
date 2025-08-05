# AxleLLM: Manifest Deep Dive

**Objective:** This document serves as the definitive technical reference for all files within the `manifest/` directory. It provides the precise syntax, properties, capabilities, and expected values for each architectural layer of an AxleLLM application.

---

## 1. Root Manifest (`manifest.js`)

This file defines the application's global configuration. It exports a single JavaScript object. The engine automatically discovers and merges the contents of the `manifest/` subdirectory files (`connectors.js`, `components.js`, etc.) into this root object.

| Section  | Required | Description                                                                                             |
| :------- | :------- | :------------------------------------------------------------------------------------------------------ |
| `launch`   | Yes      | An object that configures the main application window's appearance and properties.                     |
| `themes`   | No       | An object that defines global CSS variables for declarative application theming.                      |
| `globals`  | No       | An object that defines global string variables, which are made accessible in all UI components via `props.globals`. |
| `auth`     | No       | An object that enables and configures the built-in authentication system.                                |
| `sockets`  | No       | An object that configures WebSocket channels for broadcasting real-time UI updates between clients.   |

### `launch` Object

This object configures the primary `BrowserWindow` instance created by Electron on startup.

| Key     | Type   | Required | Description                                       |
| :------ | :----- | :------- | :------------------------------------------------ |
| `title`   | String | No       | The default title displayed in the application window's title bar.      |
| `window`  | Object | No       | An object containing properties related to the window's dimensions and style. |
| `-> width`  | Number | No       | The initial width of the window in pixels. The default value is `1024`. |
| `-> height` | Number | No       | The initial height of the window in pixels. The default value is `768`. |
| `-> devtools`| Boolean| No     | If set to `true`, the Chromium DevTools will be opened automatically on launch. This setting is **only effective in development mode** (`npm run dev`). The default value is `false`. |
| `-> frame` | Boolean| No     | If set to `false`, a frameless window is created (i.e., no native OS title bar, borders, or window controls). This is essential for creating a fully custom application appearance. The default value is `true`. |
| `-> titleBarStyle`| String | No | *(macOS & Windows only)* Controls the style of the title bar. Can be set to `hidden` to hide the title bar and window controls but retain the standard window layout. |
| `-> titleBarColor`| String | No | *(Windows only)* Specifies the background color for the title bar overlay when `titleBarStyle` is set to `hidden`. Accepts standard CSS color formats (e.g., `#FFFFFF`, `rgb(255, 255, 255)`). |
| `-> titleBarSymbolColor`| String | No | *(Windows only)* Specifies the color for the window control symbols (minimize, maximize, close) when a `titleBarOverlay` is active. |

*Example:*
```javascript
"launch": {
  "title": "My Custom Application",
  "window": { 
    "width": 1280, 
    "height": 720, 
    "frame": false, // Use a custom title bar
    "devtools": true 
  }
}
```

---

## 2. Connectors (`manifest/connectors.js`)

This file defines all application data sources. The file must export an object where each key is a unique connector name.

### Connector Types

#### `in-memory`
A volatile data store that resides in the application's memory and is reset upon every application restart. It is ideal for storing temporary UI state, such as form data or filter settings.

| Key            | Type   | Required | Description                               |
| :------------- | :----- | :------- | :---------------------------------------- |
| `type`         | String | Yes      | Must be the literal string `"in-memory"`.                    |
| `initialState` | Object | Yes      | The default object value that the connector will hold upon initialization.       |

*Example:*
```javascript
"viewState": {
  "type": "in-memory",
  "initialState": { "currentQuery": "", "filteredItems": [] }
}
```

#### `wise-json`
A persistent, file-based JSON database powered by the `wise-json-db` library. Data stored in this connector will survive application restarts. It is ideal for core application data such as user profiles, documents, or settings.

| Key            | Type   | Required | Description                                                                 |
| :------------- | :----- | :------- | :-------------------------------------------------------------------------- |
| `type`         | String | Yes      | Must be the literal string `"wise-json"`.                                                      |
| `collection`   | String | No       | The name of the subdirectory within `axle-db-data/` where this data will be stored. If omitted, it defaults to the connector's name.  |
| `initialState` | Object | No       | The default object structure for the data. This is applied only if the persistent store is empty or does not exist.                 |
| `migrations`   | Array  | No       | An array of rule objects used to update the data structure on-the-fly during a `read` operation. See the `Migrator` documentation for rule syntax.                |

*Example:*
```javascript
"receipts": {
  "type": "wise-json",
  "collection": "user_receipts",
  "initialState": { "items": [], "total": 0 }
}
```

---

## 3. Components (`manifest/components.js`)

This file serves as the central registry for all React UI components. The engine uses this registry to locate component source files and to enforce data contracts. The file must export an object where each key is a unique component name.

| Key        | Type          | Required | Description                                                                    |
| :--------- | :------------ | :------- | :----------------------------------------------------------------------------- |
| `template`   | String        | Yes      | The path to the component's source file (`.jsx`), relative to the `packages/app/app/components/` directory. The filename is expected to be in `kebab-case`. |
| `style`      | String        | No       | The path to the component's CSS file (`.css`), relative to `packages/app/app/components/`. CSS is automatically scoped to the component. |
| `schema`     | Object        | No       | A data contract that defines the component's data dependencies. The Super Validator enforces this contract.                                          |
| `-> requires`| Array<String> | No       | A list of connector names this component requires to render correctly. The validator will raise an error if a `view` route uses this component but does not provide all required connectors in its `reads` array. |
| `-> variables`| Object        | No       | **For documentation purposes only.** This object describes the `props` the component uses, providing a clear reference for human and LLM architects. It is not processed by the engine. |

*Example:*
```javascript
"userProfile": {
  "template": "user-profile.jsx",
  "style": "user-profile.css",
  "schema": {
    "requires": ["user", "preferences"],
    "variables": {
      "props.data.user.name": "String",
      "props.data.preferences.theme": "String"
    }
  }
}```

---

## 4. Routes (`manifest/routes/`)

This directory defines all application logic. The engine discovers and merges all exported objects from all `.js` files within this directory. Each key must be a unique route signature (e.g., `"GET /"` or `"POST /action/addItem"`).

### Route Types

#### `view`
A route that renders a UI screen. It is triggered by a `GET` request.

| Key      | Type          | Required | Description                                                               |
| :------- | :------------ | :------- | :------------------------------------------------------------------------ |
| `type`     | String        | Yes      | Must be the literal string `"view"`.                                                         |
| `layout`   | String        | Yes      | The name of the main layout component (as defined in `components.js`) to be used as the page frame.           |
| `reads`    | Array<String> | No       | A list of connector names to load. The data from these connectors will be aggregated and made available to the UI as `props.data`. |
| `inject`   | Object        | No       | An object that maps placeholders in the `layout` component to other component names. These injected components are passed to the layout via `props.components`. |
| `auth`     | Object        | No       | If present, protects the route, requiring authentication. Contains `required: true` and an optional `failureRedirect: '/login'` path. |

*Example:*
```javascript
"GET /": {
  "type": "view",
  "layout": "mainLayout",
  "reads": ["user", "receipts", "products", "viewState"],
  "inject": {
    "header": "headerComponent",
    "pageContent": "cashierPage"
  },
  "auth": { "required": true, "failureRedirect": "/login" }
}
```

#### `action`
A route that executes business logic. It is typically triggered by a `POST` request from a UI element.

| Key       | Type          | Required | Description                                                                                                   |
| :-------- | :------------ | :------- | :------------------------------------------------------------------------------------------------------------ |
| `type`      | String        | Yes      | Must be the literal string `"action"`.                                                                                           |
| `reads`     | Array<String> | No       | A list of connector names to load for read-only access. Their data will be available in the `data` object within the `steps` execution context.             |
| `writes`    | Array<String> | No       | A list of connector names that can be modified. The engine automatically persists any changes made to these connectors after the `steps` array completes execution.    |
| `steps`     | Array<Object> | Yes      | The sequence of operations to perform. See the "Execution Context" documentation for step syntax.                                                                        |
| `update`    | String        | No       | The name of a component (as defined in `components.js`) to re-render and send to the client after the action completes. This is the primary mechanism for UI updates.                       |
| `internal`  | Boolean       | No       | If set to `true`, this is a helper action that cannot be called via an HTTP request but can be called by other actions using the `action:run` step. |
| `auth`      | Object        | No       | If present, protects the action, preventing execution if the user is not authenticated.                                                                              |

---

## 5. Bridge (`manifest/bridge.js`)

This file is the security whitelist for all native OS interactions. No native functionality is accessible unless explicitly permitted here.

### `dialogs` Object
Grants the application access to methods from Electron's `dialog` module.

| Key                | Type    | Description                               |
| :----------------- | :------ | :---------------------------------------- |
| `showMessageBox`   | Boolean | Allows showing a simple native message box.      |
| `showOpenDialog`   | Boolean | Allows showing a native dialog to open files or folders. |
| `showSaveDialog`   | Boolean | Allows showing a native dialog to save a file.   |

### `shell` Object
Grants the application access to methods from Electron's `shell` module.

| Key            | Type    | Description                                            |
| :------------- | :------ | :----------------------------------------------------- |
| `openExternal` | Boolean | Allows opening a given URL in the user's default browser. |

### `window` Object
Grants the application access to methods of the main `BrowserWindow` instance. This is essential for creating custom title bars in frameless windows.

| Key | Type | Description |
| :--- | :--- | :--- |
| `minimize` | Boolean | Allows programmatically minimizing the application window. |
| `maximize` | Boolean | Allows programmatically maximizing or restoring the application window. |
| `close` | Boolean | Allows programmatically closing the application window. |

### `custom` Object
Registers your custom server-side Node.js modules located in the `packages/app/app/bridge/` directory, making their exported functions available to the `bridge:call` step. The key serves as an alias, and the value is the filename.

*Example:*
```javascript
"custom": {
  "fileUtilities": "file-utils.js",
  "printerDriver": "printer-driver.js"
}
```

---

## 6. Execution Context in `steps`

When an `action` route is executed, the `ActionEngine` provides a temporary context object. All `steps` operate on this object.

| Top-Level Key | Description                                                                                                 | Example Usage in `to` or `if` expressions |
| :------------ | :---------------------------------------------------------------------------------------------------------- | :------------------------------------- |
| `data`        | An object containing the data from all connectors listed in the route's `reads` array. This is where the application's state is read from and written to. | `"data.user.name"`                     |
| `body`        | An object containing data sent from the client, typically from HTML form `name` attributes.              | `"body.newName"`                       |
| `user`        | If `auth` is enabled, this object contains the data of the currently logged-in user. It is `null` otherwise.      | `"user.role === 'admin'"`              |
| `context`     | A scratchpad object for storing temporary values between steps. It is initialized as an empty object `{}` at the start of an action.      | `"context.tempValue * 2"`              |
| `error`       | **Only available inside a `catch` block.** An object containing `{ message, stack }` of the error that occurred in the `try` block. | `error.message`                        |