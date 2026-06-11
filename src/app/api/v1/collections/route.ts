import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth/middleware';
import { canViewAllSlides } from '@/lib/auth/permissions';
import { collectionIdsSharedWith } from '@/lib/auth/sharing';
import { count, desc, eq, or, inArray } from 'drizzle-orm';

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50')));
    const offset = (page - 1) * limit;

    // Albums the user owns (admins/editors: all) PLUS albums shared with them.
    const user = (request as AuthenticatedRequest).user;
    const seeAll = canViewAllSlides(user);
    const sharedIds = seeAll ? [] : await collectionIdsSharedWith(user.id);
    const scope = seeAll
      ? undefined
      : sharedIds.length > 0
        ? or(
            eq(schema.collections.ownerUserId, user.id),
            inArray(schema.collections.id, sharedIds)
          )
        : eq(schema.collections.ownerUserId, user.id);

    const [totalResult] = await db
      .select({ total: count() })
      .from(schema.collections)
      .where(scope);
    const total = totalResult?.total ?? 0;

    const rows = await db
      .select()
      .from(schema.collections)
      .where(scope)
      .orderBy(desc(schema.collections.createdAt))
      .limit(limit)
      .offset(offset);

    // Flag albums that are shown because they were shared with the user.
    const sharedSet = new Set(sharedIds);
    const collections = rows.map((c) => ({
      ...c,
      shared: !seeAll && c.ownerUserId !== user.id && sharedSet.has(c.id),
    }));

    return NextResponse.json({
      success: true,
      collections,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Errore nel recupero delle collezioni:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server.' },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const user = (request as AuthenticatedRequest).user;
    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Nome della collezione obbligatorio.' },
        { status: 400 }
      );
    }

    const [collection] = await db
      .insert(schema.collections)
      .values({
        name,
        description: description || null,
        ownerUserId: user.id,
      })
      .returning();

    return NextResponse.json(
      { success: true, collection },
      { status: 201 }
    );
  } catch (error) {
    console.error('Errore nella creazione della collezione:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server.' },
      { status: 500 }
    );
  }
});
