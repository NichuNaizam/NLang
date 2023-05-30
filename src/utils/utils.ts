import {
    Environment,
    EnvironmentValue,
    VariableValue,
} from '../compiler/environment.ts';
import { logError } from './logger.ts';

export function validateType(type: string, env: Environment, forceChecks = true) {
    let typeCopy = type;
    let asterisk = 0;
    let ampresand = 0;

    if (!forceChecks) {
        return typeCopy;
    }

    while (type.endsWith('*')) {
        asterisk++;
        type = type.slice(0, -1);
    }

    while (type.startsWith('&')) {
        ampresand++;
        type = type.slice(1);
    }

    switch (type) {
        case 'Int':
        case 'String':
        case 'Bool':
        case 'Float':
        case 'Void':
            return typeCopy;

        default:
            if (
                env.doesExistWithType(type, 'Struct') ||
                env.doesExistWithType(type, 'Class')
            ) {
                return typeCopy;
            } else {
                logError(`Unknown type: ${typeCopy}`);
                Deno.exit(1);
            }
    }
}

export function parseMemberExpression(
    exp: string,
    env: Environment
): EnvironmentValue {
    const tokens = exp.split(/\.|->/g);
    let parsed = '';
    let currentEnv = env;
    let toReturn: EnvironmentValue;

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        if (!currentEnv.doesExist(token)) {
            logError(`${parsed}${token} is not defined!`);
            Deno.exit(1);
        }
        let variable: VariableValue;

        if (currentEnv.doesExistWithType(token, 'Variable')) {
            variable = currentEnv.getVariable(token);

            if (i == tokens.length - 1) {
                toReturn = variable;
                break;
            }
        } else if (currentEnv.doesExistWithType(token, 'Function')) {
            if (i < tokens.length - 1) {
                logError(`${parsed}${token} is not a variable!`);
                Deno.exit(1);
            }

            toReturn = currentEnv.getFunction(token);
            break;
        } else {
            if (currentEnv.macroVariables.includes(token)) {
                toReturn = {
                    valueType: 'Variable',
                    macro: true,
                } as EnvironmentValue;
                break;
            }

            logError(`${parsed}${token} is not a variable or function!`);
            Deno.exit(1);
        }

        if (currentEnv.doesHaveClass(variable.type)) {
            const classObj = currentEnv.getClass(variable.type);
            currentEnv = classObj.env;
        } else if (currentEnv.doesHaveStruct(variable.type)) {
            const structObj = currentEnv.getStruct(variable.type);
            currentEnv = structObj.values;
        } else {
            if (currentEnv.macroVariables.includes(token)) {
                toReturn = {
                    valueType: 'Variable',
                    macro: true,
                } as EnvironmentValue;
                break;
            }

            logError(`${parsed}${token} is not a class!`);
            Deno.exit(1);
        }

        parsed += token + (i < tokens.length - 1 ? '.' : '');
    }

    return toReturn!;
}

export function parseArgs(args: string[]): Map<string, string> {
    const map = new Map<string, string>();

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg.startsWith('--')) {
            const key = arg.slice(2);

            if (i == args.length - 1) {
                map.set(key, 'true');
                break;
            }

            const value = args[i + 1];

            if (value.startsWith('-')) {
                map.set(key, 'true');
            }

            map.set(key, value);
        } else if (arg.startsWith('-')) {
            const key = arg.slice(1);

            if (i == args.length - 1) {
                map.set(key, 'true');
                break;
            }

            const value = args[i + 1];

            if (value.startsWith('-')) {
                map.set(key, 'true');
            } else {
                map.set(key, value);
                i++;
            }
        } else {
            if (!arg.endsWith('.n')) {
                logError('Source file must end with .n');
                Deno.exit(1);
            }

            map.set('sourceFile', arg);
        }
    }

    return map;
}