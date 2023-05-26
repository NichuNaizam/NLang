import {
    CppStatement,
    FunctionDeclaration,
    ImportStatement,
    Program,
    ReturnStatement,
    StructDeclaration,
    UnsafeStatement,
    VariableDeclaration,
} from '../frontend/ast.ts';
import { tokenize } from '../frontend/lexer.ts';
import Parser from '../frontend/parser.ts';
import { logError } from '../utils/logger.ts';
import { validateType } from '../utils/utils.ts';
import compiler from './compiler.ts';
import { Environment } from './environment.ts';

export function compileProgram(program: Program, env: Environment) {
    let code = `#include "nlang.h"\n`;

    for (const stmt of program.body) {
        code += compiler.compile(stmt, true, env);
    }

    return code;
}

export function compileVariableDeclaration(
    varDecl: VariableDeclaration,
    env: Environment
) {
    let code = (validateType(varDecl.type, env) as string) + ' ';

    if (varDecl.value) {
        code += `${varDecl.identifier} = ${compiler.compile(
            varDecl.value,
            false,
            env
        )}`;
    } else {
        code += `${varDecl.identifier}`;
    }

    env.defineIdentifier(varDecl.identifier, 'Struct');
    return code;
}

export function compileFunctionDeclaration(
    funcDecl: FunctionDeclaration,
    env: Environment
) {
    let code = (validateType(funcDecl.returnType, env) as string) + ' ';
    const newEnv = new Environment(env);

    code += `${funcDecl.name}(`;

    for (let i = 0; i < funcDecl.parameters.length; i++) {
        code +=
            (validateType(funcDecl.parameters[i].type, env) as string) + ' ';
        code += `${funcDecl.parameters[i].name}`;
        newEnv.defineIdentifier(funcDecl.parameters[i].name, 'Struct');

        if (i < funcDecl.parameters.length - 1) {
            code += ', ';
        }
    }

    code += ') {';

    for (const stmt of funcDecl.body) {
        code += compiler.compile(stmt, true, newEnv);
    }

    code += '}';

    env.defineFunction(funcDecl.name, funcDecl.parameters, funcDecl.returnType);
    return code;
}

export function compileReturnStatement(
    returnStmt: ReturnStatement,
    env: Environment
) {
    let code = 'return ';

    if (returnStmt.value) {
        code += compiler.compile(returnStmt.value, false, env);
    }

    return code;
}

export function compileCppStatement(unsafe: CppStatement) {
    return unsafe.code;
}

export function compileUnsafeStatement(
    unsafe: UnsafeStatement,
    env: Environment
) {
    let code = '';
    env.unsafe = true;

    for (const stmt of unsafe.body) {
        code += compiler.compile(stmt, true, env, false);
    }

    env.unsafe = false;
    return code;
}

export function compileStructDeclaration(
    structDecl: StructDeclaration,
    env: Environment
) {
    let code = `struct ${structDecl.name} {`;
    const properties: Map<string, string> = new Map();

    for (let [key, type] of Object.entries(structDecl.properties)) {
        type = validateType(type, env) as string;
        properties.set(key, type);

        code += `${type} ${key};`;
    }

    code += '};';

    env.defineStruct(structDecl.name, properties);
    return code;
}

export function compileImportStatement(importStmt: ImportStatement, env: Environment) {
    let code = '';

    try {
        const importCode = Deno.readTextFileSync(importStmt.path);

        const parser = new Parser();
        const program = parser.produceAST(importCode);

        code = compiler.compile(program, true, env, true);
    } catch(e) {
        logError(`Failed to import file ${importStmt.path}`);
        Deno.exit(1);
    }

    return code;
}