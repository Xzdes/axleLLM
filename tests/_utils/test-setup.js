// tests/_utils/test-setup.js
// Этот файл содержит вспомогательные функции для создания и очистки
// временных тестовых окружений.

const fs = require('fs/promises');
const path = require('path');

/**
 * Создает временную структуру папок и файлов для одного теста.
 * @param {string} testName - Уникальное имя теста, используется для создания папки.
 * @param {object} options - Опции для создания окружения.
 * @param {object} [options.manifest={}] - Объект манифеста для генерации `manifest.js`.
 * @param {object} [options.files={}] - Объект с файлами для создания, вида { 'path/to/file.html': 'content' }.
 * @returns {Promise<string>} - Абсолютный путь к созданной временной папке приложения.
 */
async function createTestAppStructure(testName, options = {}) {
    const { manifest = {}, files = {} } = options;
    
    // Создаем путь к временной папке внутри /tests/_temp/
    const tempAppPath = path.resolve(__dirname, '..', '_temp', testName);
    const manifestPath = path.join(tempAppPath, 'manifest.js');

    // 1. Гарантированно удаляем папку от предыдущего запуска, если она осталась.
    await fs.rm(tempAppPath, { recursive: true, force: true });
    // Создаем пустую папку.
    await fs.mkdir(tempAppPath, { recursive: true });

    // 2. Генерируем и записываем `manifest.js` из объекта.
    // Мы используем `JSON.stringify` с отступами для читаемости.
    const manifestContent = `module.exports = ${JSON.stringify(manifest, null, 2)};`;
    await fs.writeFile(manifestPath, manifestContent, 'utf-8');

    // 3. Создаем все остальные файлы, перечисленные в `options.files`.
    for (const relativePath in files) {
        const fullPath = path.join(tempAppPath, relativePath);
        const dir = path.dirname(fullPath);
        // Создаем родительские папки, если их нет (например, `app/components/`).
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(fullPath, files[relativePath], 'utf-8');
    }
    
    // 4. Создаем фейковый `package.json`, чтобы Node.js считал эту папку проектом.
    await fs.writeFile(path.join(tempAppPath, 'package.json'), '{ "name": "test-app" }');

    return tempAppPath;
}

/**
 * Удаляет временную папку тестового окружения.
 * @param {string} appPath - Абсолютный путь к папке для удаления.
 */
async function cleanupTestApp(appPath) {
    if (!appPath) return;
    try {
        await fs.rm(appPath, { recursive: true, force: true });
    } catch (error) {
        // Игнорируем ошибки, если папка уже была удалена.
    }
}

module.exports = {
    createTestAppStructure,
    cleanupTestApp,
};