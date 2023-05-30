import { FunctionData, VariableData } from "../utils/types.ts";

export type NodeType =
    // Statements
    | 'Program'
    | 'VariableDeclaration'
    | 'FunctionDeclaration'
    | 'ReturnStatement'
    | 'CppStatement'
    | 'UnsafeStatement'
    | 'StructDeclaration'
    | 'ImportStatement'
    | 'ClassDeclaration'
    | 'NewStatement'

    // Expressions
    | 'AssignmentExpression'
    | 'MemberExpression'
    | 'CallExpression'
    | 'BinaryExpression'
    | 'MemoryReferenceExpression'
    | 'MemoryDereferenceExpression'
    | 'ParenthesisExpression'

    // Literal
    | 'ObjectLiteral'
    | 'NumericLiteral'
    | 'StringLiteral'
    | 'Identifier';


export interface Parameter {
    name: string;
    type: string;
}

// Statements wont return a value
export interface Statement {
    kind: NodeType;
}

export interface Expression extends Statement {}

export interface Program extends Statement {
    kind: 'Program';
    body: Statement[];
}

export interface VariableDeclaration extends Statement {
    kind: 'VariableDeclaration';
    identifier: string;
    type: string;
    macro: boolean;
    value?: Expression;
}

export interface FunctionDeclaration extends Statement {
    kind: 'FunctionDeclaration';
    name: string;
    parameters: Parameter[];
    body: Statement[];
    returnType: string;
}

export interface ReturnStatement extends Statement {
    kind: 'ReturnStatement';
    value?: Expression;
}

export interface CppStatement extends Statement {
    kind: 'CppStatement';
    code: string;
}

export interface UnsafeStatement extends Statement {
    kind: 'UnsafeStatement';
    body: Statement[];
}

export interface StructDeclaration extends Statement {
    kind: 'StructDeclaration';
    name: string;
    properties: Record<string, string>;
}

export interface ImportStatement extends Statement {
    kind: 'ImportStatement';
    path: string;
}

export interface ClassDeclaration extends Statement {
    kind: 'ClassDeclaration';
    name: string;
    variables: Map<string, VariableData>;
    functions: Map<string, FunctionData>;
    constructors: Map<string, FunctionData>;
}

export interface NewStatement extends Statement {
    kind: 'NewStatement';
    name: string;
    args: Expression[];
    macro: boolean;
}

// Expressions

export interface AssignmentExpression extends Expression {
    kind: 'AssignmentExpression';
    assigne: Expression;
    value: Expression;
}

export interface BinaryExpression extends Expression {
    kind: 'BinaryExpression';
    operator: string;
    left: Expression;
    right: Expression;
}

export interface MemoryReferenceExpression extends Expression {
    kind: 'MemoryReferenceExpression';
    value: Expression;
}

export interface MemoryDereferenceExpression extends Expression {
    kind: 'MemoryDereferenceExpression';
    value: Expression;
}

export interface ParenthesisExpression extends Expression {
    kind: 'ParenthesisExpression';
    value: Expression;
}

export interface CallExpression extends Expression {
    kind: 'CallExpression';
    args: Expression[];
    caller: Expression;
    macro: boolean;
}

export interface MemberExpression extends Expression {
    kind: 'MemberExpression';
    object: Expression;
    property: Expression;
    arrow: boolean;
}

export interface Identifier extends Expression {
    kind: 'Identifier';
    symbol: string;
}

export interface NumericLiteral extends Expression {
    kind: 'NumericLiteral';
    value: number;
}

export interface StringLiteral extends Expression {
    kind: 'StringLiteral';
    raw: string;
    value: string;
}

export interface ObjectLiteral extends Expression {
    kind: 'ObjectLiteral';
    properties: Expression[];
}
