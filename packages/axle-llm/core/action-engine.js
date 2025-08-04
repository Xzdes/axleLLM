// packages/axle-llm/core/action-engine.js

const path = require('path');
const { z, ZodError } = require('zod');

function evaluate(expression, context, appPath) {
  if (typeof expression !== 'string') return expression;
  const func = new Function('ctx', 'require', `with (ctx) { return (${expression}); }`);
  const smartRequire = (moduleName) => require(require.resolve(moduleName, { paths: [appPath] }));
  context.zod = z;
  const result = func(context, smartRequire);
  if (typeof result === 'string') {
    const trimmedResult = result.trim();
    if ((trimmedResult.startsWith('{') && trimmedResult.endsWith('}')) || (trimmedResult.startsWith('[') && trimmedResult.endsWith(']'))) {
      try { return JSON.parse(trimmedResult); } catch (e) { /* ignore */ }
    }
  }
  return result;
}

class ActionEngine {
  constructor(context, appPath, assetLoader, requestHandler) {
    const replacer = (key, value) => (typeof value === 'bigint' ? value.toString() : value);
    this.context = JSON.parse(JSON.stringify(context, replacer));
    this.appPath = appPath;
    this.assetLoader = assetLoader;
    this.requestHandler = requestHandler;
    this.context._internal = this.context._internal || {}; 
  }

  // ★★★ НАПОРИСТОЕ ИСПРАВЛЕНИЕ: ПЕРЕПИСЫВАЕМ ЛОГИКУ ПРОДОЛЖЕНИЯ ★★★
  async run(steps) {
    if (!Array.isArray(steps)) return;

    let stepsToRun = steps;
    // Если мы продолжаем выполнение, то нужно взять только оставшиеся шаги
    if (this.context._internal.resumingFrom) {
      const resumeStepString = JSON.stringify(this.context._internal.resumingFrom);
      const resumeIndex = steps.findIndex(step => JSON.stringify(step) === resumeStepString);
      if (resumeIndex !== -1) {
        stepsToRun = steps.slice(resumeIndex + 1);
      }
      delete this.context._internal.resumingFrom; // Очищаем флаг
    }

    for (const step of stepsToRun) {
      if (this.context._internal.interrupt) break;
      await this.executeStep(step);
      // Запоминаем последний выполненный шаг
      this.context._internal.lastStep = step;
    }
  }

  async executeStep(step) {
    try {
      const stepType = Object.keys(step)[0];
      switch (stepType) {
        case 'log': { console.log(`\n[axle-log] 💬 ${step.log}\n`); break; }
        case 'log:value': { const v = evaluate(step['log:value'], this.context, this.appPath); console.log(`\n[axle-log] 💡 ${step['log:value']} = ${JSON.stringify(v, null, 2)}\n`); break; }
        case 'set': { const v = evaluate(step.to, this.context, this.appPath); this._setValue(step.set, v); break; }
        case 'if': { const c = evaluate(step.if, this.context, this.appPath); if (c) { if (step.then) await this.run(step.then); } else { if (step.else) await this.run(step.else); } break; }
        case 'run': { const h = this.assetLoader.getAction(step.run); if(h) await h(this.context, this.context.body); else throw new Error(`Handler '${step.run}' not found`); break; }
        case 'run:set': {
          const h = this.assetLoader.getAction(step.handler); if(!h) throw new Error(`Handler '${step.handler}' not found`);
          const args = evaluate(step.with, this.context, this.appPath);
          const result = await h(...(Array.isArray(args) ? args : [args])); this._setValue(step['run:set'], result); break;
        }
        case 'action:run': {
          const subCtx = { user: this.context.user, body: this.context.body, data: this.context.data, routeName: step['action:run'].name };
          const result = await this.requestHandler.runAction(subCtx); this.context.data = result.data; break;
        }
        case 'try': { try { if (step.try) await this.run(step.try); } catch (error) { const e = error.cause || error; this.context.error = { message: e.message, stack: e.stack }; if (step.catch) await this.run(step.catch); delete this.context.error; } break; }
        case 'bridge:call': {
          const details = step['bridge:call']; const args = evaluate(details.args, this.context, this.appPath);
          if (details.api.startsWith('custom.')) {
            const [_, mod, met] = details.api.split('.'); const bridgeMod = this.assetLoader.getBridgeModule(mod); if(!bridgeMod || typeof bridgeMod[met] !== 'function') throw new Error(`Custom bridge method '${mod}.${met}' not found`);
            const result = await bridgeMod[met](...(Array.isArray(args) ? args : [args])); if(details.resultTo) this._setValue(details.resultTo, result);
          } else {
            if (details.await) {
              this.context._internal.awaitingBridgeCall = { details: { api: details.api, args }, resultTo: details.resultTo, step };
              this.context._internal.interrupt = true;
            } else {
              if (!this.context._internal.bridgeCalls) this.context._internal.bridgeCalls = [];
              this.context._internal.bridgeCalls.push({ api: details.api, args });
            }
          }
          break;
        }
        case 'auth:login': this.context._internal.loginUser = evaluate(step['auth:login'], this.context, this.appPath); break;
        case 'auth:logout': this.context._internal.logout = true; break;
        case 'client:redirect': this.context._internal.redirect = evaluate(step['client:redirect'], this.context, this.appPath); this.context._internal.interrupt = true; break;
        default: console.warn('[ActionEngine] Unknown step:', step); break;
      }
    } catch (error) { throw new Error(`Step execution failed! Step: ${JSON.stringify(step)}. Error: ${error.message}`, { cause: error }); }
  }

  _setValue(path, value) {
    const keys = path.split('.'); const lastKey = keys.pop(); let target = this.context;
    for (const key of keys) { target = target[key] = target[key] || {}; }
    target[lastKey] = value;
  }
}

module.exports = { ActionEngine };