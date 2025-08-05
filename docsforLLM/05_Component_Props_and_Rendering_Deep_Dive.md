# `05_Component_Props_and_Rendering_Deep_Dive.md`

**Objective:** This document provides a definitive technical specification of the `props` object passed to every React component rendered by the AxleLLM engine. It also details the component injection mechanism (`inject`), the automatic CSS style isolation system, and the canonical pattern for managing application layout and scrolling.

---

### 1. The Master `props` Object Specification

Every React component involved in rendering a `view` route (both the `layout` and all `inject`-ed components) receives a standardized `props` object. Understanding this object is critical for designing UI components.

| Key | Type | Source | Description |
| :--- | :--- | :--- | :--- |
| `data` | `Object` | Connectors from the `view` route's `reads` array. | The primary data payload for the UI. It is an object where each key corresponds to a connector name, and the value is the complete data from that connector. |
| `user` | `Object` \| `null` | The `AuthEngine`. | The data object for the currently authenticated user. Its value is `null` if the route does not require authentication or if no user is logged in. |
| `globals` | `Object` | The `globals` section in `manifest.js`. | An object containing global, static string variables (e.g., application name, version) that are available to all components. |
| `components` | `Object` | The `view` route's `inject` property. | **Primarily for `layout` components.** This is an object where keys are the placeholder names from the `inject` section, and values are the actual, loadable React component functions/classes. |
| `url` | `Object` | The `RequestHandler`. | An object providing context about the current URL, containing `{ pathname: String, query: Object }`. The `query` object contains parsed URL query string parameters. |

**Canonical Example:**
For a route defined as:
```javascript
"GET /dashboard": {
  "type": "view",
  "layout": "mainLayout",
  "reads": ["user", "dashboardStats"],
  "inject": { "pageContent": "dashboardPage" }
}
```
The `mainLayout` component will receive `props` structured like this:
```javascript
{
  data: {
    dashboardStats: { /* data from the 'dashboardStats' connector */ }
  },
  user: { /* data for the currently logged-in user */ },
  globals: { /* key-value pairs from manifest.js */ },
  components: {
    pageContent: function dashboardPage(props) { /* ... */ }
  },
  url: {
    pathname: '/dashboard',
    query: {}
  }
}
```

---

### 2. Component Injection and `props` Propagation

The `inject` mechanism is the engine's method for component composition.

-   **Function:** The `layout` component acts as a frame or a shell. The `inject` property tells the engine which smaller components to render inside designated parts of that shell.
-   **Props Inheritance:** The engine employs a **"prop drilling"** strategy for simplicity and predictability. The master `props` object received by the `layout` component is **passed down unmodified** to every component it injects. This means an injected component like `dashboardPage` has access to the exact same `props.data`, `props.user`, etc., as its parent `mainLayout`.

**Canonical `layout` Component Implementation:**
This pattern is the standard way to implement a layout.

```jsx
// packages/app/app/components/main-layout.jsx
import React from 'react';

export default function MainLayout(props) {
  const { pageContent: PageComponent } = props.components || {};

  return (
    <div id="app-container">
      <main id="page-content-wrapper">
        {PageComponent && <PageComponent {...props} />}
      </main>
    </div>
  );
}
```
This pattern ensures that a component's data requirements, as defined in its `schema.requires`, only need to be satisfied by the `view` route's `reads` array once.

---

### 3. Automatic CSS Style Scoping

The engine provides automatic, zero-configuration CSS isolation to prevent style conflicts between components.

-   **Mechanism:** When a component is registered in `manifest/components.js` with a `style` property, the engine performs two actions during the server-side render:
    1.  It adds a unique data-attribute to the root element of that component's rendered HTML, e.g., `data-axle-id="c12345"`.
    2.  It processes the component's corresponding `.css` file, prefixing every single CSS rule with the unique data-attribute selector.

-   **The `:host` Pseudo-selector:**
    To style the root element of the component itself (the element that receives the `data-axle-id` attribute), use the `:host` pseudo-selector in your CSS file.

    **Example in `my-component.css`:**
    ```css
    :host {
      display: block;
      padding: 1rem;
      border: 1px solid #eee;
    }
    ```

---

### 4. Canonical Pattern: Managing Layout and Scrolling

To achieve a native desktop feel, the application window itself should never scroll. Scrolling must be delegated to specific content areas that require it. This is the canonical pattern to achieve that behavior.

**Problem:** By default, browsers add a `margin` to the `<body>` element. A root component with `height: 100vh` will exceed the viewport height, causing an unwanted global scrollbar.

**Solution:** The main layout component is responsible for establishing a fixed, non-scrollable viewport.

**Step 1: Style the `mainLayout` Component**
Create a dedicated CSS file for your `mainLayout` and use the `:host` selector to define the application's top-level container.

*File: `packages/app/app/components/main-layout.css`*
```css
:host {
  /* Take up the entire browser window */
  height: 100vh;
  width: 100vw;

  /* This is the critical property. It prevents the main layout
     itself from ever showing a scrollbar, even if content overflows. */
  overflow: hidden;

  /* Other global styles */
  display: flex;
  font-family: system-ui, sans-serif;
  background-color: var(--primary-bg);
}
```

**Step 2: Register the Style in the Manifest**
Connect the CSS file to the component in the manifest.

*File: `packages/app/manifest/components.js`*```javascript
"mainLayout": {
  "template": "main-layout.jsx",
  "style": "main-layout.css" // <-- Register the stylesheet
}
```

**Step 3: Delegate Scrolling to Child Components**
Within child components that might contain long lists or large amounts of content, use `overflow: auto` to enable scrolling *only* within that specific component.

*File: `packages/app/app/components/snippet-list.css` (Example)*
```css
:host {
  display: flex;
  flex-direction: column;
  height: 100%; /* Fill the parent container's height */
}

.list-container {
  /* This container will grow to fill available space */
  flex-grow: 1;

  /* This enables a vertical scrollbar ONLY if the content is too tall */
  overflow-y: auto;
}
```

By following this pattern, the application achieves a professional, native-like feel where only designated content areas are scrollable, while the main application window remains static.