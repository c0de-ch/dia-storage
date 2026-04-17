import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth/middleware';
import { canEditCollection, canDeleteCollection } from '@/lib/auth/permissions';
import { parseIdParam } from '@/lib/api/params';
import { parseJsonBody, collectionPatchSchema } from '@/lib/api/validation';
import { eq, and, ne, inArray } from 'drizzle-orm';

export const GET = withAuth(async (request: NextRequest, context) => {
  try {
    const { id } = await (context as { params: Promise<{ id: string }> }).params;
    const parsed = parseIdParam(id);
    if (!parsed.ok) return parsed.response;
    const numericId = parsed.id;

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
        .where(
          and(
            inArray(schema.slides.id, slideIds),
            ne(schema.slides.status, 'deleted')
          )
        );
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
    const parsed = parseIdParam(id);
    if (!parsed.ok) return parsed.response;
    const numericId = parsed.id;

    const parsedBody = await parseJsonBody(request, collectionPatchSchema);
    if (!parsedBody.ok) return parsedBody.response;

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

    const user = (request as AuthenticatedRequest).user;
    if (!canEditCollection(user, existing.ownerUserId ?? undefined)) {
      return NextResponse.json(
        { success: false, message: 'Non hai i permessi per modificare questa collezione.' },
        { status: 403 }
      );
    }

    const updateData: Record<string, unknown> = { ...parsedBody.data, updatedAt: new Date() };

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
    const parsed = parseIdParam(id);
    if (!parsed.ok) return parsed.response;
    const numericId = parsed.id;

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

    const user = (request as AuthenticatedRequest).user;
    if (!canDeleteCollection(user, existing.ownerUserId ?? undefined)) {
      return NextResponse.json(
        { success: false, message: 'Non hai i permessi per eliminare questa collezione.' },
        { status: 403 }
      );
    }

    await db.transaction(async (tx) => {
      await tx
        .delete(schema.slideCollections)
        .where(eq(schema.slideCollections.collectionId, numericId));

      await tx
        .delete(schema.collections)
        .where(eq(schema.collections.id, numericId));
    });

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
