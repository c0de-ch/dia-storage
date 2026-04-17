import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { withAuth } from '@/lib/auth/middleware';
import { parseIdParam } from '@/lib/api/params';
import { t } from '@/lib/i18n';
import { eq, and, inArray } from 'drizzle-orm';

export const POST = withAuth(async (request: NextRequest, context) => {
  try {
    const { id } = await (context as { params: Promise<{ id: string }> }).params;
    const parsed = parseIdParam(id);
    if (!parsed.ok) return parsed.response;
    const numericId = parsed.id;
    const body = await request.json();
    const { slideIds } = body;

    if (!slideIds || !Array.isArray(slideIds) || slideIds.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Lista di ID diapositive obbligatoria.' },
        { status: 400 }
      );
    }

    const [collection] = await db
      .select()
      .from(schema.collections)
      .where(eq(schema.collections.id, numericId))
      .limit(1);

    if (!collection) {
      return NextResponse.json(
        { success: false, message: 'Collezione non trovata.' },
        { status: 404 }
      );
    }

    const numericSlideIds = slideIds.map(Number);

    // Batch-check which slides actually exist
    const existingSlides = await db
      .select({ id: schema.slides.id })
      .from(schema.slides)
      .where(inArray(schema.slides.id, numericSlideIds));
    const validIds = new Set(existingSlides.map((s) => s.id));

    // Batch-check which associations already exist
    const existingAssocs = await db
      .select({ slideId: schema.slideCollections.slideId })
      .from(schema.slideCollections)
      .where(
        and(
          eq(schema.slideCollections.collectionId, numericId),
          inArray(schema.slideCollections.slideId, numericSlideIds)
        )
      );
    const alreadyLinked = new Set(existingAssocs.map((a) => a.slideId));

    // Filter to only new, valid slides
    const toInsert = numericSlideIds
      .filter((id) => validIds.has(id) && !alreadyLinked.has(id));

    if (toInsert.length > 0) {
      await db.insert(schema.slideCollections).values(
        toInsert.map((slideId) => ({
          collectionId: numericId,
          slideId,
        }))
      );
    }
    const added = toInsert.length;

    return NextResponse.json({
      success: true,
      message: `${added} diapositive aggiunte alla collezione.`,
      added,
    });
  } catch (error) {
    console.error('Errore nell\'aggiunta delle diapositive alla collezione:', error);
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
    const { searchParams } = new URL(request.url);
    const slideId = searchParams.get('slideId');

    if (!slideId) {
      return NextResponse.json(
        { success: false, message: 'ID diapositiva obbligatorio.' },
        { status: 400 }
      );
    }

    const parsedSlide = parseIdParam(slideId);
    if (!parsedSlide.ok) return parsedSlide.response;
    const numericSlideId = parsedSlide.id;

    const [collection] = await db
      .select()
      .from(schema.collections)
      .where(eq(schema.collections.id, numericId))
      .limit(1);

    if (!collection) {
      return NextResponse.json(
        { success: false, message: 'Collezione non trovata.' },
        { status: 404 }
      );
    }

    const [existingAssoc] = await db
      .select()
      .from(schema.slideCollections)
      .where(
        and(
          eq(schema.slideCollections.collectionId, numericId),
          eq(schema.slideCollections.slideId, numericSlideId)
        )
      )
      .limit(1);

    if (!existingAssoc) {
      return NextResponse.json(
        { success: false, message: 'Diapositiva non presente in questa collezione.' },
        { status: 404 }
      );
    }

    await db
      .delete(schema.slideCollections)
      .where(
        and(
          eq(schema.slideCollections.collectionId, numericId),
          eq(schema.slideCollections.slideId, numericSlideId)
        )
      );

    return NextResponse.json({
      success: true,
      message: 'Diapositiva rimossa dalla collezione.',
    });
  } catch (error) {
    console.error('Errore nella rimozione della diapositiva dalla collezione:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server.' },
      { status: 500 }
    );
  }
});
