# AxleLLM Architecture Overview for LLM

## 1. Core Philosophy

**Objective:** Design and modify native desktop applications by editing a single, declarative JavaScript object: `manifest.js`.

**Your Role:** You are a **System Architect**, not a traditional coder. Your primary task is to describe the application's structure, data flow, and behavior within the `manifest.js` file. Avoid writing complex imperative code; instead, use the declarative "steps" provided by the framework.

**Key Principles:**
- **Single Source of Truth:** The `manifest.js` file is the complete and authoritative definition of the application. All modifications must be made through it.
- **Declarative over Imperative:** Describe *what* the application should do, not *how* it should do it. The AxleLLM engine handles the implementation details.
- **Safety through Whitelisting:** All native OS interactions (file system, dialogs, etc.) are disabled by default. They must be explicitly enabled in the `bridge` section of the manifest. This is a critical security feature.
- **Data-Driven UI:** The user interface is a direct reflection of the data state defined in the `connectors`. To change the UI, you change the data.

## 2. Project Structure

The project is a monorepo with two main packages:

- `packages/axle-llm`: The core engine. **YOU MUST NOT MODIFY FILES IN THIS DIRECTORY.**
- `packages/example-app`: The user application. **ALL YOUR WORK IS DONE WITHIN THIS DIRECTORY.**

### Key Directories in `example-app`:
- `manifest.js`: The central blueprint of the application. It imports and assembles configurations from the `/manifest` directory.
- `manifest/`: Modular parts of the manifest.
  - `connectors.js`: Data source definitions.
  - `components.js`: UI component registry and their data schemas.
  - `routes.js`: View compositions and business logic (`action` steps).
  - `bridge.js`: Native function whitelist.
- `app/components/`: Contains all UI component files (`.html` and `.css`).
- `app/actions/`: Contains JavaScript helper files for complex logic, callable from `run` and `run:set` steps.
- `app/bridge/`: Contains custom Node.js modules for the Server Bridge, callable from `bridge:call` steps.

## 3. High-Level Data Flow

1.  **User Interaction:** A user clicks a UI element with an `atom-action` attribute.
2.  **Action Route:** A corresponding `action` route in `manifest/routes.js` is triggered on the server.
3.  **Data Loading:** The engine reads data from the `connectors` specified in the route's `reads` array.
4.  **Steps Execution:** The engine executes the `steps` array sequentially, modifying the data context. This may involve calculations, calling helper functions (`run:set`), or interacting with the OS (`bridge:call`).
5.  **Data Writing:** The engine writes the modified data back to the `connectors` specified in the route's `writes` array.
6.  **UI Update:** The engine re-renders the UI component specified in the route's `update` property and sends the new HTML to the client. The client intelligently swaps the new HTML into the DOM.