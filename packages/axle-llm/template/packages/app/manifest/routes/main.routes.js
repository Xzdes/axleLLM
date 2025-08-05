// packages/app/manifest/routes/main.routes.js

module.exports = {
  /**
   * VIEW-РОУТ: Отображает главный экран.
   * Вызывается при запуске приложения.
   */
  "GET /": {
    "type": "view",
    "layout": "mainLayout",
    // Мы "читаем" данные из `viewState`, потому что наш компонент
    // `homePage` требует их согласно своей схеме.
    "reads": ["viewState"],
    "inject": {
      // Вставляем `homePage` в `mainLayout`.
      "pageContent": "homePage"
    }
  },

  /**
   * ACTION-РОУТ: Изменяет сообщение в состоянии.
   * Вызывается по клику на кнопку в `home-page.jsx`.
   */
  "POST /action/change-message": {
    "type": "action",
    // Нам нужно "прочитать" текущее состояние, чтобы его изменить.
    "reads": ["viewState"],
    // Мы "записываем" изменения обратно в `viewState`.
    // Движок автоматически сохранит данные после выполнения шагов.
    "writes": ["viewState"],
    // После выполнения, мы приказываем клиенту перерисовать `homePage`
    // с новыми данными.
    "update": "homePage",
    "steps": [
      { "log": "Button was clicked! Changing message..." },
      { 
        "set": "data.viewState.message", 
        "to": "'You clicked the button! Great job.'" 
      }
    ]
  }
};