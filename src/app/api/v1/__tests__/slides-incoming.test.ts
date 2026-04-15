import { vi } from "vitest";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";

vi.mock("@/lib/db/schema", () => ({
  slides: { status: "slides.status", createdAt: "slides.createdAt" },
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

import { GET } from "@/app/api/v1/slides/incoming/route";
import { getSessionFromCookies } from "@/lib/auth/session";

const mockUser = { id: 1, email: "test@example.com", name: "Test", active: true, role: "operator" };

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost:3000/api/v1/slides/incoming");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

describe("GET /api/v1/slides/incoming", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionFromCookies).mockResolvedValue(mockUser as never);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getSessionFromCookies).mockResolvedValue(null);
    const response = await GET(makeRequest());
    expect(response.status).toBe(401);
  });

  it("returns grouped batches of incoming slides", async () => {
    const slides = [
      { id: 1, batchId: "batch-1", status: "incoming", createdAt: new Date() },
      { id: 2, batchId: "batch-1", status: "incoming", createdAt: new Date() },
      { id: 3, batchId: "batch-2", status: "incoming", createdAt: new Date() },
    ];

    let selectCall = 0;
    vi.mocked(db.select).mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) {
        const mockWhere = vi.fn().mockResolvedValue([{ total: 3 }]);
        return { from: vi.fn().mockReturnValue({ where: mockWhere }) } as never;
      }
      const mockOffset = vi.fn().mockResolvedValue(slides);
      const mockLimit = vi.fn().mockReturnValue({ offset: mockOffset });
      const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      return { from: vi.fn().mockReturnValue({ where: mockWhere }) } as never;
    });

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.batches).toHaveLength(2);
    expect(body.batches[0].batchId).toBe("batch-1");
    expect(body.batches[0].count).toBe(2);
    expect(body.total).toBe(3);
  });
});
