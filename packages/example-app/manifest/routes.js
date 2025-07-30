// packages/example-app/manifest/routes.js
module.exports = {
  "recalculateReceiptLogic": {
    "type": "action",
    "internal": true,
    "steps": [
      { "set": "data.receipt.itemCount", "to": "data.receipt.items.reduce((sum, item) => sum + (item.quantity || 0), 0)" },
      { "run:set": "data.receipt.total", "handler": "calculateTotal", "with": "[data.receipt.items]" },
      { "run:set": "context.finalCalc", "handler": "calculateFinalTotal", "with": "[data.receipt.total, data.receipt.discountPercent]" },
      { "set": "data.receipt.discount", "to": "context.finalCalc.discount" },
      { "set": "data.receipt.finalTotal", "to": "context.finalCalc.finalTotal" }
    ]
  },

  "GET /": {
    "type": "view", "layout": "mainLayout", "reads": ["user", "receipt", "positions", "viewState"],
    "inject": {
      "header": "header",
      "pageContent": "cashierPage",
      "positionsList": "positionsList",
      "receipt": "receipt"
    },
    "auth": { "required": true, "failureRedirect": "/login" }
  },

  "GET /login": {
    "type": "view", "layout": "mainLayout",
    "inject": {
      "header": "header",
      "pageContent": "authLayout",
      "formContent": "loginForm"
    }
  },

  "GET /register": {
    "type": "view", "layout": "mainLayout",
    "inject": {
      "header": "header",
      "pageContent": "authLayout",
      "formContent": "registerForm"
    }
  },

  "POST /auth/login": { "type": "action", "reads": ["user"], "steps": [ { "set": "context.userToLogin", "to": "data.user.items.find(u => u.login === body.login)" }, { "set": "context.bcrypt", "to": "require('bcrypt')" }, { "if": "context.userToLogin && context.bcrypt.compareSync(body.password, context.userToLogin.passwordHash)", "then": [ { "auth:login": "context.userToLogin" }, { "client:redirect": "'/'" } ], "else": [ { "client:redirect": "'/login?error=1'" } ] } ] },
  "POST /auth/register": { "type": "action", "reads": ["user"], "writes": ["user"], "steps": [ { "set": "context.userExists", "to": "data.user.items.some(u => u.login === body.login)" }, { "if": "context.userExists", "then": [{ "client:redirect": "'/register?error=1'" }], "else": [ { "set": "context.bcrypt", "to": "require('bcrypt')" }, { "set": "context.passwordHash", "to": "context.bcrypt.hashSync(body.password, 10)" }, { "set": "context.newUser", "to": "{ login: body.login, name: body.name, role: 'Кассир', passwordHash: context.passwordHash }" }, { "set": "data.user.items", "to": "data.user.items.concat([context.newUser])" }, { "client:redirect": "'/login?registered=true'" } ] } ] },
  "GET /auth/logout": { "type": "action", "steps": [ { "auth:logout": true }, { "client:redirect": "'/login'" } ] },
  "POST /action/addItem": { "type": "action", "reads": ["positions", "receipt"], "writes": ["receipt"], "update": "receipt", "steps": [ { "set": "context.productToAdd", "to": "data.positions.items.find(p => p.id == body.id)" }, { "set": "context.itemInReceipt", "to": "data.receipt.items.find(i => i.id == body.id)" }, { "if": "context.itemInReceipt", "then": [{ "set": "context.itemInReceipt.quantity", "to": "context.itemInReceipt.quantity + 1" }], "else": [ { "set": "context.productToAdd.quantity", "to": "1" }, { "set": "data.receipt.items", "to": "data.receipt.items.concat([context.productToAdd])" } ] }, { "set": "data.receipt.statusMessage", "to": "''" }, { "action:run": { "name": "recalculateReceiptLogic" } } ] },
  "POST /action/removeItem": { "type": "action", "reads": ["receipt"], "writes": ["receipt"], "update": "receipt", "steps": [ { "set": "data.receipt.items", "to": "data.receipt.items.filter(i => i.id != body.id)" }, { "action:run": { "name": "recalculateReceiptLogic" } } ] },
  "POST /action/clearReceipt": { "type": "action", "reads": ["receipt"], "writes": ["receipt"], "update": "receipt", "steps": [ { "set": "data.receipt.items", "to": "[]" }, { "set": "data.receipt.discountPercent", "to": "0" }, { "set": "data.receipt.statusMessage", "to": "'Чек очищен.'" }, { "action:run": { "name": "recalculateReceiptLogic" } } ] },
  "POST /action/filterPositions": { "type": "action", "reads": ["positions", "viewState"], "writes": ["viewState"], "update": "positionsList", "steps": [{ "run": "filterPositions" }] },
  "POST /action/applyCoupon": { "type": "action", "reads": ["receipt"], "writes": ["receipt"], "update": "receipt", "steps": [ { "set": "data.receipt.statusMessage", "to": "'Неверный купон!'" }, { "set": "data.receipt.discountPercent", "to": "0" }, { "if": "body.coupon_code === 'SALE15'", "then": [ { "set": "data.receipt.discountPercent", "to": 15 }, { "set": "data.receipt.statusMessage", "to": "'Купон SALE15 применен!'" } ] }, { "action:run": { "name": "recalculateReceiptLogic" } } ] },
  "POST /action/soft-refresh-receipt": { "type": "action", "reads": ["receipt"], "update": "receipt", "steps": [] },
  "GET /action/showInfo": {
    "type": "action",
    "reads": ["receipt"],
    "steps": [
      {
        "bridge:call": {
          "api": "dialogs.showMessageBox",
          "args": `{
            type: 'info',
            title: 'Информация о чеке',
            message: 'Текущая итоговая сумма чека:',
            detail: data.receipt.finalTotal + ' руб.'
          }`
        }
      }
    ]
  },
  "GET /action/open-file": {
    "type": "action",
    "steps": [
      {
        "bridge:call": {
          "api": "dialogs.showOpenDialog",
          "args": `{
            properties: ['openFile'],
            filters: [
              { name: 'Text Files', extensions: ['txt', 'md'] },
              { name: 'All Files', extensions: ['*'] }
            ]
          }`
        }
      }
    ]
  },
  "GET /action/open-docs": {
    "type": "action",
    "steps": [
      {
        "bridge:call": {
          "api": "shell.openExternal",
          "args": `{ "url": "https://github.com/Xzdes/axleLLM" }`
        }
      }
    ]
  },
  "POST /action/saveReceipt": {
    "type": "action",
    "reads": ["receipt"],
    "steps": [
      {
        "run:set": "context.receiptText",
        "handler": "formatReceiptForSave",
        "with": "[data.receipt]"
      },
      {
        "bridge:call": {
          "api": "custom.fileUtils.saveTextFile",
          "args": "['receipt.txt', context.receiptText]",
          "resultTo": "context.saveResult"
        }
      },
      {
        "bridge:call": {
          "api": "dialogs.showMessageBox",
          "args": `{
            type: context.saveResult.success ? 'info' : 'error',
            title: 'Сохранение чека',
            message: context.saveResult.message
          }`
        }
      }
    ]
  }
};