import { vi } from "vitest";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";

vi.mock("@/lib/db/schema", () => ({
  slides: { id: "slides.id", batchId: "slides.batchId", status: "slides.status" },
  users: {},
  apiKeys: {},
}));

vi.mock("fs/promises", () => ({
  rm: vi.fn().mockResolvedValue(undefined),
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

import { POST as deletePost } from "@/app/api/v1/slides/batch/delete/route";
import { POST as archivePost } from "@/app/api/v1/slides/batch/archive/route";
import { getSessionFromCookies } from "@/lib/auth/session";

const mockUser = { id: 1, email: "test@example.com", name: "Test", active: true, role: "operator" };

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/v1/slides/batch/delete", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/v1/slides/batch/delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionFromCookies).mockResolvedValue(mockUser as never);
  });

  it("returns 400 when batchId is missing", async () => {
    const response = await deletePost(makeRequest({}));
    expect(response.status).toBe(400);
  });

  it("returns 404 when no incoming slides found for batch", async () => {
    const mockWhere = vi.fn().mockResolvedValue([]);
    vi.mocked(db.select).mockReturnValue({ from: vi.fn().mockReturnValue({ where: mockWhere }) } as never);

    const response = await deletePost(makeRequest({ batchId: "non-existent" }));
    expect(response.status).toBe(404);
  });

  it("hard-deletes all incoming slides in the batch", async () => {
    const slides = [
      { id: 1, batchId: "batch-1", status: "incoming", storagePath: null, thumbnailPath: null, mediumPath: null },
      { id: 2, batchId: "batch-1", status: "incoming", storagePath: null, thumbnailPath: null, mediumPath: null },
    ];

    const mockWhere = vi.fn().mockResolvedValue(slides);
    vi.mocked(db.select).mockReturnValue({ from: vi.fn().mockReturnValue({ where: mockWhere }) } as never);

    const mockDeleteWhere = vi.fn().mockResolvedValue({});
    vi.mocked(db.delete).mockReturnValue({ where: mockDeleteWhere } as never);

    const response = await deletePost(makeRequest({ batchId: "batch-1" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.count).toBe(2);
    expect(db.delete).toHaveBeenCalled();
  });
});

describe("POST /api/v1/slides/batch/archive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionFromCookies).mockResolvedValue(mockUser as never);
  });

  it("returns 400 when batchId is missing", async () => {
    const response = await archivePost(makeRequest({}));
    expect(response.status).toBe(400);
  });

  it("archives slides and applies metadata", async () => {
    const slides = [
      { id: 1, batchId: "batch-1", status: "incoming" },
      { id: 2, batchId: "batch-1", status: "incoming" },
    ];

    const mockWhere = vi.fn().mockResolvedValue(slides);
    vi.mocked(db.select).mockReturnValue({ from: vi.fn().mockReturnValue({ where: mockWhere }) } as never);

    const mockUpdateWhere = vi.fn().mockResolvedValue({});
    const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
    vi.mocked(db.update).mockReturnValue({ set: mockUpdateSet } as never);

    const response = await archivePost(makeRequest({
      batchId: "batch-1",
      metadata: { title: "Vacanze 1985", location: "Roma" },
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.count).toBe(2);
  });
});
