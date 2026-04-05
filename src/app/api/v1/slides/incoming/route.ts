import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { withAuth } from '@/lib/auth/middleware';
import { t } from '@/lib/i18n';
import { eq, desc, sql } from 'drizzle-orm';

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const slides = await db
      .select()
      .from(schema.slides)
      .where(eq(schema.slides.status, 'incoming'))
      .orderBy(desc(schema.slides.createdAt));

    const batches: Record<string, typeof slides> = {};
    for (const slide of slides) {
      const batchId = slide.batchId || 'senza-batch';
      if (!batches[batchId]) {
        batches[batchId] = [];
      }
      batches[batchId].push(slide);
    }

    const groupedBatches = Object.entries(batches).map(([batchId, batchSlides]) => ({
      batchId,
      count: batchSlides.length,
      slides: batchSlides,
      createdAt: batchSlides[0]?.createdAt,
    }));

    return NextResponse.json({
      success: true,
      batches: groupedBatches,
      total: slides.length,
    });
  } catch (error) {
    console.error('Errore nel recupero delle diapositive in arrivo:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server.' },
      { status: 500 }
    );
  }
});
