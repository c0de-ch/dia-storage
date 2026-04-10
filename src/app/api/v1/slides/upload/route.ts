import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth/middleware';
import { t } from '@/lib/i18n';
import { nanoid } from 'nanoid';
import sharp from 'sharp';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = process.env.STORAGE_PATH || './storage';

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const user = (request as AuthenticatedRequest).user;
    const formData = await request.formData();
    let files = formData.getAll('files') as File[];
    if (files.length === 0) {
      files = formData.getAll('file') as File[];
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Nessun file caricato.' },
        { status: 400 }
      );
    }

    const batchId = nanoid();
    const results = [];

    for (const file of files) {
      const imageExts = ['.jpg', '.jpeg', '.png', '.tiff', '.tif', '.webp', '.gif', '.heic', '.heif', '.bmp', '.avif'];
      const videoExts = ['.mp4', '.mov', '.m4v', '.avi', '.mkv', '.webm'];
      const fileExt = path.extname(file.name).toLowerCase();
      const isImage = imageExts.includes(fileExt);
      const isVideo = videoExts.includes(fileExt);

      if (!isImage && !isVideo) {
        results.push({
          filename: file.name,
          success: false,
          message: `Tipo di file non supportato: ${file.name}`,
        });
        continue;
      }

      const slideId = nanoid();
      const buffer = Buffer.from(await file.arrayBuffer());

      // Compute checksum and check for duplicates
      const checksum = createHash('sha256').update(buffer).digest('hex');
      const [existing] = await db
        .select({ id: schema.slides.id, originalFilename: schema.slides.originalFilename })
        .from(schema.slides)
        .where(eq(schema.slides.checksum, checksum))
        .limit(1);

      if (existing) {
        results.push({
          filename: file.name,
          success: false,
          duplicate: true,
          message: `Immagine gia presente nell'archivio (file originale: ${existing.originalFilename ?? `#${existing.id}`}). Importazione saltata.`,
        });
        continue;
      }

      const originalDir = path.join(UPLOAD_DIR, 'originals', slideId);
      const thumbnailDir = path.join(UPLOAD_DIR, 'thumbnails', slideId);
      const mediumDir = path.join(UPLOAD_DIR, 'medium', slideId);

      await mkdir(originalDir, { recursive: true });

      const ext = path.extname(file.name) || '.jpg';
      const originalPath = path.join(originalDir, `original${ext}`);

      await writeFile(originalPath, buffer);

      let thumbnailPath: string | null = null;
      let mediumPath: string | null = null;
      let width: number | null = null;
      let height: number | null = null;

      if (isImage) {
        try {
          await mkdir(thumbnailDir, { recursive: true });
          await mkdir(mediumDir, { recursive: true });

          thumbnailPath = path.join(thumbnailDir, 'thumbnail.jpg');
          mediumPath = path.join(mediumDir, 'medium.jpg');

          await sharp(buffer)
            .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toFile(thumbnailPath);

          await sharp(buffer)
            .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 85 })
            .toFile(mediumPath);

          const metadata = await sharp(buffer).metadata();
          width = metadata.width || null;
          height = metadata.height || null;
        } catch (imgErr) {
          console.error(`Errore nell'elaborazione immagine ${file.name}:`, imgErr);
          // Store original without thumbnails
          thumbnailPath = null;
          mediumPath = null;
        }
      }

      const [slide] = await db
        .insert(schema.slides)
        .values({
          batchId,
          originalFilename: file.name,
          storagePath: originalPath,
          thumbnailPath,
          mediumPath,
          fileSize: buffer.length,
          width,
          height,
          checksum,
          status: 'incoming',
          uploadedBy: user.id,
        })
        .returning();

      results.push({
        filename: file.name,
        success: true,
        slide,
      });
    }

    return NextResponse.json({
      success: true,
      batchId,
      message: `${results.filter((r) => r.success).length} di ${files.length} file caricati con successo.`,
      results,
    });
  } catch (error) {
    console.error('Errore durante il caricamento dei file:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server.' },
      { status: 500 }
    );
  }
});
