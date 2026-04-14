import { execFile } from 'node:child_process';
import { readFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname } from 'node:path';
import { promisify } from 'node:util';
import { randomBytes } from 'node:crypto';

const execFileAsync = promisify(execFile);

const HEIC_EXTENSIONS = new Set(['.heic', '.heif']);

export function isHeicFile(filePath: string): boolean {
  return HEIC_EXTENSIONS.has(extname(filePath).toLowerCase());
}

/**
 * Convert a HEIC/HEIF file to a JPEG buffer via `heif-convert`.
 */
export async function convertHeicToJpegBuffer(filePath: string): Promise<Buffer> {
  const tmpPath = join(tmpdir(), `dia-heic-${randomBytes(8).toString('hex')}.jpg`);
  try {
    await execFileAsync('heif-convert', ['-q', '95', filePath, tmpPath]);
    return await readFile(tmpPath);
  } finally {
    await unlink(tmpPath).catch(() => {});
  }
}

/**
 * Read an image file, converting HEIC/HEIF to JPEG via `heif-convert` if needed.
 * For non-HEIC files, returns the raw file buffer.
 */
export async function readImageBuffer(filePath: string): Promise<Buffer> {
  if (!isHeicFile(filePath)) {
    return readFile(filePath);
  }
  return convertHeicToJpegBuffer(filePath);
}
