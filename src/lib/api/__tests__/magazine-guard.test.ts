import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({ db: { select: vi.fn() } }));
vi.mock("@/lib/db/schema", () => ({
  magazines: { id: "magazines.id" },
}));

import { db } from "@/lib/db";
import { canAssignMagazine } from "@/lib/api/magazine-guard";
import type { users } from "@/lib/db/schema";

type User = typeof users.$inferSelect;

function asUser(p: Partial<User>): User {
  return { id: 1, role: "user", active: true, ...p } as User;
}

function mockMagazineRow(row: unknown | null) {
  const limit = vi.fn().mockResolvedValue(row ? [row] : []);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  vi.mocked(db.select).mockReturnValue({ from } as never);
}

describe("canAssignMagazine", () => {
  beforeEach(() => vi.clearAllMocks());

  it("allows null/undefined (removing the magazine) without a DB hit", async () => {
    expect(await canAssignMagazine(asUser({}), null)).toBe(true);
    expect(await canAssignMagazine(asUser({}), undefined)).toBe(true);
    expect(db.select).not.toHaveBeenCalled();
  });

  it("rejects non-integer ids", async () => {
    expect(await canAssignMagazine(asUser({}), "abc")).toBe(false);
    expect(await canAssignMagazine(asUser({}), 1.5)).toBe(false);
  });

  it("rejects a magazine that does not exist", async () => {
    mockMagazineRow(null);
    expect(await canAssignMagazine(asUser({ id: 1 }), 42)).toBe(false);
  });

  it("allows the owner to assign their own magazine", async () => {
    mockMagazineRow({ id: 42, ownerUserId: 1 });
    expect(await canAssignMagazine(asUser({ id: 1, role: "user" }), 42)).toBe(true);
  });

  it("rejects assigning another user's magazine (non-admin)", async () => {
    mockMagazineRow({ id: 42, ownerUserId: 999 });
    expect(await canAssignMagazine(asUser({ id: 1, role: "user" }), 42)).toBe(false);
  });

  it("allows an admin to assign any magazine", async () => {
    mockMagazineRow({ id: 42, ownerUserId: 999 });
    expect(await canAssignMagazine(asUser({ id: 1, role: "admin" }), 42)).toBe(true);
  });
});
