import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
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
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Nessun file caricato.' },
        { status: 400 }
      );
    }

    const batchId = nanoid();
    const results = [];

    for (const file of files) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/tiff', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        results.push({
          filename: file.name,
          success: false,
          message: `Tipo di file non supportato: ${file.type}. Tipi ammessi: JPEG, PNG, TIFF, WebP.`,
        });
        continue;
      }

      const slideId = nanoid();
      const buffer = Buffer.from(await file.arrayBuffer());

      const originalDir = path.join(UPLOAD_DIR, 'originals', slideId);
      const thumbnailDir = path.join(UPLOAD_DIR, 'thumbnails', slideId);
      const mediumDir = path.join(UPLOAD_DIR, 'medium', slideId);

      await mkdir(originalDir, { recursive: true });
      await mkdir(thumbnailDir, { recursive: true });
      await mkdir(mediumDir, { recursive: true });

      const ext = path.extname(file.name) || '.jpg';
      const originalPath = path.join(originalDir, `original${ext}`);
      const thumbnailPath = path.join(thumbnailDir, 'thumbnail.jpg');
      const mediumPath = path.join(mediumDir, 'medium.jpg');

      await writeFile(originalPath, buffer);

      await sharp(buffer)
        .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);

      await sharp(buffer)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toFile(mediumPath);

      const metadata = await sharp(buffer).metadata();

      const [slide] = await db
        .insert(schema.slides)
        .values({
          batchId,
          originalFilename: file.name,
          storagePath: originalPath,
          thumbnailPath,
          mediumPath,
          fileSize: buffer.length,
          width: metadata.width || null,
          height: metadata.height || null,
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
