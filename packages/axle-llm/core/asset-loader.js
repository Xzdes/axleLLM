// Этот файл содержит класс AssetLoader.
// Его задача — при старте приложения загрузить все файловые ассеты
// (HTML-шаблоны, CSS-стили, JS-скрипты для `run`-шагов) в оперативную память.
// Это позволяет избежать медленных операций чтения с диска при обработке каждого запроса.

const fs = require('fs');
const path = require('path');

class AssetLoader {
  /**
   * @param {string} appPath - Абсолютный путь к приложению пользователя.
   * @param {object} manifest - Загруженный объект манифеста.
   */
  constructor(appPath, manifest) {
    this.appPath = appPath;
    this.manifest = manifest;
    
    // Хранилища для кэшированного содержимого.
    this.components = {}; // Для { template, style }
    this.actions = {};    // Для модулей из app/actions/
    
    // Запускаем загрузку всех ассетов прямо в конструкторе.
    this.loadAll();
  }

  /**
   * Сканирует манифест и папки проекта, загружая все необходимые файлы.
   */
  loadAll() {
    console.log('[AssetLoader] Caching all application assets...');
    
    this._loadComponents();
    this._loadActions();
    
    console.log('[AssetLoader] Asset caching complete.');
  }

  /**
   * Загружает все UI-компоненты (HTML и CSS).
   * @private
   */
  _loadComponents() {
    const componentsConfig = this.manifest.components || {};
    const componentsDir = path.join(this.appPath, 'app', 'components');

    for (const name in componentsConfig) {
      const config = componentsConfig[name];
      const componentData = { template: null, style: null };

      let templatePath;
      let stylePath;

      if (typeof config === 'string') {
        // Простая конфигурация: "componentName": "template.html"
        templatePath = path.join(componentsDir, config);
      } else if (typeof config === 'object' && config.template) {
        // Комплексная конфигурация: "componentName": { template: "...", style: "..." }
        templatePath = path.join(componentsDir, config.template);
        if (config.style) {
          stylePath = path.join(componentsDir, config.style);
        }
      }

      // Читаем файл шаблона. Если его нет, это критическая ошибка.
      try {
        componentData.template = fs.readFileSync(templatePath, 'utf-8');
      } catch (error) {
        // Если обязательный файл шаблона не найден, бросаем ошибку,
        // чтобы приложение не запустилось с неполной конфигурацией.
        throw new Error(`[AssetLoader] CRITICAL: Template file not found for component '${name}' at path: ${templatePath}`);
      }
      
      // Читаем файл стилей. Если его нет, это не критично — просто выводим предупреждение.
      if (stylePath) {
        try {
          componentData.style = fs.readFileSync(stylePath, 'utf-8');
        } catch (error) {
          console.warn(`[AssetLoader] WARN: Style file not found for component '${name}' at path: ${stylePath}. Component will work without styles.`);
        }
      }
      
      this.components[name] = componentData;
    }
  }

  /**
   * Загружает все JS-скрипты для `run`-шагов из папки `app/actions/`.
   * @private
   */
  _loadActions() {
    const actionsDir = path.join(this.appPath, 'app', 'actions');
    
    // Проверяем, существует ли папка, чтобы избежать падения, если ее нет.
    if (!fs.existsSync(actionsDir)) {
      return;
    }
    
    fs.readdirSync(actionsDir).forEach(file => {
      if (file.endsWith('.js')) {
        const actionName = path.basename(file, '.js');
        const actionPath = path.join(actionsDir, file);
        try {
          // Используем `require`. Он сам кэширует модули, что очень эффективно.
          // `require.resolve` нужен для корректной очистки кэша при hot-reload.
          delete require.cache[require.resolve(actionPath)];
          this.actions[actionName] = require(actionPath);
        } catch (error) {
          // Если в файле действия есть синтаксическая ошибка, `require` выдаст исключение.
          // Мы ловим его и бросаем более понятную ошибку.
          throw new Error(`[AssetLoader] CRITICAL: Failed to load action script '${actionName}' from ${actionPath}. Error: ${error.message}`);
        }
      }
    });
  }

  /**
   * Возвращает кэшированные данные компонента.
   * @param {string} name - Имя компонента.
   * @returns {{template: string, style: string|null}|undefined}
   */
  getComponent(name) {
    return this.components[name];
  }

  /**
   * Возвращает кэшированный модуль действия.
   * @param {string} name - Имя действия (имя файла без .js).
   * @returns {function|undefined}
   */
  getAction(name) {
    return this.actions[name];
  }
}

module.exports = {
  AssetLoader,
};