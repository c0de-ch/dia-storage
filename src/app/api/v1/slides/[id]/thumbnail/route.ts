import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { withAuth } from '@/lib/auth/middleware';
import { t } from '@/lib/i18n';
import { eq } from 'drizzle-orm';
import { readFile } from 'fs/promises';

export const GET = withAuth(async (request: NextRequest, context) => {
  try {
    const { id } = await (context as { params: Promise<{ id: string }> }).params;
    const numericId = Number(id);

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

    if (!slide.thumbnailPath) {
      return NextResponse.json(
        { success: false, message: 'Miniatura non disponibile.' },
        { status: 404 }
      );
    }

    const fileBuffer = await readFile(slide.thumbnailPath);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Disposition': 'inline; filename="thumbnail.jpg"',
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=604800',
      },
    });
  } catch (error) {
    console.error('Errore nel recupero della miniatura:', error);
    return NextResponse.json(
      { success: false, message: 'Errore nel recupero della miniatura.' },
      { status: 500 }
    );
  }
});
