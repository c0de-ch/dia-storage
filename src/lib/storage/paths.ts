import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { getConfig } from '@/lib/config/loader';

/**
 * Return the configured storage base path (default: /data).
 */
export function getStorageBasePath(): string {
  return getConfig().storage.basePath;
}

/**
 * Directory for incoming (not-yet-archived) batch uploads.
 * Structure: {basePath}/incoming/{batchId}/
 */
export function getIncomingDir(batchId: string): string {
  return join(getStorageBasePath(), 'incoming', batchId);
}

/**
 * Path to an incoming file within its batch directory.
 */
export function getIncomingFilePath(batchId: string, filename: string): string {
  return join(getIncomingDir(batchId), filename);
}

/**
 * Path to an original (archived) slide image.
 * Structure: {basePath}/originals/{YYYY}/{MM}/slide_{id}.jpg
 */
export function getOriginalPath(slideId: number, date?: Date): string {
  const { year, month } = getDateParts(date);
  return join(getStorageBasePath(), 'originals', year, month, `slide_${slideId}.jpg`);
}

/**
 * Path to a thumbnail image.
 * Structure: {basePath}/thumbnails/{YYYY}/{MM}/slide_{id}.jpg
 */
export function getThumbnailPath(slideId: number, date?: Date): string {
  const { year, month } = getDateParts(date);
  return join(getStorageBasePath(), 'thumbnails', year, month, `slide_${slideId}.jpg`);
}

/**
 * Path to a medium-resolution image.
 * Structure: {basePath}/medium/{YYYY}/{MM}/slide_{id}.jpg
 */
export function getMediumPath(slideId: number, date?: Date): string {
  const { year, month } = getDateParts(date);
  return join(getStorageBasePath(), 'medium', year, month, `slide_${slideId}.jpg`);
}

/**
 * Ensure a directory exists, creating it (and parents) if necessary.
 * Equivalent to `mkdir -p`.
 */
export async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDateParts(date?: Date): { year: string; month: string } {
  const d = date ?? new Date();
  const year = String(d.getFullYear());
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return { year, month };
}
