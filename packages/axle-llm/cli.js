#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { runDev, runStart, runPackage } = require('./core/commands');

const command = process.argv[2];
const appName = process.argv[3];
const appPath = process.cwd(); // Путь, откуда вызвали команду

// Цвета для вывода
const C_RESET = '\x1b[0m';
const C_GREEN = '\x1b[32m';
const C_CYAN = '\x1b[36m';

// Роутер команд
switch (command) {
  case 'new':
    if (!appName) {
      console.error('Error: Please specify the project name.');
      console.log('  For example:');
      console.log('    npx axle-llm new my-app');
      process.exit(1);
    }
    createNewApp(appName);
    break;
  case 'dev':
    runDev(appPath);
    break;
  case 'start':
    runStart(appPath);
    break;
  case 'package':
    runPackage(appPath);
    break;
  default:
    showHelp();
    break;
}

/**
 * Функция для создания нового приложения.
 */
function createNewApp(name) {
  const projectDir = path.join(process.cwd(), name);
  const templateDir = path.join(__dirname, 'template');

  console.log(`Creating a new axleLLM app in ${C_GREEN}${projectDir}${C_RESET}...`);

  // 1. Проверяем, не существует ли уже такая папка
  if (fs.existsSync(projectDir)) {
    console.error(`Error: Directory ${projectDir} already exists.`);
    process.exit(1);
  }

  // 2. Копируем шаблон
  fs.cpSync(templateDir, projectDir, { recursive: true });

  // 3. Настраиваем package.json нового проекта
  const packageJsonPath = path.join(projectDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  packageJson.name = name; // Заменяем плейсхолдер на реальное имя
  
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

  console.log(`\n${C_GREEN}Success!${C_RESET} Created ${name} at ${projectDir}`);
  console.log('Inside that directory, you can run several commands:\n');
  
  console.log(`  ${C_CYAN}npm install${C_RESET}`);
  console.log('    Installs all dependencies.\n');
  
  console.log(`  ${C_CYAN}npm run dev${C_RESET}`);
  console.log('    Starts the development server.\n');

  console.log('We suggest that you begin by typing:\n');
  console.log(`  ${C_CYAN}cd ${name}${C_RESET}`);
  console.log(`  ${C_CYAN}npm install${C_RESET}`);
}

function showHelp() {
  console.log(`
  Usage: axle-cli <command>

  Commands:
    dev       Starts the application in development mode.
              (Includes validation, hot-reloading, and DevTools)

    start     Starts the application in production mode.

    package   Packages the application into distributable formats
              for your operating system.

    help      Displays this help message.
  `);
}