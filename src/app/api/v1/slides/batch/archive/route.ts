import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { withAuth } from '@/lib/auth/middleware';
import { t } from '@/lib/i18n';
import { eq, and, inArray } from 'drizzle-orm';

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { batchId, metadata } = body;

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
      status: 'archived',
      updatedAt: new Date(),
    };

    if (metadata) {
      if (metadata.title !== undefined) updateData.title = metadata.title;
      if (metadata.description !== undefined) updateData.description = metadata.description;
      if (metadata.date !== undefined) updateData.date = metadata.date;
      if (metadata.location !== undefined) updateData.location = metadata.location;
      if (metadata.tags !== undefined) updateData.tags = metadata.tags;
      if (metadata.magazineId !== undefined) updateData.magazineId = metadata.magazineId;
      if (metadata.notes !== undefined) updateData.notes = metadata.notes;
    }

    const slideIds = slides.map((s) => s.id);

    await db
      .update(schema.slides)
      .set(updateData)
      .where(inArray(schema.slides.id, slideIds));

    return NextResponse.json({
      success: true,
      message: `${slides.length} diapositive archiviate con successo.`,
      count: slides.length,
    });
  } catch (error) {
    console.error('Errore nell\'archiviazione batch:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server.' },
      { status: 500 }
    );
  }
});
