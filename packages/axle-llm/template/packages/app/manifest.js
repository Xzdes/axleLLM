module.exports = {
  launch: {
    title: "My New AxleLLM App",
    window: {
      width: 1024,
      height: 768,
      frame: false, // Frameless by default
      devtools: true
    }
  },
  globals: {
    appName: "My AxleLLM App",
    appVersion: "1.0.0",
    useCustomTitleBar: true // Enable custom title bar by default
  },
  themes: {
    default: {
      "--primary-bg": "#f0f2f5",
      "--secondary-bg": "#FFFFFF",
      "--text-color": "#1a1a1a",
      "--border-color": "#dee2e6",
      "--border-radius": "6px"
    }
  },
  routes: {},
};