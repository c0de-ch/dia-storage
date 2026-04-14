import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { withAuth } from '@/lib/auth/middleware';
import { count, sql } from 'drizzle-orm';

export const GET = withAuth(async (_request: NextRequest) => {
  try {
    const [[slideStats], [magazinesResult]] = await Promise.all([
      db
        .select({
          total: count(),
          incoming: sql<number>`sum(case when ${schema.slides.status} = 'incoming' then 1 else 0 end)::int`,
        })
        .from(schema.slides),
      db
        .select({ total: count() })
        .from(schema.magazines),
    ]);

    return NextResponse.json({
      totalSlides: slideStats.total,
      incomingCount: slideStats.incoming ?? 0,
      magazinesCount: magazinesResult.total,
    });
  } catch (error) {
    console.error('Errore nel recupero delle statistiche:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server.' },
      { status: 500 }
    );
  }
});
