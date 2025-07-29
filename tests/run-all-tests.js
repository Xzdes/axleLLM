#!/usr/bin/env node
// Этот скрипт — наша система запуска тестов.
// Он сканирует папку /tests, находит все файлы, заканчивающиеся на `.test.js`,
// и запускает их по очереди в изолированном окружении.

const fs = require('fs/promises');
const path = require('path');
const { spawn } = require('child_process');
const { createTestAppStructure, cleanupTestApp } = require('./_utils/test-setup.js');

// Цвета для красивого вывода
const C_RESET = '\x1b[0m';
const C_RED = '\x1b[31m';
const C_GREEN = '\x1b[32m';
const C_CYAN = '\x1b[36m';
const C_YELLOW = '\x1b[33m';

// Временный файл, который будет запускать каждый отдельный тест в своем процессе
const RUNNER_SCRIPT_PATH = path.join(__dirname, '_runner.js');

/**
 * Запускает один тестовый сценарий.
 * @param {string} testName - Имя теста.
 * @param {object} testCase - Объект теста с опциями и функцией `run`.
 */
async function runTest(testName, testCase) {
    console.log(`\n${C_YELLOW}--- Running test: ${testName} ---${C_RESET}`);
    let appPath;
    try {
        // 1. Создаем временную папку с приложением для этого теста
        const safeTestName = testName.replace(/[:\s"]/g, '-');
        appPath = await createTestAppStructure(safeTestName, testCase.options);

        // 2. Генерируем временный скрипт-запускатор
        const runnerScriptContent = `
            const path = require('path');
            // Передаем абсолютный путь к временному приложению
            const appPath = ${JSON.stringify(appPath)};
            // Указываем, какую функцию-тест нужно запустить
            const testFunc = require(${JSON.stringify(path.resolve(__dirname, testCase.testFile))})['${testName}'].run;
            
            // Запускаем сам тест
            testFunc(appPath).catch(err => {
                console.error('Test function failed:', err);
                process.exit(1);
            });
        `;
        await fs.writeFile(RUNNER_SCRIPT_PATH, runnerScriptContent);
        
        // 3. Запускаем тест в отдельном дочернем процессе
        await new Promise((resolve, reject) => {
            const child = spawn('node', [RUNNER_SCRIPT_PATH], { stdio: 'inherit' });
            child.on('close', code => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Test process exited with error code ${code}`));
                }
            });
            child.on('error', reject);
        });

        console.log(`${C_GREEN}✓ PASSED${C_RESET}`);

    } finally {
        // 4. Гарантированно очищаем временные файлы после теста
        if (appPath) await cleanupTestApp(appPath);
        try { await fs.unlink(RUNNER_SCRIPT_PATH); } catch (e) {}
    }
}

/**
 * Главная функция, которая находит и запускает все тесты.
 */
async function main() {
    console.log('🚀 Starting all engine tests...');
    
    const testDir = __dirname;
    const testFiles = (await fs.readdir(testDir)).filter(f => f.endsWith('.test.js'));
    let totalTests = 0;
    
    for (const file of testFiles) {
        const filePath = path.join(testDir, file);
        const testSuite = require(filePath);
        
        for (const testName in testSuite) {
            totalTests++;
            // Добавляем к объекту теста путь к его файлу, чтобы раннер знал, что запускать
            testSuite[testName].testFile = filePath; 
            await runTest(testName, testSuite[testName]);
        }
    }
    
    console.log(`\n======================================`);
    console.log(`🏆 All ${totalTests} tests passed successfully!`);
    console.log(`======================================`);
}

main().catch(error => {
    console.error(`\n======================================`);
    console.error(`${C_RED}🔥 A test run failed. Aborting.${C_RESET}`);
    console.error(error.message);
    console.error(`======================================`);
    process.exit(1);
});