import { Expression, Parameter, Statement } from '../frontend/ast.ts';

export interface Config {
    outDir: string;
    cppFile: string;
    compileCommand: string;
    compileArgs: string[];
}

export interface VariableData {
    name: string;
    value?: Expression;
    type: string;
    visibility: 'private' | 'public';
}

export interface FunctionData {
    parameters: Parameter[];
    returnType: string;
    body: Statement[];
    visibility: 'private' | 'public';
}
