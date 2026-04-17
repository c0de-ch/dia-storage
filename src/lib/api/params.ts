import { NextResponse } from "next/server";
import { z } from "zod";

const idSchema = z.coerce.number().int().positive();

export type ParsedIdResult =
  | { ok: true; id: number }
  | { ok: false; response: NextResponse };

export function parseIdParam(raw: string | undefined): ParsedIdResult {
  const parsed = idSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, message: "ID non valido." },
        { status: 400 }
      ),
    };
  }
  return { ok: true, id: parsed.data };
}
