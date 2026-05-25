import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth/middleware';
import { eq, and, inArray } from 'drizzle-orm';

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { batchId, metadata, collectionName } = body;

    if (!batchId) {
      return NextResponse.json(
        { success: false, message: 'ID batch obbligatorio.' },
        { status: 400 }
      );
    }

    const slides = await db
      .select()
      .from(schema.slides)
      .where(
        and(
          eq(schema.slides.batchId, batchId),
          eq(schema.slides.status, 'incoming')
        )
      );

    if (slides.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Nessuna diapositiva in arrivo trovata per questo batch.' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {
      status: 'active',
      updatedAt: new Date(),
    };

    // Only map to columns that actually exist on `slides`.
    if (metadata) {
      if (metadata.title !== undefined) updateData.title = metadata.title;
      if (metadata.location !== undefined) updateData.location = metadata.location;
      if (metadata.notes !== undefined) updateData.notes = metadata.notes;
      if (metadata.magazineId !== undefined) updateData.magazineId = metadata.magazineId;
      if (metadata.dateTaken !== undefined) {
        updateData.dateTaken = metadata.dateTaken;
        updateData.dateTakenPrecise =
          typeof metadata.dateTaken === 'string' &&
          /^\d{4}-\d{2}-\d{2}$/.test(metadata.dateTaken)
            ? metadata.dateTaken
            : null;
      }
    }

    const slideIds = slides.map((s) => s.id);

    await db
      .update(schema.slides)
      .set(updateData)
      .where(inArray(schema.slides.id, slideIds));

    // Collect the archived slides into an album (collection). Name precedence:
    // explicit collectionName -> batch metadata title -> the shared title the
    // slides already carry from upload time. No name => no album.
    const user = (request as AuthenticatedRequest).user;
    const albumName =
      (typeof collectionName === 'string' && collectionName.trim()) ||
      (metadata &&
        typeof metadata.title === 'string' &&
        metadata.title.trim()) ||
      slides.find((s) => s.title)?.title?.trim() ||
      '';

    let collectionId: number | null = null;
    if (albumName) {
      // Best-effort: the slides are already archived, so a problem building the
      // album must not fail the request.
      try {
        const [existing] = await db
          .select()
          .from(schema.collections)
          .where(
            and(
              eq(schema.collections.name, albumName),
              eq(schema.collections.ownerUserId, user.id)
            )
          )
          .limit(1);
        if (existing) {
          collectionId = existing.id;
        } else {
          const [created] = await db
            .insert(schema.collections)
            .values({
              name: albumName,
              ownerUserId: user.id,
              coverSlideId: slideIds[0] ?? null,
            })
            .returning();
          collectionId = created?.id ?? null;
        }
        if (collectionId !== null) {
          const cid = collectionId;
          await db
            .insert(schema.slideCollections)
            .values(slideIds.map((id) => ({ slideId: id, collectionId: cid })))
            .onConflictDoNothing();
        }
      } catch (albumErr) {
        console.error('Errore nella creazione album per il batch:', albumErr);
        collectionId = null;
      }
    }

    return NextResponse.json({
      success: true,
      message: `${slides.length} diapositive archiviate con successo.`,
      count: slides.length,
      collectionId,
    });
  } catch (error) {
    console.error('Errore nell\'archiviazione batch:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server.' },
      { status: 500 }
    );
  }
});
