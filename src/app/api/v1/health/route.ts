import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiKeys, users } from '@/lib/db/schema';
import { sql, eq } from 'drizzle-orm';

const APP_VERSION = process.env.APP_VERSION || '0.1.0';

export async function GET(request: NextRequest) {
  try {
    // Test database connectivity
    await db.execute(sql`SELECT 1`);

    // If an API key is provided, validate it
    const apiKeyHeader = request.headers.get('x-api-key');
    if (apiKeyHeader) {
      const rows = await db
        .select({ id: apiKeys.id })
        .from(apiKeys)
        .innerJoin(users, eq(apiKeys.userId, users.id))
        .where(eq(apiKeys.key, apiKeyHeader))
        .limit(1);

      if (rows.length === 0) {
        return NextResponse.json(
          {
            status: 'error',
            version: APP_VERSION,
            timestamp: new Date().toISOString(),
            message: 'Chiave API non valida.',
          },
          { status: 401 }
        );
      }
    }

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
