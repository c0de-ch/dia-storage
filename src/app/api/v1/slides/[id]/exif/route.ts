import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { withAuth } from '@/lib/auth/middleware';
import { parseIdParam } from '@/lib/api/params';
import { eq } from 'drizzle-orm';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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

    if (!slide.storagePath) {
      return NextResponse.json(
        { success: false, message: 'File originale non disponibile.' },
        { status: 400 }
      );
    }

    const { title, dateTaken, location, author, copyright } = body;

    const exifArgs: string[] = [];
    if (title) exifArgs.push(`-Title="${title}"`);
    if (dateTaken) exifArgs.push(`-DateTimeOriginal="${dateTaken}"`);
    if (location) exifArgs.push(`-Location="${location}"`);
    if (author) exifArgs.push(`-Author="${author}"`);
    if (copyright) exifArgs.push(`-Copyright="${copyright}"`);

    if (exifArgs.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Nessun dato EXIF da scrivere.' },
        { status: 400 }
      );
    }

    const command = `exiftool -overwrite_original ${exifArgs.join(' ')} "${slide.storagePath}"`;
    await execAsync(command);

    return NextResponse.json({
      success: true,
      message: 'Dati EXIF scritti con successo.',
    });
  } catch (error) {
    console.error('Errore nella scrittura dei dati EXIF:', error);
    return NextResponse.json(
      { success: false, message: 'Errore nella scrittura dei dati EXIF.' },
      { status: 500 }
    );
  }
});
