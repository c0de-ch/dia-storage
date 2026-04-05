import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { withAdmin } from '@/lib/auth/middleware';
import { t } from '@/lib/i18n';

export const POST = withAdmin(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { destination } = body;

    if (!destination || !['s3', 'nas'].includes(destination)) {
      return NextResponse.json(
        { success: false, message: 'Destinazione non valida. Valori ammessi: s3, nas.' },
        { status: 400 }
      );
    }

    const [backup] = await db.insert(schema.backupHistory).values({
      type: destination,
      destination,
      status: 'in_progress',
    }).returning();

    // Trigger backup process asynchronously
    // The actual backup logic would be handled by a background job
    // TODO: implement backup worker

    return NextResponse.json({
      success: true,
      message: `Backup verso ${destination} avviato con successo.`,
      backupId: backup.id,
    });
  } catch (error) {
    console.error('Errore nell\'avvio del backup:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server.' },
      { status: 500 }
    );
  }
});
