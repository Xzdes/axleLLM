// packages/axle-llm/core/commands.js

const path = require('path');
const electron = require('electron');
const { spawn } = require('child_process');

// ★ ИСПРАВЛЕНИЕ: Импортируем наш новый загрузчик и валидатор
const { loadManifest } = require('./config-loader');
const validateManifest = require('./validator');

const C_RESET = '\x1b[0m';
const C_RED = '\x1b[31m';
const C_YELLOW = '\x1b[33m';
const C_CYAN = '\x1b[36m';

function runDev(appPath) {
  console.log(`${C_CYAN}[axle-cli] Starting in DEV mode...${C_RESET}`);
  
  if (!runValidation(appPath)) {
    console.error(`\n${C_RED}🚨 Aborting launch due to validation errors. Please fix the issues and try again.${C_RESET}`);
    process.exit(1);
  }

  const mainProcessPath = path.resolve(__dirname, '..', 'main.js');
  const args = [mainProcessPath, appPath, '--dev'];

  const electronProcess = spawn(electron, args, {
    stdio: 'inherit'
  });

  electronProcess.on('close', code => {
    console.log(`${C_CYAN}[axle-cli] Application process exited with code ${code}.${C_RESET}`);
    process.exit(code);
  });
}

function runStart(appPath) {
  console.log(`${C_CYAN}[axle-cli] Starting in PRODUCTION mode... (Not implemented yet)${C_RESET}`);
}

function runPackage(appPath) {
  console.log(`${C_CYAN}[axle-cli] Packaging application... (Not implemented yet)${C_RESET}`);
}

function runValidation(appPath) {
  console.log(`\n${C_CYAN}[Validator] Running validation...${C_RESET}`);
  
  try {
    // ★★★ КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: Используем наш `config-loader`,
    // так же, как мы это делаем в `main.js`. Теперь валидатор
    // получит правильно собранный, полный объект манифеста.
    const manifest = loadManifest(appPath);

    const issues = validateManifest(manifest, appPath);

    if (issues.length === 0) {
      console.log(`${C_CYAN}[Validator] ✅ Manifest is valid.${C_RESET}`);
      return true;
    }

    console.log(`\n${C_YELLOW}[Validator] 🚨 Found ${issues.length} issues:${C_RESET}\n`);
    issues.forEach((issue, i) => {
      const color = issue.level === 'error' ? C_RED : C_YELLOW;
      console.log(` ${i + 1}. ${color}[${issue.level.toUpperCase()}]${C_RESET} in ${C_CYAN}${issue.category}${C_RESET}`);
      console.log(`    ${issue.message}`);
      if (issue.suggestion) {
        console.log(`    ${issue.suggestion}`);
      }
    });
    
    if (issues.some(i => i.level === 'error')) {
        return false;
    }
    
    return true;
  } catch (error) {
    // Если `loadManifest` не смог загрузить или собрать манифест,
    // выводим ошибку.
    console.log(`\n${C_RED}[Validator] 🚨 CRITICAL ERROR during manifest loading:${C_RESET}\n`);
    console.error(error.message);
    return false;
  }
}

module.exports = {
  runDev,
  runStart,
  runPackage
};