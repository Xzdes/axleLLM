// packages/axle-llm/core/commands.js
const path = require('path');
const fs = require('fs');
const electron = require('electron');
const { spawn } = require('child_process');
const builder = require('electron-builder');

const { loadManifest } = require('./config-loader');
const validateManifest = require('./validator');

// ... (цвета и findMonorepoRoot остаются без изменений)
const C_RESET = '\x1b[0m';
const C_RED = '\x1b[31m';
const C_YELLOW = '\x1b[33m';
const C_CYAN = '\x1b[36m';
const C_GREEN = '\x1b[32m';

function findMonorepoRoot(startPath) {
    // ...
}

// ★★★ Возвращаемся к простой и надежной версии runDev ★★★
function runDev(appPath) {
  console.log(`${C_CYAN}[axle-cli] Starting in DEV mode...${C_RESET}`);
  
  if (!runValidation(appPath)) {
    process.exit(1);
  }

  // --- Управление процессами ---
  let buildProcess;
  let clientBuildProcess;
  let electronProcess;

  // --- Флаги ---
  let isInitialBuildComplete = false;

  const launchProcesses = () => {
    // 1. Сборка компонентов (сервер + клиент)
    const buildScriptPath = path.resolve(__dirname, 'build.js');
    console.log(`${C_CYAN}[axle-cli] Starting component builder (server & client)...${C_RESET}`);
    buildProcess = spawn('node', [buildScriptPath, '--watch'], { cwd: appPath });

    buildProcess.stdout.on('data', (data) => {
      const output = data.toString();
      process.stdout.write(`${C_GREEN}[build.js]${C_RESET}: ${output}`); 
      
      // Ждем сигнала от первой СЕРВЕРНОЙ сборки
      if (output.includes('// BUILD-COMPLETE //') && !isInitialBuildComplete) {
        isInitialBuildComplete = true;
        // Как только компоненты собраны, запускаем сборку бандла
        launchClientBuilder();
      }
    });
    buildProcess.stderr.on('data', (data) => process.stderr.write(`${C_RED}[build.js-ERROR]${C_RESET}: ${data.toString()}`));

  };

  const launchClientBuilder = () => {
    // 2. Сборка клиентского бандла
    const clientBuildScriptPath = path.resolve(__dirname, 'build-client.js');
    console.log(`${C_CYAN}[axle-cli] Starting client bundle builder...${C_RESET}`);
    clientBuildProcess = spawn('node', [clientBuildScriptPath, '--watch'], { cwd: appPath });

    clientBuildProcess.stdout.on('data', (data) => {
      const output = data.toString();
      process.stdout.write(`${C_CYAN}[build-client.js]${C_RESET}: ${output}`);
      
      // Ждем сигнала от сборки бандла
      if (output.includes('// CLIENT-BUILD-COMPLETE //') && !electronProcess) {
        launchElectron();
      }
    });
    clientBuildProcess.stderr.on('data', (data) => process.stderr.write(`${C_RED}[build-client.js-ERROR]${C_RESET}: ${data.toString()}`));
  };

  const launchElectron = () => {
    // 3. Запуск Electron
    console.log(`${C_GREEN}[axle-cli] All builds complete. Launching Electron...${C_RESET}`);
    const mainProcessPath = path.resolve(__dirname, '..', 'main.js');
    const args = [mainProcessPath, appPath, '--dev'];

    electronProcess = spawn(electron, args, {
      stdio: 'inherit',
      env: { ...process.env, ELECTRON_ENABLE_LOGGING: 'true' }
    });

    electronProcess.on('close', code => {
      console.log(`${C_CYAN}[axle-cli] Application process exited with code ${code}.${C_RESET}`);
      if (buildProcess) buildProcess.kill();
      if (clientBuildProcess) clientBuildProcess.kill();
      process.exit(code);
    });
  };

  // --- Старт ---
  launchProcesses();

  process.on('SIGINT', () => {
    if (buildProcess) buildProcess.kill();
    if (clientBuildProcess) clientBuildProcess.kill();
    if (electronProcess) electronProcess.kill();
    process.exit();
  });
}

// ... остальные функции (runStart, runPackage, runValidation) остаются без изменений ...
function runStart(appPath) {
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