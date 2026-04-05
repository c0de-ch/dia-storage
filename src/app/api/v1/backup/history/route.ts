import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { withAuth } from '@/lib/auth/middleware';
import { t } from '@/lib/i18n';
import { desc } from 'drizzle-orm';

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const offset = (page - 1) * limit;

    const backups = await db
      .select()
      .from(schema.backupHistory)
      .orderBy(desc(schema.backupHistory.startedAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      success: true,
      backups,
    });
  } catch (error) {
    console.error('Errore nel recupero della cronologia dei backup:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server.' },
      { status: 500 }
    );
  }
});
