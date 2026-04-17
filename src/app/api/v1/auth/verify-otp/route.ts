import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { eq, and, gt, isNull } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { cookies } from 'next/headers';
import {
  checkAuthRateLimit,
  clientIp,
  recordAuthAttempt,
} from '@/lib/auth/rate-limit';

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

    const ipAddress = clientIp(request.headers);

    const rate = await checkAuthRateLimit(email, 'verify');
    if (!rate.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: 'Troppi tentativi. Riprova più tardi.',
          retryAfterSeconds: rate.retryAfterSeconds,
        },
        {
          status: 429,
          headers: rate.retryAfterSeconds
            ? { 'Retry-After': String(rate.retryAfterSeconds) }
            : undefined,
        }
      );
    }

    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    if (!user) {
      await recordAuthAttempt(email, 'verify', false, ipAddress);
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
      await recordAuthAttempt(email, 'verify', false, ipAddress);
      return NextResponse.json(
        { success: false, message: 'Codice OTP non valido o scaduto.' },
        { status: 401 }
      );
    }

    await db
      .update(schema.otpCodes)
      .set({ usedAt: new Date() })
      .where(eq(schema.otpCodes.id, otpRecord.id));

    await recordAuthAttempt(email, 'verify', true, ipAddress);

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
