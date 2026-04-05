import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { withAdmin } from '@/lib/auth/middleware';
import { t } from '@/lib/i18n';
import nodemailer from 'nodemailer';

export const POST = withAdmin(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { to } = body;

    if (!to) {
      return NextResponse.json(
        { success: false, message: 'Indirizzo email destinatario obbligatorio.' },
        { status: 400 }
      );
    }

    const configs = await db.select().from(schema.settings);
    const configMap: Record<string, string> = {};
    for (const row of configs) {
      configMap[row.key] = String(row.value);
    }

    const transporter = nodemailer.createTransport({
      host: configMap.smtpHost,
      port: parseInt(configMap.smtpPort || '587'),
      secure: configMap.smtpSecure === 'true',
      auth: {
        user: configMap.smtpUser,
        pass: configMap.smtpPassword,
      },
    });

    await transporter.sendMail({
      from: configMap.smtpFrom || configMap.smtpUser,
      to,
      subject: 'DIA Storage - Email di test',
      text: 'Questa è una email di test inviata da DIA Storage. La configurazione email funziona correttamente.',
      html: '<p>Questa è una email di test inviata da <strong>DIA Storage</strong>.</p><p>La configurazione email funziona correttamente.</p>',
    });

    return NextResponse.json({
      success: true,
      message: 'Email di test inviata con successo.',
    });
  } catch (error) {
    console.error('Errore nell\'invio dell\'email di test:', error);
    const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
    return NextResponse.json(
      {
        success: false,
        message: `Errore nell'invio dell'email di test: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
});
