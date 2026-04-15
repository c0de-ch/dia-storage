import { vi } from "vitest";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";

vi.mock("@/lib/db/schema", () => ({
  apiKeys: {
    id: "apiKeys.id",
    name: "apiKeys.name",
    key: "apiKeys.key",
    userId: "apiKeys.userId",
    createdAt: "apiKeys.createdAt",
    lastUsedAt: "apiKeys.lastUsedAt",
  },
  users: {},
}));

vi.mock("@/lib/i18n", () => ({ t: vi.fn((k: string) => k) }));

vi.mock("@/lib/auth/session", () => ({
  getSessionFromCookies: vi.fn(),
}));

vi.mock("@/lib/config/loader", () => ({
  getConfig: vi.fn(() => ({
    auth: { sessionExpiryDays: 30 },
    app: { url: "https://dia.example.com" },
  })),
}));

import { GET, POST } from "@/app/api/v1/api-keys/route";
import { getSessionFromCookies } from "@/lib/auth/session";

const mockAdmin = { id: 1, email: "admin@example.com", name: "Admin", active: true, role: "admin" };

describe("GET /api/v1/api-keys", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionFromCookies).mockResolvedValue(mockAdmin as never);
  });

  it("returns 403 for non-admin users", async () => {
    vi.mocked(getSessionFromCookies).mockResolvedValue({ ...mockAdmin, role: "operator" } as never);
    const response = await GET(new NextRequest("http://localhost:3000/api/v1/api-keys"));
    expect(response.status).toBe(403);
  });

  it("returns list of API keys for admin", async () => {
    const keys = [
      { id: 1, name: "Test Key", userId: 1, createdAt: new Date(), lastUsedAt: null },
    ];

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockResolvedValue(keys),
    } as never);

    const response = await GET(new NextRequest("http://localhost:3000/api/v1/api-keys"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.apiKeys).toHaveLength(1);
  });
});

describe("POST /api/v1/api-keys", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionFromCookies).mockResolvedValue(mockAdmin as never);
  });

  it("returns 400 when name is missing", async () => {
    const response = await POST(new NextRequest("http://localhost:3000/api/v1/api-keys", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
    }));
    expect(response.status).toBe(400);
  });

  it("creates API key and returns raw key", async () => {
    const newKey = { id: 1, name: "My Key", userId: 1, createdAt: new Date() };
    const mockReturning = vi.fn().mockResolvedValue([newKey]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

    const response = await POST(new NextRequest("http://localhost:3000/api/v1/api-keys", {
      method: "POST",
      body: JSON.stringify({ name: "My Key" }),
      headers: { "content-type": "application/json" },
    }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.apiKey.key).toMatch(/^dia_/); // raw key starts with dia_
    expect(body.apiKey.name).toBe("My Key");
  });
});
