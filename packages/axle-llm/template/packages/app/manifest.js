// packages/app/manifest.js

// Движок автоматически загрузит и объединит все остальные части
// из директории /manifest.

module.exports = {
  /**
   * Конфигурация запуска и основного окна приложения.
   */
  launch: {
    title: "My New AxleLLM App",
    window: {
      width: 1024,
      height: 768,
      devtools: true // Включаем DevTools по умолчанию для новых проектов
    }
  },

  /**
   * Глобальные переменные, доступные во всех React-компонентах
   * через `props.globals`.
   */
  globals: {
    appName: "My AxleLLM App",
    appVersion: "1.0.0"
  },

  /**
   * Декларативная система темизации. Эти переменные будут
   * автоматически добавлены как CSS-переменные в :root.
   */
  themes: {
    default: {
      "--primary-bg": "#f0f2f5",
      "--secondary-bg": "#FFFFFF",
      "--text-color": "#1a1a1a",
      "--header-height": "60px",
      "--border-radius": "8px"
    }
  },
  
  // Эта пустая секция routes ОБЯЗАТЕЛЬНА.
  // Она говорит движку, что нужно искать файлы маршрутов
  // в директории /manifest/routes/.
  routes: {},
};