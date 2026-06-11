import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth/middleware';
import { canEditSlide } from '@/lib/auth/permissions';
import { parseIdParam } from '@/lib/api/params';
import { parseJsonBody, slideExifSchema } from '@/lib/api/validation';
import { eq } from 'drizzle-orm';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export const POST = withAuth(async (request: NextRequest, context) => {
  try {
    const { id } = await (context as { params: Promise<{ id: string }> }).params;
    const parsed = parseIdParam(id);
    if (!parsed.ok) return parsed.response;
    const numericId = parsed.id;

    const parsedBody = await parseJsonBody(request, slideExifSchema);
    if (!parsedBody.ok) return parsedBody.response;
    const { title, dateTaken, location, author, copyright } = parsedBody.data;

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

    const user = (request as AuthenticatedRequest).user;
    if (!canEditSlide(user, slide.uploadedBy ?? undefined)) {
      return NextResponse.json(
        { success: false, message: 'Non hai i permessi per modificare questa diapositiva.' },
        { status: 403 }
      );
    }

    if (!slide.storagePath) {
      return NextResponse.json(
        { success: false, message: 'File originale non disponibile.' },
        { status: 400 }
      );
    }

    // Build an argv array and run exiftool via execFile (NO shell). Each tag is
    // a single argv element, so user-supplied values can never be interpreted
    // as shell metacharacters or separate arguments.
    const exifArgs: string[] = ['-overwrite_original'];
    if (title) exifArgs.push(`-Title=${title}`);
    if (dateTaken) exifArgs.push(`-DateTimeOriginal=${dateTaken}`);
    if (location) exifArgs.push(`-Location=${location}`);
    if (author) exifArgs.push(`-Author=${author}`);
    if (copyright) exifArgs.push(`-Copyright=${copyright}`);

    if (exifArgs.length === 1) {
      return NextResponse.json(
        { success: false, message: 'Nessun dato EXIF da scrivere.' },
        { status: 400 }
      );
    }

    exifArgs.push(slide.storagePath);
    await execFileAsync('exiftool', exifArgs);

    await db
      .update(schema.slides)
      .set({ exifWritten: true, updatedAt: new Date() })
      .where(eq(schema.slides.id, numericId));

    return NextResponse.json({
      success: true,
      message: 'Dati EXIF scritti con successo.',
    });
  } catch (error) {
    console.error(
      'Errore nella scrittura dei dati EXIF:',
      error instanceof Error ? error.message : 'errore sconosciuto'
    );
    return NextResponse.json(
      { success: false, message: 'Errore nella scrittura dei dati EXIF.' },
      { status: 500 }
    );
  }
});
