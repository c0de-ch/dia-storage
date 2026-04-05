import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth/middleware';
import { t } from '@/lib/i18n';

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const user = (request as AuthenticatedRequest).user;
    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Errore nel recupero del profilo utente:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server.' },
      { status: 500 }
    );
  }
});
