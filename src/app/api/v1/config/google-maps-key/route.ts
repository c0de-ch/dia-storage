import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { settings } from '@/lib/db/schema';
import { withAuth } from '@/lib/auth/middleware';
import { eq } from 'drizzle-orm';

export const GET = withAuth(async (_request: NextRequest) => {
  try {
    // Check env var first
    const envKey = process.env.GOOGLE_MAPS_API_KEY;
    if (envKey) {
      return NextResponse.json({ key: envKey });
    }

    // Fall back to settings DB
    const [row] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, 'googleMapsApiKey'))
      .limit(1);

    if (row?.value && typeof row.value === 'string' && row.value.length > 0 && !row.value.startsWith('****')) {
      return NextResponse.json({ key: row.value });
    }

    return NextResponse.json({ key: null });
  } catch (error) {
    console.error('Errore nel recupero della chiave Google Maps:', error);
    return NextResponse.json({ key: null });
  }
});
