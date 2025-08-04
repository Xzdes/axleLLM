// packages/axle-llm/core/commands.js
const path = require('path');
const fs = require('fs');
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

// Вспомогательная функция для поиска корня монорепозитория
function findMonorepoRoot(startPath) {
  let currentPath = startPath;
  while (currentPath !== path.parse(currentPath).root) {
    const pkgPath = path.join(currentPath, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        if (pkg.workspaces) {
          return currentPath;
        }
      } catch (e) { /* ignore */ }
    }
    currentPath = path.dirname(currentPath);
  }
  return null;
}

// ★★★ НАЧАЛО: ПОЛНОСТЬЮ ПЕРЕПИСАННАЯ ФУНКЦИЯ runDev ★★★
function runDev(appPath) {
  console.log(`${C_CYAN}[axle-cli] Starting DEV mode orchestrator...${C_RESET}`);
  
  if (!runValidation(appPath)) {
    process.exit(1);
  }

  // --- Управление дочерними процессами ---
  let componentBuildProcess;
  let clientBuildProcess;
  let electronProcess;

  // --- Флаги готовности ---
  let isComponentBuildComplete = false;
  let isClientBuildComplete = false;

  // --- Функция-координатор ---
  const launchElectronIfReady = () => {
    // Запускаем только если ОБА билда завершились и Электрон еще не запущен
    if (isComponentBuildComplete && isClientBuildComplete && !electronProcess) {
      console.log(`${C_GREEN}--------------------------------------------------${C_RESET}`);
      console.log(`${C_GREEN}[axle-cli] ✅ Both builds complete. Launching Electron...${C_RESET}`);
      console.log(`${C_GREEN}--------------------------------------------------${C_RESET}`);
      
      const mainProcessPath = path.resolve(__dirname, '..', 'main.js');
      const args = [mainProcessPath, appPath, '--dev'];
  
      electronProcess = spawn(electron, args, {
        stdio: 'inherit', // Прямой вывод в консоль для логов Electron
        env: {
          ...process.env,
          ELECTRON_ENABLE_LOGGING: 'true'
        }
      });
  
      electronProcess.on('close', code => {
        console.log(`${C_YELLOW}[axle-cli] Application process exited with code ${code}.${C_RESET}`);
        if (componentBuildProcess) componentBuildProcess.kill();
        if (clientBuildProcess) clientBuildProcess.kill();
        process.exit(code);
      });
    }
  };

  // --- 1. Запуск сборщика компонентов (сервер) ---
  console.log(`${C_CYAN}[axle-cli]  оркестратор: Запускаю сборщик компонентов (build.js)...${C_RESET}`);
  const componentBuildScriptPath = path.resolve(__dirname, 'build.js');
  componentBuildProcess = spawn('node', [componentBuildScriptPath, '--watch'], { cwd: appPath });

  componentBuildProcess.stdout.on('data', (data) => {
    const output = data.toString().trim();
    if(output) console.log(`${C_GREEN}[build.js]${C_RESET}: ${output}`);
    
    if (output.includes('// BUILD-COMPLETE //')) {
      console.log(`${C_GREEN}[axle-cli] ✅ Компоненты собраны. Ожидаю сборку клиента...${C_RESET}`);
      isComponentBuildComplete = true;
      launchElectronIfReady();
    }
  });
  
  componentBuildProcess.stderr.on('data', (data) => process.stderr.write(`${C_RED}[build.js-ERROR]${C_RESET}: ${data.toString()}`));
  
  componentBuildProcess.on('error', (err) => {
      console.error(`${C_RED}[axle-cli] КРИТИЧЕСКАЯ ОШИБКА: Не удалось запустить процесс сборки компонентов:${C_RESET}`, err);
      process.exit(1);
  });

  // --- 2. Запуск сборщика бандла (клиент) ---
  console.log(`${C_CYAN}[axle-cli] оркестратор: Запускаю сборщик клиентского бандла (build-client.js)...${C_RESET}`);
  const clientBuildScriptPath = path.resolve(__dirname, 'build-client.js');
  clientBuildProcess = spawn('node', [clientBuildScriptPath, '--watch'], { cwd: appPath });
  
  clientBuildProcess.stdout.on('data', (data) => {
    const output = data.toString().trim();
    if(output) console.log(`${C_CYAN}[build-client.js]${C_RESET}: ${output}`);

    if (output.includes('// CLIENT-BUILD-COMPLETE //')) {
      console.log(`${C_GREEN}[axle-cli] ✅ Клиентский бандл собран. Ожидаю сборку компонентов...${C_RESET}`);
      isClientBuildComplete = true;
      launchElectronIfReady();
    }
  });

  clientBuildProcess.stderr.on('data', (data) => process.stderr.write(`${C_RED}[build-client.js-ERROR]${C_RESET}: ${data.toString()}`));

  clientBuildProcess.on('error', (err) => {
      console.error(`${C_RED}[axle-cli] КРИТИЧЕСКАЯ ОШИБКА: Не удалось запустить процесс сборки клиента:${C_RESET}`, err);
      process.exit(1);
  });

  // --- 3. Обработка завершения ---
  process.on('SIGINT', () => {
    console.log(`\n${C_YELLOW}[axle-cli] Получен сигнал SIGINT. Завершаю все дочерние процессы...${C_RESET}`);
    if (componentBuildProcess) componentBuildProcess.kill();
    if (clientBuildProcess) clientBuildProcess.kill();
    if (electronProcess) electronProcess.kill();
    process.exit();
  });
}
// ★★★ КОНЕЦ: ПОЛНОСТЬЮ ПЕРЕПИСАННАЯ ФУНКЦИЯ runDev ★★★

