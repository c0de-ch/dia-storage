import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { withAuth } from '@/lib/auth/middleware';
import { eq, and, inArray } from 'drizzle-orm';

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { batchId } = body;

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

    const slideIds = slides.map((s) => s.id);

    await db
      .update(schema.slides)
      .set({ status: 'deleted', updatedAt: new Date() })
      .where(inArray(schema.slides.id, slideIds));

    return NextResponse.json({
      success: true,
      message: `${slides.length} diapositive eliminate con successo.`,
      count: slides.length,
    });
  } catch (error) {
    console.error('Errore nell\'eliminazione batch:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server.' },
      { status: 500 }
    );
  }
});
