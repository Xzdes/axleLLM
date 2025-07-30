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
        case 'log': {
          console.log(`\n[axle-log] 💬 ${step.log}\n`);
          break;
        }

        case 'log:value': {
          const valueToLog = evaluate(step['log:value'], this.context, this.appPath);
          const output = JSON.stringify(valueToLog, null, 2);
          console.log(`\n[axle-log] 💡 ${step['log:value']} = ${output}\n`);
          break;
        }

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

        case 'run:set': {
          const destinationPath = step['run:set'];
          const handlerName = step.handler;
          const argsExpression = step.with;

          if (!handlerName) {
            throw new Error(`Step 'run:set' is missing the 'handler' property.`);
          }
          const handler = this.assetLoader.getAction(handlerName);
          if (!handler) {
            throw new Error(`Handler '${handlerName}' not found for 'run:set' step.`);
          }

          const evaluatedArgs = evaluate(argsExpression, this.context, this.appPath);
          const argsArray = Array.isArray(evaluatedArgs) ? evaluatedArgs : [evaluatedArgs];
          const result = await handler(...argsArray);
          this._setValue(destinationPath, result);
          break;
        }
        
        case 'action:run': {
          const subActionName = step['action:run'].name;
          const subContext = { 
            user: this.context.user, 
            body: this.context.body, 
            data: this.context.data,
            routeName: subActionName 
          };
          
          const result = await this.requestHandler.runAction(subContext);
          
          this.context.data = result.data;
          break;
        }
        
        case 'try': {
          try {
            if (step.try) await this.run(step.try);
          } catch (error) {
            const originalError = error.cause || error;
            this.context.error = { message: originalError.message, stack: originalError.stack };
            if (step.catch) {
              await this.run(step.catch);
            }
            delete this.context.error;
          }
          break;
        }
        
        case 'bridge:call': {
          const callDetails = step['bridge:call'];
          const apiParts = callDetails.api.split('.');
          const apiGroup = apiParts[0];

          const evaluatedArgs = evaluate(callDetails.args, this.context, this.appPath);
          
          if (apiGroup === 'custom') {
            const [_, moduleName, methodName] = apiParts;
            const bridgeModule = this.assetLoader.getBridgeModule(moduleName);
            if (!bridgeModule) throw new Error(`Server Bridge module '${moduleName}' is not loaded.`);
            const method = bridgeModule[methodName];
            if (typeof method !== 'function') throw new Error(`Method '${methodName}' not found in module '${moduleName}'.`);
            
            const argsArray = Array.isArray(evaluatedArgs) ? evaluatedArgs : [evaluatedArgs];
            const result = await method(...argsArray);
            
            if (callDetails.resultTo) {
              this._setValue(callDetails.resultTo, result);
            }
          } 
          else {
            if (callDetails.await) {
              this.context._internal.awaitingBridgeCall = {
                details: {
                  api: callDetails.api,
                  args: evaluatedArgs,
                },
                resultTo: callDetails.resultTo
              };
              this.context._internal.interrupt = true; 
            } else {
              if (!this.context._internal.bridgeCalls) {
                this.context._internal.bridgeCalls = [];
              }
              this.context._internal.bridgeCalls.push({
                api: callDetails.api,
                args: evaluatedArgs
              });
            }
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

        default:
          console.warn('[ActionEngine] Unknown or incomplete step:', step);
          break;
      }
    } catch (error) {
      const errorMessage = `Step execution failed! Step: ${JSON.stringify(step)}. Error: ${error.message}`;
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