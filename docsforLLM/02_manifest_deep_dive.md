# AxleLLM: Manifest Deep Dive

**Objective:** This document is the definitive technical reference for all files within the `manifest/` directory. It provides the precise syntax, properties, and capabilities of each architectural layer.

---

## 1. Root Manifest (`manifest.js`)

This file defines the application's global configuration.

| Section  | Required | Description                                                                                             |
| :------- | :------- | :------------------------------------------------------------------------------------------------------ |
| `launch`   | Yes      | An object configuring the main application window.                                                      |
| `themes`   | No       | An object defining global CSS variables for declarative theming.                                        |
| `globals`  | No       | An object defining global string variables accessible in all UI components via `props.globals`. |
| `auth`     | No       | An object configuring the built-in authentication system.                                               |
| `sockets`  | No       | An object configuring WebSocket channels for real-time UI updates.                                      |

### `launch` Object

| Key     | Type   | Required | Description                                       |
| :------ | :----- | :------- | :------------------------------------------------ |
| `title`   | String | No       | The default title of the application window.      |
| `window`  | Object | No       | An object containing window dimension properties. |
| `-> width`  | Number | No       | The initial width of the window in pixels. Default: `1024`. |
| `-> height` | Number | No       | The initial height of the window in pixels. Default: `768`. |
| `-> devtools`| Boolean| No       | If `true`, opens DevTools on launch in dev mode. Default: `false`. |

*Example:*
```javascript
"launch": {
  "title": "My Awesome App",
  "window": { "width": 1280, "height": 720, "devtools": true }
}
```

---

## 2. Connectors (`manifest/connectors.js`)

This file defines all application data sources. The file exports an object where each key is a unique connector name.

### Connector Types

#### `in-memory`
A volatile data store that resets on every application restart. Ideal for temporary UI state.

| Key            | Type   | Required | Description                               |
| :------------- | :----- | :------- | :---------------------------------------- |
| `type`         | String | Yes      | Must be `"in-memory"`.                    |
| `initialState` | Object | Yes      | The default value of the connector.       |

*Example:*
```javascript
"viewState": {
  "type": "in-memory",
  "initialState": { "currentQuery": "", "filteredItems": [] }
}
```

#### `wise-json`
A persistent, file-based JSON database powered by `wise-json-db`. Data survives application restarts. Ideal for core application data.

| Key            | Type   | Required | Description                                                                 |
| :------------- | :----- | :------- | :-------------------------------------------------------------------------- |
| `type`         | String | Yes      | Must be `"wise-json"`.                                                      |
| `collection`   | String | No       | The subdirectory name for this data store. Defaults to the connector name.  |
| `initialState` | Object | No       | The default structure for the data if the store is empty.                 |
| `migrations`   | Array  | No       | An array of rules to update the data structure on-the-fly.                |

*Example:*
```javascript
"receipt": {
  "type": "wise-json",
  "initialState": { "items": [], "total": 0 }
}
```

---

## 3. Components (`manifest/components.js`)

This file registers all React UI components and defines their data contracts. The file exports an object where each key is a unique component name.

