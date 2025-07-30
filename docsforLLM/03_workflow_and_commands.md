# AxleLLM Workflow & Commands for LLM

This document provides step-by-step instructions for common development tasks.

---

## 1. Core Development Loop

Your workflow for any new feature or modification follows this strict sequence:

1.  **Analyze the Request:** Understand the user's goal.
2.  **Plan Manifest Changes:** Determine which sections of the manifest (`connectors`, `components`, `routes`, etc.) need to be created or modified.
3.  **Create/Modify Helper Files:** If necessary, create or modify files in `app/components/`, `app/actions/`, or `app/bridge/`.
4.  **Modify Manifest Files:** Apply the planned changes to the files in the `manifest/` directory.
5.  **Validate by Running `npm run dev`:** This is your primary method for checking your work. The output will tell you if your changes are architecturally sound.
6.  **Analyze Validator Output:**
    - If you see `✅ Manifest is valid`, the application will launch. Test the new functionality.
    - If you see `🚨 Found X issues`, read the error messages carefully. They will tell you exactly what is wrong (e.g., a missing connector in `reads`, a typo in a component name).
7.  **Iterate:** Correct the errors in the manifest or helper files and go back to step 5.

---

## 2. Common Task Playbooks

### Task: Add a New View (e.g., "Settings Page")

1.  **Create Component File:** Create `app/components/settings-page.html`.
2.  **Register Component:** In `manifest/components.js`, add `"settingsPage": "settings-page.html"`. If it needs data, add a `schema`.
    ```javascript
    "settingsPage": {
      "template": "settings-page.html",
      "schema": { "requires": ["user-settings"] }
    }
    ```
3.  **Define Connector (if needed):** In `manifest/connectors.js`, define the `"user-settings"` connector.
4.  **Create Route:** In `manifest/routes.js`, create the `view` route.
    ```javascript
    "GET /settings": {
      "type": "view",
      "layout": "mainLayout",
      "reads": ["user-settings"], // Satisfy the schema
      "inject": {
        "pageContent": "settingsPage"
      }
    }
    ```
5.  **Validate:** Run `npm run dev`.

### Task: Add a New Feature (e.g., "Change Username")

1.  **Add UI Element:** In the relevant component HTML (e.g., `settings-page.html`), add a form and a button with an `atom-action`.
    ```html
    <form atom-action="POST /action/change-username" atom-target="#user-profile-container">
      <input name="newName">
      <button type="submit">Save</button>
    </form>
    ```
2.  **Create Action Route:** In `manifest/routes.js`, create the `action` route.
    ```javascript
    "POST /action/change-username": {
      "type": "action",
      "reads": ["user"],
      "writes": ["user"],
      "update": "userProfile", // Component to re-render
      "steps": [
        { "log": "Attempting to change username..." },
        { "set": "data.user.name", "to": "body.newName" },
        { "log:value": "data.user" }
      ]
    }
    ```
3.  **Validate:** Run `npm run dev`.

### Task: Add Complex Logic (e.g., "Generate Report")

1.  **Create Helper Function:** Create `app/actions/generateReport.js`. It must be a pure function that returns a value.
    ```javascript
    // Receives receipt data, returns a string
    module.exports = (receipt) => {
      // ... complex logic ...
      return `Report content for total ${receipt.total}`;
    };
    ```
2.  **Create Server Bridge Module:** Create `app/bridge/fileSaver.js` to handle file system interaction.
    ```javascript
    const fs = require('fs/promises');
    module.exports = {
      save: async (path, content) => { /* ... */ }
    };
    ```
3.  **Register Bridge Module:** In `manifest/bridge.js`, add `"fileSaver": "fileSaver.js"` to the `custom` section.
4.  **Create Action Route:** In `manifest/routes.js`, create an `action` that orchestrates these parts.
    ```javascript
    "POST /action/generate-report": {
      "type": "action",
      "reads": ["receipt"],
      "steps": [
        // 1. Get save path from user (Interactive Bridge)
        { "bridge:call": { "api": "dialogs.showSaveDialog", "await": true, "resultTo": "context.saveInfo" } },
        // 2. Generate report content (Helper Function)
        { "run:set": "context.reportContent", "handler": "generateReport", "with": "[data.receipt]" },
        // 3. Save file to disk (Server Bridge)
        { "bridge:call": { "api": "custom.fileSaver.save", "args": "[context.saveInfo.filePath, context.reportContent]" } }
      ]
    }
    ```
5.  **Validate:** Run `npm run dev`.

---

## 3. Command Reference

- **`npm run dev`**: Use this for all development and testing. It runs the validator first, then launches the app with hot-reloading.
- **`npm run test`**: Use this to run the automated test suite for the core engine. You typically do not need to run this unless you are modifying the engine itself.
- **`npm run package`**: When development is complete, run this command to create a distributable application file (e.g., `.exe`, `.dmg`).
- **`npm run seed`**: Use this to reset the application's database (`wise-json` connectors) to a known initial state.