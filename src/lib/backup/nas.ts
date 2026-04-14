import { access, copyFile, stat, constants } from 'node:fs/promises';
import { join, dirname, relative } from 'node:path';
import { eq, and, inArray } from 'drizzle-orm';

import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { getConfig } from '@/lib/config/loader';
import { ensureDir, getStorageBasePath } from '@/lib/storage/paths';

// ---------------------------------------------------------------------------
// Connection test
// ---------------------------------------------------------------------------

/**
 * Verify that a NAS mount point exists and is writable.
 *
 * Checks:
 * - The path exists
 * - The path is readable and writable
 * - A small test file can be created and removed
 */
export async function testNasConnection(mountPath: string): Promise<boolean> {
  // Check path exists and is writable
  await access(mountPath, constants.R_OK | constants.W_OK);

  // Try to write and remove a probe file
  const { writeFile, unlink } = await import('node:fs/promises');
  const probePath = join(mountPath, `.dia_probe_${Date.now()}`);

  try {
    await writeFile(probePath, 'probe');
    await unlink(probePath);
  } catch (err) {
    throw new Error(
      `Il mount NAS "${mountPath}" non è scrivibile: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  return true;
}

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------

/**
 * Copy a single file to the NAS destination, preserving the relative directory
 * structure.
 *
 * @param filePath  - Absolute source file path
 * @param destPath  - Absolute destination file path on the NAS
 */
export async function copyToNas(
  filePath: string,
  destPath: string,
): Promise<void> {
  await ensureDir(dirname(destPath));
  await copyFile(filePath, destPath);
}

// ---------------------------------------------------------------------------
// Resolve NAS config
// ---------------------------------------------------------------------------

interface NasConfig {
  mountPath: string;
  subdir: string;
}

function getNasConfig(): NasConfig | null {
  const config = getConfig();

  // Look for a local/smb backup destination or the legacy nas field
  const dest = config.backup.destinations.find(
    (d) => d.type === 'local' || d.type === 'smb',
  );

  if (dest?.path) {
    return {
      mountPath: dest.path,
      subdir: '',
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Incremental NAS backup
// ---------------------------------------------------------------------------

/**
 * Copy all un-backed-up active slides to the NAS mount.
 *
 * The directory structure on the NAS mirrors the local originals tree:
 *   {nasMountPath}/originals/2024/06/slide_42.jpg
 *
 * Each slide is marked as `backedUp = true` after a successful copy.
 */
export async function runNasBackup(): Promise<{
  copied: number;
  errors: Array<{ slideId: number; error: string }>;
}> {
  const nasConfig = getNasConfig();
  if (!nasConfig) {
    throw new Error(
      'Configurazione NAS non trovata. Aggiungere una destinazione di tipo "local" o "smb" nella configurazione backup.',
    );
  }

  await testNasConnection(nasConfig.mountPath);

  // Fetch active slides not yet backed up
  const pending = await db
    .select()
    .from(schema.slides)
    .where(
      and(
        eq(schema.slides.status, 'active'),
        eq(schema.slides.backedUp, false),
      ),
    );

  let copied = 0;
  const errors: Array<{ slideId: number; error: string }> = [];
  const basePath = getStorageBasePath();

  // Record history
  const [historyRow] = await db
    .insert(schema.backupHistory)
    .values({
      type: 'incremental',
      destination: 'nas',
      slidesCount: pending.length,
      status: 'in_progress',
    })
    .returning();

  let totalBytes = 0;
  const backedUpIds: number[] = [];

  for (const slide of pending) {
    if (!slide.storagePath) continue;

    try {
      const relPath = relative(basePath, slide.storagePath);
      const nasDest = join(nasConfig.mountPath, nasConfig.subdir, relPath);

      await copyToNas(slide.storagePath, nasDest);

      const fileStat = await stat(slide.storagePath);
      totalBytes += fileStat.size;

      backedUpIds.push(slide.id);
      copied++;
    } catch (err) {
      errors.push({
        slideId: slide.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Batch-update all successfully backed up slides
  if (backedUpIds.length > 0) {
    await db
      .update(schema.slides)
      .set({
        backedUp: true,
        backedUpAt: new Date(),
        updatedAt: new Date(),
      })
      .where(inArray(schema.slides.id, backedUpIds));
  }

  // Update history
  await db
    .update(schema.backupHistory)
    .set({
      status: errors.length === 0 ? 'completed' : 'completed_with_errors',
      totalBytes,
      slidesCount: copied,
      completedAt: new Date(),
      error:
        errors.length > 0
          ? JSON.stringify(errors.slice(0, 10))
          : null,
    })
    .where(eq(schema.backupHistory.id, historyRow.id));

  return { copied, errors };
}
