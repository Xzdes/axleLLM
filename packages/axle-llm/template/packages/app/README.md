# My New AxleLLM Application

This is your application's workspace. Welcome to the future of declarative, AI-symbiotic desktop development.

## Your Role: System Architect

Your primary task is not to write traditional, imperative code. Your role is to **architect** the application by defining its structure, data, and logic in the manifest files.

### 1. Define Your Architecture in `/manifest`

This is the brain of your application. Start here.

-   **`manifest/connectors.js`**: Define your data sources. What information does your application need to store?
-   **`manifest/components.js`**: Register your React UI components. What will the user see?
-   **`manifest/routes/`**: Describe the business logic. What happens when the user clicks a button?
-   **`manifest/bridge.js`**: Whitelist any native OS functions your app needs to access.
-   **`manifest.js`**: Configure your app's window, theme, and global settings.

### 2. Create Your Assets in `/app`

This directory contains the "physical" parts of your application that your manifest refers to.

-   **`/app/components/`**: Place your React components (`.jsx`) and their stylesheets (`.css`) here.
-   **`/app/actions/`**: Place reusable, complex JavaScript functions here.
-   **`/app/bridge/`**: Place custom Node.js modules for advanced OS interaction here.

## How to Run

All commands must be executed from the **root directory of the monorepo** (the parent directory of this `packages` folder).

### Run in Development Mode
This command starts the application with hot-reloading and a powerful architecture validator. Use it for all your development work.

```bash
npm run dev
```

### Run in Production Mode
This command starts the application as it would run for an end-user.

```bash
npm run start
```

### Package for Distribution
This command packages your application into a distributable installer (e.g., `.exe`, `.dmg`).

```bash
npm run package
```

Good luck.