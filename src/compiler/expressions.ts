import { BinaryExpression, CallExpression, Identifier } from "../frontend/ast.ts";
import compiler from "./compiler.ts";
import { Environment } from "./environment.ts";

export function compileCallExpression(callExpr: CallExpression, env: Environment) {
    let code = '';

    code += compiler.compile(callExpr.caller, false, env, !callExpr.macro);

    if (!env.doesExistWithType(code, 'Function') && !callExpr.macro) {
        console.error(`function ${code} is not defined!`);
        Deno.exit(1);
    }

    if (callExpr.macro) code = `__nlang__${code}`;

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

export function compileBinaryExpression(exp: BinaryExpression, env: Environment) {
    let code = '';

    code += compiler.compile(exp.left, false, env);
    code += exp.operator;
    code += compiler.compile(exp.right, false, env);

    return code;
}

export function compileIdentifier(ident: Identifier, env: Environment, forceChecks: boolean) {
    if (!env.doesExist(ident.symbol) && forceChecks) {
        console.error(`${ident.symbol} is not defined!`);
        Deno.exit(1);
    }

    return ident.symbol;
}