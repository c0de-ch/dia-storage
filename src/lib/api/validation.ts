import { NextResponse } from "next/server";
import { z, type ZodTypeAny } from "zod";

export type ParseBodyResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

/**
 * Parse and validate a request JSON body against a Zod schema.
 * Returns either the typed data or a 400 NextResponse ready to return.
 */
export async function parseJsonBody<S extends ZodTypeAny>(
  request: Request,
  schema: S
): Promise<ParseBodyResult<z.infer<S>>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, message: "Corpo della richiesta non valido." },
        { status: 400 }
      ),
    };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          message: "Dati non validi.",
          issues: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 }
      ),
    };
  }
  return { ok: true, data: parsed.data };
}

const nullableTrimmedString = z
  .string()
  .trim()
  .max(1000)
  .nullable()
  .optional();

const nonEmptyTrimmedString = z.string().trim().min(1).max(255);

// ---------------------------------------------------------------------------
// Slide PATCH
// ---------------------------------------------------------------------------
export const slidePatchSchema = z
  .object({
    title: nullableTrimmedString,
    dateTaken: nullableTrimmedString,
    location: nullableTrimmedString,
    magazineId: z.number().int().positive().nullable().optional(),
    slotNumber: z.number().int().positive().nullable().optional(),
    notes: z.string().trim().max(5000).nullable().optional(),
    status: z.enum(["incoming", "active", "deleted"]).optional(),
  })
  .strict();

export type SlidePatch = z.infer<typeof slidePatchSchema>;

// ---------------------------------------------------------------------------
// Collection PATCH
// ---------------------------------------------------------------------------
export const collectionPatchSchema = z
  .object({
    name: nonEmptyTrimmedString.optional(),
    description: z.string().trim().max(5000).nullable().optional(),
  })
  .strict();

export type CollectionPatch = z.infer<typeof collectionPatchSchema>;

// ---------------------------------------------------------------------------
// Magazine PATCH
// ---------------------------------------------------------------------------
export const magazinePatchSchema = z
  .object({
    name: nonEmptyTrimmedString.optional(),
    description: z.string().trim().max(5000).nullable().optional(),
  })
  .strict();

export type MagazinePatch = z.infer<typeof magazinePatchSchema>;

// ---------------------------------------------------------------------------
// User PATCH (admin-only)
// ---------------------------------------------------------------------------
export const userPatchSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().optional(),
    phone: z.string().trim().max(32).nullable().optional(),
    name: z.string().trim().max(255).nullable().optional(),
    role: z.enum(["admin", "operator", "viewer"]).optional(),
    otpChannel: z.enum(["email", "whatsapp"]).optional(),
  })
  .strict();

export type UserPatch = z.infer<typeof userPatchSchema>;
