import { spawn } from 'node:child_process';
import { mkdir, stat, unlink } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { dirname } from 'node:path';
import os from 'node:os';
import path from 'node:path';

import { uploadToS3, downloadFromS3, getS3ConfigFromApp } from './s3';

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://dia:dia@localhost:5432/dia_storage';

const BACKUP_TMP_DIR = process.env.BACKUP_TMP_DIR ?? path.join(os.tmpdir(), 'dia-backup');

/**
 * Produce a pg_dump custom-format archive at the given local path.
 * Uses DATABASE_URL as the connection string; pg_dump must be on PATH.
 */
export async function dumpDatabaseToFile(destPath: string): Promise<void> {
  await mkdir(dirname(destPath), { recursive: true });

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(
      'pg_dump',
      ['--format=custom', '--no-owner', '--no-privileges', DATABASE_URL],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );

    const out = createWriteStream(destPath);
    proc.stdout.pipe(out);

    let stderr = '';
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`pg_dump uscito con codice ${code}: ${stderr}`));
      }
    });
  });
}

/**
 * Dump the database and upload the archive to S3 under db-backups/.
 * Returns the S3 key on success.
 */
export async function backupDatabaseToS3(): Promise<string> {
  const s3Config = getS3ConfigFromApp();
  if (!s3Config) {
    throw new Error('Configurazione S3 non trovata, impossibile fare il backup del DB.');
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `dia-storage-${ts}.dump`;
  const localPath = path.join(BACKUP_TMP_DIR, filename);
  const s3Key = `db-backups/${filename}`;

  try {
    await dumpDatabaseToFile(localPath);
    await uploadToS3(localPath, s3Key, s3Config);
  } finally {
    await unlink(localPath).catch(() => undefined);
  }

  return s3Key;
}

/**
 * Restore a pg_dump custom-format archive from a local file into the configured
 * database. Uses pg_restore with --clean to drop existing objects first.
 *
 * This is DESTRUCTIVE — the target database will be overwritten.
 */
export async function restoreDatabaseFromFile(srcPath: string): Promise<void> {
  await stat(srcPath); // ensure file exists before spawning pg_restore

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(
      'pg_restore',
      [
        '--clean',
        '--if-exists',
        '--no-owner',
        '--no-privileges',
        '--dbname',
        DATABASE_URL,
        srcPath,
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );

    let stderr = '';
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    proc.on('error', reject);
    proc.on('close', (code) => {
      // pg_restore may exit with 1 when it logs non-fatal warnings (e.g. role
      // already exists). Treat 0 as success; surface stderr on anything else.
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`pg_restore uscito con codice ${code}: ${stderr}`));
      }
    });
  });
}

/**
 * Download a DB backup from S3 and restore it. DESTRUCTIVE.
 */
export async function restoreDatabaseFromS3(s3Key: string): Promise<void> {
  const localPath = path.join(BACKUP_TMP_DIR, path.basename(s3Key));
  await mkdir(dirname(localPath), { recursive: true });

  try {
    await downloadFromS3(s3Key, localPath);
    await restoreDatabaseFromFile(localPath);
  } finally {
    await unlink(localPath).catch(() => undefined);
  }
}
