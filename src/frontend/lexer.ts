import { logError } from "../utils/logger.ts";

export enum TokenType {
    // Literal Types
    NumberToken, // 1234
    StringToken, // "foo"
    IdentifierToken, // fooBar

    // Keywords
    LetKeyword, // let
    DefineKeyword, // def
    ReturnKeyword, // return
    CppKeyword, // cpp
    UnsafeKeyword, // unsafe

    // Data Types
    IntKeyword, // int
    FloatKeyword, // float
    StringKeyword, // string
    BooleanKeyword, // bool
    VoidKeyword, // void

    // Grouping * Operators
    DotToken, // .
    EqualsToken, // =
    CommaToken, // ,
    ColonToken, // :
    ExclamationToken, // !
    OpenParenToken, // (
    CloseParenToken, // )
    OpenBraceToken, // {
    CloseBraceToken, // }
    BinaryOperatorToken, // + - * / %
    OpenBracketToken, // [
    CloseBracketToken, // ]
    SemicolonToken, // ;
    EOFToken, // End of file
}

export interface Token {
    type: TokenType;
    value: string;
    line: number;
    column: number;
}

const keywords: Record<string, TokenType> = {
    let: TokenType.LetKeyword,
    def: TokenType.DefineKeyword,
    return: TokenType.ReturnKeyword,
    cpp: TokenType.CppKeyword,
    unsafe: TokenType.UnsafeKeyword,
    int: TokenType.IntKeyword,
    float: TokenType.FloatKeyword,
    string: TokenType.StringKeyword,
    bool: TokenType.BooleanKeyword,
    void: TokenType.VoidKeyword,
};

function token(
    type: TokenType,
    value: string = '',
    line: number,
    column: number
): Token {
    return {
        type,
        value,
        line,
        column,
    };
}

function isAlpha(src: string): boolean {
    return src.toUpperCase() != src.toLowerCase();
}

function isInt(src: string): boolean {
    const c = src.charCodeAt(0);
    const bounds = ['0'.charCodeAt(0), '9'.charCodeAt(0)];
    return c >= bounds[0] && c <= bounds[1];
}

function isSkippable(src: string): boolean {
    return src == ';' || src == ' ' || src == '\t' || src == '\r';
}

export function tokenize(sourceCode: string): Token[] {
    const tokens = new Array<Token>();
    const src = sourceCode.split('');

    let line = 1;
    let column = 1;

    while (src.length > 0) {
        if (src[0] == '(') {
            tokens.push(
                token(TokenType.OpenParenToken, src.shift(), line, column)
            );
            column++;
        } else if (src[0] == ')') {
            tokens.push(
                token(TokenType.CloseParenToken, src.shift(), line, column)
            );
            column++;
        } else if (
            src[0] == '+' ||
            src[0] == '-' ||
            src[0] == '*' ||
            src[0] == '/' ||
            src[0] == '%'
        ) {
            tokens.push(
                token(TokenType.BinaryOperatorToken, src.shift(), line, column)
            );
            column++;
        } else if (src[0] == '=') {
            tokens.push(
                token(TokenType.EqualsToken, src.shift(), line, column)
            );
            column++;
        } else if (src[0] == ',') {
            tokens.push(token(TokenType.CommaToken, src.shift(), line, column));
            column++;
        } else if (src[0] == ':') {
            tokens.push(token(TokenType.ColonToken, src.shift(), line, column));
            column++;
        } else if (src[0] == '{') {
            tokens.push(
                token(TokenType.OpenBraceToken, src.shift(), line, column)
            );
            column++;
        } else if (src[0] == '}') {
            tokens.push(
                token(TokenType.CloseBraceToken, src.shift(), line, column)
            );
            column++;
        } else if (src[0] == '[') {
            tokens.push(
                token(TokenType.OpenBracketToken, src.shift(), line, column)
            );
            column++;
        } else if (src[0] == ']') {
            tokens.push(
                token(TokenType.CloseBracketToken, src.shift(), line, column)
            );
            column++;
        } else if (src[0] == '.') {
            tokens.push(token(TokenType.DotToken, src.shift(), line, column));
        } else if (src[0] == '!') {
            tokens.push(token(TokenType.ExclamationToken, src.shift(), line, column));
        } else {
            // Handle Multicharector tokens
            if (isInt(src[0])) {
                let num = '';
                while (src.length > 0 && isInt(src[0])) {
                    num += src.shift();
                    column++;
                }

                tokens.push(token(TokenType.NumberToken, num, line, column));
            } else if (isAlpha(src[0])) {
                let ident = '';

                while (src.length > 0 && isAlpha(src[0]) || isInt(src[0]) || src[0] == '_') { 
                    ident += src.shift();
                    column++;
                }

                if (ident == "cpp") {
                    while (isSkippable(src[0])) {
                        if (src[0] == '\n') {
                            line++;
                            column = 1;
                        }

                        src.shift();
                        column++;
                    }

                    if (src[0] != '{') {
                        logError('Expected { after cpp keyword');
                        Deno.exit(1);
                    }

                    src.shift();
                    column++;

                    let openParen = 1;

                    let code = '';
                    while (src.length > 0) {
                        // @ts-ignore Does not increment line and column when you hit \n
                        if (src[0] == '\n') {
                            line++;
                            column = 1;
                        }

                        if (src[0] == '{') {
                            openParen++;
                        }

                        // @ts-ignore Does not terminate the loop when you hit } token
                        if (src[0] == '}') {
                            openParen--;
                            if (openParen == 0) break;
                        }

                        code += src.shift();
                        column++;
                    }

                    if (src.length == 0) {
                        logError('Unterminated cpp block');
                        Deno.exit(1);
                    }

                    src.shift();

                    tokens.push(token(TokenType.CppKeyword, code, line, column));
                } else if (ident in keywords) {
                    tokens.push(token(keywords[ident], ident, line, column));
                } else {
                    tokens.push(
                        token(TokenType.IdentifierToken, ident, line, column)
                    );
                }
            } else if (src[0] == '"') {
                src.shift();
                let string = '"';
                column++;

                while (src[0] != '"') {
                    if (src.length == 0) {
                        logError('Unterminated string in source code');
                        Deno.exit(1);
                    }

                    string += src.shift();
                    column++;
                }

                string += '"';
                src.shift();
                column++;

                tokens.push(token(TokenType.StringToken, string, line, column));
            } else if (src[0] == "'") {
                src.shift();
                let string = '"';
                column++;

                while (src[0] != "'") {
                    if (src.length == 0) {
                        logError('Unterminated string in source code');
                        Deno.exit(1);
                    }

                    string += src.shift();
                    column++;
                }

                string += '"';
                src.shift();
                column++;

                tokens.push(token(TokenType.StringToken, string, line, column));
            } else if (src[0] == '\n') {
                line++;
                column = 1;
                src.shift();
            } else if (isSkippable(src[0])) {
                src.shift();
                column++;
            } else {
                logError(`Unexpected token ${src[0]} at line ${line} column ${column}`);
                Deno.exit(1);
            }
        }
    }

    tokens.push(token(TokenType.EOFToken, 'EOF', line, column));
    return tokens;
}