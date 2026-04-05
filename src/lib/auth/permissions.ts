import type { users } from "@/lib/db/schema";

type User = typeof users.$inferSelect;

// ---------------------------------------------------------------------------
// Role hierarchy
// ---------------------------------------------------------------------------
const ROLE_LEVELS: Record<string, number> = {
  user: 0,
  editor: 1,
  admin: 2,
};

function roleLevel(role: string): number {
  return ROLE_LEVELS[role] ?? 0;
}

// ---------------------------------------------------------------------------
// General permission checks
// ---------------------------------------------------------------------------

/**
 * Check if a user has at least the given role level.
 */
export function hasRole(user: User, requiredRole: string): boolean {
  return roleLevel(user.role) >= roleLevel(requiredRole);
}

/**
 * Check if the user is an admin.
 */
export function isAdmin(user: User): boolean {
  return user.role === "admin";
}

/**
 * Check if the user is active.
 */
export function isActive(user: User): boolean {
  return user.active;
}

// ---------------------------------------------------------------------------
// Slide permissions
// ---------------------------------------------------------------------------

/**
 * Can the user upload slides?
 */
export function canUpload(user: User): boolean {
  return isActive(user) && hasRole(user, "user");
}

/**
 * Can the user edit slide metadata?
 */
export function canEditSlide(user: User, slideUploaderId?: number): boolean {
  if (!isActive(user)) return false;
  if (isAdmin(user)) return true;
  if (hasRole(user, "editor")) return true;
  // Regular users can only edit their own uploads
  return slideUploaderId === user.id;
}

/**
 * Can the user delete a slide?
 */
export function canDeleteSlide(user: User, slideUploaderId?: number): boolean {
  if (!isActive(user)) return false;
  if (isAdmin(user)) return true;
  // Only admin and the uploader can delete
  return slideUploaderId === user.id;
}

/**
 * Can the user view slides?
 */
export function canViewSlides(user: User): boolean {
  return isActive(user);
}

// ---------------------------------------------------------------------------
// Magazine permissions
// ---------------------------------------------------------------------------

/**
 * Can the user create magazines?
 */
export function canCreateMagazine(user: User): boolean {
  return isActive(user) && hasRole(user, "user");
}

/**
 * Can the user edit a magazine?
 */
export function canEditMagazine(user: User, ownerId?: number): boolean {
  if (!isActive(user)) return false;
  if (isAdmin(user)) return true;
  return ownerId === user.id;
}

/**
 * Can the user delete a magazine?
 */
export function canDeleteMagazine(user: User, ownerId?: number): boolean {
  if (!isActive(user)) return false;
  if (isAdmin(user)) return true;
  return ownerId === user.id;
}

// ---------------------------------------------------------------------------
// Collection permissions
// ---------------------------------------------------------------------------

/**
 * Can the user create collections?
 */
export function canCreateCollection(user: User): boolean {
  return isActive(user) && hasRole(user, "user");
}

/**
 * Can the user edit a collection?
 */
export function canEditCollection(user: User, ownerId?: number): boolean {
  if (!isActive(user)) return false;
  if (isAdmin(user)) return true;
  return ownerId === user.id;
}

/**
 * Can the user delete a collection?
 */
export function canDeleteCollection(user: User, ownerId?: number): boolean {
  if (!isActive(user)) return false;
  if (isAdmin(user)) return true;
  return ownerId === user.id;
}

// ---------------------------------------------------------------------------
// Admin permissions
// ---------------------------------------------------------------------------

/**
 * Can the user manage other users?
 */
export function canManageUsers(user: User): boolean {
  return isActive(user) && isAdmin(user);
}

/**
 * Can the user manage API keys?
 */
export function canManageApiKeys(
  user: User,
  keyOwnerId?: number
): boolean {
  if (!isActive(user)) return false;
  if (isAdmin(user)) return true;
  return keyOwnerId === user.id;
}

/**
 * Can the user access admin settings?
 */
export function canAccessAdmin(user: User): boolean {
  return isActive(user) && isAdmin(user);
}

/**
 * Can the user trigger backups?
 */
export function canTriggerBackup(user: User): boolean {
  return isActive(user) && isAdmin(user);
}

/**
 * Can the user view audit logs?
 */
export function canViewAuditLog(user: User): boolean {
  return isActive(user) && isAdmin(user);
}