| Key        | Type          | Required | Description                                                                    |
| :--------- | :------------ | :------- | :----------------------------------------------------------------------------- |
| `template`   | String        | Yes      | Path to the `.jsx` file, relative to `app/components/`.                       |
| `style`      | String        | No       | Path to the `.css` file, relative to `app/components/`. CSS is automatically scoped. |
| `schema`     | Object        | No       | The data contract for this component.                                          |
| `-> requires`| Array<String> | No       | A list of connector names this component needs to render. **The validator enforces this.** |
| `-> variables`| Object        | No       | **For documentation only.** Describes the props used in the component. |

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
}
```

---

## 4. Routes (`manifest/routes/`)

This directory defines all application logic. The engine merges all exported objects from `.js` files in this directory. Each key is a route signature (e.g., `"GET /"` or `"POST /action/addItem"`).

### Route Types

#### `view`
Renders a UI screen.

| Key      | Type          | Required | Description                                                               |
| :------- | :------------ | :------- | :------------------------------------------------------------------------ |
| `type`     | String        | Yes      | Must be `"view"`.                                                         |
| `layout`   | String        | Yes      | The name of the main layout component to use as the page frame.           |
| `reads`    | Array<String> | No       | A list of connector names to load and make available to the UI as `props.data`. |
| `inject`   | Object        | No       | Maps placeholders in the layout to component names to be injected. The injected components are passed to the layout via `props.components`. |
| `auth`     | Object        | No       | If present, protects the route.                                           |

*Example:*
```javascript
"GET /": {
  "type": "view",
  "layout": "mainLayout",
  "reads": ["user", "receipt", "positions", "viewState"],
  "inject": {
    "header": "header",
    "pageContent": "cashierPage"
  },
  "auth": { "required": true, "failureRedirect": "/login" }
}
```

#### `action`
Executes business logic.

| Key       | Type          | Required | Description                                                                                                   |
| :-------- | :------------ | :------- | :------------------------------------------------------------------------------------------------------------ |
| `type`      | String        | Yes      | Must be `"action"`.                                                                                           |
| `reads`     | Array<String> | No       | Connectors to load for reading. Their data will be available in the `data` object within `steps`.             |
| `writes`    | Array<String> | No       | Connectors to modify. The engine automatically saves changes to these connectors after the steps complete.    |
| `steps`     | Array<Object> | Yes      | The sequence of operations to perform.                                                                        |
| `update`    | String        | No       | The name of a component to re-render and send to the client after the action completes.                       |
| `internal`  | Boolean       | No       | If `true`, this is a helper action that can only be called by other actions via `action:run`. |
| `auth`      | Object        | No       | If present, protects the action.                                                                              |

---

## 5. Bridge (`manifest/bridge.js`)

This file is the security whitelist for all native OS interactions.

### `dialogs` Object
Grants access to Electron's `dialog` module.

| Key                | Type    | Description                               |
| :----------------- | :------ | :---------------------------------------- |
| `showMessageBox`   | Boolean | Allows showing a simple message box.      |
| `showOpenDialog`   | Boolean | Allows showing a dialog to open files/folders. |
| `showSaveDialog`   | Boolean | Allows showing a dialog to save a file.   |

### `shell` Object
Grants access to Electron's `shell` module.

| Key            | Type    | Description                                            |
| :------------- | :------ | :----------------------------------------------------- |
| `openExternal` | Boolean | Allows opening a given URL in the user's default browser. |

### `custom` Object
Registers your custom server-side Node.js modules from `app/bridge/`. The key is the alias used in `bridge:call`, and the value is the filename.

*Example:*
```javascript
"custom": {
  "fileUtils": "file-utils.js",
  "printer": "printer-driver.js"
}
```

---

## 6. Execution Context in `steps`

When an `action` route runs, the engine provides a temporary context object. All `steps` operate on this object.

| Top-Level Key | Description                                                                                                 | Example Usage in `to` or `if` expressions |
| :------------ | :---------------------------------------------------------------------------------------------------------- | :------------------------------------- |
| `data`        | An object containing the data from all connectors listed in the route's `reads` array. This is where you read from and write to your application's state. | `"data.user.name"`                     |
| `body`        | An object containing data sent from the client, typically from an HTML form `name` attributes.              | `"body.newName"`                       |
| `user`        | If `auth` is enabled, this object contains the data of the currently logged-in user. `null` otherwise.      | `"user.role === 'admin'"`              |
| `context`     | A scratchpad object for storing temporary values between steps. It is empty at the start of an action.      | `"context.tempValue * 2"`              |
| `error`       | **Only available inside a `catch` block.** An object containing `{ message, stack }` of the error that occurred. | `error.message`                        |