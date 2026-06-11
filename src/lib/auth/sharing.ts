import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { canViewAllSlides } from "./permissions";
import type { users, collections } from "@/lib/db/schema";

type User = typeof users.$inferSelect;
type Collection = typeof collections.$inferSelect;

/** Collection ids that have been shared with `userId`. */
export async function collectionIdsSharedWith(
  userId: number
): Promise<number[]> {
  const rows = await db
    .select({ collectionId: schema.collectionShares.collectionId })
    .from(schema.collectionShares)
    .where(eq(schema.collectionShares.sharedWithUserId, userId));
  return rows.map((r) => r.collectionId);
}

/**
 * True if `slideId` belongs to at least one collection shared with `userId`.
 * Used by the image-serving and slide endpoints to grant access to slides a
 * user doesn't own but that live in an album shared with them.
 */
export async function slideSharedWithUser(
  slideId: number,
  userId: number
): Promise<boolean> {
  const [row] = await db
    .select({ collectionId: schema.slideCollections.collectionId })
    .from(schema.slideCollections)
    .innerJoin(
      schema.collectionShares,
      eq(schema.slideCollections.collectionId, schema.collectionShares.collectionId)
    )
    .where(
      and(
        eq(schema.slideCollections.slideId, slideId),
        eq(schema.collectionShares.sharedWithUserId, userId)
      )
    )
    .limit(1);
  return Boolean(row);
}

/**
 * Whether `user` may VIEW a collection: admins/editors and the owner always
 * can; otherwise only if it has been shared with them. Returns the access
 * kind so callers can distinguish owner (full management) from recipient
 * (read-only).
 */
export async function collectionAccess(
  user: User,
  collection: Collection
): Promise<"owner" | "shared" | "none"> {
  if (canViewAllSlides(user) || collection.ownerUserId === user.id) {
    return "owner";
  }
  const [row] = await db
    .select({ id: schema.collectionShares.id })
    .from(schema.collectionShares)
    .where(
      and(
        eq(schema.collectionShares.collectionId, collection.id),
        eq(schema.collectionShares.sharedWithUserId, user.id)
      )
    )
    .limit(1);
  return row ? "shared" : "none";
}

/** Fetch the collections shared with `userId` (full rows). */
export async function collectionsSharedWith(userId: number) {
  const ids = await collectionIdsSharedWith(userId);
  if (ids.length === 0) return [];
  return db
    .select()
    .from(schema.collections)
    .where(inArray(schema.collections.id, ids));
}
