import compiler from './compiler/compiler.ts';
import { Environment } from './compiler/environment.ts';
import Parser from './frontend/parser.ts';
import downloadFile from './utils/downloadFile.ts';
import { logInfo, logWarn } from './utils/logger.ts';

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

// Read the source file
const source = Deno.readTextFileSync(sourceFile);

const parser = new Parser();
const ast = parser.produceAST(source);

const env = new Environment();

logInfo('Compiling...');
const code = compiler.compile(ast, true, env);

try {
    Deno.mkdirSync('./.nlang');
} catch (e) {
}

Deno.writeFileSync('./.nlang/script.cpp', new TextEncoder().encode(code));

// Check if nlang.h exists file
try {
    await Deno.stat('./.nlang/nlang.h');
} catch (e) {
    // Download nlang.h
    await downloadFile('https://raw.githubusercontent.com/NichuNaizam/NLang/master/nlang.h', './.nlang/nlang.h');
}

// Compile the code
const command = new Deno.Command('g++', {
    args: ['.nlang/script.cpp', '-o', output, '--std=c++11'],
});
const process = command.spawn();
await process.output();

logInfo('Compiled successfully');
Deno.exit(0);