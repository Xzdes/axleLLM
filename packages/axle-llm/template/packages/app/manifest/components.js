module.exports = {
  // Главный макет приложения.
  "mainLayout": {
    "template": "layouts/main-layout.html"
  },
  // Наша единственная страница.
  "homePage": {
    "template": "pages/home-page.html",
    "schema": {
      "requires": ["viewState"] // Явно указываем, что этой странице нужен viewState.
    }
  }
};