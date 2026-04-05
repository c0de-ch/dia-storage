import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { t } from '@/lib/i18n';
import { sql } from 'drizzle-orm';

const APP_VERSION = process.env.APP_VERSION || '0.1.0';

export async function GET(request: NextRequest) {
  try {
    // Test database connectivity
    await db.execute(sql`SELECT 1`);

    return NextResponse.json({
      status: 'ok',
      version: APP_VERSION,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Errore nel controllo di salute:', error);
    return NextResponse.json(
      {
        status: 'error',
        version: APP_VERSION,
        timestamp: new Date().toISOString(),
        message: 'Servizio non disponibile. Errore di connessione al database.',
      },
      { status: 503 }
    );
  }
}
