// Этот файл содержит класс ConnectorManager.
// Его задача — быть единой точкой входа для всех операций с данными.
// Он читает `manifest.js`, инициализирует все объявленные коннекторы
// и предоставляет другим частям движка унифицированный доступ к ним.

const path = require('path');
const WiseJSON = require('wise-json-db/wise-json');

// Импортируем реализации для каждого типа коннектора.
// Мы создадим эти файлы в следующих шагах.
const { InMemoryConnector } = require('./connectors/in-memory-connector');
const { WiseJsonConnector } = require('./connectors/wise-json-connector');

class ConnectorManager {
  /**
   * @param {string} appPath - Абсолютный путь к приложению пользователя.
   * @param {object} manifest - Загруженный объект манифеста.
   */
  constructor(appPath, manifest) {
    this.appPath = appPath;
    this.manifest = manifest;
    
    // Хранилище для всех инициализированных экземпляров коннекторов.
    this.connectors = {};

    // Создаем ЕДИНЫЙ экземпляр `wise-json-db` для всего приложения.
    // Все `wise-json` коннекторы будут использовать этот один экземпляр,
    // работая с разными коллекциями внутри него.
    // Мы храним данные в специальной папке, чтобы не засорять корень проекта.
    const dbPath = path.join(this.appPath, 'axle-db-data');
    this.dbInstance = new WiseJSON(dbPath);
    this.dbInitPromise = null; // Промис для отслеживания инициализации БД.
  }

  /**
   * Асинхронно инициализирует все коннекторы, объявленные в манифесте.
   * Этот метод должен быть вызван перед началом работы сервера.
   */
  async init() {
    console.log('[ConnectorManager] Initializing...');

    // Запускаем инициализацию `wise-json-db` и сохраняем промис.
    this.dbInitPromise = this.dbInstance.init().catch(err => {
      console.error("[ConnectorManager] CRITICAL: Failed to initialize WiseJSON DB.", err);
      // Если БД не стартовала, это критическая ошибка.
      throw err;
    });

    // Дожидаемся, пока БД будет готова.
    await this.dbInitPromise;
    console.log('[ConnectorManager] WiseJSON DB instance is ready.');

    const connectorConfigs = this.manifest.connectors || {};
    for (const name in connectorConfigs) {
      const config = connectorConfigs[name];
      
      switch (config.type) {
        case 'in-memory':
          this.connectors[name] = new InMemoryConnector(name, config);
          console.log(`[ConnectorManager] -> Initialized 'in-memory' connector: '${name}'`);
          break;

        case 'wise-json':
          // Передаем в конструктор уже готовый экземпляр БД.
          this.connectors[name] = new WiseJsonConnector(name, config, this.dbInstance);
          console.log(`[ConnectorManager] -> Initialized 'wise-json' connector: '${name}'`);
          break;

        default:
          // Если в манифесте указан неизвестный тип, выводим предупреждение.
          console.warn(`[ConnectorManager] WARN: Unknown connector type '${config.type}' for connector '${name}'. Skipping.`);
          break;
      }
    }
    console.log('[ConnectorManager] All connectors initialized.');
  }

  /**
   * Возвращает инициализированный экземпляр коннектора по его имени.
   * @param {string} name - Имя коннектора из манифеста.
   * @returns {object|undefined}
   */
  getConnector(name) {
    const connector = this.connectors[name];
    if (!connector) {
      console.warn(`[ConnectorManager] WARN: Attempted to access non-existent connector '${name}'.`);
    }
    return connector;
  }

  /**
   * Загружает данные из нескольких коннекторов и возвращает их в виде объекта.
   * Это основной метод, который используется перед рендерингом `view` или выполнением `action`.
   * @param {string[]} keys - Массив имен коннекторов для загрузки (например, ['user', 'receipt']).
   * @returns {Promise<object>} - Объект, где ключи - имена коннекторов, а значения - их данные.
   */
  async getContext(keys) {
    const context = {};
    const promises = [];

    for (const key of keys) {
      const connector = this.getConnector(key);
      if (connector) {
        // Запускаем чтение всех коннекторов параллельно.
        const readPromise = connector.read().then(data => {
          context[key] = data;
        });
        promises.push(readPromise);
      }
    }

    // Дожидаемся, пока все операции чтения завершатся.
    await Promise.all(promises);
    return context;
  }
}

module.exports = {
  ConnectorManager,
};