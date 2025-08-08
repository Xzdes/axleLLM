module.exports = {
  "GET /": {
    "type": "view",
    "layout": "mainLayout",
    "reads": ["user", "receipt", "positions", "viewState", "settings"],
    "inject": {
      "header": "header",
      "pageContent": "cashierPage",
      "positionsList": "positionsList",
      "receipt": "receipt"
    },
    "auth": { "required": true, "failureRedirect": "/login" }
  },

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

  "POST /action/addItem": { 
    "type": "action", 
    "reads": ["positions", "receipt"], 
    "writes": ["receipt"], 
    "update": "receipt", // ★ ЛОГИЧНО: эта операция обновляет чек
    "steps": [
        { "set": "context.productToAdd", "to": "data.positions.items.find(p => p.id == body.id)" }, 
        { "set": "context.itemInReceipt", "to": "data.receipt.items.find(i => i.id == body.id)" }, 
        { "if": "context.itemInReceipt", "then": [{ "set": "context.itemInReceipt.quantity", "to": "context.itemInReceipt.quantity + 1" }], "else": [{ "set": "context.productToAdd.quantity", "to": "1" }, { "set": "data.receipt.items", "to": "data.receipt.items.concat([context.productToAdd])" }] }, 
        { "set": "data.receipt.statusMessage", "to": "''" }, 
        { "action:run": { "name": "recalculateReceiptLogic" } }
    ]
  },
  "POST /action/removeItem": { 
    "type": "action", 
    "reads": ["receipt"], 
    "writes": ["receipt"], 
    "update": "receipt", // ★ ЛОГИЧНО: эта операция обновляет чек
    "steps": [
        { "set": "data.receipt.items", "to": "data.receipt.items.filter(i => i.id != body.id)" }, 
        { "action:run": { "name": "recalculateReceiptLogic" } }
    ]
  },
  "POST /action/clearReceipt": { 
    "type": "action", 
    "reads": ["receipt"], 
    "writes": ["receipt"], 
    "update": "receipt", // ★ ЛОГИЧНО: эта операция обновляет чек
    "steps": [
        { "set": "data.receipt.items", "to": "[]" }, 
        { "set": "data.receipt.discountPercent", "to": "0" }, 
        { "set": "data.receipt.statusMessage", "to": "'Чек очищен.'" }, 
        { "action:run": { "name": "recalculateReceiptLogic" } }
    ]
  },
  "POST /action/applyCoupon": { 
    "type": "action", 
    "reads": ["receipt"], 
    "writes": ["receipt"], 
    "update": "receipt", // ★ ЛОГИЧНО: эта операция обновляет чек
    "steps": [
        { "set": "data.receipt.statusMessage", "to": "'Неверный купон!'" }, 
        { "set": "data.receipt.discountPercent", "to": "0" }, 
        { "if": "body.coupon_code === 'SALE15'", "then": [{ "set": "data.receipt.discountPercent", "to": 15 }, { "set": "data.receipt.statusMessage", "to": "'Купон SALE15 применен!'" }] }, 
        { "action:run": { "name": "recalculateReceiptLogic" } }
    ]
  },

  "POST /action/filterPositions": { 
    "type": "action", 
    "reads": ["positions", "viewState"], 
    "writes": ["viewState"], 
    "update": "positionsList", // ★ ЛОГИЧНО: эта операция обновляет список товаров
    "steps": [{ "run": "filterPositions" }]
  },
  
  "POST /action/soft-refresh-receipt": {  
    "type": "action",  
    "reads": ["receipt"],  
    "update": "receipt",
    "steps": [] 
  },
  
  "GET /action/showInfo": { "type": "action", "reads": ["receipt"], "steps": [{"bridge:call": { "api": "dialogs.showMessageBox","args": "{ type: 'info', title: 'Информация о чеке', message: 'Текущая итоговая сумма чека:', detail: data.receipt.finalTotal + ' руб.' }"}}] },
  "GET /action/open-file": { "type": "action", "steps": [{"bridge:call": { "api": "dialogs.showOpenDialog", "await": true, "resultTo": "context.openResult", "args": "{ properties: ['openFile'] }"}}, { "if": "!context.openResult.canceled", "then": [{ "log:value": "context.openResult.filePaths[0]" }]}]},
  "GET /action/open-docs": { "type": "action", "steps": [{"bridge:call": { "api": "shell.openExternal", "args": "'https://github.com/Xzdes/axleLLM'"}}]},
  "POST /action/saveReceipt": { "type": "action", "reads": ["receipt"], "steps": [{"run:set": "context.receiptText", "handler": "formatReceiptForSave", "with": "[data.receipt]"},{"bridge:call": { "api": "dialogs.showSaveDialog", "await": true, "resultTo": "context.saveInfo", "args": "{ defaultPath: 'receipt.txt' }"}},{"if": "!context.saveInfo.canceled","then": [{"bridge:call": { "api": "custom.fileUtils.saveTextFile", "args": "[context.saveInfo.filePath, context.receiptText]", "resultTo": "context.saveResult"}},{"bridge:call": { "api": "dialogs.showMessageBox", "args": "{ type: context.saveResult.success ? 'info' : 'error', title: 'Сохранение чека', message: context.saveResult.message }"}}]}]}
};