// packages/example-app/manifest/routes/cashier.routes.js
// Этот модуль содержит всю основную бизнес-логику приложения кассы.

module.exports = {
  // --- ГЛАВНЫЙ VIEW-РОУТ ПРИЛОЖЕНИЯ ---

  /**
   * Отображает главный экран кассира после успешного входа.
   */
  "GET /": {
    "type": "view",
    "layout": "mainLayout",
    // Загружаем все необходимые данные для отображения страницы
    "reads": ["user", "receipt", "positions", "viewState"],
    "inject": {
      "header": "header",
      "pageContent": "cashierPage",
      "positionsList": "positionsList",
      "receipt": "receipt"
    },
    // Этот роут требует авторизации. Если пользователь не вошел, его перенаправит на /login.
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
      // 1. Посчитать общее количество товаров в чеке
      { "set": "data.receipt.itemCount", "to": "data.receipt.items.reduce((sum, item) => sum + (item.quantity || 0), 0)" },
      // 2. Вызвать внешнюю "чистую" функцию для подсчета суммы без скидки
      { "run:set": "data.receipt.total", "handler": "calculateTotal", "with": "[data.receipt.items]" },
      // 3. Вызвать другую функцию для расчета финальной суммы с учетом скидки
      { "run:set": "context.finalCalc", "handler": "calculateFinalTotal", "with": "[data.receipt.total, data.receipt.discountPercent]" },
      // 4. Обновить поля в коннекторе `receipt` результатами вычислений
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
    "update": "receipt", // После выполнения перерисовать компонент "receipt"
    "steps": [
      { "set": "context.productToAdd", "to": "data.positions.items.find(p => p.id == body.id)" },
      { "set": "context.itemInReceipt", "to": "data.receipt.items.find(i => i.id == body.id)" },
      { "if": "context.itemInReceipt",
        "then": [{ "set": "context.itemInReceipt.quantity", "to": "context.itemInReceipt.quantity + 1" }],
        "else": [
          { "set": "context.productToAdd.quantity", "to": "1" },
          { "set": "data.receipt.items", "to": "data.receipt.items.concat([context.productToAdd])" }
        ]
      },
      { "set": "data.receipt.statusMessage", "to": "''" }, // Сбросить статусное сообщение
      { "action:run": { "name": "recalculateReceiptLogic" } } // Вызвать пересчет чека
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
      // По умолчанию считаем, что купон неверный
      { "set": "data.receipt.statusMessage", "to": "'Неверный купон!'" },
      { "set": "data.receipt.discountPercent", "to": "0" },
      // Если код купона верный, применяем скидку
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
    "update": "positionsList",
    // Вся логика фильтрации вынесена в отдельный JS-файл для чистоты
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