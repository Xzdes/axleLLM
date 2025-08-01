#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
// runDev и остальные не нужны для команды 'new', убираем для чистоты
const { runDev, runStart, runPackage } = require('./core/commands');

const command = process.argv[2];
const appName = process.argv[3];
const appPath = process.cwd();

const C_RESET = '\x1b[0m';
const C_GREEN = '\x1b[32m';
const C_CYAN = '\x1b[36m';

switch (command) {
  case 'new':
    if (!appName) {
      console.error('Error: Please specify the project name.');
      process.exit(1);
    }
    createNewMonorepo(appName);
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
    // Добавим помощь, если команда не распознана
    console.log('Usage: axle-cli [new|dev|start|package]');
    break;
}

function createNewMonorepo(name) {
  const projectDir = path.join(process.cwd(), name);
  const templateDir = path.join(__dirname, 'template');

  // ★★★ НАЧАЛО КЛЮЧЕВОГО ИСПРАВЛЕНИЯ ★★★

  // Исходная папка движка, где бы он ни был запущен (локально или из кэша npx)
  const engineSourceDir = __dirname;
  // Целевая папка для движка в новом проекте
  const engineDestDir = path.join(projectDir, 'packages', 'axle-llm');

  console.log(`Creating a new axleLLM monorepo in ${C_GREEN}${projectDir}${C_RESET}...`);

  if (fs.existsSync(projectDir)) {
    console.error(`Error: Directory ${projectDir} already exists.`);
    process.exit(1);
  }

  // 1. Копируем ШАБЛОН приложения (этот шаг работал правильно)
  fs.cpSync(templateDir, projectDir, { recursive: true });

  // 2. Копируем ЯДРО движка (здесь была ошибка)
  fs.mkdirSync(engineDestDir, { recursive: true });

  // Список того, что составляет ядро движка.
  // Это самый надежный способ, так как он не зависит от путей.
  const coreFilesAndDirs = [
    'core',
    'client',
    'cli.js',
    'index.js',
    'main.js',
    'package.json' // Важно скопировать и package.json самого движка!
  ];

  for (const item of coreFilesAndDirs) {
    const sourcePath = path.join(engineSourceDir, item);
    const destPath = path.join(engineDestDir, item);

    if (fs.existsSync(sourcePath)) {
        // Используем cpSync, так как он умеет копировать и файлы, и папки рекурсивно
        fs.cpSync(sourcePath, destPath, { recursive: true });
    } else {
        console.warn(`Warning: source item not found and was skipped: ${sourcePath}`);
    }
  }

  // ★★★ КОНЕЦ КЛЮЧЕВОГО ИСПРАВЛЕНИЯ ★★★

  const safeName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-');

  // 3. Настраиваем корневой package.json
  const rootPackageJsonPath = path.join(projectDir, 'package.json');
  let rootPackageJson = fs.readFileSync(rootPackageJsonPath, 'utf8');
  rootPackageJson = rootPackageJson.replace(/<APP_NAME>/g, safeName);
  fs.writeFileSync(rootPackageJsonPath, rootPackageJson);

  // 4. Настраиваем package.json приложения
  const appPackageJsonPath = path.join(projectDir, 'packages', 'app', 'package.json');
  let appPackageJson = fs.readFileSync(appPackageJsonPath, 'utf8');
  appPackageJson = appPackageJson.replace(/<APP_NAME>/g, name);
  fs.writeFileSync(appPackageJsonPath, appPackageJson);


  console.log(`\n${C_GREEN}Success!${C_RESET} Created ${name} at ${projectDir}`);
  console.log('Inside that directory, you can run several commands:\n');
  console.log(`  ${C_CYAN}npm install${C_RESET}`);
  console.log('    Installs all dependencies for the monorepo.\n');
  console.log(`  ${C_CYAN}npm run dev${C_RESET}`);
  console.log('    Starts the development server for your app.\n');
  console.log('We suggest that you begin by typing:\n');
  console.log(`  ${C_CYAN}cd ${name}${C_RESET}`);
  console.log(`  ${C_CYAN}npm install${C_RESET}`);
}