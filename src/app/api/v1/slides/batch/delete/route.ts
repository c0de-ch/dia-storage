import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { withAuth } from '@/lib/auth/middleware';
import { eq, and, inArray } from 'drizzle-orm';
import { rm } from 'fs/promises';
import path from 'path';

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { batchId } = body;

    if (!batchId) {
      return NextResponse.json(
        { success: false, message: 'ID batch obbligatorio.' },
        { status: 400 }
      );
    }

    const slides = await db
      .select()
      .from(schema.slides)
      .where(
        and(
          eq(schema.slides.batchId, batchId),
          eq(schema.slides.status, 'incoming')
        )
      );

    if (slides.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Nessuna diapositiva in arrivo trovata per questo batch.' },
        { status: 404 }
      );
    }

    // Delete files from disk
    for (const slide of slides) {
      try {
        if (slide.storagePath) {
          const slideDir = path.dirname(slide.storagePath);
          await rm(slideDir, { recursive: true, force: true });
        }
        if (slide.thumbnailPath) {
          const thumbDir = path.dirname(slide.thumbnailPath);
          await rm(thumbDir, { recursive: true, force: true });
        }
        if (slide.mediumPath) {
          const medDir = path.dirname(slide.mediumPath);
          await rm(medDir, { recursive: true, force: true });
        }
      } catch {
        // File cleanup errors are non-fatal
      }
    }

    // Hard-delete from database
    const slideIds = slides.map((s) => s.id);
    await db
      .delete(schema.slides)
      .where(inArray(schema.slides.id, slideIds));

    return NextResponse.json({
      success: true,
      message: `${slides.length} diapositive eliminate definitivamente.`,
      count: slides.length,
    });
  } catch (error) {
    console.error('Errore nell\'eliminazione batch:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server.' },
      { status: 500 }
    );
  }
});
