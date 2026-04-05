import { writeFile } from 'node:fs/promises';
import { rename, copyFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { eq, and } from 'drizzle-orm';

import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { isValidJpeg } from './validation';
import { computeChecksumFromBuffer, computeChecksum } from './checksum';
import { extractExif } from './exif-reader';
import { writeExifDate } from './exif-writer';
import { generateThumbnail, generateMedium, getImageDimensions } from './thumbnails';
import {
  getIncomingDir,
  getOriginalPath,
  getThumbnailPath,
  getMediumPath,
  ensureDir,
} from '@/lib/storage/paths';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProcessedSlide {
  id: number;
  checksum: string;
  originalFilename: string;
  storagePath: string;
  thumbnailPath: string;
  width: number | null;
  height: number | null;
  status: string;
}

export interface ArchiveMetadata {
  title?: string;
  dateTaken?: string;
  location?: string;
  notes?: string;
  magazineId?: number;
  slotNumber?: number;
}

// ---------------------------------------------------------------------------
// processIncomingImage
// ---------------------------------------------------------------------------

/**
 * Full incoming image pipeline:
 *
 * 1. Validate JPEG magic bytes
 * 2. Compute SHA-256 checksum and check for duplicates
 * 3. Save original to /data/incoming/{batchId}/
 * 4. Extract EXIF metadata
 * 5. Generate thumbnail (400px)
 * 6. Insert DB record with status='incoming'
 * 7. Return the slide record
 */
export async function processIncomingImage(
  file: Buffer,
  originalFilename: string,
  userId: number,
  batchId: string,
): Promise<ProcessedSlide> {
  // 1. Validate JPEG
  if (!isValidJpeg(file)) {
    throw new Error('Il file non è un JPEG valido (magic bytes non corretti).');
  }

  // 2. Compute checksum and check for duplicates
  const checksum = computeChecksumFromBuffer(file);

  const [existing] = await db
    .select({ id: schema.slides.id })
    .from(schema.slides)
    .where(eq(schema.slides.checksum, checksum))
    .limit(1);

  if (existing) {
    throw new Error(
      `Immagine duplicata: esiste già una diapositiva con lo stesso checksum (ID ${existing.id}).`,
    );
  }

  // 3. Save to incoming directory
  const incomingDir = getIncomingDir(batchId);
  await ensureDir(incomingDir);

  const incomingPath = join(incomingDir, originalFilename);
  await writeFile(incomingPath, file);

  // 4. Extract EXIF
  const exif = await extractExif(incomingPath);

  // Get dimensions (from EXIF or by reading the file)
  let width = exif.width;
  let height = exif.height;
  if (!width || !height) {
    const dims = await getImageDimensions(incomingPath);
    width = dims.width;
    height = dims.height;
  }

  // 5. Generate thumbnail next to the original for now
  const thumbFilename = `thumb_${originalFilename}`;
  const thumbnailPath = join(incomingDir, thumbFilename);
  await generateThumbnail(incomingPath, thumbnailPath);

  // 6. Insert DB record
  const [slide] = await db
    .insert(schema.slides)
    .values({
      batchId,
      uploadedBy: userId,
      originalFilename,
      storagePath: incomingPath,
      thumbnailPath,
      checksum,
      fileSize: file.length,
      width,
      height,
      scanDate: exif.scanDate,
      exifData: exif.raw,
      status: 'incoming',
    })
    .returning();

  // Update batch slide count
  await db
    .update(schema.uploadBatches)
    .set({
      slidesCount: await getSlideCountForBatch(batchId),
    })
    .where(eq(schema.uploadBatches.batchId, batchId));

  // 7. Return
  return {
    id: slide.id,
    checksum: slide.checksum ?? checksum,
    originalFilename: slide.originalFilename ?? originalFilename,
    storagePath: slide.storagePath ?? incomingPath,
    thumbnailPath: slide.thumbnailPath ?? thumbnailPath,
    width: slide.width,
    height: slide.height,
    status: slide.status,
  };
}

// ---------------------------------------------------------------------------
// archiveSlide
// ---------------------------------------------------------------------------

/**
 * Archive a slide from incoming to permanent storage:
 *
 * 1. Generate medium-resolution version (1600px)
 * 2. Move files from incoming to originals/{YYYY}/{MM}/
 * 3. Update DB: status='active', update paths
 * 4. Write EXIF DateTimeOriginal if date provided
 * 5. Create audit log entry
 */
export async function archiveSlide(
  slideId: number,
  metadata: ArchiveMetadata,
): Promise<void> {
  // Fetch the slide
  const [slide] = await db
    .select()
    .from(schema.slides)
    .where(eq(schema.slides.id, slideId))
    .limit(1);

  if (!slide) {
    throw new Error(`Diapositiva non trovata: ID ${slideId}`);
  }

  if (slide.status !== 'incoming') {
    throw new Error(
      `La diapositiva ${slideId} non è nello stato "incoming" (stato attuale: ${slide.status}).`,
    );
  }

  if (!slide.storagePath) {
    throw new Error(`La diapositiva ${slideId} non ha un percorso di archiviazione.`);
  }

  // Determine the archive date for directory structure
  const archiveDate = metadata.dateTaken ? new Date(metadata.dateTaken) : new Date();

  // 1. Generate medium-resolution
  const incomingPath = slide.storagePath;
  const mediumDest = getMediumPath(slideId, archiveDate);
  await ensureDir(dirname(mediumDest));
  await generateMedium(incomingPath, mediumDest);

  // 2. Move original to permanent location
  const originalDest = getOriginalPath(slideId, archiveDate);
  await ensureDir(dirname(originalDest));
  await copyFile(incomingPath, originalDest);

  // Move thumbnail
  const thumbDest = getThumbnailPath(slideId, archiveDate);
  await ensureDir(dirname(thumbDest));
  if (slide.thumbnailPath) {
    await copyFile(slide.thumbnailPath, thumbDest);
  } else {
    // Regenerate if path is missing
    await generateThumbnail(originalDest, thumbDest);
  }

  // 4. Write EXIF if date provided
  if (metadata.dateTaken) {
    await writeExifDate(originalDest, metadata.dateTaken, metadata.title);
  }

  // 3. Update DB
  await db
    .update(schema.slides)
    .set({
      status: 'active',
      storagePath: originalDest,
      thumbnailPath: thumbDest,
      mediumPath: mediumDest,
      title: metadata.title ?? slide.title,
      dateTaken: metadata.dateTaken ?? slide.dateTaken,
      dateTakenPrecise: metadata.dateTaken
        ? metadata.dateTaken.substring(0, 10)
        : undefined,
      location: metadata.location ?? slide.location,
      notes: metadata.notes ?? slide.notes,
      magazineId: metadata.magazineId ?? slide.magazineId,
      slotNumber: metadata.slotNumber ?? slide.slotNumber,
      exifWritten: metadata.dateTaken ? true : slide.exifWritten,
      updatedAt: new Date(),
    })
    .where(eq(schema.slides.id, slideId));

  // 5. Audit log
  await db.insert(schema.auditLog).values({
    userId: slide.uploadedBy,
    action: 'archive_slide',
    entityType: 'slide',
    entityId: slideId,
    details: {
      from: incomingPath,
      to: originalDest,
      metadata,
    },
  });

  // Clean up incoming files (best-effort)
  try {
    const { unlink } = await import('node:fs/promises');
    await unlink(incomingPath);
    if (slide.thumbnailPath && slide.thumbnailPath !== thumbDest) {
      await unlink(slide.thumbnailPath);
    }
  } catch {
    // Incoming cleanup is not critical
  }
}

// ---------------------------------------------------------------------------
// archiveBatch
// ---------------------------------------------------------------------------

/**
 * Archive all slides in a batch at once.
 * Applies the same metadata to every slide in the batch.
 */
export async function archiveBatch(
  batchId: string,
  metadata: ArchiveMetadata,
): Promise<{ archived: number; errors: Array<{ slideId: number; error: string }> }> {
  const batchSlides = await db
    .select({ id: schema.slides.id })
    .from(schema.slides)
    .where(
      and(
        eq(schema.slides.batchId, batchId),
        eq(schema.slides.status, 'incoming'),
      ),
    );

  let archived = 0;
  const errors: Array<{ slideId: number; error: string }> = [];

  for (const slide of batchSlides) {
    try {
      await archiveSlide(slide.id, metadata);
      archived++;
    } catch (err) {
      errors.push({
        slideId: slide.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Update batch status
  if (errors.length === 0) {
    await db
      .update(schema.uploadBatches)
      .set({ status: 'archived' })
      .where(eq(schema.uploadBatches.batchId, batchId));
  }

  return { archived, errors };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getSlideCountForBatch(batchId: string): Promise<number> {
  const rows = await db
    .select({ id: schema.slides.id })
    .from(schema.slides)
    .where(eq(schema.slides.batchId, batchId));
  return rows.length;
}
