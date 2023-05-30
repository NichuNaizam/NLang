import { Parameter, Statement } from '../frontend/ast.ts';
import { logError } from '../utils/logger.ts';

type Values = 'Variable' | 'Class' | 'Struct' | 'Function';

export interface EnvironmentValue {
    valueType: Values;
    macro?: boolean;
}

export interface FunctionValue extends EnvironmentValue {
    name: string;
    body: Statement[];
    parameters: Parameter[];
    returnType: string;
}

export interface VariableValue extends EnvironmentValue {
    name: string;
    type: string;
    value?: string;
}

export interface ClassValue extends EnvironmentValue {
    name: string;
    env: Environment;
}

export interface StructValue extends EnvironmentValue {
    name: string;
    types: Map<string, string>;
    values: Environment;
}

export class Environment {
    public identifiers: Map<string, Values> = new Map();
    public classes: Map<string, ClassValue> = new Map();
    public structs: Map<string, StructValue> = new Map();
    public functions: Map<string, FunctionValue> = new Map();
    public variables: Map<string, VariableValue> = new Map();
    public privateIdentifiers: string[] = [];
    public macroVariables: string[] = [];
    private parent: Environment | null = null;
    public unsafe = false;

    constructor(env: Environment | null = null) {
        this.parent = env;

        if (env) {
            this.unsafe = env.unsafe;
        }
    }

    public defineIdentifier(name: string, type: Values, isPrivate: boolean, isMacro: boolean) {
        this.identifiers.set(name, type);
        isPrivate && this.privateIdentifiers.push(name);
        isMacro && this.macroVariables.push(name);
    }

    public defineClass(name: string, classObj: ClassValue, isPrivate = false, isMacro = false) {
        if (this.doesExist(name)) {
            logError(`${name} is already defined!`);
            Deno.exit(1);
        }

        this.classes.set(name, classObj);
        this.defineIdentifier(name, 'Class', isPrivate, isMacro);
    }

    public getClass(name: string): ClassValue {
        if (name.includes('.')) {
            const list = name.split('.');
            let className = list[0];

            if (this.doesExistWithType(className, 'Class')) {
                const classObj = this.getClass(className);
                const env = classObj.env;

                return env.getClass(list[1]);
            }
        }

        if (this.classes.has(name)) {
            return this.classes.get(name)!;
        }

        if (this.parent) return this.parent.getClass(name);
        logError(`Class ${name} is not defined!`);
        Deno.exit(1);
    }

    public defineStruct(name: string, struct: StructValue, isPrivate = false, isMacro = false) {
        if (this.doesExist(name)) {
            logError(`${name} is already defined!`);
            Deno.exit(1);
        }

        this.structs.set(name, struct);
        this.defineIdentifier(name, 'Struct', isPrivate, isMacro);
    }

    public getStruct(name: string): StructValue {
        if (name.includes('.')) {
            const list = name.split('.');
            let className = list[0];

            if (this.doesExistWithType(className, 'Class')) {
                const classObj = this.getClass(className);
                const env = classObj.env;

                return env.getStruct(list[1]);
            }
        }

        if (this.structs.has(name)) {
            return this.structs.get(name)!;
        }

        if (this.parent) return this.parent.getStruct(name);

        logError(`Struct ${name} is not defined!`);
        Deno.exit(1);
    }

    public defineFunction(
        name: string,
        body: Statement[],
        parameters: Parameter[],
        returnType: string,
        isPrivate = false,
        isMacro = false
    ) {
        if (this.doesExist(name)) {
            logError(`${name} is already defined!`);
            Deno.exit(1);
        }

        this.functions.set(name, { valueType: 'Function', name, body, parameters, returnType });
        this.defineIdentifier(name, 'Function', isPrivate, isMacro);
    }

    public getFunction(name: string): FunctionValue {
        if (name.includes('.')) {
            const list = name.split('.');
            let className = list[0];

            if (this.doesExistWithType(className, 'Class')) {
                const classObj = this.getClass(className);
                const env = classObj.env;

                return env.getFunction(list[1]);
            }
        }

        if (this.functions.has(name)) {
            return this.functions.get(name)!;
        }

        if (this.parent) return this.parent.getFunction(name);

        logError(`Function ${name} is not defined!`);
        Deno.exit(1);
    }

    public defineVariable(
        name: string,
        type: string,
        value?: string,
        isPrivate = false,
        isMacro = false,
    ) {
        if (this.doesExist(name)) {
            logError(`${name} is already defined!`);
            Deno.exit(1);
        }

        this.variables.set(name, { valueType: 'Variable', name, type, value });
        this.defineIdentifier(name, 'Variable', isPrivate, isMacro);
    }

