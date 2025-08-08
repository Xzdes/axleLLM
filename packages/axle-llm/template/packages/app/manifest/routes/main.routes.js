// packages/app/manifest/routes/main.routes.js

module.exports = {
  /**
   * VIEW-РОУТ: Отображает главный экран.
   * Вызывается при запуске приложения.
   */
  "GET /": {
    "type": "view",
    "layout": "mainLayout",
    "reads": ["viewState", "globals"], // globals нужны для кастомного title bar
    "inject": {
      "pageContent": "homePage"
    }
  },

  /**
   * ACTION-РОУТ: Изменяет сообщение в состоянии.
   * Вызывается по клику на кнопку в `home-page.jsx`.
   */
  "POST /action/change-message": {
    "type": "action",
    "reads": ["viewState"],
    "writes": ["viewState"],
    // ★★★ КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: Мы обновляем главный layout, а не отдельный компонент ★★★
    "update": "mainLayout",
    "steps": [
      { "log": "Button was clicked! Changing message..." },
      { 
        "set": "data.viewState.message", 
        "to": "'You clicked the button! Great job.'" 
      }
    ]
  }
};