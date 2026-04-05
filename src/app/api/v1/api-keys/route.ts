import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { withAuth, withAdmin, AuthenticatedRequest } from '@/lib/auth/middleware';
import { t } from '@/lib/i18n';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export const GET = withAdmin(async (request: NextRequest) => {
  try {
    const apiKeysList = await db
      .select({
        id: schema.apiKeys.id,
        name: schema.apiKeys.name,
        userId: schema.apiKeys.userId,
        createdAt: schema.apiKeys.createdAt,
        lastUsedAt: schema.apiKeys.lastUsedAt,
      })
      .from(schema.apiKeys);

    return NextResponse.json({
      success: true,
      apiKeys: apiKeysList,
    });
  } catch (error) {
    console.error('Errore nel recupero delle chiavi API:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server.' },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Nome della chiave API obbligatorio.' },
        { status: 400 }
      );
    }

    const rawKey = `dia_${crypto.randomBytes(32).toString('hex')}`;
    const hashedKey = crypto.createHash('sha256').update(rawKey).digest('hex');

    const [apiKey] = await db
      .insert(schema.apiKeys)
      .values({
        name,
        key: hashedKey,
        userId: (request as AuthenticatedRequest).user.id,
      })
      .returning({
        id: schema.apiKeys.id,
        name: schema.apiKeys.name,
        userId: schema.apiKeys.userId,
        createdAt: schema.apiKeys.createdAt,
      });

    return NextResponse.json(
      {
        success: true,
        apiKey: {
          ...apiKey,
          key: rawKey, // Only returned once at creation
        },
        message: 'Chiave API creata. Conservala in modo sicuro, non sarà più visibile.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Errore nella creazione della chiave API:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server.' },
      { status: 500 }
    );
  }
});
