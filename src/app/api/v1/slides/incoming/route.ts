import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth/middleware';
import { slideVisibilityCondition } from '@/lib/auth/visibility';
import { and, eq, desc, count } from 'drizzle-orm';

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') ?? '100')));
    const offset = (page - 1) * limit;

    // Scope the incoming queue to the user's own uploads (admins/editors: all).
    const visibility = slideVisibilityCondition((request as AuthenticatedRequest).user);
    const whereClause = visibility
      ? and(eq(schema.slides.status, 'incoming'), visibility)
      : eq(schema.slides.status, 'incoming');

    const [totalResult] = await db
      .select({ total: count() })
      .from(schema.slides)
      .where(whereClause);
    const total = totalResult?.total ?? 0;

    const slides = await db
      .select()
      .from(schema.slides)
      .where(whereClause)
      .orderBy(desc(schema.slides.createdAt))
      .limit(limit)
      .offset(offset);

    const batches = new Map<string, typeof slides>();
    for (const slide of slides) {
      const batchId = slide.batchId || 'senza-batch';
      let bucket = batches.get(batchId);
      if (!bucket) {
        bucket = [];
        batches.set(batchId, bucket);
      }
      bucket.push(slide);
    }

    const groupedBatches = Array.from(batches.entries()).map(([batchId, batchSlides]) => ({
      batchId,
      count: batchSlides.length,
      slides: batchSlides,
      createdAt: batchSlides[0]?.createdAt,
    }));

    return NextResponse.json({
      success: true,
      batches: groupedBatches,
      total,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
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
