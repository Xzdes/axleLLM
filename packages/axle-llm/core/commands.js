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

function findMonorepoRoot(startPath) {
  let currentPath = startPath;
  while (currentPath !== path.parse(currentPath).root) {
    const pkgPath = path.join(currentPath, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        if (pkg.workspaces) { return currentPath; }
      } catch (e) { /* ignore */ }
    }
    currentPath = path.dirname(currentPath);
  }
  return null;
}

function runDev(appPath) {
  console.log(`${C_CYAN}[axle-cli] Starting DEV mode orchestrator...${C_RESET}`);
  if (!runValidation(appPath)) { process.exit(1); }
  let buildProcess, clientBuildProcess, electronProcess;

  const killAllProcesses = () => {
    if (buildProcess) buildProcess.kill();
    if (clientBuildProcess) clientBuildProcess.kill();
    if (electronProcess) electronProcess.kill();
    process.exit();
  };

  const launchClientBuilder = () => {
    const clientBuildScriptPath = path.resolve(__dirname, 'build-client.js');
    clientBuildProcess = spawn('node', [clientBuildScriptPath, '--watch'], { cwd: appPath });
    
    clientBuildProcess.stdout.on('data', data => {
      const output = data.toString();
      process.stdout.write(output);
      if (output.includes('// CLIENT-BUILD-COMPLETE //') && !electronProcess) { launchElectron(); }
    });

    // ★★★ ИЗМЕНЕНИЕ: Перехват ошибок сборки клиента ★★★
    clientBuildProcess.stderr.on('data', data => {
        console.error(`${C_RED}[axle-build] 🚨 Client Bundle Build Error:${C_RESET}`);
        process.stderr.write(data);
    });
    clientBuildProcess.on('close', code => {
        if (code !== 0 && code !== null) {
            console.error(`${C_RED}🚨 Client build process exited with code ${code}. Aborting.${C_RESET}`);
            killAllProcesses();
        }
    });
  };

  const launchElectron = () => {
    console.log(`${C_GREEN}[axle-cli] ✅ All builds complete. Launching Electron...${C_RESET}`);
    const mainProcessPath = path.resolve(__dirname, '..', 'main.js');
    const args = [mainProcessPath, appPath, '--dev'];
    electronProcess = spawn(electron, args, { stdio: 'inherit' });
    electronProcess.on('close', code => {
      killAllProcesses();
    });
  };

  const buildScriptPath = path.resolve(__dirname, 'build.js');
  buildProcess = spawn('node', [buildScriptPath, '--watch'], { cwd: appPath });
  
  buildProcess.stdout.on('data', data => {
    const output = data.toString();
    process.stdout.write(output);
    if (output.includes('// BUILD-COMPLETE //') && !clientBuildProcess) { launchClientBuilder(); }
  });
  
  // ★★★ ИЗМЕНЕНИЕ: Перехват ошибок сборки компонентов ★★★
  buildProcess.stderr.on('data', data => {
    console.error(`${C_RED}[axle-build] 🚨 Component Build Error:${C_RESET}`);
    process.stderr.write(data);
  });
  buildProcess.on('close', code => {
    if (code !== 0 && code !== null) {
        console.error(`${C_RED}🚨 Component build process exited with code ${code}. Aborting.${C_RESET}`);
        killAllProcesses();
    }
  });

  process.on('SIGINT', killAllProcesses);
}

function runStart(appPath) {
  console.log(`${C_CYAN}[axle-cli] Starting in PRODUCTION mode...${C_RESET}`);
  const buildScriptPath = path.resolve(__dirname, 'build.js');
  const clientBuildScriptPath = path.resolve(__dirname, 'build-client.js');
  const buildProcess = spawn('node', [buildScriptPath], { stdio: 'inherit', cwd: appPath });
  buildProcess.on('close', (code) => {
    if (code !== 0) { process.exit(code); }
    const clientBuildProcess = spawn('node', [clientBuildScriptPath], { stdio: 'inherit', cwd: appPath });
    clientBuildProcess.on('close', (clientCode) => {
      if (clientCode !== 0) { process.exit(clientCode); }
      console.log(`${C_GREEN}[axle-cli] All production builds complete. Launching...${C_RESET}`);
      const mainProcessPath = path.resolve(__dirname, '..', 'main.js');
      const args = [mainProcessPath, appPath];
      spawn(electron, args, { stdio: 'inherit' }).on('close', exitCode => process.exit(exitCode));
    });
  });
}

async function runPackage(appPath) {
  console.log(`${C_CYAN}[axle-cli] Packaging application...${C_RESET}`);
  if (!runValidation(appPath)) { process.exit(1); }
  
  try {
    console.log(`${C_CYAN}[axle-cli] Running production builds...${C_RESET}`);
    const buildScriptPath = path.resolve(__dirname, 'build.js');
    await new Promise((resolve, reject) => {
        spawn('node', [buildScriptPath], { stdio: 'inherit', cwd: appPath })
        .on('close', code => code === 0 ? resolve() : reject(new Error('Component build failed')));
    });

    const clientBuildScriptPath = path.resolve(__dirname, 'build-client.js');
    await new Promise((resolve, reject) => {
        spawn('node', [clientBuildScriptPath], { stdio: 'inherit', cwd: appPath })
        .on('close', code => code === 0 ? resolve() : reject(new Error('Client bundle build failed')));
    });
    console.log(`${C_GREEN}[axle-cli] All production builds complete.${C_RESET}`);

    console.log(`${C_CYAN}[axle-cli] Starting electron-builder...${C_RESET}`);
    const result = await builder.build({
      projectDir: appPath,
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
      console.log(`${C_GREEN}[Validator] ✅ Manifest is valid.${C_RESET}`); return true;
    }
    console.log(`\n${C_YELLOW}[Validator] 🚨 Found ${issues.length} issues:${C_RESET}\n`);
    issues.forEach((issue, i) => {
      const color = issue.level === 'error' ? C_RED : C_YELLOW;
      console.log(` ${i + 1}. ${color}[${issue.level.toUpperCase()}]${C_RESET} in ${C_CYAN}${issue.category}${C_RESET}`);
      console.log(`    ${issue.message}`);
      if (issue.suggestion) { console.log(`    ${issue.suggestion}`); }
    });
    if (issues.some(i => i.level === 'error')) {
      console.error(`\n${C_RED}🚨 Aborting launch due to validation errors.${C_RESET}`);
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