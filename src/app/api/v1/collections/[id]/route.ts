import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { withAuth } from '@/lib/auth/middleware';
import { t } from '@/lib/i18n';
import { eq, inArray } from 'drizzle-orm';

export const GET = withAuth(async (request: NextRequest, context) => {
  try {
    const { id } = await (context as { params: Promise<{ id: string }> }).params;
    const numericId = Number(id);

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

    const collectionSlideRows = await db
      .select()
      .from(schema.slideCollections)
      .where(eq(schema.slideCollections.collectionId, numericId));

    const slideIds = collectionSlideRows.map((cs) => cs.slideId);

    let slides: (typeof schema.slides.$inferSelect)[] = [];
    if (slideIds.length > 0) {
      slides = await db
        .select()
        .from(schema.slides)
        .where(inArray(schema.slides.id, slideIds));
    }

    return NextResponse.json({
      success: true,
      collection: {
        ...collection,
        slides,
      },
    });
  } catch (error) {
    console.error('Errore nel recupero della collezione:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server.' },
      { status: 500 }
    );
  }
});

export const PATCH = withAuth(async (request: NextRequest, context) => {
  try {
    const { id } = await (context as { params: Promise<{ id: string }> }).params;
    const numericId = Number(id);
    const body = await request.json();

    const [existing] = await db
      .select()
      .from(schema.collections)
      .where(eq(schema.collections.id, numericId))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Collezione non trovata.' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    updateData.updatedAt = new Date();

    const [updatedCollection] = await db
      .update(schema.collections)
      .set(updateData)
      .where(eq(schema.collections.id, numericId))
      .returning();

    return NextResponse.json({
      success: true,
      collection: updatedCollection,
    });
  } catch (error) {
    console.error('Errore nell\'aggiornamento della collezione:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server.' },
      { status: 500 }
    );
  }
});

export const DELETE = withAuth(async (request: NextRequest, context) => {
  try {
    const { id } = await (context as { params: Promise<{ id: string }> }).params;
    const numericId = Number(id);

    const [existing] = await db
      .select()
      .from(schema.collections)
      .where(eq(schema.collections.id, numericId))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Collezione non trovata.' },
        { status: 404 }
      );
    }

    // Remove all slide associations first
    await db
      .delete(schema.slideCollections)
      .where(eq(schema.slideCollections.collectionId, numericId));

    await db
      .delete(schema.collections)
      .where(eq(schema.collections.id, numericId));

    return NextResponse.json({
      success: true,
      message: 'Collezione eliminata con successo.',
    });
  } catch (error) {
    console.error('Errore nell\'eliminazione della collezione:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server.' },
      { status: 500 }
    );
  }
});
