import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { canEditMagazine } from "@/lib/auth/permissions";
import type { users } from "@/lib/db/schema";

type User = typeof users.$inferSelect;

/**
 * Whether `user` may assign a slide to `magazineId`. Assigning to null/undefined
 * (i.e. removing the magazine) is always allowed. Otherwise the magazine must
 * exist and be one the user can edit — preventing a user from moving slides into
 * another user's magazine. Use in every slide-update path that accepts
 * magazineId (PATCH, archive, batch).
 */
export async function canAssignMagazine(
  user: User,
  magazineId: unknown
): Promise<boolean> {
  if (magazineId === undefined || magazineId === null) return true;
  const id = Number(magazineId);
  if (!Number.isInteger(id)) return false;
  const [magazine] = await db
    .select()
    .from(schema.magazines)
    .where(eq(schema.magazines.id, id))
    .limit(1);
  if (!magazine) return false;
  return canEditMagazine(user, magazine.ownerUserId ?? undefined);
}
