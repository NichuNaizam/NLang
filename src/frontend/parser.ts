// deno-lint-ignore-file no-explicit-any
import {
    AssignmentExpression,
    BinaryExpression,
    CallExpression,
    CppStatement,
    DataTypes,
    Expression,
    FunctionDeclaration,
    Identifier,
    MemberExpression,
    NumericLiteral,
    ObjectLiteral,
    Parameter,
    Program,
    Property,
    ReturnStatement,
    Statement,
    StringLiteral,
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
            console.error('Parser Error: ', err, prev, ' - Expecting: ', type);
            Deno.exit(1);
        }

        return prev;
    }

    private getDataType() {
        let type: DataTypes = 'int';

        switch (this.at().type) {
            case TokenType.IntKeyword:
                type = 'int';
                break;

            case TokenType.FloatKeyword:
                type = 'float';
                break;

            case TokenType.StringKeyword:
                type = 'string';
                break;

            case TokenType.BooleanKeyword:
                type = 'bool';
                break;

            case TokenType.VoidKeyword:
                type = 'void';
                break;

            default:
                console.error(
                    'Parser Error: Expected data type! Got: ' +
                        this.at().type +
                        ' - line: ' +
                        this.at().line +
                        ', column: ' +
                        this.at().column
                );
                Deno.exit(1);
                break;
        }

        this.eat();
        return type;
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
            const paramType = this.getDataType();

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
        const returnType = this.getDataType();

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

        this.expect(TokenType.OpenBraceToken, 'Expected { in unsafe block')

        while (this.notEOF() && this.at().type != TokenType.CloseBraceToken) {
            body.push(this.parseStatement());
        }

        this.expect(TokenType.CloseBraceToken, 'Expected } in unsafe block');
        return {
            kind: 'UnsafeStatement',
            body,
        } as UnsafeStatement;
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
        const properties = new Array<Property>();

        while (this.notEOF() && this.at().type != TokenType.CloseBraceToken) {
            const key = this.expect(
                TokenType.IdentifierToken,
                'Expected key!'
            ).value;

            // Allows shorthand key comma pair { fooBar }
            if (this.at().type == TokenType.CommaToken) {
                this.eat(); // Advance past ,
                properties.push({ kind: 'Property', key });
                continue;
            } else if (this.at().type == TokenType.CloseBraceToken) {
                properties.push({ kind: 'Property', key });
                continue;
            }

            this.expect(TokenType.ColonToken, 'Expected :');
            const value = this.parseExpression();

            properties.push({ kind: 'Property', key, value });
            if (this.at().type != TokenType.CloseBraceToken) {
                this.expect(TokenType.CommaToken, 'Expected ,');
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
        const type = this.getDataType();

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

        if (this.at().type == TokenType.OpenParenToken || this.at().type == TokenType.ExclamationToken) {
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

        while (
            this.at().type == TokenType.DotToken ||
            this.at().type == TokenType.OpenBracketToken
        ) {
            const operator = this.eat();
            let property: Expression;
            let computed: boolean;

            // non-computed values aka obj.expr
            if (operator.type == TokenType.DotToken) {
                computed = false;

                // Get identifier
                property = this.parsePrimaryExpression();

                if (property.kind != 'Identifier') {
                    console.error('Expected identifier, got', property);
                    Deno.exit(1);
                }
            } else {
                // This allows obj[expr]
                computed = true;
                property = this.parseExpression();
                this.expect(TokenType.CloseBracketToken, 'Expected ]');
            }

            object = {
                kind: 'MemberExpression',
                object,
                property,
                computed,
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
                return value;
            }

            default:
                console.error(
                    'Unexpected token found during parsing!',
                    this.at()
                );
                Deno.exit(1);
        }
    }
}
