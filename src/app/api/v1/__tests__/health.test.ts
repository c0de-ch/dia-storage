import { vi } from "vitest";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";

// Must mock before importing route
vi.mock("@/lib/db/schema", () => ({
  apiKeys: { id: "apiKeys.id", key: "apiKeys.key", userId: "apiKeys.userId" },
  users: { id: "users.id" },
}));

import { GET } from "@/app/api/v1/health/route";

function makeRequest(headers?: Record<string, string>) {
  return new NextRequest("http://localhost:3000/api/v1/health", { headers });
}

describe("GET /api/v1/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with status ok when database is reachable", async () => {
    vi.mocked(db.execute).mockResolvedValue([] as never);

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.version).toBeDefined();
    expect(body.timestamp).toBeDefined();
  });

  it("returns 503 when database is unreachable", async () => {
    vi.mocked(db.execute).mockRejectedValue(new Error("Connection refused"));

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("error");
  });

  it("returns 401 when invalid API key is provided", async () => {
    vi.mocked(db.execute).mockResolvedValue([] as never);

    const mockLimit = vi.fn().mockResolvedValue([]);
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockInnerJoin = vi.fn().mockReturnValue({ where: mockWhere });
    const mockFrom = vi.fn().mockReturnValue({ innerJoin: mockInnerJoin });
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

    const response = await GET(makeRequest({ "x-api-key": "invalid-key" }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.status).toBe("error");
  });

  it("returns 200 when valid API key is provided", async () => {
    vi.mocked(db.execute).mockResolvedValue([] as never);

    const mockLimit = vi.fn().mockResolvedValue([{ id: 1 }]);
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockInnerJoin = vi.fn().mockReturnValue({ where: mockWhere });
    const mockFrom = vi.fn().mockReturnValue({ innerJoin: mockInnerJoin });
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

    const response = await GET(makeRequest({ "x-api-key": "valid-key" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
  });
});
