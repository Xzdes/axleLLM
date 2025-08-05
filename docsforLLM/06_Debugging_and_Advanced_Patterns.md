# `06_Debugging_and_Advanced_Patterns.md`

**Objective:** To provide a systematic debugging methodology and a reference of architectural patterns for solving common, non-trivial problems within the AxleLLM framework. This document is intended to guide an architect in diagnosing issues and implementing robust, complex features.

---

### 1. The Debugging Playbook

Follow this strict, sequential procedure to diagnose and resolve issues.

#### **Step 1: Analyze Validator Output**
This is the first and most critical step. Always start development or debugging by running `npm run dev` from the monorepo root.
-   If the output is `✅ Manifest is valid`, proceed to the next step.
-   If the output is `🚨 Found X issues`, analyze each error message. The Super Validator checks for logical inconsistencies across the entire architecture (e.g., broken references, missing files, data contract violations). **Do not proceed until all `error`-level issues are resolved.**

#### **Step 2: Use Declarative Logging in `steps`**
This is the primary method for debugging `action` route logic without external debuggers. Modify the `steps` array to inspect the execution flow and context state.
-   **To trace execution flow:** Insert `{ "log": "Descriptive message" }` at key points in your `steps` array.
    -   *Example:* `{ "log": "User validation passed, proceeding to calculate total." }`
-   **To inspect context state:** Use `{ "log:value": "path.to.variable" }` to print a deep inspection of any variable in the Execution Context. The output will appear in the server console where `npm run dev` is running.
    -   *Example:* `{ "log:value": "data.receipt" }` will print the entire receipt object at that point in the execution.
    -   *Example:* `{ "log:value": "context.apiResponse" }` will print a temporary value.

#### **Step 3: Server-Side Debugging**
The server console (the terminal running `npm run dev`) is the source of truth for back-end errors.
-   **`ActionEngine` Errors:** If an expression in `to` or `if` fails, or a `run` script throws an unhandled exception, a detailed stack trace will be printed here.
-   **Bridge Module Errors:** Any errors occurring within custom Node.js modules in `app/bridge/` will be logged in this console.
-   **Asset Loader Errors:** Failure to load an asset (e.g., an action script) will be reported here on startup.

#### **Step 4: Client-Side Debugging**
Use the Electron window's DevTools (accessible via `Ctrl+Shift+I` or if `devtools: true` is set in `manifest.js`) for front-end issues.
-   **`Console` Tab:**
    -   Look for React rendering errors (e.g., "Cannot read properties of undefined"). This indicates a mismatch between the component's expectation and the `props` it received.
    -   Check for hydration errors, which can occur if the server-rendered HTML is fundamentally different from what the client expects.
    -   `[axle-client]` logs provide insight into the client-side engine's lifecycle.
-   **`Network` Tab:**
    -   Filter for `fetch` requests.
    -   Select a request made to an `/action/...` route.
    -   Inspect the **`Headers`** and **`Payload`** to ensure the client is sending the correct data.
    -   Inspect the **`Response`** to see the JSON payload returned by the server. This is critical for debugging why a component isn't updating as expected.

---

### 2. Advanced Architectural Patterns

#### **Pattern: Implementing a "Loading" State**
**Goal:** Provide visual feedback to the user during a long-running action (e.g., an API call).

1.  **Connector:** Use an `in-memory` connector to store UI state.
    ```javascript
    // manifest/connectors.js
    "viewState": {
      "type": "in-memory",
      "initialState": { "isSaving": false }
    }
    ```
2.  **Action Route:** Structure the `steps` to manage the loading flag.
    ```javascript
    // manifest/routes/some.routes.js
    "POST /action/save-report": {
      "type": "action",
      "reads": ["viewState", ...],
      "writes": ["viewState", ...],
      "update": "reportPage",
      "steps": [
        // 1. Set loading state to true and immediately update the UI.
        { "set": "data.viewState.isSaving", "to": "true" },
        { "action:run": { "name": "internal:send-interim-update" } }, // A helper action to push the update
        
        // 2. Perform the long-running operation.
        { "bridge:call": { "api": "custom.reporter.generate", "await": true, "resultTo": "context.report" } },
        
        // 3. Persist results and reset the loading state.
        { "set": "data.reports.items", "to": "[...data.reports.items, context.report]" },
        { "set": "data.viewState.isSaving", "to": "false" }
      ]
    },
    "internal:send-interim-update": {
      "type": "action",
      "internal": true,
      "update": "reportPage" // This action's sole purpose is to trigger a re-render.
    }
    ```
3.  **Component:** The React component uses the `isSaving` flag to conditionally render a spinner or disable a button.
    ```jsx
    function ReportPage({ data }) {
      const { isSaving } = data.viewState;
      return <button disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Report'}</button>;
    }
    ```

#### **Pattern: Role-Based Access Control (RBAC)**
**Goal:** Restrict an action to users with a specific role.

-   **Action Route:** Use an `if` step at the beginning of the action to check the `user` object.
    ```javascript
    // manifest/routes/admin.routes.js
    "POST /action/delete-user": {
      "type": "action",
      "auth": { "required": true }, // Ensure a user is logged in
      "reads": ["users"],
      "writes": ["users"],
      "update": "adminDashboard",
      "steps": [
        {
          "if": "user.role !== 'admin'",
          "then": [
            { "log": "SECURITY: Non-admin user attempted to delete a user." },
            { "set": "data.viewState.error", "to": "'Permission Denied'" },
            // Action terminates here, no 'else' block needed.
          ],
          "else": [
            // Main logic for admin users
            { "set": "data.users.items", "to": "data.users.items.filter(u => u.id !== body.userId)" }
          ]
        }
      ]
    }
    ```

#### **Pattern: Multi-Step Form (Wizard)**
**Goal:** Guide a user through a sequence of forms, preserving state between steps.

1.  **Connector:** Use a dedicated `in-memory` connector to hold the wizard's state.
    ```javascript
    // manifest/connectors.js
    "wizardState": {
      "type": "in-memory",
      "initialState": { "step": 1, "formData": {} }
    }
    ```
2.  **Component:** A single "wizard" component renders different forms based on the current step.
    ```jsx
    function Wizard({ data }) {
      const { step } = data.wizardState;
      if (step === 1) return <Step1Form />;
      if (step === 2) return <Step2Form />;
      return <Step3Form />;
    }
    ```3.  **Action Routes:** Each step of the form submits to a different action.
    ```javascript
    // manifest/routes/wizard.routes.js
    "POST /action/wizard/step1-submit": {
      "type": "action",
      "reads": ["wizardState"],
      "writes": ["wizardState"],
      "update": "wizardComponent",
      "steps": [
        { "set": "data.wizardState.formData.name", "to": "body.name" },
        { "set": "data.wizardState.step", "to": "2" } // Advance to the next step
      ]
    },
    "POST /action/wizard/step2-submit": {
      "type": "action",
      "reads": ["wizardState"],
      "writes": ["wizardState"],
      "update": "wizardComponent",
      "steps": [
        { "set": "data.wizardState.formData.email", "to": "body.email" },
        { "set": "data.wizardState.step", "to": "3" }
      ]
    }