# axleLLM Engine

**axleLLM** is a declarative, Node.js-based engine for building native, cross-platform desktop applications using web technologies. It is specifically architected to streamline development in the era of Large Language Models (LLMs) by shifting the paradigm from imperative coding to declarative architecture definition.

With `axleLLM`, the entire application—from data sources and UI components to native OS integrations and business logic—is defined in a single, centralized `manifest.js` file. This approach transforms the LLM from a "junior developer" prone to context-loss errors into a "system architect" that designs robust applications with high predictability and security.

*   **Repository:** [https://github.com/Xzdes/axleLLM](https://github.com/Xzdes/axleLLM)
*   **NPM Package:** [https://www.npmjs.com/package/axle-llm](https://www.npmjs.com/package/axle-llm)

---

## 🎯 Core Philosophy: Architecture Over Code

Modern LLMs excel at generating code snippets but often struggle with the contextual complexity of a multi-file application. `axleLLM` solves this by abstracting away the "how" (imperative code) and focusing on the "what" (declarative architecture).

1.  **Declarative by Default:** Instead of writing functions to connect to a database or handle a file dialog, you *declare* these resources and their configurations in the manifest. This allows the underlying implementation to be swapped without altering the application's business logic.

2.  **The Manifest as the Single Source of Truth:** The `manifest.js` file is the complete architectural blueprint of the application. This centralized model provides full context to both human developers and LLMs, dramatically reducing cognitive load and eliminating a wide class of contextual errors.

3.  **Secure by Design:** The web-based UI (Renderer Process) is completely sandboxed from Node.js APIs. All access to the operating system—such as file system interactions or printing—is strictly controlled through a declarative "Native Bridge" defined in the manifest. The LLM cannot generate or execute arbitrary system commands.

> **Result:** A development workflow where an LLM interacts with a single, structured file (`manifest.js`) to produce predictable, secure, and easily verifiable native desktop applications.

---

## 🚀 Getting Started

`axleLLM` is a monorepo containing the core engine and an example application.

*   `packages/axle-llm`: The core engine, published to NPM.
*   `packages/example-app`: A fully functional cashier application that demonstrates the engine's capabilities.

### Installation and First Run

To explore the project and run the example application locally:

```bash
# 1. Clone the repository
git clone https://github.com/Xzdes/axleLLM.git
cd axleLLM

# 2. Install all dependencies for the monorepo
# This will install dependencies for the engine and the example app,
# and link them together.
npm install

# 3. Seed the database for the example app
# This populates the local database with products and a default user.
npm run seed --workspace=example-app

# 4. Run the application in development mode
npm run dev```
This will launch the cashier application in a native window with hot-reloading enabled.

### Development Workflow: The Validate-Launch Loop

The core of the `axleLLM` development experience is its integrated workflow. Any change begins with editing the manifest and ends with a validation check.

#### **Step 1: Modify the Manifest**
All application features—from adding a new UI component to defining a new native function—start in `manifest.js` or its constituent parts in the `/manifest` directory.

#### **Step 2: Run the Development Server**
The validation process is integrated directly into the development command.

```bash
# This single command runs the validator first, then launches the app.
npm run dev
```

*   **On Success:** If the manifest is architecturally sound, the application window launches.
*   **On Failure:** The launch is aborted, and a clear, actionable list of errors is printed to the console, often with "Did you mean...?" suggestions for typos.

While running, the engine watches for file changes. When a file is saved, the validator runs again. If it passes, the application is hot-reloaded. If it fails, the error is printed to the console without crashing the running application.

---

## 📖 The `manifest.js` Blueprint

The `manifest.js` file is the heart of every `axleLLM` application. It is a standard Node.js module that exports a single configuration object.

### Key Sections

| Section | Description |
| :--- | :--- |
| **`launch`** | Configures the main application window, native menu, and system tray icon. |
| **`globals`** | Defines global variables accessible in all UI components via Mustache syntax. |
| **`auth`** | Sets the fundamental parameters for the authentication system. |
| **`sockets`** | Configures real-time WebSocket channels for live UI updates. |
| **`connectors`** | Declares all data sources (`wise-json-db`, `in-memory`) for the application. |
| **`components`** | Registers all UI "building blocks"—HTML templates and their scoped CSS styles. |
| **`bridge`** | The **Declarative Native Bridge**. A whitelist of all native OS functions the application is permitted to call. |
| **`routes`** | The application's brain. Maps `view` routes to UI compositions and `action` routes to business logic defined by `steps`. |

### Logic via `steps`

Business logic is not written in traditional functions but is declared as an array of sequential `steps` within an `action` route.

**Available Steps:**
*   `{ "set": "path.to.variable", "to": "expression" }`: Assigns a value.
*   `{ "if": "condition", "then": [...], "else": [...] }`: Conditional logic.
*   `{ "run": "scriptName" }`: Executes an external JavaScript file from `app/actions/` for complex logic.
*   `{ "action:run": { "name": "routeName" } }`: Calls another `action` route, enabling reusable logic.
*   `{ "bridge:call": { "api": "bridge.api.name", "args": {...} } }`: **Invokes a native function** defined in the `bridge`.
*   `{ "auth:login": "userObject" }`: Creates a user session.
*   `{ "auth:logout": true }`: Destroys the current user session.
*   `{ "client:redirect": "'/path'" }`: Triggers a client-side SPA navigation.

---

## 🏛️ UI and Theming

The UI is rendered using a "HTML-over-the-wire" approach. The server sends fully rendered HTMLpartials to the client, which intelligently swaps them into the DOM.

### Atomic Attributes
Plain HTML is enhanced with special `atom-*` attributes:
*   `atom-action="METHOD /url"`: Triggers an `action` route on the server.
*   `atom-target="#css-selector"`: Specifies which DOM element to update with the response.
*   `atom-event="input"`: Defines which event triggers the action (default is `click` or `submit`).
*   `atom-socket="channelName"`: Subscribes a component to a WebSocket channel for live updates.
*   `atom-on-event="eventName"`: Triggers an `atom-action` when a specific event is received via WebSocket.

### Server-Side Rendering Directives
*   `atom-if="condition"`: An attribute that conditionally includes or removes an HTML element on the server before it is sent to the client.

### Declarative Theming
`axleLLM` promotes a declarative theming system via the `themes` section in `manifest.js`. You define theme variables (colors, sizes) in the manifest, and the engine makes them available as CSS variables (`var(--primary-bg)`) in all component stylesheets, allowing an LLM to change the application's entire look and feel by modifying a single object.

---

## 🔮 Future Roadmap

*   [ ] **Full Native Bridge Implementation:** Build out the handlers for the declared `bridge` APIs (`dialogs`, `printer`, `shell`).
*   [ ] **Interactive CLI:** Create a `generate` command (`axle-cli generate component...`) to scaffold new files.
*   [ ] **Packaging and Distribution:** Implement the `npm run package` command using `electron-builder` to create distributable `.exe`, `.dmg`, and `.AppImage` files.
*   [ ] **Comprehensive Documentation:** Create a dedicated documentation website.

This project is an experiment in the future of human-AI collaboration, aimed at building reliable and predictable software systems. Contributions and ideas are welcome.