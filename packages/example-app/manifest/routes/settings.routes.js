// packages/example-app/manifest/routes/settings.routes.js

module.exports = {
  "POST /action/toggle-theme": {
    "type": "action",
    "reads": ["settings"],
    "writes": ["settings"],
    "update": "mainLayout",
    "steps": [
      { 
        "set": "data.settings.currentTheme",
        "to": "data.settings.currentTheme === 'light' ? 'dark' : 'light'"
      }
    ]
  }
};