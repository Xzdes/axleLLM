// packages/example-app/manifest/routes/cashier.routes.js
module.exports = {
  // --- ГЛАВНЫЙ VIEW-РОУТ ПРИЛОЖЕНИЯ ---
  "GET /": {
    "type": "view",
    "layout": "main-layout", // БЫЛО: mainLayout
    "reads": ["user", "receipt", "positions", "viewState"],
    "inject": {
      "header": "header",
      "pageContent": "cashier-page",    // БЫЛО: cashierPage
      "positionsList": "positions-list",// БЫЛО: positionsList
      "receipt": "receipt"
    },
    "auth": { "required": true, "failureRedirect": "/login" }
  },

  // --- ВНУТРЕННИЙ (HELPER) ACTION-РОУТ ---

  /**
   * Переиспользуемая логика для пересчета всего чека.
   * Он помечен как "internal", поэтому его нельзя вызвать из UI напрямую,
   * только через шаг { "action:run": ... } из других роутов.
   */
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

  // --- ACTION-РОУТЫ ДЛЯ РАБОТЫ С ЧЕКОМ ---

  /**
   * Добавляет товар в чек.
   */
 "POST /action/addItem": {
    "type": "action",
    "reads": ["positions", "receipt"],
    "writes": ["receipt"],
    "update": "receipt", 
    "steps": [
      // ... (логика без изменений)
      { "set": "context.productToAdd", "to": "data.positions.items.find(p => p.id == body.id)" },
      { "set": "context.itemInReceipt", "to": "data.receipt.items.find(i => i.id == body.id)" },
      { "if": "context.itemInReceipt",
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

  /**
   * Удаляет товар из чека.
   */
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

  /**
   * Полностью очищает чек.
   */
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

  /**
   * Применяет промокод.
   */
  "POST /action/applyCoupon": {
    "type": "action",
    "reads": ["receipt"],
    "writes": ["receipt"],
    "update": "receipt",
    "steps": [
      { "set": "data.receipt.statusMessage", "to": "'Неверный купон!'" },
      { "set": "data.receipt.discountPercent", "to": "0" },
      { "if": "body.coupon_code === 'SALE15'", "then": [
          { "set": "data.receipt.discountPercent", "to": 15 },
          { "set": "data.receipt.statusMessage", "to": "'Купон SALE15 применен!'" }
      ]},
      { "action:run": { "name": "recalculateReceiptLogic" } }
    ]
  },

  /**
   * Фильтрует список товаров по поисковому запросу.
   */
  "POST /action/filterPositions": {
    "type": "action",
    "reads": ["positions", "viewState"],
    "writes": ["viewState"],
    "update": "positions-list", // БЫЛО: positionsList
    "steps": [{ "run": "filterPositions" }]
  },

  // --- ACTION-РОУТЫ ДЛЯ РАБОТЫ С BRIDGE (НАСТОЛЬНЫЕ ФУНКЦИИ) ---

  /**
   * Показывает информационное сообщение с итоговой суммой чека.
   */
  "GET /action/showInfo": {
    "type": "action",
    "reads": ["receipt"], // Нужны данные из чека
    "steps": [{
      "bridge:call": {
        "api": "dialogs.showMessageBox",
        "args": `{
          type: 'info',
          title: 'Информация о чеке',
          message: 'Текущая итоговая сумма чека:',
          detail: data.receipt.finalTotal + ' руб.'
        }`
      }
    }]
  },

  /**
   * Открывает системный диалог для выбора файла.
   */
  "GET /action/open-file": {
    "type": "action",
    "steps": [{
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
    }]
  },

  /**
   * Открывает URL документации в браузере по умолчанию.
   */
  "GET /action/open-docs": {
    "type": "action",
    "steps": [{
      "bridge:call": {
        "api": "shell.openExternal",
        "args": `{ "url": "https://github.com/Xzdes/axleLLM" }`
      }
    }]
  },

  /**
   * Сохраняет текущий чек в текстовый файл.
   */
  "POST /action/saveReceipt": {
    "type": "action",
    "reads": ["receipt"],
    "steps": [
      // 1. С помощью "чистой" функции форматируем данные чека в красивую строку
      {
        "run:set": "context.receiptText",
        "handler": "formatReceiptForSave",
        "with": "[data.receipt]"
      },
      // 2. Открываем системный диалог "Сохранить как..."
      {
        "bridge:call": {
          "api": "dialogs.showSaveDialog",
          "await": true, // Ждем, пока пользователь выберет путь или закроет окно
          "resultTo": "context.saveInfo",
          "args": `{ "defaultPath": "receipt.txt" }`
        }
      },
      // 3. Если пользователь выбрал путь и нажал "Сохранить"
      {
        "if": "!context.saveInfo.canceled",
        "then": [
          // 4. Вызываем наш кастомный серверный модуль для записи файла на диск
          {
            "bridge:call": {
              "api": "custom.fileUtils.saveTextFile",
              "args": "[context.saveInfo.filePath, context.receiptText]",
              "resultTo": "context.saveResult"
            }
          },
          // 5. Показываем пользователю сообщение об успехе или ошибке
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
    ]
  },
  
  /**
    * "Мягкое" обновление чека. Используется для WebSocket.
    * Не делает ничего, кроме чтения данных и перерисовки компонента.
  */
  "POST /action/soft-refresh-receipt": { 
    "type": "action", 
    "reads": ["receipt"], 
    "update": "receipt", 
    "steps": [] 
  },
};