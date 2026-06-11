import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth/middleware';
import { slideVisibilityCondition } from '@/lib/auth/visibility';
import { canViewAllSlides } from '@/lib/auth/permissions';
import { count, eq, sql } from 'drizzle-orm';

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const user = (request as AuthenticatedRequest).user;
    // Scope counts to the user's own data; admins/editors see global totals.
    const slideScope = slideVisibilityCondition(user);
    const seeAll = canViewAllSlides(user);

    const [[slideStats], [magazinesResult]] = await Promise.all([
      db
        .select({
          total: count(),
          incoming: sql<number>`sum(case when ${schema.slides.status} = 'incoming' then 1 else 0 end)::int`,
        })
        .from(schema.slides)
        .where(slideScope),
      db
        .select({ total: count() })
        .from(schema.magazines)
        .where(seeAll ? undefined : eq(schema.magazines.ownerUserId, user.id)),
    ]);

    return NextResponse.json({
      totalSlides: slideStats?.total ?? 0,
      incomingCount: slideStats?.incoming ?? 0,
      magazinesCount: magazinesResult?.total ?? 0,
    });
  } catch (error) {
    console.error('Errore nel recupero delle statistiche:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server.' },
      { status: 500 }
    );
  }
});
