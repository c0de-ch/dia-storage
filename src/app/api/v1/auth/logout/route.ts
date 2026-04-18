import { NextRequest, NextResponse } from 'next/server';
import {
  clearSessionCookie,
  deleteSession,
  getSessionToken,
} from '@/lib/auth/session';

export async function POST(_request: NextRequest) {
  try {
    const token = await getSessionToken();

    if (token) {
      await deleteSession(token);
    }

    await clearSessionCookie();

    return NextResponse.json({
      success: true,
      message: 'Disconnessione avvenuta con successo.',
    });
  } catch (error) {
    console.error('Errore durante il logout:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server.' },
      { status: 500 }
    );
  }
}
