// packages/axle-llm/core/validator/check-components.js
const path = require('path');
const { addIssue, checkFileExists } = require('./utils');

/**
 * Converts a camelCase string to kebab-case.
 * Example: 'mainLayout' -> 'main-layout'
 * @param {string} str The string to convert.
 * @returns {string} The kebab-cased string.
 */
function camelToKebab(str) {
  return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Validates the 'components' section of the manifest for a React-based project.
 * @param {object} manifest - The full manifest object.
 * @param {string} appPath - The absolute path to the user's application.
 */
function validateComponents(manifest, appPath) {
  const components = manifest.components || {};
  const componentsDir = path.join(appPath, 'app', 'components');

  for (const name in components) {
    const config = components[name];
    const category = `Component '${name}'`;

    // ★★★ НАЧАЛО КЛЮЧЕВОГО ИСПРАВЛЕНИЯ ★★★
    // 1. Преобразуем camelCase имя компонента из манифеста в kebab-case для поиска файла.
    //    'mainLayout' => 'main-layout'
    const kebabCaseName = camelToKebab(name);
    
    // 2. Формируем имя файла с расширением.
    //    'main-layout' => 'main-layout.jsx'
    const templateFilename = `${kebabCaseName}.jsx`;
    // ★★★ КОНЕЦ КЛЮЧЕВОГО ИСПРАВЛЕНИЯ ★★★
    
    const templatePath = path.join(componentsDir, templateFilename);

    // 3. Проверяем, существует ли .jsx файл с kebab-case именем.
    checkFileExists(templatePath, category, `component source file '${templateFilename}'`);

    // 4. Проверяем, указан ли файл стилей и существует ли он.
    if (typeof config === 'object' && config.style) {
      const styleFilename = config.style;
      if (typeof styleFilename === 'string') {
        const stylePath = path.join(componentsDir, styleFilename);
        checkFileExists(stylePath, category, `style file '${styleFilename}'`);
      } else {
        addIssue('error', category, `The 'style' property must be a string path to a CSS file.`);
      }
    }
  }
}

module.exports = validateComponents;