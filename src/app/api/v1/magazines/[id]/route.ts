import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth/middleware';
import { canEditMagazine, canDeleteMagazine } from '@/lib/auth/permissions';
import { parseIdParam } from '@/lib/api/params';
import { parseJsonBody, magazinePatchSchema } from '@/lib/api/validation';
import { eq, and, ne } from 'drizzle-orm';

export const GET = withAuth(async (request: NextRequest, context) => {
  try {
    const { id } = await (context as { params: Promise<{ id: string }> }).params;
    const parsed = parseIdParam(id);
    if (!parsed.ok) return parsed.response;
    const numericId = parsed.id;

    const [magazine] = await db
      .select()
      .from(schema.magazines)
      .where(eq(schema.magazines.id, numericId))
      .limit(1);

    if (!magazine) {
      return NextResponse.json(
        { success: false, message: 'Caricatore non trovato.' },
        { status: 404 }
      );
    }

    const slides = await db
      .select()
      .from(schema.slides)
      .where(
        and(
          eq(schema.slides.magazineId, numericId),
          ne(schema.slides.status, 'deleted')
        )
      );

    return NextResponse.json({
      success: true,
      magazine: {
        ...magazine,
        slides,
      },
    });
  } catch (error) {
    console.error('Errore nel recupero del caricatore:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server.' },
      { status: 500 }
    );
  }
});

export const PATCH = withAuth(async (request: NextRequest, context) => {
  try {
    const { id } = await (context as { params: Promise<{ id: string }> }).params;
    const parsed = parseIdParam(id);
    if (!parsed.ok) return parsed.response;
    const numericId = parsed.id;

    const parsedBody = await parseJsonBody(request, magazinePatchSchema);
    if (!parsedBody.ok) return parsedBody.response;

    const [existing] = await db
      .select()
      .from(schema.magazines)
      .where(eq(schema.magazines.id, numericId))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Caricatore non trovato.' },
        { status: 404 }
      );
    }

    const user = (request as AuthenticatedRequest).user;
    if (!canEditMagazine(user, existing.ownerUserId ?? undefined)) {
      return NextResponse.json(
        { success: false, message: 'Non hai i permessi per modificare questo caricatore.' },
        { status: 403 }
      );
    }

    const updateData: Record<string, unknown> = { ...parsedBody.data, updatedAt: new Date() };

    const [updatedMagazine] = await db
      .update(schema.magazines)
      .set(updateData)
      .where(eq(schema.magazines.id, numericId))
      .returning();

    return NextResponse.json({
      success: true,
      magazine: updatedMagazine,
    });
  } catch (error) {
    console.error('Errore nell\'aggiornamento del caricatore:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server.' },
      { status: 500 }
    );
  }
});

export const DELETE = withAuth(async (request: NextRequest, context) => {
  try {
    const { id } = await (context as { params: Promise<{ id: string }> }).params;
    const parsed = parseIdParam(id);
    if (!parsed.ok) return parsed.response;
    const numericId = parsed.id;

    const [existing] = await db
      .select()
      .from(schema.magazines)
      .where(eq(schema.magazines.id, numericId))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Caricatore non trovato.' },
        { status: 404 }
      );
    }

    const user = (request as AuthenticatedRequest).user;
    if (!canDeleteMagazine(user, existing.ownerUserId ?? undefined)) {
      return NextResponse.json(
        { success: false, message: 'Non hai i permessi per eliminare questo caricatore.' },
        { status: 403 }
      );
    }

    await db
      .delete(schema.magazines)
      .where(eq(schema.magazines.id, numericId));

    return NextResponse.json({
      success: true,
      message: 'Caricatore eliminato con successo.',
    });
  } catch (error) {
    console.error('Errore nell\'eliminazione del caricatore:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server.' },
      { status: 500 }
    );
  }
});
