// packages/example-app/manifest/launch.js
module.exports = {
  title: "Атомарная Касса (axleLLM)",
  window: { 
    width: 1366, 
    height: 768, 
    devtools: true 
  },
  serve: {
    static: {
      "/public": "./public"
    }
  },
  build: {
    client: {
      entry: "./app/client/index.js",
      output: "./public/bundle.js"
    }
  }
};
