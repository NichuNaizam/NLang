import { CppStatement, FunctionDeclaration, Program, ReturnStatement, UnsafeStatement, VariableDeclaration } from "../frontend/ast.ts";
import compiler from "./compiler.ts";
import { Environment } from "./environment.ts";

export function compileProgram(program: Program, env: Environment) {
    let code = `#include "nlang.h"\n`;

    for (const stmt of program.body) {
        code += compiler.compile(stmt, true, env);
    }

    return code;
}

export function compileVariableDeclaration(varDecl: VariableDeclaration, env: Environment) {
    let code = '';

    switch (varDecl.type) {
        case 'int':
            code += 'Int ';
            break;

        case 'string':
            code += 'String ';
            break;

        case 'bool':
            code += 'Bool ';
            break;

        case 'float':
            code += 'Float ';
            break;
        
        case 'void':
            console.error(`Cannot use void as a type`);
            break;

    }

    if (varDecl.value) {
        code += `${varDecl.identifier} = ${compiler.compile(varDecl.value, false, env)}`;
    } else {
        code += `${varDecl.identifier}`;
    }

    env.setValue(varDecl.identifier, 'DataType');
    return code;
}

export function compileFunctionDeclaration(funcDecl: FunctionDeclaration, env: Environment) {
    let code = '';
    const newEnv = new Environment(env);

    switch (funcDecl.returnType) {
        case 'int':
            code += 'Int ';
            break;

        case 'string':
            code += 'String ';
            break;

        case 'bool':
            code += 'Bool ';
            break;

        case 'float':
            code += 'Float ';
            break;
        
        case 'void':
            code += 'Void ';
            break;

    }

    code += `${funcDecl.name}(`;

    for (let i = 0; i < funcDecl.parameters.length; i++) {
        switch (funcDecl.parameters[i].type) {
            case 'int':
                code += 'Int ';
                break;

            case 'string':
                code += 'String ';
                break;

            case 'bool':
                code += 'Bool ';
                break;

            case 'float':
                code += 'Float ';
                break;

            case 'void':
                console.error(`Cannot use void as a type`);
        }

        code += `${funcDecl.parameters[i].name}`;
        newEnv.setValue(funcDecl.parameters[i].name, 'DataType');

        if (i < funcDecl.parameters.length - 1) {
            code += ', ';
        }
    }

    code += ') {';

    for (const stmt of funcDecl.body) {
        code += compiler.compile(stmt, true, newEnv);
    }

    code += '}';

    env.setValue(funcDecl.name, 'Function');
    return code;    
}

export function compileReturnStatement(returnStmt: ReturnStatement, env: Environment) {
    let code = 'return ';

    if (returnStmt.value) {
        code += compiler.compile(returnStmt.value, false, env);
    }

    return code;
}

export function compileCppStatement(unsafe: CppStatement) {
    return unsafe.code;
}

export function compileUnsafeStatement(unsafe: UnsafeStatement, env: Environment) {
    let code = '';
    env.unsafe = true;

    for (const stmt of unsafe.body) {
        code += compiler.compile(stmt, true, env, false);
    }

    env.unsafe = false;
    return code;
}