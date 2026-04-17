import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { withAuth } from '@/lib/auth/middleware';
import { parseIdParam } from '@/lib/api/params';
import { t } from '@/lib/i18n';
import { eq } from 'drizzle-orm';
import { readFile } from 'fs/promises';
import path from 'path';

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

    if (!slide.storagePath) {
      return NextResponse.json(
        { success: false, message: 'File originale non disponibile.' },
        { status: 404 }
      );
    }

    const fileBuffer = await readFile(slide.storagePath);
    const filename = slide.originalFilename || `original${path.extname(slide.storagePath)}`;

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'private, max-age=86400',
      },
    });
  } catch (error) {
    console.error('Errore nel recupero del file originale:', error);
    return NextResponse.json(
      { success: false, message: 'Errore nel recupero del file originale.' },
      { status: 500 }
    );
  }
});
