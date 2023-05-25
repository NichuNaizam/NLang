import compiler from './compiler/compiler.ts';
import { Environment } from './compiler/environment.ts';
import Parser from './frontend/parser.ts';

// Parse command line arguments
const args = Deno.args;
if (args.length != 2) {
    console.log('Usage: nlangc <source file> <output file>');
    Deno.exit(1);
}

const sourceFile = args[0];
const output = args[1];

if (sourceFile == '') {
    console.error('No source file specified');
    Deno.exit(1);
}

if (output == '') {
    console.error('No output file specified');
    Deno.exit(1);
}

const source = Deno.readTextFileSync(sourceFile);

const parser = new Parser();
const ast = parser.produceAST(source);

const env = new Environment();

const code = compiler.compile(ast, true, env);

Deno.writeFileSync('./out/script.cpp', new TextEncoder().encode(code));
const command = new Deno.Command('g++', {
    args: ['out/script.cpp', '-o', output, '--std=c++11'],
});
const process = command.spawn();
await process.output();

console.log(`Compiled ${sourceFile} to ${output}`);
Deno.exit(0);