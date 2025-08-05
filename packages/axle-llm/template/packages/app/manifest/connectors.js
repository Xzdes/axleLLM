// packages/app/manifest/connectors.js

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
  }
};