type Values = 'DataType' | 'Function' | 'Undefined';

export class Environment {
    private values: Map<string, Values> = new Map();
    private parent: Environment | null = null;
    public unsafe = false;

    constructor(env: Environment | null = null) {
        this.parent = env;
    }

    public setValue(name: string, type: Values) {
        this.values.set(name, type);
    }
    
    public doesExist(name: string): boolean {
        if (this.unsafe) return true;

        if (this.values.has(name)) return true;

        if (this.parent) return this.parent.doesExist(name);
        return false;
    }

    public doesExistWithType(name: string, type: Values): boolean {
        if (this.unsafe) return true;

        if (this.values.has(name)) {
            return this.values.get(name) == type;
        }

        if (this.parent) return this.parent.doesExistWithType(name, type);
        return false;
    }
}