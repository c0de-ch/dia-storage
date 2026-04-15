import { vi } from "vitest";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";

vi.mock("@/lib/db/schema", () => ({
  slides: { id: "slides.id", status: "slides.status" },
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

import { GET, PATCH, DELETE } from "@/app/api/v1/slides/[id]/route";
import { getSessionFromCookies } from "@/lib/auth/session";

const mockUser = { id: 1, email: "test@example.com", name: "Test", active: true, role: "operator" };

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/v1/slides/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionFromCookies).mockResolvedValue(mockUser as never);
  });

  it("returns 404 when slide not found", async () => {
    const mockLimit = vi.fn().mockResolvedValue([]);
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    vi.mocked(db.select).mockReturnValue({ from: vi.fn().mockReturnValue({ where: mockWhere }) } as never);

    const response = await GET(
      new NextRequest("http://localhost:3000/api/v1/slides/999"),
      makeContext("999"),
    );
    expect(response.status).toBe(404);
  });

  it("returns slide when found", async () => {
    const slide = { id: 1, title: "PICT0001", status: "active" };
    const mockLimit = vi.fn().mockResolvedValue([slide]);
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    vi.mocked(db.select).mockReturnValue({ from: vi.fn().mockReturnValue({ where: mockWhere }) } as never);

    const response = await GET(
      new NextRequest("http://localhost:3000/api/v1/slides/1"),
      makeContext("1"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.slide.id).toBe(1);
  });
});

describe("PATCH /api/v1/slides/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionFromCookies).mockResolvedValue(mockUser as never);
  });

  it("returns 404 when slide not found", async () => {
    const mockLimit = vi.fn().mockResolvedValue([]);
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    vi.mocked(db.select).mockReturnValue({ from: vi.fn().mockReturnValue({ where: mockWhere }) } as never);

    const response = await PATCH(
      new NextRequest("http://localhost:3000/api/v1/slides/999", {
        method: "PATCH",
        body: JSON.stringify({ title: "New Title" }),
        headers: { "content-type": "application/json" },
      }),
      makeContext("999"),
    );
    expect(response.status).toBe(404);
  });

  it("updates slide fields and returns updated slide", async () => {
    const existingSlide = { id: 1, title: "Old Title", status: "active" };
    const updatedSlide = { id: 1, title: "New Title", status: "active" };

    const mockLimit = vi.fn().mockResolvedValue([existingSlide]);
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    vi.mocked(db.select).mockReturnValue({ from: vi.fn().mockReturnValue({ where: mockWhere }) } as never);

    const mockReturning = vi.fn().mockResolvedValue([updatedSlide]);
    const mockUpdateWhere = vi.fn().mockReturnValue({ returning: mockReturning });
    const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
    vi.mocked(db.update).mockReturnValue({ set: mockUpdateSet } as never);

    const response = await PATCH(
      new NextRequest("http://localhost:3000/api/v1/slides/1", {
        method: "PATCH",
        body: JSON.stringify({ title: "New Title" }),
        headers: { "content-type": "application/json" },
      }),
      makeContext("1"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.slide.title).toBe("New Title");
  });
});

describe("DELETE /api/v1/slides/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionFromCookies).mockResolvedValue(mockUser as never);
  });

  it("returns 404 when slide not found", async () => {
    const mockLimit = vi.fn().mockResolvedValue([]);
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    vi.mocked(db.select).mockReturnValue({ from: vi.fn().mockReturnValue({ where: mockWhere }) } as never);

    const response = await DELETE(
      new NextRequest("http://localhost:3000/api/v1/slides/999", { method: "DELETE" }),
      makeContext("999"),
    );
    expect(response.status).toBe(404);
  });

  it("soft-deletes the slide by setting status to deleted", async () => {
    const slide = { id: 1, title: "PICT0001", status: "active" };
    const mockLimit = vi.fn().mockResolvedValue([slide]);
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    vi.mocked(db.select).mockReturnValue({ from: vi.fn().mockReturnValue({ where: mockWhere }) } as never);

    const deletedSlide = { ...slide, status: "deleted" };
    const mockReturning = vi.fn().mockResolvedValue([deletedSlide]);
    const mockUpdateWhere = vi.fn().mockReturnValue({ returning: mockReturning });
    const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
    vi.mocked(db.update).mockReturnValue({ set: mockUpdateSet } as never);

    const response = await DELETE(
      new NextRequest("http://localhost:3000/api/v1/slides/1", { method: "DELETE" }),
      makeContext("1"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(db.update).toHaveBeenCalled();
  });
});
