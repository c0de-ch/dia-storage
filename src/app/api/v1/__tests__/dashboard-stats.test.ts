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
  slides: { status: "slides.status" },
  magazines: {},
  users: {},
  apiKeys: {},
}));

vi.mock("@/lib/auth/session", () => ({
  getSessionFromCookies: vi.fn(),
}));

vi.mock("@/lib/config/loader", () => ({
  getConfig: vi.fn(() => ({
    auth: { sessionExpiryDays: 30 },
    app: { url: "https://dia.example.com" },
  })),
}));

import { GET } from "@/app/api/v1/dashboard/stats/route";
import { getSessionFromCookies } from "@/lib/auth/session";

const mockUser = { id: 1, email: "test@example.com", name: "Test", active: true, role: "operator" };

describe("GET /api/v1/dashboard/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionFromCookies).mockResolvedValue(mockUser as never);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getSessionFromCookies).mockResolvedValue(null);
    const response = await GET(new NextRequest("http://localhost:3000/api/v1/dashboard/stats"));
    expect(response.status).toBe(401);
  });

  it("returns dashboard statistics", async () => {
    let selectCall = 0;
    vi.mocked(db.select).mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) {
        // Slide stats
        return { from: vi.fn().mockResolvedValue([{ total: 150, incoming: 12 }]) } as never;
      }
      // Magazine count
      return { from: vi.fn().mockResolvedValue([{ total: 5 }]) } as never;
    });

    const response = await GET(new NextRequest("http://localhost:3000/api/v1/dashboard/stats"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.totalSlides).toBe(150);
    expect(body.incomingCount).toBe(12);
    expect(body.magazinesCount).toBe(5);
  });
});
