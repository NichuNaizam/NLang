import { DenoStdInternalError } from 'https://deno.land/std@0.189.0/_util/asserts.ts';
import { Parameter } from '../frontend/ast.ts';
import { logError } from '../utils/logger.ts';

type Values = 'Variable' | 'Struct' | 'Function';

interface FunctionValue {
    parameters: Parameter[];
    returnType: string;
}

interface VariableValue {
    type: string;
    value: string;
}

export class Environment {
    public identifiers: Map<string, Values> = new Map();
    public structs: Map<string, Map<string, string>> = new Map();
    public functions: Map<string, FunctionValue> = new Map();
    public variables: Map<string, VariableValue> = new Map();
    private parent: Environment | null = null;
    public unsafe = false;

    constructor(env: Environment | null = null) {
        this.parent = env;

        if (env) {
            this.unsafe = env.unsafe;
        }
    }

    public defineIdentifier(name: string, type: Values) {
        this.identifiers.set(name, type);
    }

    public defineStruct(name: string, struct: Map<string, string>) {
        this.structs.set(name, struct);
        this.defineIdentifier(name, 'Struct');
    }

    public getStruct(name: string): Map<string, string> {
        if (this.structs.has(name)) {
            return this.structs.get(name)!;
        }

        if (this.parent) return this.parent.getStruct(name);
        return new Map();
    }

    public defineFunction(
        name: string,
        parameters: Parameter[],
        returnType: string
    ) {
        this.functions.set(name, { parameters, returnType });
        this.defineIdentifier(name, 'Function');
    }

    public getFunction(name: string): FunctionValue {
        if (this.functions.has(name)) {
            return this.functions.get(name)!;
        }

        if (this.parent) return this.parent.getFunction(name);

        logError(`Function ${name} does not exist`);
        Deno.exit(1);
    }

    public defineVariable(name: string, type: string, value: string) {
        this.variables.set(name, { type, value });
        this.defineIdentifier(name, 'Variable');
    }

    public getVariable(name: string): VariableValue {
        if (this.variables.has(name)) {
            return this.variables.get(name)!;
        }

        if (this.parent) return this.parent.getVariable(name);

        logError(`Variable ${name} does not exist`);
        Deno.exit(1);
    }

    public doesExist(name: string): boolean {
        if (this.unsafe) return true;

        if (this.identifiers.has(name)) return true;

        if (this.parent) return this.parent.doesExist(name);
        return false;
    }

    public doesExistWithType(name: string, type: Values): boolean {
        if (this.unsafe) return true;

        if (this.identifiers.has(name)) {
            return this.identifiers.get(name) == type;
        }

        if (this.parent) return this.parent.doesExistWithType(name, type);
        return false;
    }
}
