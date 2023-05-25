import { ensureFile } from 'https://deno.land/std/fs/ensure_file.ts';
import { logError } from './logger.ts';

export default async function downloadFile(src: string, dest: string) {
    if (!(src.startsWith('http://') || src.startsWith('https://'))) {
        throw new TypeError('URL must start with be http:// or https://');
    }
    const resp = await fetch(src);
    if (!resp.ok) {
        logError('Failed to download nlang.h, response not ok');
    } else if (!resp.body) {
        logError('Failed to download nlang.h, no body');
    } else if (resp.status === 404) {
        logError('Failed to download nlang.h, ERROR 404');
    }

    await ensureFile(dest);
    const file = await Deno.open(dest, { truncate: true, write: true });
    resp.body.pipeTo(file.writable);
}