import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { withAdmin } from '@/lib/auth/middleware';
import { parseIdParam } from '@/lib/api/params';
import { parseJsonBody, userPatchSchema } from '@/lib/api/validation';
import { eq } from 'drizzle-orm';

export const PATCH = withAdmin(async (request: NextRequest, context) => {
  try {
    const { id } = await (context as { params: Promise<{ id: string }> }).params;
    const parsed = parseIdParam(id);
    if (!parsed.ok) return parsed.response;
    const numericId = parsed.id;

    const parsedBody = await parseJsonBody(request, userPatchSchema);
    if (!parsedBody.ok) return parsedBody.response;

    const [existingUser] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, numericId))
      .limit(1);

    if (!existingUser) {
      return NextResponse.json(
        { success: false, message: 'Utente non trovato.' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = { ...parsedBody.data, updatedAt: new Date() };

    const [updatedUser] = await db
      .update(schema.users)
      .set(updateData)
      .where(eq(schema.users.id, numericId))
      .returning();

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Errore nell\'aggiornamento dell\'utente:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server.' },
      { status: 500 }
    );
  }
});

export const DELETE = withAdmin(async (request: NextRequest, context) => {
  try {
    const { id } = await (context as { params: Promise<{ id: string }> }).params;
    const parsed = parseIdParam(id);
    if (!parsed.ok) return parsed.response;
    const numericId = parsed.id;

    const [existingUser] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, numericId))
      .limit(1);

    if (!existingUser) {
      return NextResponse.json(
        { success: false, message: 'Utente non trovato.' },
        { status: 404 }
      );
    }

    const [deactivatedUser] = await db
      .update(schema.users)
      .set({ active: false, updatedAt: new Date() })
      .where(eq(schema.users.id, numericId))
      .returning();

    return NextResponse.json({
      success: true,
      message: 'Utente disattivato con successo.',
      user: deactivatedUser,
    });
  } catch (error) {
    console.error('Errore nella disattivazione dell\'utente:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server.' },
      { status: 500 }
    );
  }
});
