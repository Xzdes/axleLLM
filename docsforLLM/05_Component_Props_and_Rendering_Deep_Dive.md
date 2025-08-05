# `05_Component_Props_and_Rendering_Deep_Dive.md`

**Objective:** This document provides a definitive technical specification of the `props` object passed to every React component rendered by the AxleLLM engine. It also details the component injection mechanism (`inject`) and the automatic CSS style isolation system.

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
  // 1. Destructure the required component from props.components
  const { pageContent: PageComponent } = props.components || {};

  return (
    <div className="app-container">
      <header>My App Header</header>
      <main>
        {/* 2. Conditionally render the component */}
        {/* 3. Pass the entire props object down */}
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

-   **Transformation Example:**
    A rule in `my-component.css` like:
    ```css
    .title { color: blue; }
    ```
    Will be transformed and injected into the final HTML as:
    ```html
    <style data-component-name="myComponent">
      [data-axle-id="c12345"] .title { color: blue; }
    </style>
    ```
    This guarantees the `.title` class will only apply to elements inside `myComponent`.

-   **The `:host` Pseudo-selector:**
    To style the root element of the component itself (the element that receives the `data-axle-id` attribute), use the `:host` pseudo-selector in your CSS file.

    **Example in `my-component.css`:**
    ```css
    /* This will style the component's root container div */
    :host {
      display: block;
      padding: 1rem;
      border: 1px solid #eee;
    }

    .title {
      font-size: 1.5rem;
    }