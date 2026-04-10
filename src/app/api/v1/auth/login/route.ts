import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { t } from '@/lib/i18n';
import { eq } from 'drizzle-orm';
import { sendOtpEmail } from '@/lib/email/transport';

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

    if (!user.active) {
      return NextResponse.json(
        { success: false, message: 'Account disattivato. Contattare un amministratore.' },
        { status: 403 }
      );
    }

    const code = process.env.NODE_ENV === 'development' ? '000000' : Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await db.insert(schema.otpCodes).values({
      email: user.email,
      code,
      channel: user.otpChannel,
      expiresAt,
    });

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

    return NextResponse.json({
      success: true,
      message: 'Codice OTP inviato con successo.',
    });
  } catch (error) {
    console.error('Errore durante il login:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server.' },
      { status: 500 }
    );
  }
}
