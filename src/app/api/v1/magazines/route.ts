import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { withAuth } from '@/lib/auth/middleware';
import { t } from '@/lib/i18n';
import { count, desc } from 'drizzle-orm';

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50')));
    const offset = (page - 1) * limit;

    const [totalResult] = await db.select({ total: count() }).from(schema.magazines);

    const magazines = await db
      .select()
      .from(schema.magazines)
      .orderBy(desc(schema.magazines.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      success: true,
      magazines,
      pagination: {
        page,
        limit,
        total: totalResult.total,
        totalPages: Math.ceil(totalResult.total / limit),
      },
    });
  } catch (error) {
    console.error('Errore nel recupero dei caricatori:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server.' },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { name, description, slotCount } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Nome del caricatore obbligatorio.' },
        { status: 400 }
      );
    }

    const [magazine] = await db
      .insert(schema.magazines)
      .values({
        name,
        description: description || null,
        slotCount: slotCount || 50,
      })
      .returning();

    return NextResponse.json(
      { success: true, magazine },
      { status: 201 }
    );
  } catch (error) {
    console.error('Errore nella creazione del caricatore:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server.' },
      { status: 500 }
    );
  }
});
