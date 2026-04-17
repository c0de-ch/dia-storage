import { vi } from "vitest";

// Mock next/headers cookies/headers. This is runtime-provided in Next.js and
// cannot be imported outside a request context, so it has to be stubbed here.
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
  headers: vi.fn(() => new Map()),
}));

// NOTE: no global mock for `@/lib/db`. Each test file that touches the
// database must declare its own `vi.mock("@/lib/db", ...)` shaped to the
// specific queries it exercises. A blanket mock here would let broken
// queries pass tests (we were burned by this: the API-key middleware bug
// in #1 would have been caught by a realistic mock that matched rows only
// on the hashed key).
