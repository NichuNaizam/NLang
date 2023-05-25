import { red, green, yellow } from 'https://deno.land/std@0.187.0/fmt/colors.ts';

export function logInfo(...args: string[]) {
    console.log('[' + green('INFO') + ']: ', ...args);
}

export function logWarn(...args: string[]) {
    console.warn('[' + yellow('WARN') + ']: ', ...args);
}

export function logError(...args: string[]) {
    console.error('[' + red('ERROR') + ']: ', ...args);
}