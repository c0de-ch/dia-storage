import { describe, it, expect } from "vitest";
import { slideVisibilityCondition } from "@/lib/auth/visibility";
import type { users } from "@/lib/db/schema";

type User = typeof users.$inferSelect;

function user(partial: Partial<User>): User {
  return {
    id: 1,
    email: "u@example.com",
    phone: null,
    name: null,
    role: "user",
    otpChannel: "email",
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...partial,
  } as User;
}

describe("slideVisibilityCondition", () => {
  it("returns undefined for admins (see all)", () => {
    expect(slideVisibilityCondition(user({ role: "admin" }))).toBeUndefined();
  });

  it("returns undefined for editors (see all)", () => {
    expect(slideVisibilityCondition(user({ role: "editor" }))).toBeUndefined();
  });

  it("returns a scoping condition for regular users", () => {
    const cond = slideVisibilityCondition(user({ id: 7, role: "user" }));
    expect(cond).toBeDefined();
  });

  it("returns a scoping condition for inactive/unknown roles", () => {
    expect(slideVisibilityCondition(user({ role: "viewer" }))).toBeDefined();
  });
});
