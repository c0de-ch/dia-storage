import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth/middleware';
import { canManageApiKeys } from '@/lib/auth/permissions';
import { parseIdParam } from '@/lib/api/params';
import { eq } from 'drizzle-orm';

export const DELETE = withAuth(async (request: NextRequest, context) => {
  try {
    const { id } = await (context as { params: Promise<{ id: string }> }).params;
    const parsed = parseIdParam(id);
    if (!parsed.ok) return parsed.response;
    const numericId = parsed.id;

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

    const user = (request as AuthenticatedRequest).user;
    if (!canManageApiKeys(user, existingKey.userId)) {
      return NextResponse.json(
        { success: false, message: 'Non hai i permessi per revocare questa chiave API.' },
        { status: 403 }
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
