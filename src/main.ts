import compiler from './compiler/compiler.ts';
import { Environment } from './compiler/environment.ts';
import Parser from './frontend/parser.ts';
import downloadFile from './utils/downloadFile.ts';
import { logInfo, logWarn } from './utils/logger.ts';
import { Config } from './utils/types.ts';
import { parseArgs } from './utils/utils.ts';

// constants
const IS_COMPILED = Deno.args.includes('--is_compiled_binary');
const VERSION = '0.0.1';

const path = Deno.execPath().split('/');
path.pop();

const PATH_TO_EXEC = IS_COMPILED ? path.join('/') : '.';

// Parse command line arguments
const parsedArgs = parseArgs(Deno.args);

if (parsedArgs.get('h') || parsedArgs.get('help')) {
    console.log(`NLang Compiler v${VERSION}
Usage: nlangc <source file> -o <output file>
Options:
    -h, --help      Show this help message
    -o, --output    Output file name
    -i, --init      Create a nlang.json file
`);
    Deno.exit(0);
}

const sourceFile = parsedArgs.get('sourceFile');
const output = parsedArgs.get('o') || parsedArgs.get('output');

if (!sourceFile) {
    console.log('No source file specified!');
    Deno.exit(1);
}

if (!output) {
    console.log('No output file specified!');
    Deno.exit(1);
}

let config = {
    outDir: '.nlang',
    purgeOutDir: true,
    cppFile: 'nlang.cpp',
    compileCommand: 'g++',
    compileArgs: [
        '${outDir}/${cppFile}',
        '-std=c++17',
        '-I',
        '${nlangDir}',
        '-o',
        '${outBinary}',
    ],
} as Config;

// Check if the bin folder exists
try {
    await Deno.stat(`${PATH_TO_EXEC}/bin`);
} catch (e) {
    await Deno.mkdir(`${PATH_TO_EXEC}/bin`);
}

// Check config file
try {
    await Deno.stat('./nlang.json');

    const data = Deno.readTextFileSync('./nlang.json');
    const loadedConfig = JSON.parse(data);

    config = {
        ...config,
        ...loadedConfig,
    };
} catch (e) {
    if (parsedArgs.get('init') || parsedArgs.get('i')) {
        Deno.writeTextFileSync('./nlang.json', JSON.stringify(config, null, 4));
        Deno.exit(0);
    }
}

config.compileArgs = config.compileArgs.map((arg: string) => {
    arg = arg.replace('${nlangDir}', `${PATH_TO_EXEC}/bin`);
    arg = arg.replace('${cppFile}', config.cppFile);
    arg = arg.replace('${outBinary}', output);
    arg = arg.replace('${outDir}', config.outDir);
    return arg;
});

// Read the source file
logInfo(`Reading ${sourceFile}`);
const source = Deno.readTextFileSync(sourceFile);

logInfo('Parsing source code...');
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

Deno.writeFileSync(
    `${config.outDir}/${config.cppFile}`,
    new TextEncoder().encode(code)
);

// Check if nlang.h exists file
try {
    await Deno.stat(`${PATH_TO_EXEC}/bin/nlang.h`);
} catch (e) {
    // Download nlang.h
    logWarn('nlang.h not found, downloading...');
    const time = Date.now();
    await downloadFile(
        'https://raw.githubusercontent.com/NichuNaizam/NLang/master/nlang.h',
        `${PATH_TO_EXEC}/bin/nlang.h`
    );
    logInfo(`Downloaded nlang.h in ${Date.now() - time}ms!`);
}

// Compile the code
const command = new Deno.Command(config.compileCommand, {
    args: config.compileArgs,
});
const process = command.spawn();
await process.output();

logInfo(`Compiled in ${Date.now() - time}ms!`);
Deno.exit(0);
