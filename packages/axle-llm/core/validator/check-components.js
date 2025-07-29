// packages/axle-llm/core/validator/check-components.js
// Этот модуль отвечает за валидацию секции `components` в манифесте.

const path = require('path');
const { addIssue, checkFileExists } = require('./utils');

/**
 * Проверяет все компоненты, объявленные в манифесте.
 * @param {object} manifest - Полный объект манифеста.
 * @param {string} appPath - Абсолютный путь к приложению пользователя.
 */
function validateComponents(manifest, appPath) {
  const components = manifest.components || {};
  const componentsDir = path.join(appPath, 'app', 'components');

  for (const name in components) {
    const config = components[name];
    const category = `Component '${name}'`;

    let templateFilename;
    let styleFilename;

    // --- Шаг 1: Определяем, в каком формате задан компонент (строка или объект) ---

    if (typeof config === 'string') {
      // Простой формат: "myComponent": "my-template.html"
      templateFilename = config;
    } else if (typeof config === 'object' && config !== null && config.template) {
      // Комплексный формат: "myComponent": { template: "...", style: "..." }
      templateFilename = config.template;
      styleFilename = config.style;
    } else {
      // Неверный формат.
      addIssue(
        'error',
        category,
        `Invalid component definition.`,
        `Definition must be a string (template path) or an object with a 'template' property.`
      );
      continue; // Переходим к следующему компоненту.
    }

    // --- Шаг 2: Проверяем, что файлы, указанные в конфигурации, существуют ---

    // Проверяем существование файла шаблона (обязательно).
    if (templateFilename) {
      const templatePath = path.join(componentsDir, templateFilename);
      checkFileExists(templatePath, category, `template file '${templateFilename}'`);
    } else {
      addIssue('error', category, `Component definition is missing a template file path.`);
    }

    // Проверяем существование файла стилей (необязательно).
    if (styleFilename) {
      const stylePath = path.join(componentsDir, styleFilename);
      checkFileExists(stylePath, category, `style file '${styleFilename}'`);
    }
  }
}

module.exports = validateComponents;