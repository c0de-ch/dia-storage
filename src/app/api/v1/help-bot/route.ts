import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { withAuth } from "@/lib/auth/middleware";
import { apiError } from "@/lib/api/errors";

// Approximate cost per 1M tokens (USD) — conservative estimates
const COST_PER_1M_INPUT: Record<string, number> = {
  "claude-haiku-4-5-20251001": 0.80,
  "claude-sonnet-4-6": 3.0,
  "claude-opus-4-6": 15.0,
};
const COST_PER_1M_OUTPUT: Record<string, number> = {
  "claude-haiku-4-5-20251001": 4.0,
  "claude-sonnet-4-6": 15.0,
  "claude-opus-4-6": 75.0,
};

const KNOWLEDGE = `PAGES:
- Overview (Panoramica): dashboard with stats, queue and recent slides
- Incoming queue (Coda in arrivo): freshly uploaded slides awaiting processing (thumbnails, EXIF, archival)
- Upload (Caricamento): drag-and-drop zone for JPEG/TIFF/PNG from scanner. Also macOS Dia-Uploader app for auto-import from SD card
- Gallery (Galleria): all archived slides, filterable by collection, magazine, status. Grid or list view
- Search (Ricerca): PostgreSQL full-text search with Italian dictionary on title, location, notes
- Admin > Users: add/edit users, roles (admin, editor, user, viewer)
- Admin > Backup: backups to S3, NAS, rsync. Manual or scheduled via cron
- Admin > Settings: SMTP, WhatsApp, storage, theme, AI assistant
- Admin > Activity log: user action history

CONCEPTS:
- Slides: scanned images (PICTnnnn.JPG, 14/22MP)
- Magazines: physical slide trays with 36/50 slots in the scanner
- Collections: virtual groupings by theme/event
- Login: passwordless OTP via email (6-digit code)
- Pipeline: upload -> incoming -> thumbnails + EXIF -> permanent archive
- Duplicates: detected via SHA-256 checksum, not imported
- API keys: programmatic access for scripts and Dia-Uploader`;

const SYSTEM_PROMPTS: Record<string, string> = {
  "it-IT": `Sei l'assistente vocale di Dia-Storage, un'applicazione web per gestire diapositive digitalizzate da 35mm con lo scanner Reflecta DigitDia Evolution.

Rispondi SEMPRE in italiano, in modo chiaro e conciso (massimo 3-4 frasi).

Ecco cosa sai dell'applicazione:

${KNOWLEDGE}

Se non sai la risposta, dillo onestamente e suggerisci dove l'utente potrebbe trovare aiuto.`,

  "en-US": `You are the voice assistant for Dia-Storage, a web application for managing digitised 35mm slides from a Reflecta DigitDia Evolution scanner.

ALWAYS reply in English, clearly and concisely (max 3-4 sentences).

Here is what you know about the application:

${KNOWLEDGE}

If you don't know the answer, say so honestly and suggest where the user might find help.`,

  "de-DE": `Du bist der Sprachassistent von Dia-Storage, einer Webanwendung zur Verwaltung digitalisierter 35-mm-Dias vom Scanner Reflecta DigitDia Evolution.

Antworte IMMER auf Deutsch, klar und kurz (maximal 3-4 Satze).

Hier ist, was du uber die Anwendung weisst:

${KNOWLEDGE}

Wenn du die Antwort nicht weisst, sage es ehrlich und schlage vor, wo der Benutzer Hilfe finden konnte.`,

  "fr-FR": `Tu es l'assistant vocal de Dia-Storage, une application web pour gerer des diapositives 35mm numerisees avec le scanner Reflecta DigitDia Evolution.

Reponds TOUJOURS en francais, clairement et brievement (max 3-4 phrases).

Voici ce que tu sais de l'application:

${KNOWLEDGE}

Si tu ne connais pas la reponse, dis-le honnetement et suggere ou l'utilisateur pourrait trouver de l'aide.`,

  "zh-CN": `你是 Dia-Storage 的语音助手。Dia-Storage 是一个用于管理通过 Reflecta DigitDia Evolution 扫描仪数字化的 35mm 幻灯片的网络应用。

请始终用中文回答，简洁明了（最多3-4句话）。

以下是你对该应用的了解：

${KNOWLEDGE}

如果你不知道答案，请如实说明，并建议用户可以在哪里找到帮助。`,
};

function getSystemPrompt(lang?: string): string {
  const fallback = SYSTEM_PROMPTS["it-IT"]!;
  return SYSTEM_PROMPTS[lang ?? "it-IT"] ?? fallback;
}

async function getSetting(key: string): Promise<string | null> {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1);
  if (!row || row.value === null) return null;
  return typeof row.value === "string" ? row.value : JSON.stringify(row.value);
}

