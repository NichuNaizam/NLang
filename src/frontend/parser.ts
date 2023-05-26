// deno-lint-ignore-file no-explicit-any
import { logError } from '../utils/logger.ts';
import {
    AssignmentExpression,
    BinaryExpression,
    CallExpression,
    CppStatement,
    Expression,
    FunctionDeclaration,
    Identifier,
    MemberExpression,
    MemoryDereferenceExpression,
    MemoryReferenceExpression,
    NumericLiteral,
    ObjectLiteral,
    Parameter,
    ParenthesisExpression,
    Program,
    ReturnStatement,
    Statement,
    StringLiteral,
    StructDeclaration,
    UnsafeStatement,
    VariableDeclaration,
} from './ast.ts';

import { Token, tokenize, TokenType } from './lexer.ts';

export default class Parser {
    private tokens: Token[] = [];

    private notEOF(): boolean {
        return this.tokens[0].type != TokenType.EOFToken;
    }

    private at() {
        return this.tokens[0] as Token;
    }

    private eat() {
        const prev = this.tokens.shift() as Token;
        return prev;
    }

    private expect(type: TokenType, err: any) {
        const prev = this.tokens.shift() as Token;
        if (!prev || prev.type != type) {
            logError(
                `Parser Error: ${err} Got: ${prev.value} - line: ${prev.line}, column: ${prev.column}`
            );
            Deno.exit(1);
        }

        return prev;
    }

    private getIdentifier(): string {
        if (this.at().type == TokenType.IdentifierToken) {
            let toReturn = this.eat().value;

            if (
                this.at().type == TokenType.BinaryOperatorToken &&
                this.at().value == '*'
            ) {
                toReturn += this.eat().value;
            }

            return toReturn;
        } else if (
            this.at().type == TokenType.BinaryOperatorToken &&
            this.at().value == '*'
        ) {
            let toReturn = this.eat().value;
            toReturn += this.getIdentifier();

            return toReturn;
        } else if (this.at().type == TokenType.AmpersandToken) {
            let toReturn = this.eat().value;
            toReturn += this.getIdentifier();

            return toReturn;
        } else {
            logError(
                `Parser Error: Expected identifier, got ${
                    this.at().value
                } - line: ${this.at().line}, column: ${this.at().column}`
            );
            Deno.exit(1);
        }
    }

    private parseArrow() {
        if (
            this.tokens[0].value == '-' &&
            this.tokens[1].type == TokenType.GreaterThanToken
        ) {
            this.eat();
            this.eat();
            return true;
        }

        return false;
    }

    public produceAST(sourceCode: string): Program {
        this.tokens = tokenize(sourceCode);
        const program: Program = {
            kind: 'Program',
            body: [],
        };

        while (this.notEOF()) {
            program.body.push(this.parseStatement());
        }

        return program;
    }

    private parseStatement(): Statement {
        switch (this.at().type) {
            case TokenType.LetKeyword:
                return this.parseVariableDeclaration();

            case TokenType.DefineKeyword:
                return this.parseFunctionDeclaration();

            case TokenType.ReturnKeyword:
                return this.parseReturnStatement();

            case TokenType.CppKeyword:
                return this.parseCppStatement();

            case TokenType.UnsafeKeyword:
                return this.parseUnsafeStatement();

            case TokenType.StructKeyword:
                return this.parseStructDeclaration();

            default:
                return this.parseExpression();
        }
    }

    private parseFunctionDeclaration(): Statement {
        this.eat(); // eats the 'def' keyword
        const name = this.expect(
            TokenType.IdentifierToken,
            'Expected identifier'
        ).value;

        const parameters: Parameter[] = [];

        this.expect(TokenType.OpenParenToken, 'Expected (');

        while (this.at().type != TokenType.CloseParenToken && this.notEOF()) {
            const paramName = this.expect(
                TokenType.IdentifierToken,
                'Expected parameter name'
            ).value;
            this.expect(TokenType.ColonToken, 'Expected :');
            const paramType = this.expect(
                TokenType.IdentifierToken,
                'Expected parameter type'
            ).value;

            parameters.push({
                name: paramName,
                type: paramType,
            });

            if (this.at().type == TokenType.CommaToken) {
                this.eat();
            }
        }

        this.expect(TokenType.CloseParenToken, 'Expected )'); // Eat the closing paren

        this.expect(TokenType.ColonToken, "Expected ':'");
        const returnType = this.expect(
            TokenType.IdentifierToken,
            'Expected return type'
        ).value;

        this.expect(TokenType.OpenBraceToken, 'Expected {');
        const body: Statement[] = [];

        while (this.notEOF() && this.at().type != TokenType.CloseBraceToken) {
            body.push(this.parseStatement());
        }

        this.expect(TokenType.CloseBraceToken, 'Expected }');
        return {
            kind: 'FunctionDeclaration',
            name,
            parameters,
            body,
            returnType,
        } as FunctionDeclaration;
    }

