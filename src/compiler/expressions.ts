import {
    AssignmentExpression,
    BinaryExpression,
    CallExpression,
    Identifier,
    MemberExpression,
    ObjectLiteral,
} from '../frontend/ast.ts';
import { logError } from '../utils/logger.ts';
import { VariableData } from '../utils/types.ts';
import { parseMemberExpression } from '../utils/utils.ts';
import compiler from './compiler.ts';
import { Environment } from './environment.ts';

export function compileCallExpression(
    callExpr: CallExpression,
    env: Environment
) {
    let code = '';
    const caller = compiler.compile(callExpr.caller, false, env, !callExpr.macro);

    if (caller.includes('.') || caller.includes('->')) {
        parseMemberExpression(caller, env);
        code += caller;
    } else {
        // Check if its a function or a class constructor
        if (env.doesExistWithType(caller, 'Function') || callExpr.macro) {
            code += caller;
        } else if (env.doesExistWithType(caller, 'Class')) {
            code += `${caller}::new`;
        } else {
            logError(`Function ${caller} is not defined!`);
            Deno.exit(1);
        }
    }

    code += '(';
    for (let i = 0; i < callExpr.args.length; i++) {
        code += compiler.compile(callExpr.args[i], false, env);
        if (i < callExpr.args.length - 1) {
            code += ', ';
        }
    }
    code += ')';

    return code;
}

export function compileBinaryExpression(
    exp: BinaryExpression,
    env: Environment
) {
    let code = '';

    code += compiler.compile(exp.left, false, env);
    code += exp.operator;
    code += compiler.compile(exp.right, false, env);

    return code;
}

export function compileIdentifier(
    ident: Identifier,
    env: Environment,
    forceChecks: boolean
) {
    if (!env.doesExist(ident.symbol) && forceChecks) {
        logError(`Identifier ${ident.symbol} is not defined!`);
        Deno.exit(1);
    }

    return ident.symbol;
}

export function compileObjectLiteral(obj: ObjectLiteral, env: Environment) {
    let code = '{';

    for (let i = 0; i < obj.properties.length; i++) {
        const prop = obj.properties[i];

        code += `${compiler.compile(prop, false, env)}`;
        if (i < obj.properties.length - 1) {
            code += ', ';
        }
    }

    code += '}';

    return code;
}

export function compileMemberExpression(
    exp: MemberExpression,
    env: Environment
) {
    let code = '';

    code += compiler.compile(exp.object, false, env, false);
    code += exp.arrow ? '->' : '.';
    code += compiler.compile(exp.property, false, env, false);

    parseMemberExpression(code, env);

    return code;
}

export function compileAssignmentExpression(
    exp: AssignmentExpression,
    env: Environment
) {
    const assigne = compiler.compile(exp.assigne, false, env);
    const value = compiler.compile(exp.value, false, env);

    if (!env.doesExistWithType(assigne, 'Variable')) {
        logError(`Assigne ${assigne} is not defined!`);
        Deno.exit(1);
    }

    return `${assigne}=${value}`;
}
