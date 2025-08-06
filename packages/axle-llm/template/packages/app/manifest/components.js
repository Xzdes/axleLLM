module.exports = {
  "mainLayout": {
    "template": "main-layout.jsx",
    "style": "main-layout.css"
  },
  "titleBar": {
    "template": "title-bar.jsx",
    "style": "title-bar.css",
    "schema": {
      "requires": ["globals"]
    }
  },
  "homePage": {
    "template": "home-page.jsx",
    "style": "home-page.css",
    "schema": {
      "requires": ["viewState"]
    }
  }
};