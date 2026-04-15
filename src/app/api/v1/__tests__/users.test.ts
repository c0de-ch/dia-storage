import { vi } from "vitest";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";

vi.mock("@/lib/db/schema", () => ({
  users: { id: "users.id", email: "users.email", createdAt: "users.createdAt" },
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

import { GET, POST } from "@/app/api/v1/users/route";
import { getSessionFromCookies } from "@/lib/auth/session";

const mockAdmin = { id: 1, email: "admin@example.com", name: "Admin", active: true, role: "admin" };

describe("GET /api/v1/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionFromCookies).mockResolvedValue(mockAdmin as never);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getSessionFromCookies).mockResolvedValue(null);
    const response = await GET(new NextRequest("http://localhost:3000/api/v1/users"));
    expect(response.status).toBe(401);
  });

  it("returns 403 when not admin", async () => {
    vi.mocked(getSessionFromCookies).mockResolvedValue({ ...mockAdmin, role: "operator" } as never);
    const response = await GET(new NextRequest("http://localhost:3000/api/v1/users"));
    expect(response.status).toBe(403);
  });

  it("returns paginated users list for admin", async () => {
    const users = [
      { id: 1, name: "Admin", email: "admin@example.com", role: "admin" },
      { id: 2, name: "User", email: "user@example.com", role: "operator" },
    ];

    let selectCall = 0;
    vi.mocked(db.select).mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) {
        return { from: vi.fn().mockResolvedValue([{ total: 2 }]) } as never;
      }
      const mockOffset = vi.fn().mockResolvedValue(users);
      const mockLimit = vi.fn().mockReturnValue({ offset: mockOffset });
      const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
      return { from: vi.fn().mockReturnValue({ orderBy: mockOrderBy }) } as never;
    });

    const response = await GET(new NextRequest("http://localhost:3000/api/v1/users"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.users).toHaveLength(2);
    expect(body.pagination.total).toBe(2);
  });
});

describe("POST /api/v1/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionFromCookies).mockResolvedValue(mockAdmin as never);
  });

  it("returns 400 when email or name is missing", async () => {
    const res1 = await POST(new NextRequest("http://localhost:3000/api/v1/users", {
      method: "POST",
      body: JSON.stringify({ email: "a@b.com" }),
      headers: { "content-type": "application/json" },
    }));
    expect(res1.status).toBe(400);

    const res2 = await POST(new NextRequest("http://localhost:3000/api/v1/users", {
      method: "POST",
      body: JSON.stringify({ name: "Test" }),
      headers: { "content-type": "application/json" },
    }));
    expect(res2.status).toBe(400);
  });

  it("returns 400 for invalid role", async () => {
    const response = await POST(new NextRequest("http://localhost:3000/api/v1/users", {
      method: "POST",
      body: JSON.stringify({ email: "a@b.com", name: "Test", role: "superadmin" }),
      headers: { "content-type": "application/json" },
    }));
    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid otpChannel", async () => {
    const response = await POST(new NextRequest("http://localhost:3000/api/v1/users", {
      method: "POST",
      body: JSON.stringify({ email: "a@b.com", name: "Test", otpChannel: "sms" }),
      headers: { "content-type": "application/json" },
    }));
    expect(response.status).toBe(400);
  });

  it("returns 409 when email already exists", async () => {
    const mockLimit = vi.fn().mockResolvedValue([{ id: 1 }]);
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    vi.mocked(db.select).mockReturnValue({ from: vi.fn().mockReturnValue({ where: mockWhere }) } as never);

    const response = await POST(new NextRequest("http://localhost:3000/api/v1/users", {
      method: "POST",
      body: JSON.stringify({ email: "existing@example.com", name: "Test" }),
      headers: { "content-type": "application/json" },
    }));
    expect(response.status).toBe(409);
  });

  it("creates user with defaults and returns 201", async () => {
    const mockLimit = vi.fn().mockResolvedValue([]);
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    vi.mocked(db.select).mockReturnValue({ from: vi.fn().mockReturnValue({ where: mockWhere }) } as never);

    const newUser = { id: 3, email: "new@example.com", name: "New User", role: "operator", otpChannel: "email" };
    const mockReturning = vi.fn().mockResolvedValue([newUser]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

    const response = await POST(new NextRequest("http://localhost:3000/api/v1/users", {
      method: "POST",
      body: JSON.stringify({ email: "new@example.com", name: "New User" }),
      headers: { "content-type": "application/json" },
    }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.user.role).toBe("operator");
  });
});
