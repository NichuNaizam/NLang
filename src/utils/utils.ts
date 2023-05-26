import { Environment } from '../compiler/environment.ts';
import { logError } from './logger.ts';

export function validateType(type: string, env: Environment) {
    let typeCopy = type;
    let asterisk = 0;
    let ampresand = 0;

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
            if (env.doesExistWithType(type, 'Struct')) {
                return typeCopy;
            } else {
                logError(`Unknown type: ${typeCopy}`);
                Deno.exit(1);
            }
    }
}
