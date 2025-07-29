// packages/axle-llm/core/validator/index.js
// Это главный файл-оркестратор для "Супер-Валидатора".
// Он импортирует и запускает все специализированные проверки
// для каждой секции манифеста (коннекторы, компоненты, роуты).

// Мы создадим эти файлы в следующих шагах.
const validateConnectors = require('./check-connectors');
const validateComponents = require('./check-components');
const validateRoutes = require('./check-routes');
const { getIssues, clearIssues, addIssue } = require('./utils');

/**
 * Основная функция, которая запускает все проверки манифеста.
 * @param {object} manifest - Объект манифеста для проверки.
 * @param {string} appPath - Абсолютный путь к приложению пользователя.
 * @returns {Array<object>} - Массив всех найденных проблем (ошибок и предупреждений).
 */
function validateManifest(manifest, appPath) {
  // Очищаем массив от проблем предыдущего запуска (важно для hot-reload).
  clearIssues();

  if (!manifest || typeof manifest !== 'object') {
    addIssue('error', 'Manifest', 'manifest.js file could not be loaded, is empty, or does not export an object.');
    return getIssues();
  }

  // --- Проверка наличия обязательных корневых секций ---
  const requiredSections = ['connectors', 'components', 'routes', 'launch'];
  requiredSections.forEach(section => {
    if (!manifest[section]) {
      // Ищем возможные опечатки для подсказки.
      const suggestion = Object.keys(manifest).find(key => key.toLowerCase() === section) 
          ? `Did you mean '${Object.keys(manifest).find(key => key.toLowerCase() === section)}'?` 
          : '';
      addIssue('error', 'Manifest Structure', `Required top-level section '${section}' is missing.`, suggestion);
    }
  });

  // Если отсутствуют ключевые секции, дальнейшие проверки могут вызвать ошибки,
  // поэтому мы можем вернуть уже найденные проблемы.
  if (getIssues().some(i => i.level === 'error')) {
      return getIssues();
  }

  // --- Запускаем все остальные модули проверок ---
  validateConnectors(manifest);
  validateComponents(manifest, appPath);
  validateRoutes(manifest, appPath);

  return getIssues();
}

module.exports = validateManifest;