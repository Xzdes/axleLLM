// packages/axle-llm/core/validator/check-components.js
const path = require('path');
const { addIssue, checkFileExists } = require('./utils');

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

    // In our new React engine, the component definition is just the object.
    // The key 'name' corresponds to the file name.
    const templateFilename = `${name}.jsx`;
    const templatePath = path.join(componentsDir, templateFilename);

    // 1. Check if the .jsx file exists.
    checkFileExists(templatePath, category, `component source file '${templateFilename}'`);

    // 2. Check if a style file is specified and if it exists.
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