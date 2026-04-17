import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { withAuth } from '@/lib/auth/middleware';
import { parseIdParam } from '@/lib/api/params';
import { eq } from 'drizzle-orm';
import { readFile, access } from 'fs/promises';
import { readImageBuffer } from '@/lib/images/heic';

async function getSetting(key: string): Promise<string | null> {
  const [row] = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, key))
    .limit(1);
  if (!row || row.value === null) return null;
  return typeof row.value === 'string' ? row.value : JSON.stringify(row.value);
}

export const POST = withAuth(async (request: NextRequest, context) => {
  try {
    const { id } = await (context as { params: Promise<{ id: string }> }).params;
    const parsed = parseIdParam(id);
    if (!parsed.ok) return parsed.response;
    const numericId = parsed.id;
    const { lang } = await request.json().catch(() => ({ lang: 'it-IT' }));

    const [slide] = await db
      .select()
      .from(schema.slides)
      .where(eq(schema.slides.id, numericId))
      .limit(1);

    if (!slide) {
      return NextResponse.json(
        { success: false, message: 'Diapositiva non trovata.' },
        { status: 404 }
      );
    }

    // Get image as base64 — prefer medium, fall back to thumbnail, then original
    let imageBuffer: Buffer | null = null;
    for (const imgPath of [slide.mediumPath, slide.thumbnailPath, slide.storagePath]) {
      if (!imgPath) continue;
      try {
        await access(imgPath);
        // Medium/thumbnail are already JPEG; original might be HEIC
        if (imgPath === slide.storagePath) {
          imageBuffer = await readImageBuffer(imgPath);
        } else {
          imageBuffer = await readFile(imgPath);
        }
        break;
      } catch {
        continue;
      }
    }

    if (!imageBuffer) {
      return NextResponse.json(
        { success: false, message: 'Nessuna immagine disponibile per questa diapositiva.' },
        { status: 404 }
      );
    }

    const base64Image = imageBuffer.toString('base64');

    // Check AI provider
    const provider = await getSetting('aiProvider') ?? 'anthropic';
    const ollamaUrl = (await getSetting('ollamaUrl')) ?? 'http://localhost:11434';
    // Vision uses a separate model setting — falls back to the general model, then llava
    const ollamaVisionModel = (await getSetting('ollamaVisionModel'))
      ?? (await getSetting('ollamaModel'))
      ?? 'llava:7b';

    const langPrompts: Record<string, string> = {
      'it-IT': 'Descrivi in dettaglio cosa vedi in questa immagine. È una diapositiva da 35mm digitalizzata. Descrivi le persone, i luoghi, gli oggetti e l\'atmosfera. Rispondi in italiano, in modo naturale come se stessi raccontando a qualcuno cosa c\'è nella foto.',
      'en-US': 'Describe in detail what you see in this image. It is a digitized 35mm slide. Describe the people, places, objects, and atmosphere. Reply in English, naturally as if telling someone what is in the photo.',
      'de-DE': 'Beschreibe detailliert, was du in diesem Bild siehst. Es handelt sich um ein digitalisiertes 35-mm-Dia. Beschreibe Personen, Orte, Objekte und Atmosphare. Antworte auf Deutsch.',
      'fr-FR': 'Decris en detail ce que tu vois dans cette image. C\'est une diapositive 35mm numerisee. Decris les personnes, les lieux, les objets et l\'atmosphere. Reponds en francais.',
    };
    const prompt = langPrompts[lang] ?? langPrompts['it-IT']!;

    if (provider === 'ollama') {
      const res = await fetch(`${ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: ollamaVisionModel,
          messages: [
            {
              role: 'user',
              content: prompt,
              images: [base64Image],
            },
          ],
          stream: false,
          options: { num_predict: 500 },
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        console.error('Errore Ollama vision:', errText);
        return NextResponse.json(
          { success: false, message: `Errore nella connessione a Ollama (${ollamaVisionModel}). Verifica che il server sia in esecuzione e che il modello vision sia installato.` },
          { status: 502 }
        );
      }

      const data = await res.json();
      const description = data.message?.content ?? 'Non sono riuscito a descrivere l\'immagine.';

      return NextResponse.json({ success: true, description });
    }

    // Anthropic vision
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const dbApiKey = await getSetting('anthropicApiKey');
    const apiKey = (dbApiKey && dbApiKey !== '' && !dbApiKey.startsWith('***'))
      ? dbApiKey
      : process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, message: 'Chiave API Anthropic non configurata.' },
        { status: 500 }
      );
    }

    const modelSetting = await getSetting('aiModel');
    const model = modelSetting || 'claude-haiku-4-5-20251001';
    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model,
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: base64Image },
            },
            { type: 'text', text: prompt },
          ],
        },
      ],
    });

    const firstBlock = response.content[0];
    const description = firstBlock?.type === 'text'
      ? firstBlock.text
      : 'Non sono riuscito a descrivere l\'immagine.';

    return NextResponse.json({ success: true, description });
  } catch (error) {
    console.error('Errore describe:', error);
    return NextResponse.json(
      { success: false, message: 'Errore nella generazione della descrizione.' },
      { status: 500 }
    );
  }
});
