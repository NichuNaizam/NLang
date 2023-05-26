import compiler from './compiler/compiler.ts';
import { Environment } from './compiler/environment.ts';
import Parser from './frontend/parser.ts';
import downloadFile from './utils/downloadFile.ts';
import { logInfo, logWarn } from './utils/logger.ts';
import { Config } from './utils/types.ts';

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

let config = {
    outDir: 'out',
    outFile: 'nlang.cpp',
    compileCommand: 'g++',
    compileArgs: ['-std=c++17'],
} as Config;

// Check config file
try {
    await Deno.stat('./nlang.json');

    const data = Deno.readTextFileSync('./nlang.json');
    const loadedConfig = JSON.parse(data);

    config = {
        ...config,
        ...loadedConfig,
    };
} catch(e) {
    const data = JSON.stringify(config, null, 4);
    Deno.writeFileSync('./nlang.json', new TextEncoder().encode(data));
}

// Read the source file
const source = Deno.readTextFileSync(sourceFile);

const parser = new Parser();
const ast = parser.produceAST(source);

const env = new Environment();

const time = Date.now();
logInfo('Compiling...');
const code = compiler.compile(ast, true, env);

try {
    Deno.mkdirSync(config.outDir);
} catch (e) {
    // Ignore
}

Deno.writeFileSync(`${config.outDir}/${config.outFile}`, new TextEncoder().encode(code));

// Check if nlang.h exists file
try {
    await Deno.stat(`${config.outDir}/nlang.h`);
} catch (e) {
    // Download nlang.h
    logWarn('nlang.h not found, downloading...');
    const time = Date.now();
    await downloadFile('https://raw.githubusercontent.com/NichuNaizam/NLang/master/nlang.h', `${config.outDir}/nlang.h`);
    logInfo(`Downloaded nlang.h in ${Date.now() - time}ms!`);
}

// Compile the code
const command = new Deno.Command(config.compileCommand, {
    args: [`${config.outDir}/${config.outFile}`, '-o', output, ...config.compileArgs],
});
const process = command.spawn();
await process.output();

logInfo(`Compiled in ${Date.now() - time}ms!`);
Deno.exit(0);