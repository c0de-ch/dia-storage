import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { withAuth } from '@/lib/auth/middleware';
import { t } from '@/lib/i18n';
import { eq } from 'drizzle-orm';

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const magazines = await db.select().from(schema.magazines);

    return NextResponse.json({
      success: true,
      magazines,
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
