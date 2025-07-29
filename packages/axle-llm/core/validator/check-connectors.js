// packages/axle-llm/core/validator/check-connectors.js
// Этот модуль отвечает за валидацию секции `connectors` в манифесте.

const { addIssue } = require('./utils');

/**
 * Проверяет все коннекторы, объявленные в манифесте.
 * @param {object} manifest - Полный объект манифеста.
 */
function validateConnectors(manifest) {
  const connectors = manifest.connectors || {};

  // Проходим по каждому коннектору, объявленному в манифесте.
  for (const name in connectors) {
    const config = connectors[name];
    const category = `Connector '${name}'`; // Категория для сообщений об ошибках.

    // Проверка 1: У каждого коннектора должен быть указан тип.
    if (!config.type) {
      addIssue(
        'error',
        category,
        `Connector is missing the required 'type' property.`,
        `Must be one of: 'wise-json', 'in-memory'.`
      );
      // Если типа нет, дальнейшие проверки могут быть бессмысленны, переходим к следующему.
      continue; 
    }

    // Проверка 2: Тип должен быть одним из поддерживаемых.
    const supportedTypes = ['wise-json', 'in-memory'];
    if (!supportedTypes.includes(config.type)) {
      addIssue(
        'error',
        category,
        `Unsupported connector type: '${config.type}'.`,
        `Must be one of: ${supportedTypes.join(', ')}.`
      );
    }
    
    // Проверка 3: У `in-memory` коннекторов настоятельно рекомендуется иметь `initialState`.
    if (config.type === 'in-memory' && !config.initialState) {
        addIssue(
          'warning',
          category,
          `Connector is missing 'initialState'. The connector will start with an empty object {} by default.`,
          `It is highly recommended to define a default structure, for example: "initialState": { "items": [] }`
        );
    }

    // Проверка 4 (будущая): Можно добавить проверку, что у `wise-json` коннекторов
    // указано поле `collection`, если мы решим сделать его обязательным.
  }
}

module.exports = validateConnectors;