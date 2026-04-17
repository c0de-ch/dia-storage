import { vi } from "vitest";

// Mock next/headers cookies
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
  headers: vi.fn(() => new Map()),
}));

// Mock database by default — tests can override.
// Transactions invoke the callback with the same `db` reference so per-test
// mocks like `vi.mocked(db.insert).mockReturnValue(...)` apply inside tx too.
vi.mock("@/lib/db", () => {
  const db: Record<string, unknown> = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => []),
        })),
        innerJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => []),
          })),
        })),
        orderBy: vi.fn(() => ({
          limit: vi.fn(() => []),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => []),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({})),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => ({})),
    })),
    execute: vi.fn(),
  };
  db.transaction = vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(db));
  return { db };
});
