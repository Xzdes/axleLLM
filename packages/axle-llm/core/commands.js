// packages/axle-llm/core/commands.js

const path = require('path');
const fs = require('fs'); // ★★★ ДОБАВЛЯЕМ МОДУЛЬ FS ★★★
const electron = require('electron');
const { spawn } = require('child_process');
const builder = require('electron-builder');

const { loadManifest } = require('./config-loader');
const validateManifest = require('./validator');

const C_RESET = '\x1b[0m';
const C_RED = '\x1b[31m';
const C_YELLOW = '\x1b[33m';
const C_CYAN = '\x1b[36m';
const C_GREEN = '\x1b[32m';

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
  console.log(`${C_CYAN}[axle-cli] Starting in PRODUCTION mode...${C_RESET}`);
  const mainProcessPath = path.resolve(__dirname, '..', 'main.js');
  const args = [mainProcessPath, appPath];
  const electronProcess = spawn(electron, args, { stdio: 'inherit' });
  electronProcess.on('close', code => process.exit(code));
}

async function runPackage(appPath) {
  console.log(`${C_CYAN}[axle-cli] Packaging application...${C_RESET}`);

  if (!runValidation(appPath)) {
    console.error(`\n${C_RED}🚨 Aborting packaging due to validation errors.${C_RESET}`);
    process.exit(1);
  }
  
  try {
    // ★★★ НАЧАЛО КЛЮЧЕВОГО ИСПРАВЛЕНИЯ ★★★
    // Шаг 1: Прочитать package.json приложения, которое мы собираем.
    const appPackageJsonPath = path.join(appPath, 'package.json');
    const appPackageJson = JSON.parse(fs.readFileSync(appPackageJsonPath, 'utf-8'));
    const electronVersion = appPackageJson.devDependencies?.electron;

    if (!electronVersion) {
      throw new Error(`'electron' version not found in devDependencies of ${appPackageJsonPath}`);
    }
    
    console.log(`${C_CYAN}[axle-cli] Using Electron version: ${electronVersion}${C_RESET}`);
    
    // Шаг 2: Передать эту версию напрямую в конфигурацию electron-builder.
    const result = await builder.build({
      projectDir: appPath,
      config: {
        "directories": {
          "output": path.join(appPath, "dist")
        },
        "electronVersion": electronVersion // Это решает проблему авто-детекции.
      }
    });
    // ★★★ КОНЕЦ КЛЮЧЕВОГО ИСПРАВЛЕНИЯ ★★★

    console.log(`${C_GREEN}✅ Packaging complete! Files are located at:${C_RESET}`);
    result.forEach(p => console.log(`  - ${p}`));

  } catch (error) {
    console.error(`\n${C_RED}🚨 Packaging failed:${C_RESET}`);
    // Печатаем более детальную ошибку, если она есть
    console.error(error.stack || error);
    process.exit(1);
  }
}

function runValidation(appPath) {
  console.log(`\n${C_CYAN}[Validator] Running validation...${C_RESET}`);
  
  try {
    const manifest = loadManifest(appPath);
    const issues = validateManifest(manifest, appPath);

    if (issues.length === 0) {
      console.log(`${C_GREEN}[Validator] ✅ Manifest is valid.${C_RESET}`);
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