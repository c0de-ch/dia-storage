import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { withAuth } from '@/lib/auth/middleware';
import { and, or, ilike, gte, lte, eq, desc, count, sql } from 'drizzle-orm';

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const magazineId = searchParams.get('magazineId');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const offset = (page - 1) * limit;

    const conditions = [];

    // Exclude deleted slides from search
    conditions.push(sql`${schema.slides.status} != 'deleted'`);

    if (q) {
      conditions.push(
        or(
          ilike(schema.slides.title, `%${q}%`),
          ilike(schema.slides.location, `%${q}%`),
          ilike(schema.slides.notes, `%${q}%`),
          ilike(schema.slides.originalFilename, `%${q}%`)
        )
      );
    }

    if (dateFrom) {
      conditions.push(gte(schema.slides.dateTaken, dateFrom));
    }

    if (dateTo) {
      conditions.push(lte(schema.slides.dateTaken, dateTo));
    }

    if (magazineId) {
      conditions.push(eq(schema.slides.magazineId, Number(magazineId)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

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

    return NextResponse.json({
      success: true,
      slides,
      query: q,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Errore durante la ricerca:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server.' },
      { status: 500 }
    );
  }
});
