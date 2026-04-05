import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth/middleware';
import { t } from '@/lib/i18n';

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const collections = await db.select().from(schema.collections);

    return NextResponse.json({
      success: true,
      collections,
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
