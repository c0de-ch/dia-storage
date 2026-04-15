import { vi } from "vitest";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";

vi.mock("@/lib/db/schema", () => ({
  slides: {
    id: "slides.id",
    status: "slides.status",
    magazineId: "slides.magazineId",
    createdAt: "slides.createdAt",
    title: "slides.title",
    dateTakenPrecise: "slides.dateTakenPrecise",
    storagePath: "slides.storagePath",
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

import { GET } from "@/app/api/v1/slides/route";
import { getSessionFromCookies } from "@/lib/auth/session";

const mockUser = {
  id: 1,
  email: "test@example.com",
  name: "Test",
  active: true,
  role: "operator",
};

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost:3000/api/v1/slides");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

describe("GET /api/v1/slides", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionFromCookies).mockResolvedValue(mockUser as never);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getSessionFromCookies).mockResolvedValue(null);
    const response = await GET(makeRequest());
    expect(response.status).toBe(401);
  });

  it("returns paginated slides list", async () => {
    const mockSlides = [
      { id: 1, title: "PICT0001", storagePath: "/data/originals/1", status: "active" },
      { id: 2, title: "PICT0002", storagePath: "/data/originals/2", status: "active" },
    ];

    // First select: count
    // Second select: slides
    let selectCall = 0;
    vi.mocked(db.select).mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) {
        // Count query
        const mockWhere = vi.fn().mockResolvedValue([{ total: 2 }]);
        return { from: vi.fn().mockReturnValue({ where: mockWhere }) } as never;
      }
      // Data query
      const mockOffset = vi.fn().mockResolvedValue(mockSlides);
      const mockLimit = vi.fn().mockReturnValue({ offset: mockOffset });
      const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      return { from: vi.fn().mockReturnValue({ where: mockWhere }) } as never;
    });

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.slides).toHaveLength(2);
    expect(body.pagination).toBeDefined();
    expect(body.pagination.total).toBe(2);
  });

  it("respects pagination parameters", async () => {
    let selectCall = 0;
    vi.mocked(db.select).mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) {
        const mockWhere = vi.fn().mockResolvedValue([{ total: 100 }]);
        return { from: vi.fn().mockReturnValue({ where: mockWhere }) } as never;
      }
      const mockOffset = vi.fn().mockResolvedValue([]);
      const mockLimit = vi.fn().mockReturnValue({ offset: mockOffset });
      const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      return { from: vi.fn().mockReturnValue({ where: mockWhere }) } as never;
    });

    const response = await GET(makeRequest({ page: "2", limit: "10" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.pagination.page).toBe(2);
    expect(body.pagination.limit).toBe(10);
    expect(body.pagination.totalPages).toBe(10);
  });

  it("adds thumbnail and medium URLs to slides with storagePath", async () => {
    let selectCall = 0;
    vi.mocked(db.select).mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) {
        const mockWhere = vi.fn().mockResolvedValue([{ total: 1 }]);
        return { from: vi.fn().mockReturnValue({ where: mockWhere }) } as never;
      }
      const slides = [{ id: 5, storagePath: "/path/to/file" }];
      const mockOffset = vi.fn().mockResolvedValue(slides);
      const mockLimit = vi.fn().mockReturnValue({ offset: mockOffset });
      const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      return { from: vi.fn().mockReturnValue({ where: mockWhere }) } as never;
    });

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(body.slides[0].thumbnailUrl).toBe("/api/v1/slides/5/thumbnail");
    expect(body.slides[0].mediumUrl).toBe("/api/v1/slides/5/medium");
  });
});
