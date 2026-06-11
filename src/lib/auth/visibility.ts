import { eq, type SQL } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import { canViewAllSlides } from "./permissions";
import type { users } from "@/lib/db/schema";

type User = typeof users.$inferSelect;

/**
 * Drizzle WHERE condition that scopes a slides query to what `user` may see:
 * - admins/editors: no restriction (returns undefined — caller adds nothing)
 * - regular users: only rows they uploaded
 *
 * Apply this to every list/search/count query over slides so that pagination
 * totals and results never expose another user's slides. Pair it with
 * canViewSlide() on single-row endpoints.
 */
export function slideVisibilityCondition(user: User): SQL | undefined {
  if (canViewAllSlides(user)) return undefined;
  return eq(schema.slides.uploadedBy, user.id);
}
