import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';

/**
 * Compute a SHA-256 hex digest for a file on disk.
 * Streams the file to avoid loading the entire contents into memory.
 */
export async function computeChecksum(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);

    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err) => reject(err));
  });
}

/**
 * Compute a SHA-256 hex digest from a Buffer.
 */
export function computeChecksumFromBuffer(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}
