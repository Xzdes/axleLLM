// packages/example-app/manifest/routes/auth.routes.js
module.exports = {
  // --- VIEW-РОУТЫ ДЛЯ ОТОБРАЖЕНИЯ ФОРМ ---
  
  // Роут для страницы входа
  "GET /login": {
    "type": "view",
    "layout": "mainLayout",
    "reads": ["user"],
    "inject": {
      "header": "header",
      "pageContent": "authLayout",
      "formContent": "loginForm"
    }
  },

  // Роут для страницы регистрации
  "GET /register": {
    "type": "view",
    "layout": "mainLayout",
    "reads": ["user"],
    "inject": {
      "header": "header",
      "pageContent": "authLayout",
      "formContent": "registerForm"
    }
  },

  // --- ACTION-РОУТЫ (логика шагов остается без изменений) ---
  
  // Обработка отправки формы входа
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

  // Обработка отправки формы регистрации
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

  // Выход из системы
  "GET /auth/logout": {
    "type": "action",
    "steps": [
      { "auth:logout": true },
      { "client:redirect": "'/login'" }
    ]
  }
};