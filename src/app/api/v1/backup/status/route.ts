import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { withAuth } from '@/lib/auth/middleware';
import { desc } from 'drizzle-orm';

export const GET = withAuth(async (_request: NextRequest) => {
  try {
    const [latestBackup] = await db
      .select()
      .from(schema.backupHistory)
      .orderBy(desc(schema.backupHistory.startedAt))
      .limit(1);

    if (!latestBackup) {
      return NextResponse.json({
        success: true,
        backup: null,
        message: 'Nessun backup trovato.',
      });
    }

    return NextResponse.json({
      success: true,
      backup: latestBackup,
    });
  } catch (error) {
    console.error('Errore nel recupero dello stato del backup:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server.' },
      { status: 500 }
    );
  }
});
