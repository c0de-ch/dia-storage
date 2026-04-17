import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { withAuth } from '@/lib/auth/middleware';
import { eq, desc, count } from 'drizzle-orm';

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') ?? '100')));
    const offset = (page - 1) * limit;

    const [totalResult] = await db
      .select({ total: count() })
      .from(schema.slides)
      .where(eq(schema.slides.status, 'incoming'));

    const slides = await db
      .select()
      .from(schema.slides)
      .where(eq(schema.slides.status, 'incoming'))
      .orderBy(desc(schema.slides.createdAt))
      .limit(limit)
      .offset(offset);

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
      total: totalResult.total,
      pagination: {
        page,
        limit,
        total: totalResult.total,
        totalPages: Math.ceil(totalResult.total / limit),
      },
    });
  } catch (error) {
    console.error('Errore nel recupero delle diapositive in arrivo:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server.' },
      { status: 500 }
    );
  }
});
