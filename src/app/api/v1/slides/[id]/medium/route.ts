import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { withAuth } from '@/lib/auth/middleware';
import { parseIdParam } from '@/lib/api/params';
import { eq } from 'drizzle-orm';
import { readFile, writeFile, mkdir, access } from 'fs/promises';
import sharp from 'sharp';
import path from 'path';
import { readImageBuffer } from '@/lib/images/heic';

const UPLOAD_DIR = process.env.STORAGE_PATH || './storage';

export const GET = withAuth(async (request: NextRequest, context) => {
  try {
    const { id } = await (context as { params: Promise<{ id: string }> }).params;
    const parsed = parseIdParam(id);
    if (!parsed.ok) return parsed.response;
    const numericId = parsed.id;

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

    // If medium exists on disk, serve it
    if (slide.mediumPath) {
      try {
        await access(slide.mediumPath);
        const fileBuffer = await readFile(slide.mediumPath);
        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': 'image/jpeg',
            'Content-Disposition': 'inline; filename="medium.jpg"',
            'Content-Length': fileBuffer.length.toString(),
            'Cache-Control': 'public, max-age=604800',
          },
        });
      } catch {
        // File missing on disk, fall through to regenerate
      }
    }

    // Generate medium on-demand from original
    if (!slide.storagePath) {
      return NextResponse.json(
        { success: false, message: 'File a media risoluzione non disponibile.' },
        { status: 404 }
      );
    }

    try {
      const originalBuffer = await readImageBuffer(slide.storagePath);
      const mediumBuffer = await sharp(originalBuffer)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();

      // Save for future requests
      const slideId = path.basename(path.dirname(slide.storagePath));
      const mediumDir = path.join(UPLOAD_DIR, 'medium', slideId);
      const mediumPath = path.join(mediumDir, 'medium.jpg');
      await mkdir(mediumDir, { recursive: true });
      await writeFile(mediumPath, mediumBuffer);

      // Update DB
      await db
        .update(schema.slides)
        .set({ mediumPath })
        .where(eq(schema.slides.id, numericId));

      return new NextResponse(new Uint8Array(mediumBuffer), {
        headers: {
          'Content-Type': 'image/jpeg',
          'Content-Disposition': 'inline; filename="medium.jpg"',
          'Content-Length': mediumBuffer.length.toString(),
          'Cache-Control': 'public, max-age=604800',
        },
      });
    } catch (err) {
      console.error('Errore nella generazione del file a media risoluzione:', err);
      return NextResponse.json(
        { success: false, message: 'File a media risoluzione non disponibile per questo formato.' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Errore nel recupero del file a media risoluzione:', error);
    return NextResponse.json(
      { success: false, message: 'Errore nel recupero del file a media risoluzione.' },
      { status: 500 }
    );
  }
});
