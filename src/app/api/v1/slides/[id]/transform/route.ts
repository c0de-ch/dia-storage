import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth/middleware';
import { canEditSlide } from '@/lib/auth/permissions';
import { parseIdParam } from '@/lib/api/params';
import { eq } from 'drizzle-orm';
import { writeFile, mkdir } from 'fs/promises';
import sharp from 'sharp';
import path from 'path';
import { readImageBuffer } from '@/lib/images/heic';
import { MAX_INPUT_PIXELS } from '@/lib/images/limits';

const UPLOAD_DIR = process.env.STORAGE_PATH || './storage';

type Op = 'rotate-cw' | 'rotate-ccw' | 'flip-h' | 'flip-v';
const OPS = new Set<Op>(['rotate-cw', 'rotate-ccw', 'flip-h', 'flip-v']);

/**
 * Apply a lossy in-place transform (90° rotation or mirror) to a slide's
 * original image and regenerate its cached thumbnail/medium so previews update.
 * Re-encodes at high quality; repeated transforms compound JPEG loss.
 */
export const POST = withAuth(async (request: NextRequest, context) => {
  try {
    const { id } = await (context as { params: Promise<{ id: string }> }).params;
    const parsed = parseIdParam(id);
    if (!parsed.ok) return parsed.response;
    const numericId = parsed.id;

    let op: string | undefined;
    try {
      op = (await request.json())?.op;
    } catch {
      op = undefined;
    }
    if (!op || !OPS.has(op as Op)) {
      return NextResponse.json(
        { success: false, message: 'Operazione non valida.' },
        { status: 400 }
      );
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

    const user = (request as AuthenticatedRequest).user;
    if (!canEditSlide(user, slide.uploadedBy ?? undefined)) {
      return NextResponse.json(
        { success: false, message: 'Non hai i permessi per modificare questa diapositiva.' },
        { status: 403 }
      );
    }

    // Apply the transform to the original. No bare .rotate(): we apply an
    // explicit angle and drop EXIF, so the pixels themselves carry the result.
    const original = await readImageBuffer(slide.storagePath);
    let pipeline = sharp(original, { failOn: 'none', limitInputPixels: MAX_INPUT_PIXELS });
    switch (op as Op) {
      case 'rotate-cw':
        pipeline = pipeline.rotate(90);
        break;
      case 'rotate-ccw':
        pipeline = pipeline.rotate(-90);
        break;
      case 'flip-h':
        pipeline = pipeline.flop();
        break;
      case 'flip-v':
        pipeline = pipeline.flip();
        break;
    }
    const transformed = await pipeline.jpeg({ quality: 95 }).toBuffer();
    await writeFile(slide.storagePath, transformed);

    // Regenerate the cached derivatives from the transformed original.
    const slideKey = path.basename(path.dirname(slide.storagePath));

    const thumbBuf = await sharp(transformed)
      .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
    const thumbPath =
      slide.thumbnailPath ||
      path.join(UPLOAD_DIR, 'thumbnails', slideKey, 'thumbnail.jpg');
    await mkdir(path.dirname(thumbPath), { recursive: true });
    await writeFile(thumbPath, thumbBuf);

    const medBuf = await sharp(transformed)
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
    console.error('Errore nella trasformazione immagine:', error);
    return NextResponse.json(
      { success: false, message: 'Errore nella trasformazione.' },
      { status: 500 }
    );
  }
});
