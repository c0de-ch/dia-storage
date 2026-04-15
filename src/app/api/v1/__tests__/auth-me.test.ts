import { vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db/schema", () => ({
  users: {},
  apiKeys: {},
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

import { GET } from "@/app/api/v1/auth/me/route";
import { getSessionFromCookies } from "@/lib/auth/session";

const mockUser = {
  id: 1,
  email: "test@example.com",
  name: "Test User",
  active: true,
  role: "operator",
};

describe("GET /api/v1/auth/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getSessionFromCookies).mockResolvedValue(null);

    const response = await GET(new NextRequest("http://localhost:3000/api/v1/auth/me"));
    expect(response.status).toBe(401);
  });

  it("returns user data when authenticated", async () => {
    vi.mocked(getSessionFromCookies).mockResolvedValue(mockUser as never);

    const response = await GET(new NextRequest("http://localhost:3000/api/v1/auth/me"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.user.email).toBe("test@example.com");
  });
});