    private parseReturnStatement(): Statement {
        this.eat(); // Eat the 'return' keyword

        if (
            this.at().type == TokenType.SemicolonToken ||
            this.at().type == TokenType.CloseBraceToken
        ) {
            return {
                kind: 'ReturnStatement',
            };
        }

        const value = this.parseExpression();
        return {
            kind: 'ReturnStatement',
            value,
        } as ReturnStatement;
    }

    private parseCppStatement(): Statement {
        const cppToken = this.eat(); // Eat the 'cpp' keyword
        return {
            kind: 'CppStatement',
            code: cppToken.value,
        } as CppStatement;
    }

    private parseUnsafeStatement(): Statement {
        this.eat(); // Eat the 'unsafe' keyword
        const body: Statement[] = [];

        this.expect(TokenType.OpenBraceToken, 'Expected { in unsafe block');

        while (this.notEOF() && this.at().type != TokenType.CloseBraceToken) {
            body.push(this.parseStatement());
        }

        this.expect(TokenType.CloseBraceToken, 'Expected } in unsafe block');
        return {
            kind: 'UnsafeStatement',
            body,
        } as UnsafeStatement;
    }

    private parseStructDeclaration(): Statement {
        this.eat(); // Eat the 'struct' keyword
        const name = this.expect(
            TokenType.IdentifierToken,
            'Expected identifier'
        ).value;

        this.expect(TokenType.OpenBraceToken, 'Expected {');

        const properties: Record<string, string> = {};

        while (this.notEOF() && this.at().type != TokenType.CloseBraceToken) {
            const key = this.expect(
                TokenType.IdentifierToken,
                'Expected key!'
            ).value;

            this.expect(TokenType.ColonToken, 'Expected :');

            const type = this.expect(
                TokenType.IdentifierToken,
                'Expected type!'
            ).value;

            properties[key] = type;

            if (this.at().type == TokenType.CommaToken) {
                this.eat();
            }
        }

        this.expect(TokenType.CloseBraceToken, 'Expected }');

        return {
            kind: 'StructDeclaration',
            name,
            properties,
        } as StructDeclaration;
    }

    private parseExpression(): Expression {
        return this.parseAssignmentExpression();
    }

    private parseAssignmentExpression(): Expression {
        const left = this.parseObjectExpression();

        if (this.at().type == TokenType.EqualsToken) {
            this.eat(); // Advance past Equals token
            const value = this.parseAssignmentExpression();

            return {
                kind: 'AssignmentExpression',
                assigne: left,
                value,
            } as AssignmentExpression;
        }

        return left;
    }

    private parseObjectExpression(): Expression {
        if (this.at().type != TokenType.OpenBraceToken) {
            return this.parseAdditiveExpression();
        }

        this.eat(); // Advances past {
        const properties = new Array<Expression>();

        while (this.notEOF() && this.at().type != TokenType.CloseBraceToken) {
            properties.push(this.parseExpression());

            if (this.at().type != TokenType.CloseBraceToken) {
                this.expect(TokenType.CommaToken, 'Expected , or }');
            }
        }

        this.expect(TokenType.CloseBraceToken, 'Expected }');
        return { kind: 'ObjectLiteral', properties } as ObjectLiteral;
    }

    private parseVariableDeclaration(): Statement {
        this.eat(); // Eat the 'let' keyword
        const identifier = this.expect(
            TokenType.IdentifierToken,
            'Expected identifier'
        ).value;

        this.expect(TokenType.ColonToken, "Expected ':'");
        const type = this.getIdentifier();

        if (this.at().type != TokenType.EqualsToken) {
            return {
                kind: 'VariableDeclaration',
                identifier,
                type,
            } as VariableDeclaration;
        }

        this.expect(TokenType.EqualsToken, 'Expected =');
        const declaration = {
            kind: 'VariableDeclaration',
            identifier,
            value: this.parseExpression(),
            type,
        } as VariableDeclaration;

        return declaration;
    }

    private parseAdditiveExpression(): Expression {
        let left = this.parseMultiplicitaveExpression();

        while (this.at().value == '+' || this.at().value == '-') {
            const operator = this.eat().value;
            const right = this.parseMultiplicitaveExpression();
            left = {
                kind: 'BinaryExpression',
                left,
                right,
                operator,
            } as BinaryExpression;
        }

        return left;
    }

