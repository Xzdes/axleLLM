// Этот файл содержит реализацию коннектора типа `wise-json`.
// Он использует `wise-json-db` для персистентного хранения данных на диске.
// Поддерживает миграции, транзакции и разделение данных на "коллекцию" и "метаданные".

const { Migrator } = require('../migrator'); // Мы создадим этот файл далее.

class WiseJsonConnector {
  /**
   * @param {string} name - Имя коннектора из манифеста.
   * @param {object} config - Объект конфигурации для этого коннектора.
   * @param {object} dbInstance - Уже инициализированный экземпляр WiseJSON.
   */
  constructor(name, config, dbInstance) {
    this.name = name;
    this.config = config;
    this.dbInstance = dbInstance;
    
    // Имя коллекции в БД. Если не указано, используется имя коннектора.
    this.collectionName = config.collection || name;
    this.collection = null; // Здесь будет экземпляр коллекции.

    // Создаем экземпляр мигратора с правилами из манифеста.
    this.migrator = new Migrator(config.migrations);
    
    // Промис для отслеживания инициализации самой коллекции.
    this.initPromise = this._initialize();
  }

  /**
   * Внутренний метод для получения экземпляра коллекции из БД.
   */
  async _initialize() {
    if (!this.dbInstance) {
      throw new Error(`[WiseJsonConnector:${this.name}] DB instance is not available.`);
    }
    this.collection = await this.dbInstance.getCollection(this.collectionName);
  }

  /**
   * Считывает и собирает данные из коллекции.
   * Применяет миграции при необходимости.
   * @returns {Promise<object>} - Объект с данными в формате { items: [...], ...meta }.
   */
  async read() {
    // Убеждаемся, что коллекция готова к работе.
    await this.initPromise;

    const allDocs = await this.collection.getAll() || [];
    
    // Находим документ с метаданными (он у нас один).
    const metaDoc = allDocs.find(d => d._id === '_meta') || {};
    // Все остальные документы - это элементы нашей коллекции.
    const items = allDocs.filter(d => d._id !== '_meta');
    
    // Собираем финальный объект данных.
    // Порядок важен: initialState -> metaDoc -> items.
    // Это гарантирует, что сохраненные данные перезапишут начальные.
    let data = {
      ...(this.config.initialState || {}),
      ...metaDoc,
      items: items
    };

    // Запускаем мигратор. Он проверяет данные и обновляет их структуру, если нужно.
    const migrationResult = this.migrator.migrate(data);
    if (migrationResult.changed) {
      console.log(`[WiseJsonConnector:${this.name}] Data structure has been migrated. Resaving...`);
      // Если мигратор изменил данные, мы тут же перезаписываем их обратно в БД,
      // чтобы следующая операция чтения получила уже обновленную структуру.
      await this.write(data);
    }

    return data;
  }

  /**
   * Полностью перезаписывает данные в коллекции, используя транзакцию.
   * @param {object} newData - Новый объект данных для сохранения.
   */
  async write(newData) {
    await this.initPromise;
    
    // Деструктурируем новые данные: `items` отдельно, всё остальное — в `metaData`.
    const { items, ...metaData } = newData;
    const docsToSave = items || [];

    // Используем транзакцию для гарантии атомарности операции.
    // Либо все операции внутри (clear, insertMany, insert) выполнятся успешно,
    // либо ни одна из них не будет применена. Это защищает от повреждения данных.
    const txn = this.dbInstance.beginTransaction();
    try {
      const txnCollection = txn.collection(this.collectionName);

      // 1. Полностью очищаем коллекцию.
      await txnCollection.clear(); 
      
      // 2. Вставляем все элементы коллекции одним махом.
      if (docsToSave.length > 0) {
        await txnCollection.insertMany(docsToSave);
      }
      
      // 3. Создаем и вставляем отдельный документ для метаданных.
      // Удаляем `_id` из `metaData`, если он там случайно оказался.
      delete metaData._id; 
      await txnCollection.insert({ _id: '_meta', ...metaData });

      // 4. Если все прошло успешно, подтверждаем транзакцию.
      await txn.commit();
    } catch (error) {
      console.error(`[WiseJsonConnector:${this.name}] Transaction failed. Rolling back. Error:`, error);
      // Если на любом шаге произошла ошибка, откатываем все изменения.
      await txn.rollback();
      throw error; // Пробрасываем ошибку наверх.
    }
  }
}

module.exports = {
  WiseJsonConnector,
};