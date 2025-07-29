// packages/axle-llm/core/validator/utils.js
// Этот файл содержит общие вспомогательные функции,
// используемые всеми модулями валидатора.

const fs = require('fs');
const path = require('path');

// Глобальный (в рамках одного запуска валидатора) массив для хранения всех проблем.
const issues = [];

/**
 * Добавляет новую проблему (ошибку или предупреждение) в общий список.
 * @param {'error' | 'warning'} level - Уровень проблемы ('error' блокирует запуск).
 * @param {string} category - Категория, к которой относится проблема (например, "Route 'GET /'").
 * @param {string} message - Основное сообщение об ошибке.
 * @param {string} [suggestion=''] - Необязательное предложение по исправлению (например, "Did you mean...?").
 */
function addIssue(level, category, message, suggestion = '') {
  issues.push({ level, category, message, suggestion });
}

/**
 * Проверяет, существует ли файл по указанному пути.
 * Если файл не найден, автоматически добавляет ошибку в `issues`.
 * @param {string} filePath - Абсолютный путь к файлу для проверки.
 * @param {string} category - Категория для сообщения об ошибке.
 * @param {string} description - Описание файла (например, "template file for component 'main'").
 * @returns {boolean} - `true`, если файл существует, иначе `false`.
 */
function checkFileExists(filePath, category, description) {
  if (!fs.existsSync(filePath)) {
    addIssue(
      'error', 
      category, 
      `File not found for ${description}.`,
      `Path checked: ${filePath}`
    );
    return false;
  }
  return true;
}

/**
 * Очищает список проблем перед новым запуском валидации.
 */
function clearIssues() {
  issues.length = 0; // Это самый быстрый способ очистить массив.
}

/**
 * Возвращает копию массива со всеми собранными проблемами.
 * @returns {Array<object>}
 */
function getIssues() {
  return [...issues]; // Возвращаем копию, чтобы избежать случайных мутаций извне.
}

// Экспортируем все наши инструменты.
module.exports = {
  addIssue,
  checkFileExists,
  clearIssues,
  getIssues,
};