module.exports = {
  "POST /action/window/minimize": {
    "type": "action",
    "steps": [{ "bridge:call": { "api": "window.minimize" } }]
  },
  "POST /action/window/maximize": {
    "type": "action",
    "steps": [{ "bridge:call": { "api": "window.maximize" } }]
  },
  "POST /action/window/close": {
    "type": "action",
    "steps": [{ "bridge:call": { "api": "window.close" } }]
  }
};