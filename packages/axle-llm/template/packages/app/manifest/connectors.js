// packages/axle-llm/template/packages/app/manifest/connectors.js

module.exports = {
  /**
   * Коннектор для хранения временного состояния UI.
   * `in-memory` означает, что данные будут сбрасываться
   * при каждом перезапуске приложения. Идеально для
   * состояния, которое не нужно сохранять надолго.
   */
  "viewState": {
    "type": "in-memory",
    "initialState": {
      "message": "Welcome to your new AxleLLM App!"
    }
  },

  /**
   * НОВЫЙ КОННЕКТОР
   * Хранит персистентные настройки приложения.
   * `wise-json` означает, что данные будут сохранены на диске.
   * Мы будем использовать его для хранения выбранной пользователем темы.
   */
  "settings": {
    "type": "wise-json",
    "collection": "app_settings",
    "initialState": {
      "currentTheme": "light" // Тема по умолчанию: 'light' или 'dark'
    }
  }
};