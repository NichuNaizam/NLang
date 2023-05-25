export type NodeType =
    // Statements
    | 'Program'
    | 'VariableDeclaration'
    | 'FunctionDeclaration'
    | 'ReturnStatement'
    | 'CppStatement'
    | 'UnsafeStatement'

    // Expressions
    | 'AssignmentExpression'
    | 'MemberExpression'
    | 'CallExpression'

    // Literal
    | 'Property'
    | 'ObjectLiteral'
    | 'NumericLiteral'
    | 'StringLiteral'
    | 'Identifier'
    | 'BinaryExpression';

export type DataTypes = 'int' | 'float' | 'string' | 'bool' | 'void';

export interface Parameter {
    name: string;
    type: DataTypes;
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
    type: DataTypes;
    value?: Expression;
}

export interface FunctionDeclaration extends Statement {
    kind: 'FunctionDeclaration';
    name: string;
    parameters: Parameter[];
    body: Statement[];
    returnType: DataTypes;
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
    computed: boolean;
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

export interface Property extends Expression {
    kind: 'Property';
    key: string;
    value?: Expression;
}

export interface ObjectLiteral extends Expression {
    kind: 'ObjectLiteral';
    properties: Property[];
}