    public getVariable(name: string): VariableValue {
        if (name.includes('.')) {
            const list = name.split('.');
            let className = list[0];

            if (this.doesExistWithType(className, 'Class')) {
                const classObj = this.getClass(className);
                const env = classObj.env;

                return env.getVariable(list[1]);
            }
        }

        if (this.variables.has(name)) {
            return this.variables.get(name)!;
        }

        if (this.parent) return this.parent.getVariable(name);
        
        logError(`Variable ${name} is not defined!`);
        Deno.exit(1);
    }

    public doesExist(name: string): boolean {
        if (name.includes('.')) {
            const list = name.split('.');
            let className = list[0];

            if (this.doesExistWithType(className, 'Class')) {
                const classObj = this.getClass(className);
                const env = classObj.env;

                return env.doesExist(list[1]);
            }
        }

        if (this.unsafe) return true;

        if (this.identifiers.has(name)) return true;

        if (this.parent) return this.parent.doesExist(name);
        return false;
    }

    public doesExistWithType(name: string, type: Values): boolean {
        if (this.macroVariables.includes(name)) return true;

        if (name.includes('.')) {
            const list = name.split('.');
            let className = list[0];

            if (this.doesExistWithType(className, 'Class')) {
                const classObj = this.getClass(className);
                const env = classObj.env;

                return env.doesExistWithType(list[1], type);
            }
        }

        if (this.unsafe) return true;

        if (this.identifiers.has(name)) {
            return this.identifiers.get(name) == type;
        }

        if (this.parent) return this.parent.doesExistWithType(name, type);
        return false;
    }

    public isPrivate(name: string): boolean {
        if (this.privateIdentifiers.includes(name)) return true;

        if (this.parent) return this.parent.isPrivate(name);
        return false;
    }

    public getAllPublicVariables(): VariableValue[] {
        const variables: VariableValue[] = [];

        for (const [name, value] of this.variables) {
            if (!this.isPrivate(name)) {
                variables.push(value);
            }
        }

        if (this.parent) {
            return [...variables, ...this.parent.getAllPublicVariables()];
        }

        return variables;
    }

    public getAllPublicFunctions(): FunctionValue[] {
        const functions: FunctionValue[] = [];

        for (const [name, value] of this.functions) {
            if (!this.isPrivate(name)) {
                functions.push(value);
            }
        }

        if (this.parent) {
            return [...functions, ...this.parent.getAllPublicFunctions()];
        }

        return functions;
    }

    public getAllPrivateVariables(): VariableValue[] {
        const variables: VariableValue[] = [];

        for (const [name, value] of this.variables) {
            if (this.isPrivate(name)) {
                variables.push(value);
            }
        }

        if (this.parent) {
            return [...variables, ...this.parent.getAllPrivateVariables()];
        }

        return variables;
    }

    public getAllPrivateFunctions(): FunctionValue[] {
        const functions: FunctionValue[] = [];

        for (const [name, value] of this.functions) {
            if (this.isPrivate(name)) {
                functions.push(value);
            }
        }

        if (this.parent) {
            return [...functions, ...this.parent.getAllPrivateFunctions()];
        }

        return functions;
    }

    public getAllClassNames(): string[] {
        const classes: string[] = [];

        for (const [name, value] of this.classes) {
            classes.push(name);
        }

        if (this.parent) {
            return [...classes, ...this.parent.getAllClassNames()];
        }

        return classes;
    }

    public getAllStructNames(): string[] {
        const structs: string[] = [];

        for (const [name, value] of this.structs) {
            structs.push(name);
        }

        if (this.parent) {
            return [...structs, ...this.parent.getAllStructNames()];
        }

        return structs;
    }

    public doesHaveClass(name: string): boolean {
        if (this.classes.has(name)) return true;

        if (this.parent) return this.parent.doesHaveClass(name);
        if (this.macroVariables.includes(name)) return true;
        return false;
    }

    public doesHaveStruct(name: string): boolean {
        if (this.structs.has(name)) return true;

        if (this.parent) return this.parent.doesHaveStruct(name);
        if (this.macroVariables.includes(name)) return true;
        return false;
    }

    public doesHaveFunction(name: string): boolean {
        if (this.functions.has(name)) return true;
        
        if (this.parent) return this.parent.doesHaveFunction(name);
        if (this.macroVariables.includes(name)) return true;
        return false;
    }

    public doesHaveVariable(name: string): boolean {
        if (this.variables.has(name)) return true;

        if (this.parent) return this.parent.doesHaveVariable(name);
        if (this.macroVariables.includes(name)) return true;
        return false;
    }
}