async function upsertSetting(key: string, value: string | number): Promise<void> {
  const [existing] = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  if (existing) {
    await db.update(settings).set({ value: String(value), updatedAt: new Date() }).where(eq(settings.key, key));
  } else {
    await db.insert(settings).values({ key, value: String(value) });
  }
}

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export const POST = withAuth(async (request: NextRequest) => {
  try {
    // Check if AI is enabled
    const aiEnabled = await getSetting("aiEnabled");
    if (aiEnabled === "false") {
      return apiError(
        403,
        "L'assistente IA e disattivato. Un amministratore puo abilitarlo nelle Impostazioni.",
        "AI_DISABLED",
      );
    }

    const { message, history, lang } = await request.json();
    if (!message || typeof message !== "string") {
      return apiError(400, "Messaggio mancante.");
    }

    // Check provider FIRST — Ollama doesn't need an API key or spending cap
    const provider = await getSetting("aiProvider") ?? "anthropic";
    const monthKey = currentMonthKey();
    const requestsKey = `aiRequests_${monthKey}`;

    // Build conversation history
    const chatHistory: Array<{ role: string; text: string }> = [];
    if (Array.isArray(history)) {
      for (const msg of history.slice(-10)) {
        if (msg.role === "user" || msg.role === "assistant") {
          chatHistory.push(msg);
        }
      }
    }

    if (provider === "ollama") {
      // ---- Ollama (local model) ----
      const ollamaUrl = (await getSetting("ollamaUrl")) ?? "http://localhost:11434";
      const ollamaModel = (await getSetting("ollamaModel")) ?? "llama3.2";

      const ollamaMessages = [
        { role: "system", content: getSystemPrompt(lang) },
        ...chatHistory.map((m) => ({ role: m.role, content: m.text })),
        { role: "user", content: message },
      ];

      const ollamaRes = await fetch(`${ollamaUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: ollamaModel,
          messages: ollamaMessages,
          stream: false,
          options: { num_predict: 300 },
        }),
      });

      if (!ollamaRes.ok) {
        const errText = await ollamaRes.text().catch(() => "");
        console.error("Errore Ollama:", errText);
        return apiError(
          502,
          `Errore nella connessione a Ollama (${ollamaModel}). Verifica che il server sia in esecuzione.`,
          "OLLAMA_UNREACHABLE",
        );
      }

      const ollamaData = await ollamaRes.json();
      const text = ollamaData.message?.content ?? "Non sono riuscito a generare una risposta.";

      // Track requests (no cost for local)
      const currentRequestsStr = await getSetting(requestsKey);
      const currentRequests = currentRequestsStr ? parseInt(currentRequestsStr) : 0;
      await upsertSetting(requestsKey, currentRequests + 1);
      await upsertSetting("aiCurrentMonthRequests", currentRequests + 1);

      return NextResponse.json({ answer: text });
    }

    // ---- Anthropic (Claude) ----
    const dbApiKey = await getSetting("anthropicApiKey");
    const apiKey = (dbApiKey && dbApiKey !== "" && !dbApiKey.startsWith("***"))
      ? dbApiKey
      : process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return apiError(
        500,
        "Chiave API Anthropic non configurata. Vai in Impostazioni > Assistente IA.",
        "ANTHROPIC_KEY_MISSING",
      );
    }

    // Check monthly spending cap
    const maxMonthlyStr = await getSetting("aiMaxMonthlyUsd");
    const maxMonthly = maxMonthlyStr ? parseFloat(maxMonthlyStr) : 5;
    const usageKey = `aiUsage_${monthKey}`;
    const currentUsageStr = await getSetting(usageKey);
    const currentUsage = currentUsageStr ? parseFloat(currentUsageStr) : 0;

    if (currentUsage >= maxMonthly) {
      return apiError(
        429,
        `Limite di spesa mensile raggiunto ($${currentUsage.toFixed(2)} / $${maxMonthly.toFixed(2)}). Il limite viene reimpostato il primo del mese.`,
        "SPEND_LIMIT_REACHED",
      );
    }

    const modelSetting = await getSetting("aiModel");
    const model = modelSetting || "claude-haiku-4-5-20251001";

    const client = new Anthropic({ apiKey });

    const messages: Anthropic.MessageParam[] = [
      ...chatHistory.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.text,
      })),
      { role: "user", content: message },
    ];

    const response = await client.messages.create({
      model,
      max_tokens: 300,
      system: getSystemPrompt(lang),
      messages,
    });

    const firstBlock = response.content[0];
    const text =
      firstBlock?.type === "text"
        ? firstBlock.text
        : "Non sono riuscito a generare una risposta.";

    // Track usage
    const inputTokens = response.usage?.input_tokens ?? 0;
    const outputTokens = response.usage?.output_tokens ?? 0;
    const inputCostPer1M = COST_PER_1M_INPUT[model] ?? 1;
    const outputCostPer1M = COST_PER_1M_OUTPUT[model] ?? 5;
    const requestCost =
      (inputTokens / 1_000_000) * inputCostPer1M +
      (outputTokens / 1_000_000) * outputCostPer1M;

    const newUsage = currentUsage + requestCost;
    await upsertSetting(usageKey, newUsage);

    const currentRequestsStr = await getSetting(requestsKey);
    const currentRequests = currentRequestsStr ? parseInt(currentRequestsStr) : 0;
    await upsertSetting(requestsKey, currentRequests + 1);

    await upsertSetting("aiCurrentMonthUsageUsd", newUsage);
    await upsertSetting("aiCurrentMonthRequests", currentRequests + 1);

    return NextResponse.json({
      answer: text,
      usage: {
        inputTokens,
        outputTokens,
        costUsd: requestCost,
        monthlyTotalUsd: newUsage,
        monthlyLimitUsd: maxMonthly,
      },
    });
  } catch (error) {
    console.error("Errore help-bot:", error);
    return apiError(500, "Errore nella generazione della risposta.");
  }
});
