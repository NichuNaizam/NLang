import {
BinaryExpression,
    CallExpression,
    CppStatement,
    FunctionDeclaration,
    Identifier,
    NumericLiteral,
    Program,
    ReturnStatement,
    Statement,
    StringLiteral,
    UnsafeStatement,
    VariableDeclaration,
} from '../frontend/ast.ts';
import { Environment } from './environment.ts';
import { compileBinaryExpression, compileCallExpression, compileIdentifier } from './expressions.ts';
import {
    compileFunctionDeclaration,
    compileProgram,
    compileReturnStatement,
    compileUnsafeStatement,
    compileVariableDeclaration,
} from './statments.ts';

function compile(astNode: Statement, semicolon = true, env: Environment, forceChecks = true): string {
    switch (astNode.kind) {
        case 'Program':
            return compileProgram(astNode as Program, env);

        case 'VariableDeclaration':
            return compileVariableDeclaration(astNode as VariableDeclaration, env) + (semicolon ? ';' : '')

        case 'FunctionDeclaration':
            return compileFunctionDeclaration(astNode as FunctionDeclaration, env);

        case 'ReturnStatement':
            return compileReturnStatement(astNode as ReturnStatement, env) + (semicolon ? ';' : '');

        case 'UnsafeStatement':
            return compileUnsafeStatement(astNode as UnsafeStatement, env);

        case 'CppStatement':
            return (astNode as CppStatement).code;

        case 'BinaryExpression':
            return compileBinaryExpression(astNode as BinaryExpression, env) + (semicolon ? ';' : '')

        case 'CallExpression':
            return compileCallExpression(astNode as CallExpression, env) + (semicolon ? ';' : '')

        case 'NumericLiteral':
            return (astNode as NumericLiteral).value.toString();

        case 'StringLiteral':
            return (astNode as StringLiteral).raw;

        case 'Identifier':
            return compileIdentifier(astNode as Identifier, env, forceChecks);

        default:
            console.error(`Cannot compile ${astNode.kind}`);
    }

    return '';
}

export default {
    compile,
};
