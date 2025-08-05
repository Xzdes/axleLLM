# My New AxleLLM Application

This is your application's workspace. Welcome to the future of declarative, AI-symbiotic desktop development.

## Your Role: System Architect

Your primary task is not to write traditional, imperative code. Your role is to **architect** the application by defining its structure, data, and logic in the manifest files.

### 1. Define Your Architecture in `/manifest`

This is the brain of your application. Start here.

-   **`manifest/connectors.js`**: Define your data sources.
-   **`manifest/components.js`**: Register your React UI components.
-   **`manifest/routes/`**: Describe the business logic (views and actions).
-   **`manifest/bridge.js`**: Whitelist any native OS functions your app needs.
-   **`manifest.js`**: Configure your app's window, theme, and global settings.

### 2. Create Your Assets in `/app` and `/public`

-   **`/app/components/`**: Place your React components (`.jsx`) and their stylesheets (`.css`) here.
-   **`/app/actions/`**: Place reusable, complex JavaScript functions here.
-   **`/app/bridge/`**: Place custom Node.js modules for OS interaction here.
-   **`/public/`**: Place static assets like images and fonts here. The in-app path will be `/public/your-asset.png`.

### 3. Setting the Application Icon

To set the icon for your packaged application (`.exe`, `.dmg`):

1.  Create a `build` folder in the root of this `app` directory (`packages/app/build/`).
2.  Place your icon files inside: `icon.ico` (for Windows), `icon.icns` (for macOS), and `icon.png` (for Linux).
3.  The `package.json` is already configured to use these files during the packaging process.

## How to Run

All commands must be executed from the **root directory of the monorepo**.

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run start
```

### Package for Distribution
```bash
npm run package