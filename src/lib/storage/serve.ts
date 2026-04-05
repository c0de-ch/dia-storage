import { stat } from 'node:fs/promises';
import { createReadStream, existsSync } from 'node:fs';
import { extname } from 'node:path';

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

/** Default cache duration: 1 year for immutable image assets. */
const CACHE_MAX_AGE = 365 * 24 * 60 * 60; // seconds

/**
 * Serve a file from disk as an HTTP response with correct headers.
 *
 * Sets Content-Type based on extension, Content-Length from file stats,
 * and a long Cache-Control for immutable image assets.
 *
 * Returns a standard Web API `Response` (compatible with Next.js Route Handlers).
 */
export async function serveFile(filePath: string): Promise<Response> {
  if (!existsSync(filePath)) {
    return new Response('File non trovato', { status: 404 });
  }

  try {
    const fileStat = await stat(filePath);
    const ext = extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';

    // Read the file as a stream and convert to a ReadableStream for the Response API
    const nodeStream = createReadStream(filePath);

    const webStream = new ReadableStream({
      start(controller) {
        nodeStream.on('data', (chunk: Buffer | string) => {
          const buf = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
          controller.enqueue(new Uint8Array(buf));
        });
        nodeStream.on('end', () => {
          controller.close();
        });
        nodeStream.on('error', (err) => {
          controller.error(err);
        });
      },
      cancel() {
        nodeStream.destroy();
      },
    });

    return new Response(webStream, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(fileStat.size),
        'Cache-Control': `public, max-age=${CACHE_MAX_AGE}, immutable`,
        'Last-Modified': fileStat.mtime.toUTCString(),
      },
    });
  } catch {
    return new Response('Errore nella lettura del file', { status: 500 });
  }
}
