import {
    ClassDeclaration,
    CppStatement,
    FunctionDeclaration,
    ImportStatement,
    NewStatement,
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
    let code = validateType(varDecl.type, env, !varDecl.macro) + ' ';
    let value = varDecl.value
        ? `=${compiler.compile(varDecl.value, false, env)};`
        : ';';

    if (varDecl.value) {
        code += `${varDecl.identifier}${value}`;
    } else {
        code += `${varDecl.identifier}`;
    }

    env.defineVariable(
        varDecl.identifier,
        varDecl.type,
        value == ';' ? undefined : value,
        false,
        varDecl.macro
    );
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
        let type = validateType(funcDecl.parameters[i].type, env);

        code += `${type} ${funcDecl.parameters[i].name}`;
        newEnv.defineVariable(funcDecl.parameters[i].name, type);

        if (i < funcDecl.parameters.length - 1) {
            code += ', ';
        }
    }

    code += ') {';

    for (const stmt of funcDecl.body) {
        code += compiler.compile(stmt, true, newEnv);
    }

    code += '}';

    env.defineFunction(
        funcDecl.name,
        funcDecl.body,
        funcDecl.parameters,
        funcDecl.returnType
    );
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

    env.defineStruct(structDecl.name, {
        valueType: 'Struct',
        name: structDecl.name,
        types: properties,
        values: new Environment(),
    });
    return code;
}

export function compileImportStatement(
    importStmt: ImportStatement,
    env: Environment
) {
    let code = '';

    try {
        const importCode = Deno.readTextFileSync(importStmt.path);

        const parser = new Parser();
        const program = parser.produceAST(importCode);

        code = compiler.compile(program, true, env, true);
    } catch (e) {
        logError(`Failed to import file ${importStmt.path}`);
        Deno.exit(1);
    }

    return code;
}

export function compileClassDeclaration(
    classDecl: ClassDeclaration,
    env: Environment
) {
    let code = `class ${classDecl.name}{`;

    const classEnv = new Environment();
    for (const [name, data] of classDecl.constructors) {
        if (data.returnType != 'Void') {
            logError(`Constructor ${name} cannot have a return type`);
            Deno.exit(1);
        }

        classEnv.defineFunction(
            classDecl.name,
            data.body,
            data.parameters,
            data.returnType,
            data.visibility == 'private'
        );
    }

    for (const [name, data] of classDecl.functions) {
        classEnv.defineFunction(
            name,
            data.body,
            data.parameters,
            data.returnType,
            data.visibility == 'private'
        );
    }

    for (const [name, data] of classDecl.variables) {
        classEnv.defineVariable(
            name,
            data.type,
            data.value ? compiler.compile(data.value, false, env) : undefined,
            data.visibility == 'private'
        );
    }

    code += 'public:';
    for (const v of classEnv.getAllPublicVariables()) {
        code += `${v.type} ${v.name}${v.value ? `=${v.value};` : ';'}`;
    }
    for (const f of classEnv.getAllPublicFunctions()) {
        const funcEnv = new Environment(classEnv);

        code += f.name == classDecl.name ? `${f.name}(` : `${f.returnType} ${f.name}(`;
        for (let i = 0; i < f.parameters.length; i++) {
            funcEnv.defineVariable(f.parameters[i].name, f.parameters[i].type);
            code += `${f.parameters[i].type} ${f.parameters[i].name}`;
            if (i < f.parameters.length - 1) {
                code += ', ';
            }
        }

        code += '){';
        for (const stmt of f.body) {
            code += compiler.compile(stmt, true, funcEnv);
        }
        code += '}';
    }

    code += 'private:';
    for (const v of classEnv.getAllPrivateVariables()) {
        code += `${v.type} ${v.name}${v.value ? `=${v.value};` : ';'}`;
    }
    for (const f of classEnv.getAllPrivateFunctions()) {
        const funcEnv = new Environment(classEnv);

        code +=
            f.name == classDecl.name
                ? `${f.name}(`
                : `${f.returnType} ${f.name}(`;
        for (let i = 0; i < f.parameters.length; i++) {
            funcEnv.defineVariable(f.parameters[i].name, f.parameters[i].type);

            code += `${f.parameters[i].type} ${f.parameters[i].name}`;
            if (i < f.parameters.length - 1) {
                code += ', ';
            }
        }
        code += '){';
        for (const stmt of f.body) {
            code += compiler.compile(stmt, true, funcEnv);
        }
        code += '}';
    }

    env.defineClass(classDecl.name, {
        valueType: 'Class',
        name: classDecl.name,
        env: classEnv,
    });
    return (code += '};');
}

export function compileNewStatement(
    newStmt: NewStatement,
    env: Environment
) {
    if (!newStmt.macro && !env.doesExistWithType(newStmt.name, 'Class')) {
        logError(`Class ${newStmt.name} does not exist`);
        Deno.exit(1);
    }

    let code = `${newStmt.name}(`;

    for (let i = 0; i < newStmt.args.length; i++) {
        code += compiler.compile(newStmt.args[i], false, env);

        if (i < newStmt.args.length - 1) {
            code += ', ';
        }
    }

    return (code += ')');
}