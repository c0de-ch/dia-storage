import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth/middleware';
import { canEditSlide, canDeleteSlide } from '@/lib/auth/permissions';
import { parseIdParam } from '@/lib/api/params';
import { parseJsonBody, slidePatchSchema } from '@/lib/api/validation';
import { t } from '@/lib/i18n';
import { eq } from 'drizzle-orm';

export const GET = withAuth(async (request: NextRequest, context) => {
  try {
    const { id } = await (context as { params: Promise<{ id: string }> }).params;
    const parsed = parseIdParam(id);
    if (!parsed.ok) return parsed.response;
    const numericId = parsed.id;

    const [slide] = await db
      .select()
      .from(schema.slides)
      .where(eq(schema.slides.id, numericId))
      .limit(1);

    if (!slide) {
      return NextResponse.json(
        { success: false, message: 'Diapositiva non trovata.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      slide,
    });
  } catch (error) {
    console.error('Errore nel recupero della diapositiva:', error);
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

    const parsedBody = await parseJsonBody(request, slidePatchSchema);
    if (!parsedBody.ok) return parsedBody.response;

    const [existingSlide] = await db
      .select()
      .from(schema.slides)
      .where(eq(schema.slides.id, numericId))
      .limit(1);

    if (!existingSlide) {
      return NextResponse.json(
        { success: false, message: 'Diapositiva non trovata.' },
        { status: 404 }
      );
    }

    const user = (request as AuthenticatedRequest).user;
    if (!canEditSlide(user, existingSlide.uploadedBy ?? undefined)) {
      return NextResponse.json(
        { success: false, message: 'Non hai i permessi per modificare questa diapositiva.' },
        { status: 403 }
      );
    }

    const updateData: Record<string, unknown> = { ...parsedBody.data, updatedAt: new Date() };

    const [updatedSlide] = await db
      .update(schema.slides)
      .set(updateData)
      .where(eq(schema.slides.id, numericId))
      .returning();

    return NextResponse.json({
      success: true,
      slide: updatedSlide,
    });
  } catch (error) {
    console.error('Errore nell\'aggiornamento della diapositiva:', error);
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

    const [existingSlide] = await db
      .select()
      .from(schema.slides)
      .where(eq(schema.slides.id, numericId))
      .limit(1);

    if (!existingSlide) {
      return NextResponse.json(
        { success: false, message: 'Diapositiva non trovata.' },
        { status: 404 }
      );
    }

    const user = (request as AuthenticatedRequest).user;
    if (!canDeleteSlide(user, existingSlide.uploadedBy ?? undefined)) {
      return NextResponse.json(
        { success: false, message: 'Non hai i permessi per eliminare questa diapositiva.' },
        { status: 403 }
      );
    }

    const [deletedSlide] = await db
      .update(schema.slides)
      .set({ status: 'deleted', updatedAt: new Date() })
      .where(eq(schema.slides.id, numericId))
      .returning();

    return NextResponse.json({
      success: true,
      message: 'Diapositiva eliminata con successo.',
      slide: deletedSlide,
    });
  } catch (error) {
    console.error('Errore nell\'eliminazione della diapositiva:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server.' },
      { status: 500 }
    );
  }
});
