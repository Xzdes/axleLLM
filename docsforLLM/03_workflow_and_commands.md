# AxleLLM: Workflow and Commands

**Objective:** To provide the standard operating procedures for designing and modifying AxleLLM applications. Your role is **System Architect**. You will not write imperative code; you will declare the system's architecture in the `manifest/` directory.

---

## 1. Core Development Loop

All tasks, features, and modifications must follow this strict, sequential workflow.

1.  **Analyze the Request:** Deconstruct the user's goal into architectural requirements. Identify the data, UI components, and logic flows that need to be created or modified.

2.  **Plan Manifest Changes:** Determine which manifest files are affected.
    *   **Data Requirement:** Plan changes in `manifest/connectors.js`.
    *   **UI Requirement:** Plan changes in `manifest/components.js`.
    *   **Business Logic Requirement:** Plan changes in `manifest/routes.js`.
    *   **Native OS Interaction Requirement:** Plan changes in `manifest/bridge.js`.

3.  **Create/Modify Helper Files:** If the architecture requires them, create the necessary atomic files.
    *   UI templates (`.html`, `.css`) go into `app/components/`.
    *   Complex, pure functions (`run:set`) or imperative scripts (`run`) go into `app/actions/`.
    *   Custom Node.js modules for native OS access (`bridge:call`) go into `app/bridge/`.

4.  **Modify Manifest Files:** Implement the planned architectural changes in the `manifest/` directory. Register new components, define new data connectors, and declare new `view` or `action` routes.

5.  **Validate by Running `npm run dev`:** This command is your primary validation and testing tool. The AxleLLM engine will first execute the "Super Validator" against your entire manifest architecture.

6.  **Analyze Validator Output:**
    *   If the output is `✅ Manifest is valid`, the application will launch. Proceed to test the new functionality. Hot-reloading is active.
    *   If the output is `🚨 Found X issues`, read the error messages carefully. The validator provides precise instructions for correction (e.g., `Route 'GET /settings' does not provide required connector 'user-settings' for component 'settingsPage'`).

7.  **Iterate:** Correct the specified errors in the manifest or helper files and return to step 5.

---

## 2. Common Task Playbooks

These are standard architectural patterns for common tasks.

### Task: Add a New View (e.g., "Settings Page")

1.  **Create Component File (`app/`):**
    Create `app/components/settings-page.html`.
    ```html
    <div id="settingsPage-container">
      <h2>Settings</h2>
      <p>Username: {{ data.userSettings.name }}</p>
    </div>
    ```

2.  **Define Connector (`manifest/`):**
    In `manifest/connectors.js`, define the data source.
    ```javascript
    "userSettings": {
      "type": "wise-json",
      "initialState": { "name": "Default User", "theme": "dark" }
    }
    ```

3.  **Register Component & Schema (`manifest/`):**
    In `manifest/components.js`, register the component and its data contract.
    ```javascript
    "settingsPage": {
      "template": "settings-page.html",
      "schema": { "requires": ["userSettings"] }
    }
    ```

4.  **Create View Route (`manifest/`):**
    In `manifest/routes.js`, create the `view` route to render the page.
    ```javascript
    "GET /settings": {
      "type": "view",
      "layout": "mainLayout",
      "reads": ["userSettings"], // Satisfies the schema's 'requires' contract.
      "inject": {
        "pageContent": "settingsPage"
      }
    }
    ```

5.  **Validate:** Run `npm run dev`.

### Task: Add a New Feature (e.g., "Change Username")

1.  **Add UI Element (`app/`):**
    In `app/components/settings-page.html`, add a form.
    ```html
    <form atom-action="POST /action/change-username" atom-target="#settingsPage-container">
      <input name="newName" placeholder="New username">
      <button type="submit">Save</button>
    </form>
    ```

2.  **Create Action Route (`manifest/`):**
    In `manifest/routes.js`, define the business logic.
    ```javascript
    "POST /action/change-username": {
      "type": "action",
      "reads": ["userSettings"],
      "writes": ["userSettings"], // The engine will auto-save changes to this connector.
      "update": "settingsPage",  // Re-render this component and send to client.
      "steps": [
        { "log": "Attempting to change username..." },
        { "set": "data.userSettings.name", "to": "body.newName" }, // 'body' contains form data.
        { "log:value": "data.userSettings" }
      ]
    }
    ```

3.  **Validate:** Run `npm run dev`.

### Task: Add Complex Logic (e.g., "Generate and Save a Report")

1.  **Create Helper Function (`app/`):**
    Create a pure function in `app/actions/generateReport.js`.
    ```javascript
    // Input: user settings object. Output: a formatted string.
    module.exports = (settings) => {
      return `User Report\nName: ${settings.name}\nTheme: ${settings.theme}`;
    };
    ```

2.  **Create Server Bridge Module (`app/`):**
    Create a Node.js module in `app/bridge/fileSaver.js` to interact with the filesystem.
    ```javascript
    const fs = require('fs/promises');
    module.exports = {
      save: async (filePath, content) => { /* ... implementation ... */ }
    };
    ```

3.  **Whitelist Native Functions (`manifest/`):**
    In `manifest/bridge.js`, whitelist the dialog and the custom module.
    ```javascript
    "dialogs": { "showSaveDialog": true },
    "custom": { "fileSaver": "fileSaver.js" }
    ```

4.  **Create Orchestrating `action` Route (`manifest/`):**
    In `manifest/routes.js`, create an `action` that uses these pieces.
    ```javascript
    "POST /action/generate-report": {
      "type": "action",
      "reads": ["userSettings"],
      "steps": [
        // 1. Get save path from user (Interactive Client Bridge). Pauses execution.
        { "bridge:call": { "api": "dialogs.showSaveDialog", "await": true, "resultTo": "context.saveInfo" } },
        
        { "if": "!context.saveInfo.canceled", "then": [
            // 2. Generate report content (Helper Function).
            { "run:set": "context.reportContent", "handler": "generateReport", "with": "[data.userSettings]" },
            
            // 3. Save file to disk (Custom Server Bridge).
            { "bridge:call": { "api": "custom.fileSaver.save", "args": "[context.saveInfo.filePath, context.reportContent]" } }
        ]}
      ]
    }
    ```

---

## 3. Command Reference

All commands must be executed from the root of your application directory (e.g., `my-desktop-app/`).

-   **`npm run dev`**
    Use this for all development. It runs the Super Validator, then launches the application with hot-reloading and DevTools enabled.

-   **`npm run start`**
    Runs the application in production mode. This is how users will experience the app.

-   **`npm run package`**
    Packages your application into a distributable file (e.g., `.exe`, `.dmg`) for release.

-   **`npm run seed`**
    Executes the `seed.js` script in your project root to reset the application's database (`wise-json` connectors) to a known initial state.