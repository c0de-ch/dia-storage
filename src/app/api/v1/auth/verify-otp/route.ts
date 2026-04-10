import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { t } from '@/lib/i18n';
import { eq, and, gt, isNull } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code } = body;

    if (!email || !code) {
      return NextResponse.json(
        { success: false, message: 'Email e codice OTP sono obbligatori.' },
        { status: 400 }
      );
    }

    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Utente non trovato.' },
        { status: 404 }
      );
    }

    const [otpRecord] = await db
      .select()
      .from(schema.otpCodes)
      .where(
        and(
          eq(schema.otpCodes.email, email),
          eq(schema.otpCodes.code, code),
          isNull(schema.otpCodes.usedAt),
          gt(schema.otpCodes.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!otpRecord) {
      return NextResponse.json(
        { success: false, message: 'Codice OTP non valido o scaduto.' },
        { status: 401 }
      );
    }

    await db
      .update(schema.otpCodes)
      .set({ usedAt: new Date() })
      .where(eq(schema.otpCodes.id, otpRecord.id));

    const sessionToken = nanoid(64);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await db.insert(schema.userSessions).values({
      userId: user.id,
      token: sessionToken,
      expiresAt,
    });

    const cookieStore = await cookies();
    cookieStore.set('dia_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    });

    const { ...safeUser } = user;

    return NextResponse.json({
      success: true,
      user: safeUser,
    });
  } catch (error) {
    console.error('Errore durante la verifica OTP:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server.' },
      { status: 500 }
    );
  }
}
