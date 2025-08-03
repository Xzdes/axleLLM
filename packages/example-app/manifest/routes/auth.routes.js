// packages/example-app/manifest/routes/auth.routes.js
// Этот модуль отвечает за все роуты, связанные с аутентификацией.

module.exports = {
  // --- VIEW-РОУТЫ ДЛЯ ОТОБРАЖЕНИЯ ФОРМ ---

  /**
   * Отображает страницу с формой входа.
   * Использует основной макет `mainLayout`, в который вставляет "обертку" `authLayout`,
   * а уже внутрь этой обертки — саму форму `loginForm`.
   */
  "GET /login": {
    "type": "view",
    "layout": "mainLayout",
    "reads": [], // Странице входа не нужны данные из коннекторов
    "inject": {
      "header": "header",
      "pageContent": "authLayout",
      "formContent": "loginForm"
    }
  },

  /**
   * Отображает страницу с формой регистрации.
   * Архитектура аналогична странице входа.
   */
  "GET /register": {
    "type": "view",
    "layout": "mainLayout",
    "reads": [],
    "inject": {
      "header": "header",
      "pageContent": "authLayout",
      "formContent": "registerForm"
    }
  },

  // --- ACTION-РОУТЫ ДЛЯ ОБРАБОТКИ ЛОГИКИ ---

  /**
   * Обрабатывает POST-запрос от формы входа.
   */
  "POST /auth/login": {
    "type": "action",
    "reads": ["user"], // Нам нужно прочитать всех пользователей, чтобы найти нужного
    "steps": [
      // Шаг 1: Найти пользователя в базе данных по логину, введенному в форме (body.login)
      { "set": "context.userToLogin", "to": "data.user.items.find(u => u.login === body.login)" },
      // Шаг 2: Загрузить библиотеку bcrypt для сравнения хэшей паролей
      { "set": "context.bcrypt", "to": "require('bcrypt')" },
      // Шаг 3: Проверить, что пользователь найден И введенный пароль совпадает с хэшем в базе
      { 
        "if": "context.userToLogin && context.bcrypt.compareSync(body.password, context.userToLogin.passwordHash)", 
        "then": [
          // Если все верно, авторизуем пользователя и перенаправляем на главную страницу
          { "auth:login": "context.userToLogin" }, 
          { "client:redirect": "'/'" }
        ], 
        "else": [
          // Если неверно, перенаправляем обратно на страницу входа с меткой об ошибке
          { "client:redirect": "'/login?error=1'" }
        ] 
      }
    ]
  },

  /**
   * Обрабатывает POST-запрос от формы регистрации.
   */
  "POST /auth/register": {
    "type": "action",
    "reads": ["user"],  // Читаем пользователей для проверки
    "writes": ["user"], // Будем записывать нового пользователя
    "steps": [
      // Шаг 1: Проверить, не занят ли уже этот логин
      { "set": "context.userExists", "to": "data.user.items.some(u => u.login === body.login)" },
      { 
        "if": "context.userExists", 
        "then": [
          // Если занят, перенаправляем на регистрацию с ошибкой
          { "client:redirect": "'/register?error=1'" }
        ], 
        "else": [
          // Если свободен, хэшируем пароль
          { "set": "context.bcrypt", "to": "require('bcrypt')" }, 
          { "set": "context.passwordHash", "to": "context.bcrypt.hashSync(body.password, 10)" },
          // Создаем объект нового пользователя
          { "set": "context.newUser", "to": "{ login: body.login, name: body.name, role: 'Кассир', passwordHash: context.passwordHash }" }, 
          // Добавляем его в массив пользователей
          { "set": "data.user.items", "to": "data.user.items.concat([context.newUser])" },
          // Перенаправляем на страницу входа с сообщением об успехе
          { "client:redirect": "'/login?registered=true'" }
        ] 
      }
    ]
  },

  /**
   * Выход пользователя из системы.
   */
  "GET /auth/logout": {
    "type": "action",
    "steps": [
      { "auth:logout": true }, // Специальный шаг для удаления сессии
      { "client:redirect": "'/login'" } // Перенаправление на страницу входа
    ]
  }
};