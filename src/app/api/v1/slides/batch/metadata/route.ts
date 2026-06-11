import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth/middleware';
import { canEditSlide } from '@/lib/auth/permissions';
import { inArray } from 'drizzle-orm';

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { slideIds, metadata } = body;

    if (!slideIds || !Array.isArray(slideIds) || slideIds.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Lista di ID diapositive obbligatoria.' },
        { status: 400 }
      );
    }

    // Only accept a bounded list of numeric ids.
    if (slideIds.length > 500 || !slideIds.every((v) => Number.isInteger(v))) {
      return NextResponse.json(
        { success: false, message: 'Elenco di ID non valido.' },
        { status: 400 }
      );
    }

    if (!metadata || Object.keys(metadata).length === 0) {
      return NextResponse.json(
        { success: false, message: 'Metadati obbligatori.' },
        { status: 400 }
      );
    }

    const existingSlides = await db
      .select()
      .from(schema.slides)
      .where(inArray(schema.slides.id, slideIds));

    if (existingSlides.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Nessuna diapositiva trovata con gli ID forniti.' },
        { status: 404 }
      );
    }

    // Reject the whole batch unless the user may edit every targeted slide.
    const user = (request as AuthenticatedRequest).user;
    const forbidden = existingSlides.some(
      (s) => !canEditSlide(user, s.uploadedBy ?? undefined)
    );
    if (forbidden) {
      return NextResponse.json(
        { success: false, message: 'Non hai i permessi per modificare una o più diapositive selezionate.' },
        { status: 403 }
      );
    }

    const allowedFields = [
      'title', 'description', 'date', 'location', 'tags',
      'magazineId', 'slideNumber', 'notes', 'status',
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (metadata[field] !== undefined) {
        updateData[field] = metadata[field];
      }
    }
    updateData.updatedAt = new Date();

    await db
      .update(schema.slides)
      .set(updateData)
      .where(inArray(schema.slides.id, slideIds));

    return NextResponse.json({
      success: true,
      message: `Metadati aggiornati per ${existingSlides.length} diapositive.`,
      count: existingSlides.length,
    });
  } catch (error) {
    console.error('Errore nell\'aggiornamento batch dei metadati:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server.' },
      { status: 500 }
    );
  }
});
