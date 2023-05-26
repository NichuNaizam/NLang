import {
AssignmentExpression,
BinaryExpression,
    CallExpression,
    CppStatement,
    FunctionDeclaration,
    Identifier,
    ImportStatement,
    MemberExpression,
    MemoryDereferenceExpression,
    MemoryReferenceExpression,
    NumericLiteral,
    ObjectLiteral,
    ParenthesisExpression,
    Program,
    ReturnStatement,
    Statement,
    StringLiteral,
    StructDeclaration,
    UnsafeStatement,
    VariableDeclaration,
} from '../frontend/ast.ts';
import { logError } from '../utils/logger.ts';
import { Environment } from './environment.ts';
import { compileAssignmentExpression, compileBinaryExpression, compileCallExpression, compileIdentifier, compileMemberExpression, compileObjectLiteral } from './expressions.ts';
import {
    compileFunctionDeclaration,
    compileImportStatement,
    compileProgram,
    compileReturnStatement,
    compileStructDeclaration,
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

        case 'StructDeclaration':
            return compileStructDeclaration(astNode as StructDeclaration, env);

        case 'ImportStatement':
            return compileImportStatement(astNode as ImportStatement, env);

        case 'ObjectLiteral':
            return compileObjectLiteral(astNode as ObjectLiteral, env);

        case 'BinaryExpression':
            return compileBinaryExpression(astNode as BinaryExpression, env) + (semicolon ? ';' : '')

        case 'CallExpression':
            return compileCallExpression(astNode as CallExpression, env) + (semicolon ? ';' : '')

        case 'MemberExpression':
            return compileMemberExpression(astNode as MemberExpression, env) + (semicolon ? ';' : '')

        case 'AssignmentExpression':
            return compileAssignmentExpression(astNode as AssignmentExpression, env) + (semicolon ? ';' : '')

        case 'MemoryReferenceExpression':
            return `&${compile((astNode as MemoryReferenceExpression).value, semicolon, env, forceChecks)}`;

        case 'MemoryDereferenceExpression':
            return `*${compile((astNode as MemoryDereferenceExpression).value, semicolon, env, forceChecks)}`;

        case 'ParenthesisExpression':
            return `(${compile((astNode as ParenthesisExpression).value, semicolon, env, forceChecks)})`;

        case 'NumericLiteral':
            return (astNode as NumericLiteral).value.toString();

        case 'StringLiteral':
            return (astNode as StringLiteral).raw;

        case 'Identifier':
            return compileIdentifier(astNode as Identifier, env, forceChecks);

        default:
            logError('Unknown AST node kind: ' + astNode.kind);
            console.log(astNode);
    }

    return '';
}

export default {
    compile,
};
