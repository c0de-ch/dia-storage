import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { withAuth } from '@/lib/auth/middleware';
import { parseIdParam } from '@/lib/api/params';
import { eq } from 'drizzle-orm';

export const POST = withAuth(async (request: NextRequest, context) => {
  try {
    const { id } = await (context as { params: Promise<{ id: string }> }).params;
    const parsed = parseIdParam(id);
    if (!parsed.ok) return parsed.response;
    const numericId = parsed.id;
    const body = await request.json();

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

    if (slide.status !== 'incoming') {
      return NextResponse.json(
        { success: false, message: 'Solo le diapositive in arrivo possono essere archiviate.' },
        { status: 400 }
      );
    }

    const { title, dateTaken, location, magazineId, slotNumber, notes } = body;

    const updateData: Record<string, unknown> = {
      status: 'active',
      updatedAt: new Date(),
    };

    if (title !== undefined) updateData.title = title;
    if (dateTaken !== undefined) updateData.dateTaken = dateTaken;
    if (location !== undefined) updateData.location = location;
    if (magazineId !== undefined) updateData.magazineId = magazineId;
    if (slotNumber !== undefined) updateData.slotNumber = slotNumber;
    if (notes !== undefined) updateData.notes = notes;

    const [archivedSlide] = await db
      .update(schema.slides)
      .set(updateData)
      .where(eq(schema.slides.id, numericId))
      .returning();

    return NextResponse.json({
      success: true,
      message: 'Diapositiva archiviata con successo.',
      slide: archivedSlide,
    });
  } catch (error) {
    console.error('Errore nell\'archiviazione della diapositiva:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server.' },
      { status: 500 }
    );
  }
});
