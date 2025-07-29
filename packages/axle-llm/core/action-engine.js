// packages/axle-llm/core/action-engine.js

const path = require('path');
const { z, ZodError } = require('zod');

function evaluate(expression, context, appPath) {
  if (typeof expression !== 'string') return expression;

  try {
    const func = new Function('ctx', 'require', `
      with (ctx) {
        return (${expression});
      }
    `);
    
    const smartRequire = (moduleName) => require(require.resolve(moduleName, { paths: [appPath] }));
    
    context.zod = z;

    return func(context, smartRequire);

  } catch (error) {
    if (error instanceof ZodError) {
      throw error;
    }
    console.warn(`[ActionEngine] Evaluate warning for expression "${expression}": ${error.message}`);
    return undefined;
  }
}

class ActionEngine {
  constructor(context, appPath, assetLoader, requestHandler) {
    const replacer = (key, value) =>
      typeof value === 'bigint'
        ? value.toString()
        : value;
    
    this.context = JSON.parse(JSON.stringify(context, replacer));
    
    this.appPath = appPath;
    this.assetLoader = assetLoader;
    this.requestHandler = requestHandler;
    
    this.context._internal = {}; 
  }

  async run(steps) {
    if (!Array.isArray(steps)) return;

    for (const step of steps) {
      if (this.context._internal.interrupt) break;
      await this.executeStep(step);
    }
  }

  async executeStep(step) {
    try {
      const stepType = Object.keys(step)[0];

      switch (stepType) {
        case 'set': {
          const value = evaluate(step.to, this.context, this.appPath);
          this._setValue(step.set, value);
          break;
        }

        case 'if': {
          const condition = evaluate(step.if, this.context, this.appPath);
          if (condition) {
            if (step.then) await this.run(step.then);
          } else {
            if (step.else) await this.run(step.else);
          }
          break;
        }

        case 'run': {
          const handler = this.assetLoader.getAction(step.run);
          if (handler) {
            await handler(this.context, this.context.body);
          } else {
            throw new Error(`Handler '${step.run}' not found for 'run' step.`);
          }
          break;
        }

        // ★★★ КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ ЗДЕСЬ ★★★
        case 'action:run': {
          const subActionName = step['action:run'].name;
          
          // Создаем контекст для вложенного экшена.
          // Он должен содержать user, body и ВЕСЬ текущий объект `data`.
          const subContext = {
            user: this.context.user,
            body: this.context.body,
            data: this.context.data // Передаем весь объект data
          };

          // Вызываем `runAction` с этим контекстом.
          const resultContext = await this.requestHandler.runAction(subActionName, subContext);
          
          // `runAction` теперь вернет измененный объект `data`,
          // которым мы заменяем наш текущий `data`.
          this.context.data = resultContext.data;
          break;
        }
        // ★★★ КОНЕЦ ИСПРАВЛЕНИЯ ★★★
        
        case 'auth:login':
          this.context._internal.loginUser = evaluate(step['auth:login'], this.context, this.appPath);
          break;

        case 'auth:logout':
          this.context._internal.logout = true;
          break;

        case 'client:redirect':
          this.context._internal.redirect = evaluate(step['client:redirect'], this.context, this.appPath);
          this.context._internal.interrupt = true;
          break;
        
        case 'bridge:call':
          console.warn(`[ActionEngine] 'bridge:call' is not yet implemented.`);
          break;

        default:
          console.warn('[ActionEngine] Unknown or incomplete step:', step);
          break;
      }
    } catch (error) {
      const errorMessage = `Step execution failed! Step: ${JSON.stringify(step)}. Error: ${error.message}`;
      console.error(`\n💥 [ActionEngine] ${errorMessage}\n`);
      throw new Error(errorMessage, { cause: error });
    }
  }

  _setValue(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let target = this.context;
    for (const key of keys) {
      if (target[key] === undefined || target[key] === null) {
        target[key] = {};
      }
      target = target[key];
    }
    target[lastKey] = value;
  }
}

module.exports = { 
  ActionEngine 
};