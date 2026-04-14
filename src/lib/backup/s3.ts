import {
  S3Client,
  HeadBucketCommand,
  type S3ClientConfig,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { basename } from 'node:path';
import { eq, and, inArray } from 'drizzle-orm';

import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { getConfig } from '@/lib/config/loader';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface S3Config {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle?: boolean;
}

// ---------------------------------------------------------------------------
// Client factory
// ---------------------------------------------------------------------------

/**
 * Create an S3Client from explicit config.
 */
export function createS3Client(config: S3Config): S3Client {
  const clientConfig: S3ClientConfig = {
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: config.forcePathStyle ?? true,
  };

  return new S3Client(clientConfig);
}

/**
 * Resolve the S3 config from the app configuration.
 * Looks for a backup destination of type "s3" in the backup.destinations array.
 */
function getS3ConfigFromApp(): S3Config | null {
  const config = getConfig();
  const dest = config.backup.destinations.find((d) => d.type === 's3');
  if (
    !dest ||
    !dest.endpoint ||
    !dest.bucket ||
    !dest.accessKeyId ||
    !dest.secretAccessKey
  ) {
    return null;
  }

  return {
    endpoint: dest.endpoint,
    region: dest.region ?? 'us-east-1',
    bucket: dest.bucket,
    accessKeyId: dest.accessKeyId,
    secretAccessKey: dest.secretAccessKey,
  };
}

// ---------------------------------------------------------------------------
// Connection test
// ---------------------------------------------------------------------------

/**
 * Test the S3 connection by performing a HeadBucket request.
 * Returns true if the bucket is accessible, throws otherwise.
 */
export async function testS3Connection(config: S3Config): Promise<boolean> {
  const client = createS3Client(config);

  await client.send(
    new HeadBucketCommand({ Bucket: config.bucket }),
  );

  return true;
}

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

/**
 * Upload a local file to S3 using multipart upload for large files.
 *
 * @param filePath - Absolute path to the local file
 * @param key      - S3 object key (e.g. "originals/2024/06/slide_42.jpg")
 * @param config   - Optional S3 config; defaults to the app configuration
 */
export async function uploadToS3(
  filePath: string,
  key: string,
  config?: S3Config,
): Promise<void> {
  const s3Config = config ?? getS3ConfigFromApp();
  if (!s3Config) {
    throw new Error(
      'Configurazione S3 non trovata. Configurare un backup destination di tipo "s3".',
    );
  }

  const client = createS3Client(s3Config);
  const fileStat = await stat(filePath);
  const stream = createReadStream(filePath);

  const upload = new Upload({
    client,
    params: {
      Bucket: s3Config.bucket,
      Key: key,
      Body: stream,
      ContentType: 'image/jpeg',
      ContentLength: fileStat.size,
    },
    // 10 MB part size for multipart
    partSize: 10 * 1024 * 1024,
    queueSize: 4,
  });

  await upload.done();
}

// ---------------------------------------------------------------------------
// Incremental backup
// ---------------------------------------------------------------------------

/**
 * Backup all slides that haven't been backed up to S3 yet.
 * Updates each slide's `backedUp` flag and `backedUpAt` timestamp on success.
 *
 * Returns a summary with counts and any errors encountered.
 */
export async function runIncrementalBackup(): Promise<{
  uploaded: number;
  errors: Array<{ slideId: number; error: string }>;
}> {
  const s3Config = getS3ConfigFromApp();
  if (!s3Config) {
    throw new Error('Configurazione S3 non disponibile.');
  }

  // Fetch all active slides not yet backed up
  const pending = await db
    .select()
    .from(schema.slides)
    .where(
      and(
        eq(schema.slides.status, 'active'),
        eq(schema.slides.backedUp, false),
      ),
    );

  let uploaded = 0;
  const errors: Array<{ slideId: number; error: string }> = [];

  // Record backup run in history
  const [historyRow] = await db
    .insert(schema.backupHistory)
    .values({
      type: 'incremental',
      destination: 's3',
      slidesCount: pending.length,
      status: 'in_progress',
    })
    .returning();

  let totalBytes = 0;
  const backedUpIds: number[] = [];

  for (const slide of pending) {
    if (!slide.storagePath) continue;

    try {
      const key = slide.storagePath.replace(/^\/data\//, '');
      const fileStat = await stat(slide.storagePath);

      await uploadToS3(slide.storagePath, key, s3Config);

      backedUpIds.push(slide.id);
      totalBytes += fileStat.size;
      uploaded++;
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

  // Update history record
  await db
    .update(schema.backupHistory)
    .set({
      status: errors.length === 0 ? 'completed' : 'completed_with_errors',
      totalBytes,
      slidesCount: uploaded,
      completedAt: new Date(),
      error:
        errors.length > 0
          ? JSON.stringify(errors.slice(0, 10))
          : null,
    })
    .where(eq(schema.backupHistory.id, historyRow.id));

  return { uploaded, errors };
}
