import { vi } from "vitest";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";

vi.mock("@/lib/db/schema", () => ({
  collections: { id: "collections.id", createdAt: "collections.createdAt" },
  slideCollections: { collectionId: "slideCollections.collectionId", slideId: "slideCollections.slideId" },
  slides: { id: "slides.id" },
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

import { GET, POST } from "@/app/api/v1/collections/route";
import { GET as getById, PATCH, DELETE } from "@/app/api/v1/collections/[id]/route";
import { getSessionFromCookies } from "@/lib/auth/session";

const mockUser = { id: 1, email: "test@example.com", name: "Test", active: true, role: "operator" };

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/v1/collections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionFromCookies).mockResolvedValue(mockUser as never);
  });

  it("returns paginated collections", async () => {
    const collections = [
      { id: 1, name: "Vacanze", createdAt: new Date() },
      { id: 2, name: "Famiglia", createdAt: new Date() },
    ];

    let selectCall = 0;
    vi.mocked(db.select).mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) {
        return { from: vi.fn().mockResolvedValue([{ total: 2 }]) } as never;
      }
      const mockOffset = vi.fn().mockResolvedValue(collections);
      const mockLimit = vi.fn().mockReturnValue({ offset: mockOffset });
      const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
      return { from: vi.fn().mockReturnValue({ orderBy: mockOrderBy }) } as never;
    });

    const response = await GET(new NextRequest("http://localhost:3000/api/v1/collections"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.collections).toHaveLength(2);
    expect(body.pagination.total).toBe(2);
  });
});

describe("POST /api/v1/collections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionFromCookies).mockResolvedValue(mockUser as never);
  });

  it("returns 400 when name is missing", async () => {
    const response = await POST(new NextRequest("http://localhost:3000/api/v1/collections", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
    }));
    expect(response.status).toBe(400);
  });

  it("creates collection and returns 201", async () => {
    const newCollection = { id: 1, name: "Vacanze", description: null };
    const mockReturning = vi.fn().mockResolvedValue([newCollection]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

    const response = await POST(new NextRequest("http://localhost:3000/api/v1/collections", {
      method: "POST",
      body: JSON.stringify({ name: "Vacanze" }),
      headers: { "content-type": "application/json" },
    }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.collection.name).toBe("Vacanze");
  });
});

describe("GET /api/v1/collections/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionFromCookies).mockResolvedValue(mockUser as never);
  });

  it("returns 404 when collection not found", async () => {
    const mockLimit = vi.fn().mockResolvedValue([]);
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    vi.mocked(db.select).mockReturnValue({ from: vi.fn().mockReturnValue({ where: mockWhere }) } as never);

    const response = await getById(
      new NextRequest("http://localhost:3000/api/v1/collections/999"),
      makeContext("999"),
    );
    expect(response.status).toBe(404);
  });

  it("returns collection with slides", async () => {
    const collection = { id: 1, name: "Vacanze" };
    const slideCollections = [{ slideId: 10, collectionId: 1 }];
    const slides = [{ id: 10, title: "PICT0001" }];

    let selectCall = 0;
    vi.mocked(db.select).mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) {
        const mockLimit = vi.fn().mockResolvedValue([collection]);
        const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
        return { from: vi.fn().mockReturnValue({ where: mockWhere }) } as never;
      }
      if (selectCall === 2) {
        const mockWhere = vi.fn().mockResolvedValue(slideCollections);
        return { from: vi.fn().mockReturnValue({ where: mockWhere }) } as never;
      }
      const mockWhere = vi.fn().mockResolvedValue(slides);
      return { from: vi.fn().mockReturnValue({ where: mockWhere }) } as never;
    });

    const response = await getById(
      new NextRequest("http://localhost:3000/api/v1/collections/1"),
      makeContext("1"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.collection.slides).toHaveLength(1);
  });
});

describe("PATCH /api/v1/collections/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionFromCookies).mockResolvedValue(mockUser as never);
  });

  it("updates collection name", async () => {
    const existing = { id: 1, name: "Old Name", ownerUserId: 1 };
    const updated = { id: 1, name: "New Name", ownerUserId: 1 };

    const mockLimit = vi.fn().mockResolvedValue([existing]);
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    vi.mocked(db.select).mockReturnValue({ from: vi.fn().mockReturnValue({ where: mockWhere }) } as never);

    const mockReturning = vi.fn().mockResolvedValue([updated]);
    const mockUpdateWhere = vi.fn().mockReturnValue({ returning: mockReturning });
    const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
    vi.mocked(db.update).mockReturnValue({ set: mockUpdateSet } as never);

    const response = await PATCH(
      new NextRequest("http://localhost:3000/api/v1/collections/1", {
        method: "PATCH",
        body: JSON.stringify({ name: "New Name" }),
        headers: { "content-type": "application/json" },
      }),
      makeContext("1"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.collection.name).toBe("New Name");
  });

  it("returns 403 when user does not own the collection and is not admin", async () => {
    const existing = { id: 1, name: "Other's", ownerUserId: 999 };

    const mockLimit = vi.fn().mockResolvedValue([existing]);
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    vi.mocked(db.select).mockReturnValue({ from: vi.fn().mockReturnValue({ where: mockWhere }) } as never);

    const response = await PATCH(
      new NextRequest("http://localhost:3000/api/v1/collections/1", {
        method: "PATCH",
        body: JSON.stringify({ name: "Hacked" }),
        headers: { "content-type": "application/json" },
      }),
      makeContext("1"),
    );

    expect(response.status).toBe(403);
    expect(db.update).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/v1/collections/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionFromCookies).mockResolvedValue(mockUser as never);
  });

  it("returns 404 when collection not found", async () => {
    const mockLimit = vi.fn().mockResolvedValue([]);
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    vi.mocked(db.select).mockReturnValue({ from: vi.fn().mockReturnValue({ where: mockWhere }) } as never);

    const response = await DELETE(
      new NextRequest("http://localhost:3000/api/v1/collections/999", { method: "DELETE" }),
      makeContext("999"),
    );
    expect(response.status).toBe(404);
  });

  it("deletes collection and its slide associations", async () => {
    const existing = { id: 1, name: "Test", ownerUserId: 1 };
    const mockLimit = vi.fn().mockResolvedValue([existing]);
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    vi.mocked(db.select).mockReturnValue({ from: vi.fn().mockReturnValue({ where: mockWhere }) } as never);

    const mockDeleteWhere = vi.fn().mockResolvedValue({});
    vi.mocked(db.delete).mockReturnValue({ where: mockDeleteWhere } as never);

    const response = await DELETE(
      new NextRequest("http://localhost:3000/api/v1/collections/1", { method: "DELETE" }),
      makeContext("1"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(db.delete).toHaveBeenCalledTimes(2); // slideCollections + collections
  });
});
