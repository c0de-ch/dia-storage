import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { withAuth } from '@/lib/auth/middleware';
import { eq, count } from 'drizzle-orm';

export const GET = withAuth(async (_request: NextRequest) => {
  try {
    const [totalResult] = await db
      .select({ total: count() })
      .from(schema.slides);

    const [incomingResult] = await db
      .select({ total: count() })
      .from(schema.slides)
      .where(eq(schema.slides.status, 'incoming'));

    const [magazinesResult] = await db
      .select({ total: count() })
      .from(schema.magazines);

    return NextResponse.json({
      totalSlides: totalResult.total,
      incomingCount: incomingResult.total,
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
