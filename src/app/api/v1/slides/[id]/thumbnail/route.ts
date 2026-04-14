import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { withAuth } from '@/lib/auth/middleware';
import { eq } from 'drizzle-orm';
import { readFile, writeFile, mkdir, access } from 'fs/promises';
import sharp from 'sharp';
import path from 'path';
import { readImageBuffer } from '@/lib/images/heic';

const UPLOAD_DIR = process.env.STORAGE_PATH || './storage';

export const GET = withAuth(async (request: NextRequest, context) => {
  try {
    const { id } = await (context as { params: Promise<{ id: string }> }).params;
    const numericId = Number(id);

    const [slide] = await db
      .select()
      .from(schema.slides)
      .where(eq(schema.slides.id, numericId))
      .limit(1);

    if (!slide) {
      return NextResponse.json(
        { success: false, message: 'Diapositiva non trovata.' },
        { status: 404 }
      );
    }

    // If thumbnail exists on disk, serve it
    if (slide.thumbnailPath) {
      try {
        await access(slide.thumbnailPath);
        const fileBuffer = await readFile(slide.thumbnailPath);
        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': 'image/jpeg',
            'Content-Disposition': 'inline; filename="thumbnail.jpg"',
            'Content-Length': fileBuffer.length.toString(),
            'Cache-Control': 'public, max-age=604800',
          },
        });
      } catch {
        // File missing on disk, fall through to regenerate
      }
    }

    // Generate thumbnail on-demand from original
    if (!slide.storagePath) {
      return NextResponse.json(
        { success: false, message: 'Miniatura non disponibile.' },
        { status: 404 }
      );
    }

    try {
      const originalBuffer = await readImageBuffer(slide.storagePath);
      const thumbnailBuffer = await sharp(originalBuffer)
        .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();

      // Save for future requests
      const slideId = path.basename(path.dirname(slide.storagePath));
      const thumbnailDir = path.join(UPLOAD_DIR, 'thumbnails', slideId);
      const thumbnailPath = path.join(thumbnailDir, 'thumbnail.jpg');
      await mkdir(thumbnailDir, { recursive: true });
      await writeFile(thumbnailPath, thumbnailBuffer);

      // Update DB
      await db
        .update(schema.slides)
        .set({ thumbnailPath })
        .where(eq(schema.slides.id, numericId));

      return new NextResponse(new Uint8Array(thumbnailBuffer), {
        headers: {
          'Content-Type': 'image/jpeg',
          'Content-Disposition': 'inline; filename="thumbnail.jpg"',
          'Content-Length': thumbnailBuffer.length.toString(),
          'Cache-Control': 'public, max-age=604800',
        },
      });
    } catch (err) {
      console.error('Errore nella generazione della miniatura:', err);
      return NextResponse.json(
        { success: false, message: 'Miniatura non disponibile per questo formato.' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Errore nel recupero della miniatura:', error);
    return NextResponse.json(
      { success: false, message: 'Errore nel recupero della miniatura.' },
      { status: 500 }
    );
  }
});
