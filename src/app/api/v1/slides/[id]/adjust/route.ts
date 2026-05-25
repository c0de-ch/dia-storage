import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { withAuth } from '@/lib/auth/middleware';
import { parseIdParam } from '@/lib/api/params';
import { eq } from 'drizzle-orm';
import { writeFile, mkdir } from 'fs/promises';
import sharp from 'sharp';
import path from 'path';
import { readImageBuffer } from '@/lib/images/heic';

const UPLOAD_DIR = process.env.STORAGE_PATH || './storage';

// Keep multipliers in a sane range; 1 = unchanged.
function clamp(n: unknown): number {
  const v = typeof n === 'number' && Number.isFinite(n) ? n : 1;
  return Math.min(2, Math.max(0.3, v));
}

/**
 * Bake a brightness/contrast/saturation adjustment into a slide's original and
 * regenerate its cached thumbnail/medium. Lossy and cumulative (no separate
 * edit layer), so the UI previews with CSS first and only calls this on apply.
 */
export const POST = withAuth(async (request: NextRequest, context) => {
  try {
    const { id } = await (context as { params: Promise<{ id: string }> }).params;
    const parsed = parseIdParam(id);
    if (!parsed.ok) return parsed.response;
    const numericId = parsed.id;

    let bodyJson: { brightness?: number; contrast?: number; saturation?: number } = {};
    try {
      bodyJson = await request.json();
    } catch {
      bodyJson = {};
    }
    const brightness = clamp(bodyJson.brightness);
    const contrast = clamp(bodyJson.contrast);
    const saturation = clamp(bodyJson.saturation);

    if (brightness === 1 && contrast === 1 && saturation === 1) {
      return NextResponse.json({ success: true, unchanged: true });
    }

    const [slide] = await db
      .select()
      .from(schema.slides)
      .where(eq(schema.slides.id, numericId))
      .limit(1);

    if (!slide || !slide.storagePath) {
      return NextResponse.json(
        { success: false, message: 'Diapositiva non trovata.' },
        { status: 404 }
      );
    }

    const original = await readImageBuffer(slide.storagePath);
    let pipeline = sharp(original, { failOn: 'none' });
    // Contrast pivots around mid-gray (128); then brightness/saturation.
    if (contrast !== 1) {
      pipeline = pipeline.linear(contrast, -(128 * contrast) + 128);
    }
    if (brightness !== 1 || saturation !== 1) {
      pipeline = pipeline.modulate({ brightness, saturation });
    }
    const adjusted = await pipeline.jpeg({ quality: 95 }).toBuffer();
    await writeFile(slide.storagePath, adjusted);

    const slideKey = path.basename(path.dirname(slide.storagePath));

    const thumbBuf = await sharp(adjusted)
      .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
    const thumbPath =
      slide.thumbnailPath ||
      path.join(UPLOAD_DIR, 'thumbnails', slideKey, 'thumbnail.jpg');
    await mkdir(path.dirname(thumbPath), { recursive: true });
    await writeFile(thumbPath, thumbBuf);

    const medBuf = await sharp(adjusted)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    const mediumPath =
      slide.mediumPath ||
      path.join(UPLOAD_DIR, 'medium', slideKey, 'medium.jpg');
    await mkdir(path.dirname(mediumPath), { recursive: true });
    await writeFile(mediumPath, medBuf);

    await db
      .update(schema.slides)
      .set({ thumbnailPath: thumbPath, mediumPath, updatedAt: new Date() })
      .where(eq(schema.slides.id, numericId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Errore nella correzione colore:', error);
    return NextResponse.json(
      { success: false, message: 'Errore nella correzione.' },
      { status: 500 }
    );
  }
});
