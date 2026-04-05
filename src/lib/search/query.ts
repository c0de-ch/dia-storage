import { sql, and, eq, gte, lte, type SQL } from 'drizzle-orm';

import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SearchParams {
  /** Free-text search query */
  q?: string;
  /** Filter: earliest date taken (ISO 8601 or YYYY-MM-DD) */
  dateFrom?: string;
  /** Filter: latest date taken (ISO 8601 or YYYY-MM-DD) */
  dateTo?: string;
  /** Filter: magazine ID */
  magazineId?: number;
  /** Filter: collection ID */
  collectionId?: number;
  /** Page number (1-based, default 1) */
  page?: number;
  /** Results per page (default 24, max 100) */
  limit?: number;
  /** Sort field */
  sortBy?: 'date' | 'created' | 'title' | 'relevance';
  /** Sort direction */
  sortDir?: 'asc' | 'desc';
}

export interface SearchResult {
  slides: Array<typeof schema.slides.$inferSelect>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Query builder
// ---------------------------------------------------------------------------

/**
 * Build and execute a search query against the slides table.
 *
 * - Free-text search uses PostgreSQL `plainto_tsquery` with the `italian` dictionary,
 *   matching against the `search_vector` tsvector column.
 * - Supports date range, magazine, and collection filters.
 * - Supports pagination with offset/limit.
 * - Results are sorted by relevance (when searching) or by date/creation.
 */
export async function buildSearchQuery(
  params: SearchParams,
): Promise<SearchResult> {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 24));
  const offset = (page - 1) * limit;

  // Build WHERE conditions
  const conditions: SQL[] = [];

  // Only show active slides by default
  conditions.push(eq(schema.slides.status, 'active'));

  // Full-text search
  if (params.q && params.q.trim().length > 0) {
    const sanitized = params.q.trim();
    conditions.push(
      sql`${schema.slides.searchVector} @@ plainto_tsquery('italian', ${sanitized})`,
    );
  }

  // Date range on date_taken_precise (date column)
  if (params.dateFrom) {
    conditions.push(
      gte(schema.slides.dateTakenPrecise, params.dateFrom),
    );
  }
  if (params.dateTo) {
    conditions.push(
      lte(schema.slides.dateTakenPrecise, params.dateTo),
    );
  }

  // Magazine filter
  if (params.magazineId != null) {
    conditions.push(eq(schema.slides.magazineId, params.magazineId));
  }

  // Collection filter -- requires a join through the slide_collections table
  if (params.collectionId != null) {
    conditions.push(
      sql`${schema.slides.id} IN (
        SELECT ${schema.slideCollections.slideId}
        FROM ${schema.slideCollections}
        WHERE ${schema.slideCollections.collectionId} = ${params.collectionId}
      )`,
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Determine ORDER BY
  let orderClause: SQL;
  const dir = params.sortDir === 'asc' ? sql`ASC` : sql`DESC`;

  if (params.q && params.q.trim().length > 0 && (!params.sortBy || params.sortBy === 'relevance')) {
    // Sort by full-text relevance
    const sanitized = params.q.trim();
    orderClause = sql`ts_rank(${schema.slides.searchVector}, plainto_tsquery('italian', ${sanitized})) DESC`;
  } else {
    switch (params.sortBy) {
      case 'date':
        orderClause = sql`${schema.slides.dateTakenPrecise} ${dir} NULLS LAST`;
        break;
      case 'title':
        orderClause = sql`${schema.slides.title} ${dir} NULLS LAST`;
        break;
      case 'created':
        orderClause = sql`${schema.slides.createdAt} ${dir}`;
        break;
      default:
        orderClause = sql`${schema.slides.createdAt} ${dir}`;
    }
  }

  // Count total results
  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.slides)
    .where(whereClause);

  const total = countRow?.count ?? 0;

  // Fetch the page of results
  const slides = await db
    .select()
    .from(schema.slides)
    .where(whereClause)
    .orderBy(orderClause)
    .limit(limit)
    .offset(offset);

  return {
    slides,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
