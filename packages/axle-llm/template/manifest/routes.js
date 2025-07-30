module.exports = {
  // Маршрут для отображения главного экрана.
  "GET /": {
    "type": "view",
    "layout": "mainLayout",
    "reads": ["viewState"], // Предоставляем коннектор, который требует homePage.
    "inject": {
      "pageContent": "homePage"
    }
  },

  // Маршрут, который вызывается по клику на кнопку.
  "POST /action/change-message": {
    "type": "action",
    "reads": ["viewState"],  // Читаем текущее состояние.
    "writes": ["viewState"], // Указываем, что будем его изменять.
    "update": "homePage",    // Какой компонент нужно перерисовать после выполнения.
    "steps": [
      { "log": "Button clicked! Changing message..." },
      { "set": "data.viewState.message", "to": "'Hello, AxleLLM!'" }
    ]
  }
};