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

function getOrigin(request: NextRequest): string {
  const host = request.headers.get('host') ?? new URL(request.url).host;
  const proto = request.headers.get('x-forwarded-proto') ?? 'http';
  return `${proto}://${host}`;
}

export async function GET(request: NextRequest) {
  const origin = getOrigin(request);

  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const code = searchParams.get('code');

    if (!email || !code) {
      return NextResponse.redirect(`${origin}/accesso?error=invalid`);
    }

    const ipAddress = clientIp(request.headers);

    const rate = await checkAuthRateLimit(email, 'verify');
    if (!rate.allowed) {
      return NextResponse.redirect(`${origin}/accesso?error=ratelimit`);
    }

    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    if (!user) {
      await recordAuthAttempt(email, 'verify', false, ipAddress);
      return NextResponse.redirect(`${origin}/accesso?error=user`);
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
      return NextResponse.redirect(`${origin}/accesso?error=expired`);
    }

    // Mark OTP as used
    await db
      .update(schema.otpCodes)
      .set({ usedAt: new Date() })
      .where(eq(schema.otpCodes.id, otpRecord.id));

    await recordAuthAttempt(email, 'verify', true, ipAddress);

    // Create session
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

    return NextResponse.redirect(`${origin}/`);
  } catch (error) {
    console.error('Errore magic link:', error);
    return NextResponse.redirect(`${origin}/accesso?error=generic`);
  }
}
