// packages/example-app/app/bridge/file-utils.js
// Этот модуль инкапсулирует логику работы с файловой системой.
// Он может использовать любые Node.js модули, например 'fs'.

const fs = require('fs/promises');

// Экспортируем объект с методами, которые будут доступны через bridge:call
module.exports = {
  /**
   * Сохраняет текстовое содержимое в файл.
   * @param {string} filePath - Абсолютный путь к файлу.
   * @param {string} content - Текст для сохранения.
   * @returns {Promise<{success: boolean, message: string}>} - Результат операции.
   */
  saveTextFile: async (filePath, content) => {
    try {
      await fs.writeFile(filePath, content, 'utf-8');
      console.log(`[file-utils] File saved successfully to: ${filePath}`);
      return { success: true, message: `Файл успешно сохранен: ${filePath}` };
    } catch (error) {
      console.error(`[file-utils] Error saving file:`, error);
      return { success: false, message: `Ошибка сохранения файла: ${error.message}` };
    }
  }
};