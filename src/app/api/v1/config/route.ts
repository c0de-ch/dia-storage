import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { withAdmin } from '@/lib/auth/middleware';
import { sql } from 'drizzle-orm';

const SENSITIVE_FIELDS = [
  'smtpPassword',
  'whatsappApiKey',
  'whatsappAccessToken',
  's3SecretKey',
  'nasPassword',
  'anthropicApiKey',
  'ollamaApiKey',
  'googleMapsApiKey',
];

function maskSensitiveFields(config: Record<string, unknown>): Record<string, unknown> {
  const masked = { ...config };
  for (const field of SENSITIVE_FIELDS) {
    if (masked[field] && typeof masked[field] === 'string') {
      const value = masked[field] as string;
      masked[field] = value.length > 4
        ? '****' + value.slice(-4)
        : '****';
    }
  }
  return masked;
}

export const GET = withAdmin(async (_request: NextRequest) => {
  try {
    const configs = await db.select().from(schema.settings);

    const configMap: Record<string, unknown> = {};
    for (const row of configs) {
      configMap[row.key] = row.value;
    }

    return NextResponse.json({
      success: true,
      config: maskSensitiveFields(configMap),
    });
  } catch (error) {
    console.error('Errore nel recupero della configurazione:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server.' },
      { status: 500 }
    );
  }
});

export const PUT = withAdmin(async (request: NextRequest) => {
  try {
    const body = await request.json();

    if (!body || typeof body !== 'object' || Object.keys(body).length === 0) {
      return NextResponse.json(
        { success: false, message: 'Dati di configurazione obbligatori.' },
        { status: 400 }
      );
    }

    const entries = Object.entries(body).map(([key, value]) => ({
      key,
      value: String(value),
      updatedAt: new Date(),
    }));

    await db
      .insert(schema.settings)
      .values(entries)
      .onConflictDoUpdate({
        target: schema.settings.key,
        set: {
          value: sql`excluded.value`,
          updatedAt: sql`excluded.updated_at`,
        },
      });

    return NextResponse.json({
      success: true,
      message: 'Configurazione aggiornata con successo.',
    });
  } catch (error) {
    console.error('Errore nell\'aggiornamento della configurazione:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server.' },
      { status: 500 }
    );
  }
});
