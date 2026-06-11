import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { canViewAllSlides, canViewSlide } from "./permissions";
import type { users, collections, slides } from "@/lib/db/schema";

type User = typeof users.$inferSelect;
type Collection = typeof collections.$inferSelect;
type Slide = typeof slides.$inferSelect;

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

// ---------------------------------------------------------------------------
// Gallery-level sharing (an owner shares ALL their slides with a user)
// ---------------------------------------------------------------------------

/** True if `ownerId`'s whole gallery has been shared with `viewerId`. */
export async function gallerySharedWithUser(
  ownerId: number | null | undefined,
  viewerId: number
): Promise<boolean> {
  if (ownerId == null) return false;
  if (ownerId === viewerId) return true;
  const [row] = await db
    .select({ id: schema.galleryShares.id })
    .from(schema.galleryShares)
    .where(
      and(
        eq(schema.galleryShares.ownerUserId, ownerId),
        eq(schema.galleryShares.sharedWithUserId, viewerId)
      )
    )
    .limit(1);
  return Boolean(row);
}

/** Whether `user` may browse `ownerId`'s gallery: self, admin/editor, or shared. */
export async function canViewOwnerGallery(
  user: User,
  ownerId: number
): Promise<boolean> {
  if (canViewAllSlides(user) || ownerId === user.id) return true;
  return gallerySharedWithUser(ownerId, user.id);
}

/**
 * Single source of truth for "may this user access this slide record's
 * image/metadata?": own/admin/editor, OR the slide is in an album shared with
 * them, OR the slide's owner shared their whole gallery with them.
 */
export async function canAccessSlideRecord(
  user: User,
  slide: Pick<Slide, "id" | "uploadedBy">
): Promise<boolean> {
  if (canViewSlide(user, slide.uploadedBy ?? undefined)) return true;
  if (await gallerySharedWithUser(slide.uploadedBy, user.id)) return true;
  return slideSharedWithUser(slide.id, user.id);
}
