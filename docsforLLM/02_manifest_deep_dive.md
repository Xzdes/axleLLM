# AxleLLM Manifest Deep Dive for LLM

This document is the definitive API reference for the `manifest.js` file. Use it to understand the syntax and capabilities of each section.

---

## 1. Top-Level Sections

| Section | Required | Description |
| :--- | :--- | :--- |
| `launch` | Yes | Configures the main application window (title, size). |
| `themes` | No | Defines global CSS variables for declarative theming. |
| `globals`| No | Defines global string variables accessible in all UI components via `{{ globals.varName }}`. |
| `auth` | No | Configures the built-in authentication system. |
| `sockets`| No | Configures WebSocket channels for real-time UI updates. |
| `connectors` | Yes | Declares all application data sources. |
| `components` | Yes | Registers all UI components and their data schemas. |
| `bridge` | No | Whitelists all native OS functions and custom server modules. |
| `routes` | Yes | Defines all application views and business logic actions. |

---

## 2. Section Details

### `connectors`
Defines data sources. Each key is a unique connector name.

**Types:**
- **`in-memory`**: A volatile data store that resets on application restart. Ideal for temporary UI state.
  - `type`: "in-memory"
  - `initialState`: (Object) The default value of the connector. Highly recommended.
- **`wise-json`**: A persistent, file-based JSON database. Data survives restarts. Ideal for application data.
  - `type`: "wise-json"
  - `collection`: (String) The subdirectory name for this data. Defaults to the connector name.
  - `initialState`: (Object) The default structure for the data.
  - `migrations`: (Array) Rules to update data structure on the fly.

*Example:*
```javascript
"connectors": {
  "viewState": { "type": "in-memory", "initialState": { "query": "" } },
  "receipt": { "type": "wise-json", "initialState": { "items": [], "total": 0 } }
}
```

### `components`
Registers UI components and their data contracts.

**Properties:**
- `template`: (String) Path to the `.html` file relative to `app/components/`.
- `style`: (String, optional) Path to the `.css` file. CSS rules are automatically scoped to this component.
- `schema`: (Object, optional) The data contract for the component.
  - `requires`: (Array<String>) A list of connector names this component needs to render correctly. The validator will enforce this.
  - `variables`: (Object, for documentation) A description of the Mustache variables used in the template.

*Example:*
```javascript
"components": {
  "receipt": {
    "template": "receipt.html",
    "style": "receipt.css",
    "schema": {
      "requires": ["receipt", "user"]
    }
  }
}```

### `routes`
Defines application logic. Each key is a route signature, e.g., `"GET /"` or `"POST /action/addItem"`.

**Types:**
- **`view`**: Renders a UI screen.
  - `type`: "view"
  - `layout`: (String) The name of the main layout component.
  - `reads`: (Array<String>) A list of connector names to load and make available to the UI. **Must satisfy all schemas of all used components.**
  - `inject`: (Object) Maps placeholders in the layout (`<atom-inject into="placeholderName">`) to component names.
- **`action`**: Executes business logic.
  - `type`: "action"
  - `reads`: (Array<String>) Connectors to load for reading.
  - `writes`: (Array<String>) Connectors to modify. The engine automatically saves changes to these connectors after the steps complete.
  - `steps`: (Array<Object>) The sequence of operations to perform.
  - `update`: (String, optional) The name of a component to re-render and send to the client after the action completes.
  - `internal`: (Boolean, optional) If `true`, this is a helper action that can only be called by other actions via `action:run`.

---

## 3. `steps` API Reference

This is the core of your work. `steps` are executed sequentially on the server.

| Step | Description & Properties |
| :--- | :--- |
| **`log`** | Prints a static message to the server console for debugging. `{ "log": "User logged in" }` |
| **`log:value`** | Prints the value of a context variable to the server console. `{ "log:value": "data.receipt.total" }` |
| **`set`** | Assigns a value to a variable in the context. `{ "set": "data.receipt.total", "to": "100.50" }` |
| **`if`** | Executes `then` or `else` blocks based on a condition. `{ "if": "data.user.isAdmin", "then": [...], "else": [...] }` |
| **`run`** | Executes a script from `app/actions/` with side effects. The script receives `(context, body)`. `{ "run": "updateLegacySystem" }` |
| **`run:set`** | Executes a pure function from `app/actions/` and sets its return value. `{ "run:set": "data.user.fullName", "handler": "formatName", "with": "[data.user.first, data.user.last]" }` |
| **`action:run`** | Executes another `action` route defined as `internal: true`. `{ "action:run": { "name": "recalculateReceiptLogic" } }` |
| **`try/catch`** | Executes `try` steps. If any fail, executes `catch` steps. The error object is available as `context.error`. `{ "try": [...], "catch": [...] }` |
| **`bridge:call` (Client)** | Sends a command to the client-side native bridge. `{ "bridge:call": { "api": "dialogs.showMessageBox", "args": "{ title: 'Hi' }" } }` |
| **`bridge:call` (Client, Await)** | Sends a command to the client, pauses execution, and waits for a result. The `action` resumes when the client sends the result back. `{ "bridge:call": { "api": "dialogs.showSaveDialog", "args": "{}", "await": true, "resultTo": "context.savePath" } }` |
| **`bridge:call` (Server)** | Executes a method from a custom Node.js module in `app/bridge/` immediately on the server. The module must be registered in `manifest/bridge.js`. `{ "bridge:call": { "api": "custom.fiscalPrinter.printReceipt", "args": "[data.receipt]", "resultTo": "context.printResult" } }` |
| **`auth:login`** | Creates a session for the specified user object. `{ "auth:login": "context.userToLogin" }` |
| **`auth:logout`** | Destroys the current user session. `{ "auth:logout": true }` |
| **`client:redirect`** | Triggers a client-side SPA navigation to a new view. `{ "client:redirect": "'/dashboard'" }` |
