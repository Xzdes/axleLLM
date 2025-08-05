# `04_Execution_Context_and_Expressions.md`

**Objective:** This document provides the definitive technical specification for the `Execution Context` object available within `action` routes. It details the properties, lifecycle, and scope of the context, and defines the precise capabilities and constraints of the `Expression Engine` used in `steps`.

---

### 1. Anatomy of the Execution Context

When an `action` route is triggered, the `ActionEngine` constructs a temporary, in-memory `Execution Context` object. All `steps` operate exclusively on this object. Its structure is as follows:

| Key | Type | Source | Lifecycle | Description |
| :--- | :--- | :--- | :--- | :--- |
| `data` | `Object` | Connectors from `reads` | Initialized at start. Mutable via steps. Persisted to `writes` connectors on completion. | The primary state store. An object where each key is a connector name and the value is its data. |
| `body` | `Object` | HTTP Request Body | Initialized at start. **Immutable**. | A key-value object containing data sent from the client, typically from HTML form `name` attributes or a JSON payload. |
| `user` | `Object` \| `null` | `AuthEngine` | Initialized at start. **Immutable**. | The data object for the currently authenticated user. Value is `null` if authentication is not enabled or no user is logged in. |
| `context` | `Object` | `ActionEngine` | Initialized as `{}` at start. Mutable via steps. **Discarded** after action completion. | A volatile scratchpad for storing temporary values, counters, or flags required for logic flow between steps. |
| `error` | `Object` | `try/catch` block | Exists **only** within the scope of a `catch` block. | An object containing `{ message, stack }` of the error thrown within the corresponding `try` block. It is removed from context after the `catch` block completes. |

---

### 2. The Expression Engine

All dynamic values within `action` steps (i.e., the string values for `to`, `if`, `with`, `args`) are processed by the Expression Engine.

-   **Core Implementation:** The engine evaluates expressions by dynamically creating a JavaScript function: `new Function('ctx', 'require', 'with (ctx) { return (expression); }')`.
-   **Scope:** The use of `with (ctx)` is critical. It places all top-level keys of the Execution Context (`data`, `body`, `user`, `context`) into the global scope of the expression. This allows for direct access to variables (e.g., `data.user.name` instead of `ctx.data.user.name`).

#### Available Globals & APIs within Expressions

The following are available within the expression's scope:

1.  **Standard JavaScript Built-ins:** All standard global objects and functions are available.
    -   **Objects:** `JSON`, `Math`, `Date`, `Object`, `Array`, etc.
    -   **Functions:** `parseInt`, `parseFloat`, etc.

2.  **`require(moduleName)`:** A specialized, sandboxed `require` function.
    -   **Resolution Path:** It resolves modules relative to the **application's root path** (`packages/app/`), not the engine's core directory.
    -   **Use Case:** This allows direct access to any dependency listed in the application's `package.json`.
    -   **Example:** `"require('bcryptjs').hashSync(body.password, 10)"`

3.  **`zod`:** The complete `zod` library instance.
    -   **Availability:** It is injected into the scope only for the duration of the expression's evaluation and removed immediately after.
    -   **Use Case:** Enables powerful, declarative, in-line data validation within `steps`.
    -   **Example:** `"zod.string().email().safeParse(body.email).success"`

---

### 3. Expression Gallery

This table provides canonical examples for common tasks. Note the use of nested quotes for string literals.

| Task Description | Example Expression |
| :--- | :--- |
| Assign a literal string | `"'Hello, World'"` |
| Assign a literal number/boolean | `"123.45"`, `"true"` |
| Concatenate strings | `"'User ID: ' + user.id"` |
| Perform arithmetic | `"(data.receipt.total - data.receipt.discount) * 1.2"` |
| Create a new object | `"{ id: 'prod_' + Math.random().toString(36).substring(2, 9), name: body.productName, price: parseFloat(body.price) }"` |
| Conditional value (ternary) | `"user.role === 'admin' ? true : false"` |
| Access nested properties | `"data.config.settings.features.isEnabled"` |
| Find an item in an array | `"data.positions.items.find(p => p.id == body.id)"` |
| Filter an array | `"data.receipt.items.filter(item => !item.isTaxable)"` |
| Map an array to new values | `"data.users.items.map(u => u.email)"` |
| Reduce an array to a single value | `"data.receipt.items.reduce((total, item) => total + (item.price * item.quantity), 0)"` |
| Get current timestamp | `"new Date().toISOString()"` |
| Use `require` for a utility | `"require('uuid').v4()"` |
| Use `zod` for validation | `"zod.object({ name: zod.string().min(2) }).safeParse(body).success"` |