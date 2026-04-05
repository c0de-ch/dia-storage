import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { t } from '@/lib/i18n';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;

    if (sessionToken) {
      await db
        .delete(schema.userSessions)
        .where(eq(schema.userSessions.token, sessionToken));

      cookieStore.delete('session');
    }

    return NextResponse.json({
      success: true,
      message: 'Disconnessione avvenuta con successo.',
    });
  } catch (error) {
    console.error('Errore durante il logout:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server.' },
      { status: 500 }
    );
  }
}
