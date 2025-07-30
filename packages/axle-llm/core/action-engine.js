// packages/axle-llm/core/action-engine.js

const path = require('path');
const { z, ZodError } = require('zod');

function evaluate(expression, context, appPath) {
  if (typeof expression !== 'string') return expression;

  const func = new Function('ctx', 'require', `
    with (ctx) {
      return (${expression});
    }
  `);
  
  const smartRequire = (moduleName) => require(require.resolve(moduleName, { paths: [appPath] }));
  
  context.zod = z;

  return func(context, smartRequire);
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
        
        case 'action:run': {
          const subActionName = step['action:run'].name;
          
          const subContext = {
            user: this.context.user,
            body: this.context.body,
            data: this.context.data 
          };

          const resultContext = await this.requestHandler.runAction(subActionName, subContext);
          
          this.context.data = resultContext.data;
          break;
        }
        
        case 'try': {
          try {
            if (step.try) await this.run(step.try);
          } catch (error) {
            // ★★★ КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ ЗДЕСЬ ★★★
            // Ищем исходную, "чистую" ошибку. Если ее нет, используем саму ошибку.
            const originalError = error.cause || error;
            
            // Помещаем в контекст именно информацию об исходной ошибке.
            this.context.error = {
              message: originalError.message,
              stack: originalError.stack,
            };
            
            if (step.catch) {
              await this.run(step.catch);
            }
            
            // Гарантированно очищаем временный объект ошибки из контекста.
            delete this.context.error;
          }
          break;
        }

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
      // Оборачиваем исходную ошибку, чтобы сохранить контекст о шаге, на котором она произошла.
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