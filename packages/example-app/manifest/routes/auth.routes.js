// packages/example-app/manifest/routes/auth.routes.js
module.exports = {
  // --- VIEW-РОУТЫ ДЛЯ ОТОБРАЖЕНИЯ ФОРМ ---
  "GET /login": {
    "type": "view",
    "layout": "main-layout", // БЫЛО: mainLayout
    "reads": ["user"],
    "inject": {
      "header": "header",
      "pageContent": "auth-layout", // БЫЛО: authLayout
      "formContent": "login-form"   // БЫЛО: loginForm
    }
  },

  "GET /register": {
    "type": "view",
    "layout": "main-layout", // БЫЛО: mainLayout
    "reads": ["user"],
    "inject": {
      "header": "header",
      "pageContent": "auth-layout", // БЫЛО: authLayout
      "formContent": "register-form" // БЫЛО: registerForm
    }
  },

  // --- ACTION-РОУТЫ (здесь изменений нет, но оставляем для полноты) ---
  "POST /auth/login": {
    "type": "action",
    "reads": ["user"],
    "steps": [
      { "set": "context.userToLogin", "to": "data.user.items.find(u => u.login === body.login)" },
      { "set": "context.bcrypt", "to": "require('bcrypt')" },
      { 
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
        "then": [
          { "client:redirect": "'/register?error=1'" }
        ], 
        "else": [
          { "set": "context.bcrypt", "to": "require('bcrypt')" }, 
          { "set": "context.passwordHash", "to": "context.bcrypt.hashSync(body.password, 10)" },
          { "set": "context.newUser", "to": "{ login: body.login, name: body.name, role: 'Кассир', passwordHash: context.passwordHash }" }, 
          { "set": "data.user.items", "to": "data.user.items.concat([context.newUser])" },
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