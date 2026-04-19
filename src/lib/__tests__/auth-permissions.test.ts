import {
  hasRole,
  isAdmin,
  isActive,
  canUpload,
  canEditSlide,
  canDeleteSlide,
  canViewSlides,
  canCreateMagazine,
  canEditMagazine,
  canDeleteMagazine,
  canCreateCollection,
  canEditCollection,
  canDeleteCollection,
  canManageUsers,
  canManageApiKeys,
  canAccessAdmin,
  canTriggerBackup,
  canViewAuditLog,
} from "@/lib/auth/permissions";
import type { users } from "@/lib/db/schema";

type User = typeof users.$inferSelect;

// ---------------------------------------------------------------------------
// Helpers — build a minimal User object for testing
// ---------------------------------------------------------------------------
function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    email: "test@example.com",
    phone: null,
    name: "Test",
    role: "user",
    otpChannel: "email",
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Role hierarchy
// ---------------------------------------------------------------------------
describe("hasRole", () => {
  it("user meets the 'user' requirement", () => {
    expect(hasRole(makeUser({ role: "user" }), "user")).toBe(true);
  });

  it("editor meets the 'user' requirement", () => {
    expect(hasRole(makeUser({ role: "editor" }), "user")).toBe(true);
  });

  it("admin meets the 'user' requirement", () => {
    expect(hasRole(makeUser({ role: "admin" }), "user")).toBe(true);
  });

  it("user does NOT meet the 'editor' requirement", () => {
    expect(hasRole(makeUser({ role: "user" }), "editor")).toBe(false);
  });

  it("user does NOT meet the 'admin' requirement", () => {
    expect(hasRole(makeUser({ role: "user" }), "admin")).toBe(false);
  });

  it("editor meets the 'editor' requirement", () => {
    expect(hasRole(makeUser({ role: "editor" }), "editor")).toBe(true);
  });

  it("editor does NOT meet the 'admin' requirement", () => {
    expect(hasRole(makeUser({ role: "editor" }), "admin")).toBe(false);
  });

  it("admin meets all role requirements", () => {
    const admin = makeUser({ role: "admin" });
    expect(hasRole(admin, "user")).toBe(true);
    expect(hasRole(admin, "editor")).toBe(true);
    expect(hasRole(admin, "admin")).toBe(true);
  });

  it("unknown role defaults to level 0 (treated as user)", () => {
    expect(hasRole(makeUser({ role: "unknown" }), "user")).toBe(true);
    expect(hasRole(makeUser({ role: "unknown" }), "editor")).toBe(false);
  });

  it("unknown required role defaults to level 0", () => {
    expect(hasRole(makeUser({ role: "user" }), "unknown")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isAdmin / isActive
// ---------------------------------------------------------------------------
describe("isAdmin", () => {
  it("returns true for admin role", () => {
    expect(isAdmin(makeUser({ role: "admin" }))).toBe(true);
  });

  it("returns false for editor role", () => {
    expect(isAdmin(makeUser({ role: "editor" }))).toBe(false);
  });

  it("returns false for user role", () => {
    expect(isAdmin(makeUser({ role: "user" }))).toBe(false);
  });
});

describe("isActive", () => {
  it("returns true when active is true", () => {
    expect(isActive(makeUser({ active: true }))).toBe(true);
  });

  it("returns false when active is false", () => {
    expect(isActive(makeUser({ active: false }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Slide permissions
// ---------------------------------------------------------------------------
describe("canUpload", () => {
  it("active user can upload", () => {
    expect(canUpload(makeUser())).toBe(true);
  });

  it("active editor can upload", () => {
    expect(canUpload(makeUser({ role: "editor" }))).toBe(true);
  });

  it("active admin can upload", () => {
    expect(canUpload(makeUser({ role: "admin" }))).toBe(true);
  });

  it("inactive user cannot upload", () => {
    expect(canUpload(makeUser({ active: false }))).toBe(false);
  });
});

describe("canViewSlides", () => {
  it("active user can view slides", () => {
    expect(canViewSlides(makeUser())).toBe(true);
  });

  it("inactive user cannot view slides", () => {
    expect(canViewSlides(makeUser({ active: false }))).toBe(false);
  });
});

describe("canEditSlide", () => {
  it("admin can edit any slide", () => {
    expect(canEditSlide(makeUser({ role: "admin" }), 999)).toBe(true);
  });

  it("editor can edit any slide", () => {
    expect(canEditSlide(makeUser({ role: "editor" }), 999)).toBe(true);
  });

  it("user can edit their own slide", () => {
    expect(canEditSlide(makeUser({ id: 5 }), 5)).toBe(true);
  });

  it("user cannot edit another user's slide", () => {
    expect(canEditSlide(makeUser({ id: 5 }), 10)).toBe(false);
  });

  it("inactive admin cannot edit", () => {
    expect(canEditSlide(makeUser({ role: "admin", active: false }), 1)).toBe(false);
  });

  it("user can edit slide when uploaderId is undefined (no owner)", () => {
    // undefined !== user.id, so this is false
    expect(canEditSlide(makeUser({ id: 5 }), undefined)).toBe(false);
  });
});

describe("canDeleteSlide", () => {
  it("admin can delete any slide", () => {
    expect(canDeleteSlide(makeUser({ role: "admin" }), 999)).toBe(true);
  });

  it("editor cannot delete another user's slide", () => {
    expect(canDeleteSlide(makeUser({ id: 2, role: "editor" }), 999)).toBe(false);
  });

  it("user can delete their own slide", () => {
    expect(canDeleteSlide(makeUser({ id: 7 }), 7)).toBe(true);
  });

  it("user cannot delete another user's slide", () => {
    expect(canDeleteSlide(makeUser({ id: 7 }), 8)).toBe(false);
  });

  it("inactive user cannot delete even their own slide", () => {
    expect(canDeleteSlide(makeUser({ id: 7, active: false }), 7)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Magazine permissions
// ---------------------------------------------------------------------------
describe("canCreateMagazine", () => {
  it("active user can create", () => {
    expect(canCreateMagazine(makeUser())).toBe(true);
  });

  it("inactive user cannot create", () => {
    expect(canCreateMagazine(makeUser({ active: false }))).toBe(false);
  });
});

describe("canEditMagazine", () => {
  it("admin can edit any magazine", () => {
    expect(canEditMagazine(makeUser({ role: "admin" }), 99)).toBe(true);
  });

  it("owner can edit their magazine", () => {
    expect(canEditMagazine(makeUser({ id: 3 }), 3)).toBe(true);
  });

  it("non-owner user cannot edit", () => {
    expect(canEditMagazine(makeUser({ id: 3 }), 4)).toBe(false);
  });

  it("inactive admin cannot edit", () => {
    expect(canEditMagazine(makeUser({ role: "admin", active: false }), 99)).toBe(false);
  });
});

describe("canDeleteMagazine", () => {
  it("admin can delete any magazine", () => {
    expect(canDeleteMagazine(makeUser({ role: "admin" }), 99)).toBe(true);
  });

  it("owner can delete their magazine", () => {
    expect(canDeleteMagazine(makeUser({ id: 3 }), 3)).toBe(true);
  });

  it("non-owner user cannot delete", () => {
    expect(canDeleteMagazine(makeUser({ id: 3 }), 4)).toBe(false);
  });

  it("inactive owner cannot delete their own magazine", () => {
    expect(canDeleteMagazine(makeUser({ id: 3, active: false }), 3)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Collection permissions
// ---------------------------------------------------------------------------
describe("canCreateCollection", () => {
  it("active user can create", () => {
    expect(canCreateCollection(makeUser())).toBe(true);
  });

  it("inactive user cannot create", () => {
    expect(canCreateCollection(makeUser({ active: false }))).toBe(false);
  });
});

describe("canEditCollection", () => {
  it("admin can edit any collection", () => {
    expect(canEditCollection(makeUser({ role: "admin" }), 99)).toBe(true);
  });

  it("owner can edit their collection", () => {
    expect(canEditCollection(makeUser({ id: 4 }), 4)).toBe(true);
  });

  it("non-owner cannot edit", () => {
    expect(canEditCollection(makeUser({ id: 4 }), 5)).toBe(false);
  });

  it("inactive owner cannot edit their own collection", () => {
    expect(canEditCollection(makeUser({ id: 4, active: false }), 4)).toBe(false);
  });
});

describe("canDeleteCollection", () => {
  it("admin can delete any collection", () => {
    expect(canDeleteCollection(makeUser({ role: "admin" }), 99)).toBe(true);
  });

  it("owner can delete their collection", () => {
    expect(canDeleteCollection(makeUser({ id: 4 }), 4)).toBe(true);
  });

  it("non-owner cannot delete", () => {
    expect(canDeleteCollection(makeUser({ id: 4 }), 5)).toBe(false);
  });

  it("inactive owner cannot delete their own collection", () => {
    expect(canDeleteCollection(makeUser({ id: 4, active: false }), 4)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Admin permissions
// ---------------------------------------------------------------------------
describe("canManageUsers", () => {
  it("admin can manage users", () => {
    expect(canManageUsers(makeUser({ role: "admin" }))).toBe(true);
  });

  it("editor cannot manage users", () => {
    expect(canManageUsers(makeUser({ role: "editor" }))).toBe(false);
  });

  it("user cannot manage users", () => {
    expect(canManageUsers(makeUser())).toBe(false);
  });

  it("inactive admin cannot manage users", () => {
    expect(canManageUsers(makeUser({ role: "admin", active: false }))).toBe(false);
  });
});

describe("canManageApiKeys", () => {
  it("admin can manage any API key", () => {
    expect(canManageApiKeys(makeUser({ role: "admin" }), 99)).toBe(true);
  });

  it("user can manage their own API key", () => {
    expect(canManageApiKeys(makeUser({ id: 5 }), 5)).toBe(true);
  });

  it("user cannot manage another user's API key", () => {
    expect(canManageApiKeys(makeUser({ id: 5 }), 6)).toBe(false);
  });

  it("inactive user cannot manage even their own key", () => {
    expect(canManageApiKeys(makeUser({ id: 5, active: false }), 5)).toBe(false);
  });
});

describe("canAccessAdmin", () => {
  it("admin can access admin panel", () => {
    expect(canAccessAdmin(makeUser({ role: "admin" }))).toBe(true);
  });

  it("editor cannot access admin panel", () => {
    expect(canAccessAdmin(makeUser({ role: "editor" }))).toBe(false);
  });
});

describe("canTriggerBackup", () => {
  it("admin can trigger backups", () => {
    expect(canTriggerBackup(makeUser({ role: "admin" }))).toBe(true);
  });

  it("editor cannot trigger backups", () => {
    expect(canTriggerBackup(makeUser({ role: "editor" }))).toBe(false);
  });
});

describe("canViewAuditLog", () => {
  it("admin can view audit log", () => {
    expect(canViewAuditLog(makeUser({ role: "admin" }))).toBe(true);
  });

  it("user cannot view audit log", () => {
    expect(canViewAuditLog(makeUser())).toBe(false);
  });

  it("inactive admin cannot view audit log", () => {
    expect(canViewAuditLog(makeUser({ role: "admin", active: false }))).toBe(false);
  });
});
