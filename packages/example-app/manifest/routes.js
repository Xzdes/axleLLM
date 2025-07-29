// packages/example-app/manifest/routes.js

module.exports = {
  // ★★★ КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ ЗДЕСЬ ★★★
  // Мы делаем нашу логику пересчета более надежной, явно
  // преобразуя все значения в числа с помощью `parseFloat`.
  "recalculateReceiptLogic": {
    "type": "action",
    "internal": true,
    "steps": [
      // Считаем общее количество товаров. `Number(item.quantity || 0)` - безопасно.
      { "set": "data.receipt.itemCount", "to": "data.receipt.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)" },
      
      // Считаем сумму, преобразуя цену и количество в числа.
      { "set": "context.total", "to": "data.receipt.items.reduce((sum, item) => sum + (parseFloat(item.price || 0) * Number(item.quantity || 0)), 0)" },
      { "set": "data.receipt.total", "to": "context.total.toFixed(2)" },

      // Считаем скидку.
      { "set": "context.discount", "to": "context.total * (parseFloat(data.receipt.discountPercent || 0) / 100)" },
      { "set": "data.receipt.discount", "to": "context.discount.toFixed(2)" },
      
      // Считаем итоговую сумму.
      { "set": "data.receipt.finalTotal", "to": "(context.total - context.discount).toFixed(2)" }
    ]
  },

  // ... (остальной код остается без изменений) ...
  "GET /": {
    "type": "view",
    "layout": "mainLayout",
    "reads": ["user", "receipt", "positions", "viewState"],
    "inject": {
      "pageContent": "cashierPage",
      "positionsList": "positionsList",
      "receipt": "receipt"
    },
    "auth": { "required": true, "failureRedirect": "/login" }
  },
  "GET /login": {
    "type": "view",
    "layout": "mainLayout",
    "inject": {
      "pageContent": "authLayout",
      "formContent": "loginForm"
    }
  },
  "GET /register": {
    "type": "view",
    "layout": "mainLayout",
    "inject": {
      "pageContent": "authLayout",
      "formContent": "registerForm"
    }
  },
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
        "then": [{ "client:redirect": "'/register?error=1'" }],
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
  },
  "POST /action/addItem": {
    "type": "action",
    "reads": ["positions", "receipt"],
    "writes": ["receipt"],
    "update": "receipt",
    "steps": [
      { "set": "context.productToAdd", "to": "data.positions.items.find(p => p.id == body.id)" },
      { "set": "context.itemInReceipt", "to": "data.receipt.items.find(i => i.id == body.id)" },
      {
        "if": "context.itemInReceipt",
        "then": [{ "set": "context.itemInReceipt.quantity", "to": "context.itemInReceipt.quantity + 1" }],
        "else": [
          { "set": "context.productToAdd.quantity", "to": "1" },
          { "set": "data.receipt.items", "to": "data.receipt.items.concat([context.productToAdd])" }
        ]
      },
      { "set": "data.receipt.statusMessage", "to": "''" },
      { "action:run": { "name": "recalculateReceiptLogic" } }
    ]
  },
  "POST /action/removeItem": {
      "type": "action",
      "reads": ["receipt"],
      "writes": ["receipt"],
      "update": "receipt",
      "steps": [
          { "set": "data.receipt.items", "to": "data.receipt.items.filter(i => i.id != body.id)" },
          { "action:run": { "name": "recalculateReceiptLogic" } }
      ]
  },
  "POST /action/clearReceipt": {
    "type": "action",
    "reads": ["receipt"],
    "writes": ["receipt"],
    "update": "receipt",
    "steps": [
      { "set": "data.receipt.items", "to": "[]" },
      { "set": "data.receipt.discountPercent", "to": "0" },
      { "set": "data.receipt.statusMessage", "to": "'Чек очищен.'" },
      { "action:run": { "name": "recalculateReceiptLogic" } }
    ]
  },
  "POST /action/filterPositions": {
    "type": "action",
    "reads": ["positions", "viewState"],
    "writes": ["viewState"],
    "update": "positionsList",
    "steps": [{ "run": "filterPositions" }]
  },
  "POST /action/applyCoupon": {
    "type": "action",
    "reads": ["receipt"],
    "writes": ["receipt"],
    "update": "receipt",
    "steps": [
      { "set": "data.receipt.statusMessage", "to": "'Неверный купон!'" },
      { "set": "data.receipt.discountPercent", "to": "0" },
      {
        "if": "body.coupon_code === 'SALE15'",
        "then": [
          { "set": "data.receipt.discountPercent", "to": 15 },
          { "set": "data.receipt.statusMessage", "to": "'Купон SALE15 применен!'" }
        ]
      },
      { "action:run": { "name": "recalculateReceiptLogic" } }
    ]
  },
  "POST /action/soft-refresh-receipt": {
    "type": "action",
    "reads": ["receipt"],
    "update": "receipt",
    "steps": []
  }
};