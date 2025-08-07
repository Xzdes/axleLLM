// packages/example-app/manifest/connectors.js
// Этот файл описывает все источники данных ("коннекторы"),
// которые использует наше приложение.

module.exports = {
  // --- Коннекторы для Аутентификации ---

  // Хранит активные сессии пользователей
  "session": { 
    "type": "wise-json", 
    "collection": "sessions",
    "initialState": {}
  },

  // Хранит данные пользователей
  "user": { 
    "type": "wise-json", 
    "collection": "user", 
    "initialState": {} 
  },

  // Хранит настройки приложения, включая тему
  "settings": {
    "type": "wise-json",
    "collection": "settings",
    "initialState": {
      "currentTheme": "light"
    }
  },

  // Хранит чек
  "receipt": {
    "type": "wise-json",
    "collection": "receipt",
    "initialState": { 
      "items": [], 
      "itemCount": 0, 
      "total": 0, 
      "discountPercent": 0,
      "discount": 0, 
      "finalTotal": 0, 
      "statusMessage": ""
    }
  },

  // Хранит позиции
  "positions": { 
    "type": "wise-json",
    "collection": "positions",
    "initialState": { 
      "items": [] 
    }
  },
  
  // Состояние UI
  "viewState": { 
    "type": "in-memory",
    "initialState": { 
      "query": "",
      "filtered": []
    } 
  },
  
  // ★★★ НОВЫЙ КОННЕКТОР ★★★
  // Хранит персистентные настройки приложения.
  // Мы будем использовать его для хранения выбранной пользователем темы.
  "settings": {
    "type": "wise-json",
    "collection": "app_settings",
    "initialState": {
      "currentTheme": "light" // Тема по умолчанию: 'light' или 'dark'
    }
  }
};