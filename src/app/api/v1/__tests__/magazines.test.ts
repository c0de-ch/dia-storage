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
  magazines: { id: "magazines.id", createdAt: "magazines.createdAt" },
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

import { GET, POST } from "@/app/api/v1/magazines/route";
import { getSessionFromCookies } from "@/lib/auth/session";

const mockUser = { id: 1, email: "test@example.com", name: "Test", active: true, role: "operator" };

describe("GET /api/v1/magazines", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionFromCookies).mockResolvedValue(mockUser as never);
  });

  it("returns paginated magazines list", async () => {
    const magazines = [
      { id: 1, name: "Caricatore 1", slotCount: 50, createdAt: new Date() },
    ];

    let selectCall = 0;
    vi.mocked(db.select).mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) {
        return { from: vi.fn().mockResolvedValue([{ total: 1 }]) } as never;
      }
      const mockOffset = vi.fn().mockResolvedValue(magazines);
      const mockLimit = vi.fn().mockReturnValue({ offset: mockOffset });
      const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
      return { from: vi.fn().mockReturnValue({ orderBy: mockOrderBy }) } as never;
    });

    const response = await GET(new NextRequest("http://localhost:3000/api/v1/magazines"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.magazines).toHaveLength(1);
  });
});

describe("POST /api/v1/magazines", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionFromCookies).mockResolvedValue(mockUser as never);
  });

  it("returns 400 when name is missing", async () => {
    const response = await POST(new NextRequest("http://localhost:3000/api/v1/magazines", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
    }));
    expect(response.status).toBe(400);
  });

  it("creates magazine with default slotCount of 50", async () => {
    const newMagazine = { id: 1, name: "Caricatore A", slotCount: 50 };
    const mockReturning = vi.fn().mockResolvedValue([newMagazine]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

    const response = await POST(new NextRequest("http://localhost:3000/api/v1/magazines", {
      method: "POST",
      body: JSON.stringify({ name: "Caricatore A" }),
      headers: { "content-type": "application/json" },
    }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.magazine.name).toBe("Caricatore A");
  });

  it("creates magazine with custom slotCount", async () => {
    const newMagazine = { id: 2, name: "Caricatore B", slotCount: 36 };
    const mockReturning = vi.fn().mockResolvedValue([newMagazine]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

    const response = await POST(new NextRequest("http://localhost:3000/api/v1/magazines", {
      method: "POST",
      body: JSON.stringify({ name: "Caricatore B", slotCount: 36 }),
      headers: { "content-type": "application/json" },
    }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.magazine.slotCount).toBe(36);
  });
});
