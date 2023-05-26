import {
    red,
    green,
    yellow,
} from 'https://deno.land/std@0.187.0/fmt/colors.ts';

export function logInfo(...args: string[]) {
    console.log(
        '[' + green('INFO') + ' - ' + new Date().toTimeString() + ']: ',
        ...args
    );
}

export function logWarn(...args: string[]) {
    console.log(
        '[' + yellow('WARN') + ' - ' + new Date().toTimeString() + ']: ',
        ...args
    );
}

export function logError(...args: string[]) {
    console.error(
        '[' + red('ERROR') + ' - ' + new Date().toTimeString() + ']: ',
        ...args
    );
}
