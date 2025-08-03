// packages/axle-llm/core/validator/index.js
const validateConnectors = require('./check-connectors');
const validateComponents = require('./check-components');
const validateRoutes = require('./check-routes');
const { getIssues, clearIssues, addIssue } = require('./utils');

/**
 * Финальная, правильная версия валидатора.
 * Он принимает уже полностью собранный объект манифеста и просто его проверяет.
 * @param {object} manifest - Полностью собранный объект манифеста.
 * @param {string} appPath - Абсолютный путь к приложению пользователя.
 * @returns {Array<object>} - Массив всех найденных проблем.
 */
function validateManifest(manifest, appPath) {
  clearIssues();

  if (!manifest || typeof manifest !== 'object') {
    addIssue('error', 'Manifest', 'manifest.js file could not be loaded, is empty, or does not export an object.');
    return getIssues();
  }

  const requiredSections = ['connectors', 'components', 'routes', 'launch'];
  requiredSections.forEach(section => {
    if (!manifest[section]) {
      const suggestion = Object.keys(manifest).find(key => key.toLowerCase() === section) 
          ? `Did you mean '${Object.keys(manifest).find(key => key.toLowerCase() === section)}'?` 
          : '';
      addIssue('error', 'Manifest Structure', `Required top-level section '${section}' is missing.`, suggestion);
    }
  });

  if (getIssues().some(i => i.level === 'error')) {
      return getIssues();
  }

  validateConnectors(manifest);
  validateComponents(manifest, appPath);
  validateRoutes(manifest, appPath);

  return getIssues();
}

// Экспортируем только одну функцию, которая принимает манифест
module.exports = validateManifest;