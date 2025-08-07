// packages/example-app/manifest/routes/settings.routes.js

module.exports = {
  /**
   * ACTION-РОУТ: Переключает текущую тему оформления.
   * Вызывается по клику на кнопку в UI.
   */
  "POST /action/toggle-theme": {
    "type": "action",
    // Нам нужно "прочитать" текущее состояние настроек...
    "reads": ["settings"],
    // ...чтобы "записать" в него новое значение.
    "writes": ["settings"],
    // После смены темы мы должны перерисовать всё приложение,
    // начиная с корневого layout-компонента.
    "update": "mainLayout",
    "steps": [
      { 
        "set": "data.settings.currentTheme",
        // Используем тернарный оператор для переключения значения
        "to": "data.settings.currentTheme === 'light' ? 'dark' : 'light'" 
      }
    ]
  }
};