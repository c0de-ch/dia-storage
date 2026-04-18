import { vi } from "vitest";

vi.mock("@/lib/db", () => {
  const db: Record<string, unknown> = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    execute: vi.fn(),
  };
  db.transaction = vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(db));
  return { db };
});
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";

vi.mock("@/lib/db/schema", () => ({
  userSessions: { token: "userSessions.token" },
  users: {},
}));

vi.mock("@/lib/i18n", () => ({ t: vi.fn((k: string) => k) }));

vi.mock("@/lib/config/loader", () => ({
  getConfig: () => ({
    app: { url: "http://localhost:3000" },
    auth: { sessionExpiryDays: 30 },
  }),
}));

import { POST } from "@/app/api/v1/auth/logout/route";

const SESSION_COOKIE_NAME = "dia_session";

function makeRequest() {
  return new NextRequest("http://localhost:3000/api/v1/auth/logout", {
    method: "POST",
  });
}

describe("POST /api/v1/auth/logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 even without a session cookie", async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
      set: vi.fn(),
      delete: vi.fn(),
    } as never);

    const response = await POST(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("deletes session from DB and clears the dia_session cookie", async () => {
    const mockDelete = vi.fn();
    const mockGet = vi.fn().mockReturnValue({ value: "session-token-123" });
    const mockCookieStore = {
      get: mockGet,
      set: vi.fn(),
      delete: mockDelete,
    };
    vi.mocked(cookies).mockResolvedValue(mockCookieStore as never);

    const mockDbWhere = vi.fn().mockResolvedValue({});
    vi.mocked(db.delete).mockReturnValue({ where: mockDbWhere } as never);

    const response = await POST(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);

    // Regression: the cookie name must match what setSessionCookie uses.
    expect(mockGet).toHaveBeenCalledWith(SESSION_COOKIE_NAME);
    expect(mockDelete).toHaveBeenCalledWith(SESSION_COOKIE_NAME);
    expect(db.delete).toHaveBeenCalled();
    expect(mockDbWhere).toHaveBeenCalled();
  });

  it("does not query the DB when no session cookie is present", async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
      set: vi.fn(),
      delete: vi.fn(),
    } as never);

    await POST(makeRequest());

    expect(db.delete).not.toHaveBeenCalled();
  });
});
