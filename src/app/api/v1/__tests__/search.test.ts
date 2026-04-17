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

vi.mock("@/lib/db/schema", () => ({
  slides: {
    id: "slides.id",
    status: "slides.status",
    title: "slides.title",
    location: "slides.location",
    notes: "slides.notes",
    originalFilename: "slides.originalFilename",
    dateTaken: "slides.dateTaken",
    magazineId: "slides.magazineId",
    createdAt: "slides.createdAt",
  },
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

import { GET } from "@/app/api/v1/search/route";
import { getSessionFromCookies } from "@/lib/auth/session";

const mockUser = { id: 1, email: "test@example.com", name: "Test", active: true, role: "operator" };

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost:3000/api/v1/search");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

describe("GET /api/v1/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionFromCookies).mockResolvedValue(mockUser as never);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getSessionFromCookies).mockResolvedValue(null);
    const response = await GET(makeRequest());
    expect(response.status).toBe(401);
  });

  it("returns search results with query", async () => {
    const slides = [{ id: 1, title: "Roma 1985" }];

    let selectCall = 0;
    vi.mocked(db.select).mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) {
        const mockWhere = vi.fn().mockResolvedValue([{ total: 1 }]);
        return { from: vi.fn().mockReturnValue({ where: mockWhere }) } as never;
      }
      const mockOffset = vi.fn().mockResolvedValue(slides);
      const mockLimit = vi.fn().mockReturnValue({ offset: mockOffset });
      const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      return { from: vi.fn().mockReturnValue({ where: mockWhere }) } as never;
    });

    const response = await GET(makeRequest({ q: "Roma" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.slides).toHaveLength(1);
    expect(body.query).toBe("Roma");
    expect(body.pagination).toBeDefined();
  });

  it("returns results without query (all non-deleted slides)", async () => {
    let selectCall = 0;
    vi.mocked(db.select).mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) {
        const mockWhere = vi.fn().mockResolvedValue([{ total: 0 }]);
        return { from: vi.fn().mockReturnValue({ where: mockWhere }) } as never;
      }
      const mockOffset = vi.fn().mockResolvedValue([]);
      const mockLimit = vi.fn().mockReturnValue({ offset: mockOffset });
      const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      return { from: vi.fn().mockReturnValue({ where: mockWhere }) } as never;
    });

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.query).toBeNull();
  });
});
