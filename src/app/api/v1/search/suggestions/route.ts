import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth/middleware';
import { slideVisibilityCondition } from '@/lib/auth/visibility';
import { and, ne, isNotNull, desc, count, sql } from 'drizzle-orm';

/**
 * Search suggestions derived from the archive itself, so every chip is
 * guaranteed to match at least the slides it was derived from:
 * - locations: the most frequent non-empty `location` values
 * - years: 4-digit years extracted from the free-text `dateTaken` field
 *   (applied as a plain `q` search, which matches dateTaken via ilike)
 */
export const GET = withAuth(async (request) => {
  try {
    const yearExpr = sql<string>`substring(${schema.slides.dateTaken} from '((19|20)[0-9]{2})')`;
    // Scope suggestions to the requesting user's own slides (admins/editors: all).
    const visibility = slideVisibilityCondition((request as AuthenticatedRequest).user);

    const [locationRows, yearRows] = await Promise.all([
      db
        .select({ location: schema.slides.location, total: count() })
        .from(schema.slides)
        .where(
          and(
            ne(schema.slides.status, 'deleted'),
            isNotNull(schema.slides.location),
            ne(schema.slides.location, ''),
            ...(visibility ? [visibility] : [])
          )
        )
        .groupBy(schema.slides.location)
        .orderBy(desc(count()))
        .limit(6),
      db
        .select({ year: yearExpr, total: count() })
        .from(schema.slides)
        .where(
          and(
            ne(schema.slides.status, 'deleted'),
            isNotNull(schema.slides.dateTaken),
            ...(visibility ? [visibility] : [])
          )
        )
        .groupBy(yearExpr)
        .having(sql`${yearExpr} IS NOT NULL`)
        .orderBy(desc(count()), desc(yearExpr))
        .limit(5),
    ]);

    return NextResponse.json({
      success: true,
      locations: locationRows.map((r) => r.location),
      years: yearRows.map((r) => r.year),
    });
  } catch (error) {
    console.error('Errore nel caricamento dei suggerimenti:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server.' },
      { status: 500 }
    );
  }
});
