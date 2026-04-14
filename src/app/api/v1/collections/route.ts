import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth/middleware';
import { t } from '@/lib/i18n';
import { count, desc } from 'drizzle-orm';

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50')));
    const offset = (page - 1) * limit;

    const [totalResult] = await db.select({ total: count() }).from(schema.collections);

    const collections = await db
      .select()
      .from(schema.collections)
      .orderBy(desc(schema.collections.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      success: true,
      collections,
      pagination: {
        page,
        limit,
        total: totalResult.total,
        totalPages: Math.ceil(totalResult.total / limit),
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
