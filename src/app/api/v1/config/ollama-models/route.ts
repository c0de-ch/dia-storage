import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/lib/auth/middleware';

export const POST = withAdmin(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { ollamaUrl } = body;

    if (!ollamaUrl) {
      return NextResponse.json(
        { success: false, models: [], message: 'URL del server Ollama obbligatorio.' },
        { status: 400 }
      );
    }

    const res = await fetch(`${ollamaUrl}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { success: false, models: [], message: `Ollama ha risposto con stato ${res.status}.` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const models = (data.models ?? []).map((m: { name: string }) => m.name);

    return NextResponse.json({ success: true, models });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Errore sconosciuto';
    return NextResponse.json(
      { success: false, models: [], message: `Impossibile contattare il server Ollama: ${message}` },
      { status: 502 }
    );
  }
});
