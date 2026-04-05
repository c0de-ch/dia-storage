import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { withAdmin } from '@/lib/auth/middleware';
import { t } from '@/lib/i18n';

export const POST = withAdmin(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { to } = body;

    if (!to) {
      return NextResponse.json(
        { success: false, message: 'Numero di telefono destinatario obbligatorio.' },
        { status: 400 }
      );
    }

    const configs = await db.select().from(schema.settings);
    const configMap: Record<string, string> = {};
    for (const row of configs) {
      configMap[row.key] = String(row.value);
    }

    const whatsappApiUrl = configMap.whatsappApiUrl;
    const whatsappApiKey = configMap.whatsappApiKey;

    if (!whatsappApiUrl || !whatsappApiKey) {
      return NextResponse.json(
        { success: false, message: 'Configurazione WhatsApp non completa. Impostare URL API e chiave API.' },
        { status: 400 }
      );
    }

    const response = await fetch(whatsappApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${whatsappApiKey}`,
      },
      body: JSON.stringify({
        to,
        message: 'Questo è un messaggio di test inviato da DIA Storage. La configurazione WhatsApp funziona correttamente.',
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      return NextResponse.json(
        {
          success: false,
          message: `Errore nell'invio del messaggio WhatsApp: ${errorData}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Messaggio WhatsApp di test inviato con successo.',
    });
  } catch (error) {
    console.error('Errore nell\'invio del messaggio WhatsApp di test:', error);
    const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
    return NextResponse.json(
      {
        success: false,
        message: `Errore nell'invio del messaggio WhatsApp di test: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
});
