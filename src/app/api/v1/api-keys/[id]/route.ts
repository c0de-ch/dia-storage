import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { withAuth } from '@/lib/auth/middleware';
import { t } from '@/lib/i18n';
import { eq } from 'drizzle-orm';

export const DELETE = withAuth(async (request: NextRequest, context) => {
  try {
    const { id } = await (context as { params: Promise<{ id: string }> }).params;
    const numericId = Number(id);

    const [existingKey] = await db
      .select()
      .from(schema.apiKeys)
      .where(eq(schema.apiKeys.id, numericId))
      .limit(1);

    if (!existingKey) {
      return NextResponse.json(
        { success: false, message: 'Chiave API non trovata.' },
        { status: 404 }
      );
    }

    await db
      .delete(schema.apiKeys)
      .where(eq(schema.apiKeys.id, numericId));

    return NextResponse.json({
      success: true,
      message: 'Chiave API revocata con successo.',
    });
  } catch (error) {
    console.error('Errore nella revoca della chiave API:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server.' },
      { status: 500 }
    );
  }
});
