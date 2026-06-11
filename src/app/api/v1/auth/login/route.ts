import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { sendOtpEmail } from '@/lib/email/transport';
import { createOtpCode } from '@/lib/auth/otp';
import {
  checkAuthRateLimit,
  clientIp,
  recordAuthAttempt,
} from '@/lib/auth/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Indirizzo email obbligatorio.' },
        { status: 400 }
      );
    }

    const ipAddress = clientIp(request.headers);

    const rate = await checkAuthRateLimit(email, 'login');
    if (!rate.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: 'Troppi tentativi. Riprova più tardi.',
          retryAfterSeconds: rate.retryAfterSeconds,
        },
        {
          status: 429,
          ...(rate.retryAfterSeconds && {
            headers: { 'Retry-After': String(rate.retryAfterSeconds) },
          }),
        }
      );
    }

    // Uniform response regardless of whether the account exists or is active,
    // so the endpoint can't be used to enumerate which emails are registered.
    // We only actually send an OTP for an existing, active account.
    const genericResponse = NextResponse.json({
      success: true,
      message: 'Se esiste un account per questa email, riceverai un codice di accesso.',
    });

    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    if (!user || !user.active) {
      // Record the attempt so unknown/disabled probes are also rate-limited,
      // but return the same response as the success path.
      await recordAuthAttempt(email, 'login', false, ipAddress);
      return genericResponse;
    }

    const code = await createOtpCode(user.email, user.otpChannel);
    await recordAuthAttempt(user.email, 'login', true, ipAddress);

    const host = request.headers.get('host') ?? new URL(request.url).host;
    const proto = request.headers.get('x-forwarded-proto') ?? 'http';
    const origin = `${proto}://${host}`;

    try {
      await sendOtpEmail(user.email, code, origin);
    } catch (emailErr) {
      console.error('Errore invio OTP email:', emailErr);
      return NextResponse.json(
        { success: false, message: 'Errore nell\'invio dell\'email. Verificare la configurazione SMTP.' },
        { status: 500 }
      );
    }

    return genericResponse;
  } catch (error) {
    console.error('Errore durante il login:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server.' },
      { status: 500 }
    );
  }
}
