// packages/example-app/manifest/routes/auth.routes.js
module.exports = {
  // --- VIEW-РОУТЫ ДЛЯ ОТОБРАЖЕНИЯ ФОРМ ---
  "GET /login": {
    "type": "view",
    "layout": "mainLayout",
    "reads": ["user"],
    "inject": { "header": "header", "pageContent": "authLayout", "formContent": "loginForm" }
  },
  "GET /register": {
    "type": "view",
    "layout": "mainLayout",
    "reads": ["user"],
    "inject": { "header": "header", "pageContent": "authLayout", "formContent": "registerForm" }
  },

  // --- ACTION-РОУТЫ ---
  "POST /auth/login": {
    "type": "action",
    "reads": ["user"],
    "steps": [
      { "set": "context.userToLogin", "to": "data.user.items.find(u => u.login === body.login)" },
      // ★★★ НАПОРИСТОЕ ИСПРАВЛЕНИЕ: Подключаем НОВУЮ библиотеку ★★★
      { "set": "context.bcrypt", "to": "require('bcryptjs')" },
      { 
        // ★★★ Используем СИНХРОННЫЙ метод, он проще для Action Engine ★★★
        "if": "context.userToLogin && context.bcrypt.compareSync(body.password, context.userToLogin.passwordHash)", 
        "then": [
          { "auth:login": "context.userToLogin" }, 
          { "client:redirect": "'/'" }
        ], 
        "else": [
          { "client:redirect": "'/login?error=1'" }
        ] 
      }
    ]
  },
  "POST /auth/register": {
    "type": "action",
    "reads": ["user"],
    "writes": ["user"],
    "steps": [
      { "set": "context.userExists", "to": "data.user.items.some(u => u.login === body.login)" },
      { 
        "if": "context.userExists", 
        "then": [ { "client:redirect": "'/register?error=1'" } ], 
        "else": [
          // ★★★ НАПОРИСТОЕ ИСПРАВЛЕНИЕ: Подключаем НОВУЮ библиотеку ★★★
          { "set": "context.bcrypt", "to": "require('bcryptjs')" }, 
          // ★★★ Используем СИНХРОННЫЙ метод ★★★
          { "set": "context.passwordHash", "to": "context.bcrypt.hashSync(body.password, 10)" },
          { "set": "context.newUser", "to": "{ login: body.login, name: body.name, role: 'Кассир', passwordHash: context.passwordHash }" }, 
          { "set": "data.user.items", "to": "[...data.user.items, context.newUser]" },
          { "client:redirect": "'/login?registered=true'" }
        ] 
      }
    ]
  },
  "GET /auth/logout": {
    "type": "action",
    "steps": [
      { "auth:logout": true },
      { "client:redirect": "'/login'" }
    ]
  }
};