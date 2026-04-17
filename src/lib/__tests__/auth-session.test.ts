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
import { db } from "@/lib/db";
import { cookies } from "next/headers";

// Mock config loader
vi.mock("@/lib/config/loader", () => ({
  getConfig: vi.fn(() => ({
    auth: {
      sessionExpiryDays: 30,
    },
    app: {
      url: "https://dia.example.com",
    },
  })),
}));

import {
  createSession,
  validateSession,
  deleteSession,
  setSessionCookie,
  clearSessionCookie,
  getSessionFromCookies,
  getSessionToken,
} from "@/lib/auth/session";
import { getConfig } from "@/lib/config/loader";

// ---------------------------------------------------------------------------
// Helper: build a mock user object matching the users table shape
// ---------------------------------------------------------------------------
function mockUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    email: "test@example.com",
    phone: null,
    name: "Test User",
    role: "user",
    otpChannel: "email",
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// createSession
// ---------------------------------------------------------------------------
describe("createSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inserts a session into the database and returns a token", async () => {
    const mockValues = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([]) });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

    const token = await createSession(1);

    expect(typeof token).toBe("string");
    expect(token.length).toBe(48);
    expect(db.insert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        token: expect.any(String),
        expiresAt: expect.any(Date),
      })
    );
  });

  it("sets expiry based on config sessionExpiryDays", async () => {
    vi.mocked(getConfig).mockReturnValue({
      auth: { sessionExpiryDays: 7 },
      app: { url: "https://dia.example.com" },
    } as ReturnType<typeof getConfig>);

    const mockValues = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([]) });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

    const before = Date.now();
    await createSession(1);
    const after = Date.now();

    const passedValues = mockValues.mock.calls[0][0];
    const expiresAt = passedValues.expiresAt as Date;
    const expectedMin = before + 7 * 24 * 60 * 60 * 1000;
    const expectedMax = after + 7 * 24 * 60 * 60 * 1000;

    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMin);
    expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedMax);
  });

  it("generates unique tokens for each call", async () => {
    const mockValues = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([]) });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

    const token1 = await createSession(1);
    const token2 = await createSession(1);

    expect(token1).not.toBe(token2);
  });
});

// ---------------------------------------------------------------------------
// validateSession
// ---------------------------------------------------------------------------
describe("validateSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the user when session is valid", async () => {
    const user = mockUser();
    const mockLimit = vi.fn().mockResolvedValue([{ session: {}, user }]);
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockInnerJoin = vi.fn().mockReturnValue({ where: mockWhere });
    const mockFrom = vi.fn().mockReturnValue({ innerJoin: mockInnerJoin });
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

    const result = await validateSession("valid-token");

    expect(result).toEqual(user);
    expect(db.select).toHaveBeenCalled();
  });

  it("returns null when no matching session is found", async () => {
    const mockLimit = vi.fn().mockResolvedValue([]);
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockInnerJoin = vi.fn().mockReturnValue({ where: mockWhere });
    const mockFrom = vi.fn().mockReturnValue({ innerJoin: mockInnerJoin });
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

    const result = await validateSession("invalid-token");

    expect(result).toBeNull();
  });

  it("returns null when user is inactive", async () => {
    const user = mockUser({ active: false });
    const mockLimit = vi.fn().mockResolvedValue([{ session: {}, user }]);
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockInnerJoin = vi.fn().mockReturnValue({ where: mockWhere });
    const mockFrom = vi.fn().mockReturnValue({ innerJoin: mockInnerJoin });
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

    const result = await validateSession("valid-token-inactive-user");

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// deleteSession
// ---------------------------------------------------------------------------
describe("deleteSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes the session from the database", async () => {
    const mockWhere = vi.fn().mockResolvedValue({});
    vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as never);

    await deleteSession("token-to-delete");

    expect(db.delete).toHaveBeenCalled();
    expect(mockWhere).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// setSessionCookie
// ---------------------------------------------------------------------------
describe("setSessionCookie", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getConfig).mockReturnValue({
      auth: { sessionExpiryDays: 30 },
      app: { url: "https://dia.example.com" },
    } as ReturnType<typeof getConfig>);
  });

  it("sets a session cookie with correct name and options", async () => {
    const mockSet = vi.fn();
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn(),
      set: mockSet,
      delete: vi.fn(),
    } as never);

    await setSessionCookie("my-session-token");

    expect(mockSet).toHaveBeenCalledWith("dia_session", "my-session-token", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
  });

  it("sets secure=false for http URLs", async () => {
    vi.mocked(getConfig).mockReturnValue({
      auth: { sessionExpiryDays: 30 },
      app: { url: "http://localhost:3000" },
    } as ReturnType<typeof getConfig>);

    const mockSet = vi.fn();
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn(),
      set: mockSet,
      delete: vi.fn(),
    } as never);

    await setSessionCookie("my-token");

    expect(mockSet).toHaveBeenCalledWith(
      "dia_session",
      "my-token",
      expect.objectContaining({ secure: false })
    );
  });
});

// ---------------------------------------------------------------------------
// clearSessionCookie
// ---------------------------------------------------------------------------
describe("clearSessionCookie", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes the session cookie", async () => {
    const mockDelete = vi.fn();
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn(),
      set: vi.fn(),
      delete: mockDelete,
    } as never);

    await clearSessionCookie();

    expect(mockDelete).toHaveBeenCalledWith("dia_session");
  });
});

// ---------------------------------------------------------------------------
// getSessionFromCookies
// ---------------------------------------------------------------------------
describe("getSessionFromCookies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no session cookie is present", async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
      set: vi.fn(),
      delete: vi.fn(),
    } as never);

    // validateSession won't be called — mock db to return empty anyway
    const mockLimit = vi.fn().mockResolvedValue([]);
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockInnerJoin = vi.fn().mockReturnValue({ where: mockWhere });
    const mockFrom = vi.fn().mockReturnValue({ innerJoin: mockInnerJoin });
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

    const result = await getSessionFromCookies();

    expect(result).toBeNull();
    expect(db.select).not.toHaveBeenCalled();
  });

  it("returns user when a valid session cookie is present", async () => {
    const user = mockUser();
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "valid-token" }),
      set: vi.fn(),
      delete: vi.fn(),
    } as never);

    const mockLimit = vi.fn().mockResolvedValue([{ session: {}, user }]);
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockInnerJoin = vi.fn().mockReturnValue({ where: mockWhere });
    const mockFrom = vi.fn().mockReturnValue({ innerJoin: mockInnerJoin });
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

    const result = await getSessionFromCookies();

    expect(result).toEqual(user);
    expect(db.select).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// getSessionToken
// ---------------------------------------------------------------------------
describe("getSessionToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the token when cookie is present", async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "my-token" }),
      set: vi.fn(),
      delete: vi.fn(),
    } as never);

    const result = await getSessionToken();
    expect(result).toBe("my-token");
  });

  it("returns null when cookie is not present", async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
      set: vi.fn(),
      delete: vi.fn(),
    } as never);

    const result = await getSessionToken();
    expect(result).toBeNull();
  });
});
