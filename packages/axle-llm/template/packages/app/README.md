# AxleLLM Engine: The Symbiotic Framework

**AxleLLM** is a declarative Node.js and Electron-based engine for creating native, cross-platform desktop applications. Its architecture is specifically designed for symbiotic collaboration between a **Human and a Large Language Model (LLM)**, shifting the development paradigm from writing imperative code to architecting intelligent, self-analyzing systems.

With AxleLLM, the entire application—from data sources and UI components to OS integration and business logic—is defined in a set of declarative JavaScript files located in the `manifest/` directory. This approach elevates the LLM from a simple code generator to a true **System Architect** that designs, debugs, and extends robust, secure applications.

- **NPM Package:** [https://www.npmjs.com/package/axle-llm](https://www.npmjs.com/package/axle-llm)
- **Repository:** [https://github.com/Xzdes/axleLLM](https://github.com/Xzdes/axleLLM)

---

## 🚀 Quick Start: Your First App in 60 Seconds

Creating a native desktop application has never been this straightforward. All you need is Node.js installed.

1.  **Create a New Application**
    Open your terminal in any directory and run the following command. The `npx` command will download and execute the AxleLLM CLI to generate a new project for you.
    ```bash
    npx axle-llm new my-desktop-app
    ```

2.  **Navigate and Install Dependencies**
    Change into the newly created directory and install the necessary project dependencies.
    ```bash
    cd my-desktop-app
    npm install
    ```

3.  **Launch in Development Mode**
    Start the application. The engine will first validate your entire architecture and then launch the app window.
    ```bash
    npm run dev
    ```

That's it! A desktop application window will appear on your screen. The project is now running with hot-reloading, so any changes you make to the files will be reflected in real-time.

---

## 🏛️ Core Concepts

To work effectively with AxleLLM, you must understand these core principles:

-   **Your Role is System Architect:** You do not write application code in the traditional sense. You define the system's structure, data flows, and behavior in the `manifest/` directory.

-   **Declarative, Not Imperative:** You describe *what* the application should do, not *how* it should do it. The AxleLLM engine handles the implementation details.

-   **The `manifest/` Directory is the Source of Truth:** This directory contains the complete and authoritative definition of your application. All architectural work happens here.

-   **Safety Through Whitelisting:** The application is sandboxed by default. All interactions with the operating system (like accessing files or showing dialogs) must be explicitly permitted in `manifest/bridge.js`.

---

## 📖 Next Steps

This document provides the quickest path to getting started. To fully understand the capabilities of the AxleLLM engine, proceed to the other documentation files:

-   **`01_Architecture_and_Project_Structure.md`:** A detailed overview of the core philosophy, the structure of a generated project, and the high-level data flow.
-   **`02_Manifest_Deep_Dive.md`:** The complete API reference for all manifest files (`connectors.js`, `components.js`, `routes.js`, `bridge.js`).
-   **`03_Workflow_and_Commands.md`:** A practical guide with step-by-step instructions and patterns for common development tasks.