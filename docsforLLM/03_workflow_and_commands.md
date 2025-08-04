# AxleLLM: Workflow and Commands

**Objective:** To provide the standard operating procedures for designing and modifying AxleLLM applications. Your role is **System Architect**. You will not write imperative code; you will declare the system's architecture in the `manifest/` directory inside your `packages/app/` workspace.

---

## 1. Core Development Loop

All tasks, features, and modifications must follow this strict, sequential workflow.

1.  **Analyze the Request:** Deconstruct the user's goal into architectural requirements. Identify the data, UI components, and logic flows that need to be created or modified.

2.  **Plan Manifest Changes:** Determine which manifest files within `packages/app/manifest/` are affected.
    *   **Data Requirement:** Plan changes in `packages/app/manifest/connectors.js`.
    *   **UI Requirement:** Plan changes in `packages/app/manifest/components.js`.
    *   **Business Logic Requirement:** Plan changes in `packages/app/manifest/routes/`.
    *   **Native OS Interaction Requirement:** Plan changes in `packages/app/manifest/bridge.js`.

3.  **Create/Modify Asset Files:** If the architecture requires them, create the necessary atomic files inside `packages/app/app/`.
    *   React components (`.jsx`) and their styles (`.css`) go into `packages/app/app/components/`.
    *   Complex, pure functions (`run:set`) or imperative scripts (`run`) go into `packages/app/app/actions/`.
    *   Custom Node.js modules for native OS access (`bridge:call`) go into `packages/app/app/bridge/`.

4.  **Modify Manifest Files:** Implement the planned architectural changes in the `packages/app/manifest/` directory.

5.  **Validate by Running `npm run dev`:** From the **monorepo root**, run this command. It is your primary validation and testing tool. The AxleLLM engine will first execute the "Super Validator" against your entire manifest architecture.

6.  **Analyze Validator Output:**
    *   If the output is `✅ Manifest is valid`, the application will launch.
    *   If the output is `🚨 Found X issues`, read the error messages carefully.

7.  **Iterate:** Correct the specified errors and return to step 5.

---

## 2. Common Task Playbooks

These are standard architectural patterns for common tasks.

### Task: Add a New View (e.g., "Settings Page")

1.  **Create Component File:**
    Create `packages/app/app/components/settings-page.jsx`.
    ```jsx
    import React from 'react';
    export default function SettingsPage({ data }) {
      return (
        <div>
          <h2>Settings</h2>
          <p>Username: {data.userSettings.name}</p>
        </div>
      );
    }
    ```

2.  **Define Connector:**
    In `packages/app/manifest/connectors.js`, define the data source.
    ```javascript
    "userSettings": {
      "type": "wise-json",
      "initialState": { "name": "Default User", "theme": "dark" }
    }
    ```

3.  **Register Component & Schema:**
    In `packages/app/manifest/components.js`, register the new component.
    ```javascript
    "settingsPage": {
      "template": "settings-page.jsx",
      "schema": { "requires": ["userSettings"] }
    }
    ```

4.  **Create View Route:**
    In a file inside `packages/app/manifest/routes/`, create the `view` route.
    ```javascript
    "GET /settings": {
      "type": "view",
      "layout": "mainLayout",
      "reads": ["user", "userSettings"], // Add 'user' if the layout requires it
      "inject": {
        "pageContent": "settingsPage"
      }
    }
    ```

5.  **Validate:** Run `npm run dev` from the monorepo root.

### Task: Add a New Feature (e.g., "Change Username")

1.  **Add UI Element:**
    In `packages/app/app/components/settings-page.jsx`, add a form.
    ```jsx
    // ... inside the component
    <form atom-action="POST /action/change-username" atom-target="#pageContent-container">
      <input name="newName" defaultValue={data.userSettings.name} />
      <button type="submit">Save</button>
    </form>
    ```

2.  **Create Action Route:**
    In a file inside `packages/app/manifest/routes/`, define the business logic.
    ```javascript
    "POST /action/change-username": {
      "type": "action",
      "reads": ["userSettings"],
      "writes": ["userSettings"],
      "update": "settingsPage", // The component to re-render
      "steps": [
        { "set": "data.userSettings.name", "to": "body.newName" }
      ]
    }
    ```

3.  **Validate:** Run `npm run dev` from the monorepo root.

### Task: Add Complex Logic (e.g., "Generate and Save a Report")

1.  **Create Helper Function:**
    Create a pure function in `packages/app/app/actions/generateReport.js`.
    ```javascript
    module.exports = (settings) => {
      // Complex logic to generate a string report...
      return `Report based on theme: ${settings.theme}`;
    };
    ```

2.  **Create Server Bridge Module:**
    Create a Node.js module in `packages/app/app/bridge/fileSaver.js`.
    ```javascript
    const fs = require('fs/promises');
    module.exports = {
      save: async (filePath, content) => {
        await fs.writeFile(filePath, content, 'utf-8');
        return { success: true };
      }
    };
    ```

3.  **Whitelist Native Functions:**
    In `packages/app/manifest/bridge.js`, whitelist all required functions.
    ```javascript
    "dialogs": { "showSaveDialog": true },
    "custom": { "fileSaver": "fileSaver.js" }
    ```

4.  **Create Orchestrating `action` Route:**
    In a file inside `packages/app/manifest/routes/`, create the `action`.
    ```javascript
    "POST /action/generate-report": {
      "type": "action",
      "reads": ["userSettings"],
      "steps": [
        { "bridge:call": { "api": "dialogs.showSaveDialog", "await": true, "resultTo": "context.saveInfo" } },
        { "if": "!context.saveInfo.canceled", "then": [
            { "run:set": "context.reportContent", "handler": "generateReport", "with": "[data.userSettings]" },
            { "bridge:call": { "api": "custom.fileSaver.save", "args": "[context.saveInfo.filePath, context.reportContent]" } }
        ]}
      ]
    }
    ```

---

## 3. Command Reference

All commands must be executed from the **monorepo root** of your application (e.g., `my-app/`).

-   **`npm run dev`**
    Use this for all development. It runs the Super Validator, then launches your application with hot-reloading for both manifest files and React components.

-   **`npm run start`**
    Runs the application in production mode. This requires a manual build step first.

-   **`npm run package`**
    Packages your application into a distributable file (e.g., `.exe`, `.dmg`).

-   **`npm run seed`**
    Executes the seed script located in `packages/app/seed.js` (if it exists).