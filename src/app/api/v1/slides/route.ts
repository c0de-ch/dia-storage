import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { withAuth } from '@/lib/auth/middleware';
import { eq, and, desc, asc, count, ilike, gte, lte, or, ne } from 'drizzle-orm';

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const magazineId = searchParams.get('magazineId');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const offset = (page - 1) * limit;

    const location = searchParams.get('location');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const q = searchParams.get('q');

    const conditions = [];
    if (status) {
      conditions.push(eq(schema.slides.status, status));
    } else {
      // Hide soft-deleted rows unless caller explicitly asks for them.
      conditions.push(ne(schema.slides.status, 'deleted'));
    }
    if (magazineId) {
      conditions.push(eq(schema.slides.magazineId, Number(magazineId)));
    }
    if (location) {
      conditions.push(ilike(schema.slides.location, `%${location}%`));
    }
    if (dateFrom) {
      conditions.push(gte(schema.slides.dateTakenPrecise, dateFrom));
    }
    if (dateTo) {
      conditions.push(lte(schema.slides.dateTakenPrecise, dateTo));
    }
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

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db
      .select({ total: count() })
      .from(schema.slides)
      .where(whereClause);

    const total = totalResult?.total ?? 0;

    const orderFn = sortOrder === 'asc' ? asc : desc;
    const orderExpr = sortBy === 'title' ? orderFn(schema.slides.title)
      : sortBy === 'dateTakenPrecise' ? orderFn(schema.slides.dateTakenPrecise)
      : orderFn(schema.slides.createdAt);

    const slides = await db
      .select()
      .from(schema.slides)
      .where(whereClause)
      .orderBy(orderExpr)
      .limit(limit)
      .offset(offset);

    const slidesWithUrls = slides.map((slide) => ({
      ...slide,
      thumbnailUrl: slide.storagePath ? `/api/v1/slides/${slide.id}/thumbnail` : null,
      mediumUrl: slide.storagePath ? `/api/v1/slides/${slide.id}/medium` : null,
    }));

    return NextResponse.json({
      success: true,
      slides: slidesWithUrls,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Errore nel recupero delle diapositive:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server.' },
      { status: 500 }
    );
  }
});
