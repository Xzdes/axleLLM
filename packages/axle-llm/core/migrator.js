// Этот файл содержит класс Migrator.
// Его задача — применять правила миграции, описанные в манифесте,
// к набору данных. Это позволяет "на лету" обновлять структуру данных
// до актуальной версии без ручного вмешательства.

class Migrator {
  /**
   * @param {Array<object>|undefined} migrationsConfig - Массив правил миграции из манифеста.
   */
  constructor(migrationsConfig) {
    // Мы сохраняем правила. Если в манифесте секции `migrations` нет,
    // будет `undefined`, и мы будем работать с пустым массивом.
    this.config = migrationsConfig || [];
  }

  /**
   * Проверяет и применяет все сконфигурированные правила миграции к данным.
   * @param {object} data - Объект данных из коннектора (например, { items: [...], total: 0 }).
   * @returns {{data: object, changed: boolean}} - Возвращает объект с обновленными данными
   *   и флагом `changed`, который равен `true`, если были внесены изменения.
   */
  migrate(data) {
    // Если правил нет или данные не содержат массив `items`,
    // то миграция не требуется.
    if (this.config.length === 0 || !Array.isArray(data.items)) {
      return { data, changed: false };
    }

    let hasChanged = false;

    // Проходим по каждому правилу, определенному в манифесте.
    this.config.forEach(rule => {
      // На данный момент мы поддерживаем только один тип правила: `if_not_exists`.
      if (rule.if_not_exists && rule.set) {
        const fieldToCheck = rule.if_not_exists;
        const fieldsToSet = rule.set;

        // Применяем правило к каждому элементу в коллекции.
        data.items.forEach(item => {
          // Проверяем, что поле отсутствует именно у самого объекта, а не в его прототипе.
          // Это стандартная и безопасная практика в JavaScript.
          if (!Object.prototype.hasOwnProperty.call(item, fieldToCheck)) {
            // Если поля нет, мы копируем все поля из `rule.set` в наш элемент.
            for (const key in fieldsToSet) {
              item[key] = fieldsToSet[key];
            }
            // Выставляем флаг, что данные были изменены.
            hasChanged = true;
          }
        });
      }
    });

    return { data, changed: hasChanged };
  }
}

module.exports = {
  Migrator,
};