    private parseMultiplicitaveExpression(): Expression {
        let left = this.parseCallMemberExpression();

        while (
            this.at().value == '/' ||
            this.at().value == '*' ||
            this.at().value == '%'
        ) {
            const operator = this.eat().value;
            const right = this.parseCallMemberExpression();
            left = {
                kind: 'BinaryExpression',
                left,
                right,
                operator,
            } as BinaryExpression;
        }

        return left;
    }

    private parseCallMemberExpression(): Expression {
        const member = this.parseMemberExpression();

        if (
            this.at().type == TokenType.OpenParenToken ||
            this.at().type == TokenType.ExclamationToken
        ) {
            return this.parseCallExpression(member);
        } else {
            return member;
        }
    }

    private parseCallExpression(caller: Expression): Expression {
        if (this.at().type == TokenType.ExclamationToken) {
            this.eat(); // Eat the !
            let callExpr: Expression = {
                kind: 'CallExpression',
                caller,
                args: this.parseArgs(),
                macro: true,
            } as CallExpression;

            if (this.at().type == TokenType.OpenParenToken) {
                callExpr = this.parseCallExpression(callExpr);
            }

            return callExpr;
        }

        let callExpr: Expression = {
            kind: 'CallExpression',
            caller,
            args: this.parseArgs(),
            macro: false,
        } as CallExpression;

        if (this.at().type == TokenType.OpenParenToken) {
            callExpr = this.parseCallExpression(callExpr);
        }

        return callExpr;
    }

    private parseArgs(): Expression[] {
        this.expect(TokenType.OpenParenToken, 'Expected (');
        const argsList =
            this.at().type == TokenType.CloseParenToken
                ? []
                : this.parseArgumentsList();
        this.expect(TokenType.CloseParenToken, 'Expected )');
        return argsList;
    }

    private parseArgumentsList(): Expression[] {
        const args = [this.parseAssignmentExpression()];

        while (this.notEOF() && this.at().type == TokenType.CommaToken) {
            this.eat(); // Remove the Comma ,
            args.push(this.parseAssignmentExpression());
        }

        return args;
    }

    private parseMemberExpression(): Expression {
        let object = this.parsePrimaryExpression();

        while (this.at().type == TokenType.DotToken || this.parseArrow()) {
            let property: Expression;
            let arrow = true;

            if (this.at().type == TokenType.DotToken) {
                arrow = false;
                this.eat(); // Eat the .
            }

            // Get identifier
            property = this.parsePrimaryExpression();

            if (property.kind != 'Identifier') {
                logError('Expected identifier, got' + property);
                Deno.exit(1);
            }

            object = {
                kind: 'MemberExpression',
                object,
                property,
                arrow,
            } as MemberExpression;
        }

        return object;
    }

    private parsePrimaryExpression(): Expression {
        const tk = this.at().type;

        switch (tk) {
            case TokenType.IdentifierToken:
                return {
                    kind: 'Identifier',
                    symbol: this.eat().value,
                } as Identifier;

            case TokenType.NumberToken:
                return {
                    kind: 'NumericLiteral',
                    value: parseFloat(this.eat().value),
                } as NumericLiteral;

            case TokenType.StringToken:
                return {
                    kind: 'StringLiteral',
                    raw: this.at().value,
                    value: this.eat().value.replace(/"/g, ''),
                } as StringLiteral;

            case TokenType.OpenParenToken: {
                this.eat();
                const value = this.parseExpression();
                this.expect(TokenType.CloseParenToken, 'Expected )');
                
                return {
                    kind: 'ParenthesisExpression',
                    value,
                } as ParenthesisExpression;
            }

            case TokenType.AmpersandToken: {
                this.eat(); // Eat the &
                const value = this.parseExpression();
                return {
                    kind: 'MemoryReferenceExpression',
                    value,
                } as MemoryReferenceExpression;
            }

            case TokenType.BinaryOperatorToken: {
                if (this.at().value == '*') {
                    this.eat(); // Eat the *
                    const value = this.parseExpression();
                    return {
                        kind: 'MemoryDereferenceExpression',
                        value,
                    } as MemoryDereferenceExpression;
                }

                logError('Unexpected token ' + this.at().value);
                Deno.exit(1);
                break;
            }

            default:
                logError('Unexpected token ' + this.at().value);
                Deno.exit(1);
        }
    }
}
