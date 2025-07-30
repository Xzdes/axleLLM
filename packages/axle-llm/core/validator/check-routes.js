// packages/axle-llm/core/validator/check-routes.js
// Этот модуль отвечает за валидацию секции `routes` - самой сложной и важной
// части манифеста, так как она связывает все остальные части воедино.

const path = require('path');
const { addIssue, checkFileExists } = require('./utils');

/**
 * Проверяет все роуты, объявленные в манифесте.
 * @param {object} manifest - Полный объект манифеста.
 * @param {string} appPath - Абсолютный путь к приложению пользователя.
 */
function validateRoutes(manifest, appPath) {
  const routes = manifest.routes || {};
  const componentNames = Object.keys(manifest.components || {});
  const connectorNames = Object.keys(manifest.connectors || {});
  const actionNames = Object.keys(routes).filter(key => routes[key].type === 'action');

  for (const key in routes) {
    const route = routes[key];
    const category = `Route '${key}'`;

    if (!route.type || !['view', 'action'].includes(route.type)) {
      addIssue('error', category, `Route is missing or has an invalid 'type'. Must be 'view' or 'action'.`);
      continue;
    }

    if (route.type === 'view') {
      _validateViewRoute(route, category, componentNames, connectorNames);
    } else { // route.type === 'action'
      _validateActionRoute(route, category, componentNames, connectorNames, actionNames, appPath);
    }
  }
}

/**
 * Вспомогательная функция для валидации `view`-роута.
 * @private
 */
function _validateViewRoute(route, category, componentNames, connectorNames) {
  // Проверка `layout`
  if (!route.layout) {
    addIssue('error', category, `View route is missing the required 'layout' property.`);
  } else if (!componentNames.includes(route.layout)) {
    addIssue('error', category, `Layout component '${route.layout}' is not defined.`, _getSuggestion(route.layout, componentNames));
  }

  // Проверка `reads`
  (route.reads || []).forEach(name => {
    if (!connectorNames.includes(name)) {
      addIssue('error', category, `Read connector '${name}' is not defined.`, _getSuggestion(name, connectorNames));
    }
  });

  // Проверка `inject`
  for (const placeholder in (route.inject || {})) {
    const componentName = route.inject[placeholder];
    if (!componentNames.includes(componentName)) {
      addIssue('error', category, `Injected component '${componentName}' is not defined.`, _getSuggestion(componentName, componentNames));
    }
  }
}

/**
 * Вспомогательная функция для валидации `action`-роута.
 * @private
 */
function _validateActionRoute(route, category, componentNames, connectorNames, actionNames, appPath) {
  // Пропускаем проверку для внутренних экшенов, у них нет `update` или `redirect`.
  if (route.internal === true) return;
  
  // Проверка `reads` и `writes`
  [...(route.reads || []), ...(route.writes || [])].forEach(name => {
    if (!connectorNames.includes(name)) {
      addIssue('error', category, `Connector '${name}' is not defined.`, _getSuggestion(name, connectorNames));
    }
  });
  
  // Проверка `update`
  if (route.update && !componentNames.includes(route.update)) {
    addIssue('error', category, `Update component '${route.update}' is not defined.`, _getSuggestion(route.update, componentNames));
  }
  
  const stringifiedSteps = JSON.stringify(route.steps || []);
  const hasRedirect = stringifiedSteps.includes('"client:redirect"');
  const hasBridgeCall = stringifiedSteps.includes('"bridge:call"');

  if (!route.update && !hasRedirect && !hasBridgeCall) {
    addIssue(
      'error', 
      category, 
      `Action must have a terminating operation.`, 
      `Provide an 'update' property, a 'client:redirect' step, or a 'bridge:call' step.`
    );
  }

  // Рекурсивная проверка `steps`
  _checkSteps(route.steps || [], category, actionNames, appPath);
}

/**
 * Рекурсивно проверяет массив `steps`.
 * @private
 */
function _checkSteps(steps, category, actionNames, appPath) {
  steps.forEach(step => {
    if (step.then) _checkSteps(step.then, category, actionNames, appPath);
    if (step.else) _checkSteps(step.else, category, actionNames, appPath);
    
    // Проверка для старого шага "run"
    if (step.run) {
      const runPath = path.join(appPath, 'app', 'actions', `${step.run}.js`);
      checkFileExists(runPath, category, `run script '${step.run}.js'`);
    }

    // ★★★ НАЧАЛО НОВОЙ ФУНКЦИОНАЛЬНОСТИ ★★★
    // Проверка для нового шага "run:set"
    if (step['run:set']) {
      const handlerName = step.handler;
      if (!handlerName) {
        addIssue('error', category, `Step 'run:set' is missing the required 'handler' property.`);
      } else {
        const handlerPath = path.join(appPath, 'app', 'actions', `${handlerName}.js`);
        checkFileExists(handlerPath, category, `handler script for 'run:set' ('${handlerName}.js')`);
      }
      if (!step.with) {
        addIssue('warning', category, `Step 'run:set' is missing the 'with' property.`, `The handler '${handlerName}' will be called with 'undefined' as an argument.`);
      }
    }
    // ★★★ КОНЕЦ НОВОЙ ФУНКЦИОНАЛЬНОСТИ ★★★
    
    if (step['action:run'] && step['action:run'].name) {
      const actionName = step['action:run'].name;
      if (!actionNames.includes(actionName)) {
        addIssue('error', category, `Internal action '${actionName}' is not defined.`, _getSuggestion(actionName, actionNames));
      }
    }
  });
}

/**
 * Находит наиболее вероятное правильное имя, если пользователь опечатался.
 * @private
 */
function _getSuggestion(typo, validOptions) {
  let bestMatch = null;
  let minDistance = 3; 

  for (const option of validOptions) {
    const distance = _levenshtein(typo, option);
    if (distance < minDistance) {
      minDistance = distance;
      bestMatch = option;
    }
  }
  return bestMatch ? `Did you mean '${bestMatch}'?` : '';
}

/**
 * Реализация алгоритма "Расстояние Левенштейна" для поиска опечаток.
 * @private
 */
function _levenshtein(a, b) {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
  for (let i = 0; i <= a.length; i += 1) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[j][0] = j;
  for (let j = 1; j <= b.length; j += 1) {
    for (let i = 1; i <= a.length; i += 1) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(matrix[j][i - 1] + 1, matrix[j - 1][i] + 1, matrix[j - 1][i - 1] + indicator);
    }
  }
  return matrix[b.length][a.length];
}

module.exports = validateRoutes;