function runStart(appPath) {
  // ... эта функция остается без изменений
  console.log(`${C_CYAN}[axle-cli] Starting in PRODUCTION mode...${C_RESET}`);
  console.log(`${C_CYAN}[axle-cli] Running production component build...${C_RESET}`);
  const buildScriptPath = path.resolve(__dirname, 'build.js');
  
  const buildProcess = spawn('node', [buildScriptPath], {
    stdio: 'inherit',
    cwd: appPath
  });

  buildProcess.on('close', (code) => {
    if (code !== 0) {
      console.error(`${C_RED}[axle-cli] Production build failed. Aborting start.${C_RESET}`);
      process.exit(code);
    }
    console.log(`${C_GREEN}[axle-cli] Production build complete.${C_RESET}`);
    console.log(`${C_CYAN}[axle-cli] Launching application...${C_RESET}`);
    const mainProcessPath = path.resolve(__dirname, '..', 'main.js');
    const args = [mainProcessPath, appPath];
    const electronProcess = spawn(electron, args, { stdio: 'inherit' });
    electronProcess.on('close', exitCode => process.exit(exitCode));
  });
}

async function runPackage(appPath) {
  // ... эта функция остается без изменений
  console.log(`${C_CYAN}[axle-cli] Packaging application...${C_RESET}`);

  if (!runValidation(appPath)) {
    process.exit(1);
  }
  
  try {
    const monorepoRoot = findMonorepoRoot(appPath);
    const packageJsonPath = monorepoRoot 
      ? path.join(monorepoRoot, 'package.json')
      : path.join(appPath, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
        throw new Error(`Could not find package.json at ${packageJsonPath}`);
    }
    console.log(`${C_CYAN}[axle-cli] Using config from: ${packageJsonPath}${C_RESET}`);

    const appPackageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const electronVersion = appPackageJson.devDependencies?.electron;

    if (!electronVersion) {
      throw new Error(`'electron' version not found in devDependencies of ${packageJsonPath}`);
    }
    console.log(`${C_CYAN}[axle-cli] Using Electron version: ${electronVersion}${C_RESET}`);
    
    console.log(`${C_CYAN}[axle-cli] Running production component build...${C_RESET}`);
    const buildScriptPath = path.resolve(__dirname, 'build.js');
    await new Promise((resolve, reject) => {
        const buildProcess = spawn('node', [buildScriptPath], { stdio: 'inherit', cwd: appPath });
        buildProcess.on('close', code => code === 0 ? resolve() : reject(new Error('Build failed')));
    });
    console.log(`${C_GREEN}[axle-cli] Production build complete.${C_RESET}`);

    const result = await builder.build({
      projectDir: appPath,
      config: {
        "directories": { "output": path.join(appPath, "dist") },
        "electronVersion": electronVersion,
        "files": [
          "**/*",
          ".axle-build/**/*" 
        ]
      }
    });

    console.log(`${C_GREEN}✅ Packaging complete! Files are located at:${C_RESET}`);
    result.forEach(p => console.log(`  - ${p}`));

  } catch (error) {
    console.error(`\n${C_RED}🚨 Packaging failed:${C_RESET}`);
    console.error(error.stack || error);
    process.exit(1);
  }
}

function runValidation(appPath) {
  // ... эта функция остается без изменений
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
        console.error(`\n${C_RED}🚨 Aborting launch due to validation errors. Please fix the issues and try again.${C_RESET}`);
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