import { vi } from "vitest";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

// Mock config loader
vi.mock("@/lib/config/loader", () => ({
  getConfig: vi.fn(() => ({
    auth: { sessionExpiryDays: 30 },
    app: { url: "https://dia.example.com" },
  })),
}));

// Mock the session module
vi.mock("@/lib/auth/session", () => ({
  getSessionFromCookies: vi.fn(),
}));

import { withAuth, withAdmin, withApiKey } from "@/lib/auth/middleware";
import { getSessionFromCookies } from "@/lib/auth/session";
import type { AuthenticatedRequest } from "@/lib/auth/middleware";

// ---------------------------------------------------------------------------
// Helper: build a mock user
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

function makeRequest(url = "http://localhost:3000/api/v1/test", headers?: Record<string, string>) {
  return new NextRequest(url, { headers });
}

// ---------------------------------------------------------------------------
// withAuth
// ---------------------------------------------------------------------------
describe("withAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no session is found", async () => {
    vi.mocked(getSessionFromCookies).mockResolvedValue(null);

    const handler = vi.fn();
    const wrapped = withAuth(handler);
    const response = await wrapped(makeRequest());

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBeDefined();
    expect(handler).not.toHaveBeenCalled();
  });

  it("returns 403 when user is inactive", async () => {
    const inactiveUser = mockUser({ active: false });
    vi.mocked(getSessionFromCookies).mockResolvedValue(inactiveUser as never);

    const handler = vi.fn();
    const wrapped = withAuth(handler);
    const response = await wrapped(makeRequest());

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBeDefined();
    expect(handler).not.toHaveBeenCalled();
  });

  it("calls handler with user attached to request when session is valid", async () => {
    const user = mockUser();
    vi.mocked(getSessionFromCookies).mockResolvedValue(user as never);

    const handler = vi.fn().mockResolvedValue(new Response("OK", { status: 200 }));
    const wrapped = withAuth(handler);
    const response = await wrapped(makeRequest());

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledTimes(1);

    const passedReq = handler.mock.calls[0][0] as AuthenticatedRequest;
    expect(passedReq.user).toEqual(user);
  });

  it("passes context through to the handler", async () => {
    const user = mockUser();
    vi.mocked(getSessionFromCookies).mockResolvedValue(user as never);

    const handler = vi.fn().mockResolvedValue(new Response("OK"));
    const wrapped = withAuth(handler);
    const context = { params: { id: "42" } };

    await wrapped(makeRequest(), context);

    expect(handler).toHaveBeenCalledWith(expect.anything(), context);
  });
});

// ---------------------------------------------------------------------------
// withAdmin
// ---------------------------------------------------------------------------
describe("withAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no session is found", async () => {
    vi.mocked(getSessionFromCookies).mockResolvedValue(null);

    const handler = vi.fn();
    const wrapped = withAdmin(handler);
    const response = await wrapped(makeRequest());

    expect(response.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it("returns 403 when user is not an admin", async () => {
    const user = mockUser({ role: "user" });
    vi.mocked(getSessionFromCookies).mockResolvedValue(user as never);

    const handler = vi.fn();
    const wrapped = withAdmin(handler);
    const response = await wrapped(makeRequest());

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBeDefined();
    expect(handler).not.toHaveBeenCalled();
  });

  it("returns 403 for editor role (not admin)", async () => {
    const user = mockUser({ role: "editor" });
    vi.mocked(getSessionFromCookies).mockResolvedValue(user as never);

    const handler = vi.fn();
    const wrapped = withAdmin(handler);
    const response = await wrapped(makeRequest());

    expect(response.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it("calls handler when user is an admin", async () => {
    const adminUser = mockUser({ role: "admin" });
    vi.mocked(getSessionFromCookies).mockResolvedValue(adminUser as never);

    const handler = vi.fn().mockResolvedValue(new Response("OK", { status: 200 }));
    const wrapped = withAdmin(handler);
    const response = await wrapped(makeRequest());

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledTimes(1);

    const passedReq = handler.mock.calls[0][0] as AuthenticatedRequest;
    expect(passedReq.user.role).toBe("admin");
  });
});

// ---------------------------------------------------------------------------
// withApiKey
// ---------------------------------------------------------------------------
describe("withApiKey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no X-Api-Key header is provided", async () => {
    const handler = vi.fn();
    const wrapped = withApiKey(handler);
    const response = await wrapped(makeRequest());

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBeDefined();
    expect(handler).not.toHaveBeenCalled();
  });

  it("returns 401 when the API key is not found in the database", async () => {
    const mockLimit = vi.fn().mockResolvedValue([]);
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockInnerJoin = vi.fn().mockReturnValue({ where: mockWhere });
    const mockFrom = vi.fn().mockReturnValue({ innerJoin: mockInnerJoin });
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

    const handler = vi.fn();
    const wrapped = withApiKey(handler);
    const response = await wrapped(makeRequest("http://localhost:3000/api/v1/test", {
      "x-api-key": "invalid-key",
    }));

    expect(response.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it("returns 403 when the API key owner is inactive", async () => {
    const user = mockUser({ active: false });
    const apiKey = { id: 1, key: "valid-key", userId: 1, name: "Test Key", lastUsedAt: null, createdAt: new Date() };
    const mockLimit = vi.fn().mockResolvedValue([{ apiKey, user }]);
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockInnerJoin = vi.fn().mockReturnValue({ where: mockWhere });
    const mockFrom = vi.fn().mockReturnValue({ innerJoin: mockInnerJoin });
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

    const handler = vi.fn();
    const wrapped = withApiKey(handler);
    const response = await wrapped(makeRequest("http://localhost:3000/api/v1/test", {
      "x-api-key": "valid-key",
    }));

    expect(response.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it("calls handler and updates lastUsedAt when API key is valid", async () => {
    const user = mockUser();
    const apiKey = { id: 5, key: "valid-key", userId: 1, name: "Test Key", lastUsedAt: null, createdAt: new Date() };
    const mockLimit = vi.fn().mockResolvedValue([{ apiKey, user }]);
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockInnerJoin = vi.fn().mockReturnValue({ where: mockWhere });
    const mockFrom = vi.fn().mockReturnValue({ innerJoin: mockInnerJoin });
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

    const mockUpdateWhere = vi.fn().mockResolvedValue({});
    const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
    vi.mocked(db.update).mockReturnValue({ set: mockUpdateSet } as never);

    const handler = vi.fn().mockResolvedValue(new Response("OK", { status: 200 }));
    const wrapped = withApiKey(handler);
    const response = await wrapped(makeRequest("http://localhost:3000/api/v1/test", {
      "x-api-key": "valid-key",
    }));

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(db.update).toHaveBeenCalled();
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ lastUsedAt: expect.any(Date) })
    );

    const passedReq = handler.mock.calls[0][0] as AuthenticatedRequest;
    expect(passedReq.user).toEqual(user);
  });
});
