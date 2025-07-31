#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
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
    break;
}

function createNewMonorepo(name) {
  const projectDir = path.join(process.cwd(), name);
  const templateDir = path.join(__dirname, 'template');
  const engineSourceDir = __dirname;

  console.log(`Creating a new axleLLM monorepo in ${C_GREEN}${projectDir}${C_RESET}...`);

  if (fs.existsSync(projectDir)) {
    console.error(`Error: Directory ${projectDir} already exists.`);
    process.exit(1);
  }

  // 1. Копируем шаблон
  fs.cpSync(templateDir, projectDir, { recursive: true });

  // 2. Копируем исходный код движка
  const engineDestDir = path.join(projectDir, 'packages', 'axle-llm');
  fs.mkdirSync(engineDestDir, { recursive: true });
  fs.cpSync(engineSourceDir, engineDestDir, { 
    recursive: true,
    filter: (src) => !src.includes('node_modules') && !src.includes('template-legacy') && !src.includes('template')
  });

  const safeName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-');

  // 3. Настраиваем корневой package.json
  const rootPackageJsonPath = path.join(projectDir, 'package.json');
  let rootPackageJson = fs.readFileSync(rootPackageJsonPath, 'utf8');
  rootPackageJson = rootPackageJson.replace(/<APP_NAME>/g, safeName);
  fs.writeFileSync(rootPackageJsonPath, rootPackageJson);

  // 4. Настраиваем package.json приложения
  const appPackageJsonPath = path.join(projectDir, 'packages', 'app', 'package.json');
  let appPackageJson = fs.readFileSync(appPackageJsonPath, 'utf8');
  appPackageJson = appPackageJson.replace(/<APP_NAME>/g, name); // Используем оригинальное имя для productName
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