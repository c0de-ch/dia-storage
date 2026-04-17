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
  users: { email: "users.email" },
  otpCodes: { email: "otpCodes.email", code: "otpCodes.code", usedAt: "otpCodes.usedAt", expiresAt: "otpCodes.expiresAt", id: "otpCodes.id" },
  userSessions: {},
  authAttempts: {},
}));

vi.mock("@/lib/i18n", () => ({ t: vi.fn((k: string) => k) }));
vi.mock("nanoid", () => ({ nanoid: vi.fn(() => "test-session-token-64chars") }));

vi.mock("@/lib/auth/rate-limit", () => ({
  checkAuthRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  recordAuthAttempt: vi.fn().mockResolvedValue(undefined),
  clientIp: vi.fn().mockReturnValue(null),
}));

import { POST } from "@/app/api/v1/auth/verify-otp/route";
import { checkAuthRateLimit } from "@/lib/auth/rate-limit";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/v1/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const mockUser = {
  id: 1,
  email: "test@example.com",
  name: "Test User",
  active: true,
  role: "operator",
};

describe("POST /api/v1/auth/verify-otp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when email or code is missing", async () => {
    const res1 = await POST(makeRequest({ email: "test@example.com" }));
    expect(res1.status).toBe(400);

    const res2 = await POST(makeRequest({ code: "123456" }));
    expect(res2.status).toBe(400);

    const res3 = await POST(makeRequest({}));
    expect(res3.status).toBe(400);
  });

  it("returns 404 when user is not found", async () => {
    const mockLimit = vi.fn().mockResolvedValue([]);
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

    const response = await POST(makeRequest({ email: "unknown@example.com", code: "123456" }));
    expect(response.status).toBe(404);
  });

  it("returns 401 when OTP is invalid or expired", async () => {
    // First call returns user, second call returns no OTP
    let selectCallCount = 0;
    vi.mocked(db.select).mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        // User lookup
        const mockLimit = vi.fn().mockResolvedValue([mockUser]);
        const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
        return { from: vi.fn().mockReturnValue({ where: mockWhere }) } as never;
      }
      // OTP lookup - not found
      const mockLimit = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
      return { from: vi.fn().mockReturnValue({ where: mockWhere }) } as never;
    });

    const response = await POST(makeRequest({ email: "test@example.com", code: "wrong" }));
    expect(response.status).toBe(401);
  });

  it("returns 200 with user data on valid OTP", async () => {
    const otpRecord = { id: 10, email: "test@example.com", code: "123456" };

    let selectCallCount = 0;
    vi.mocked(db.select).mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        const mockLimit = vi.fn().mockResolvedValue([mockUser]);
        const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
        return { from: vi.fn().mockReturnValue({ where: mockWhere }) } as never;
      }
      const mockLimit = vi.fn().mockResolvedValue([otpRecord]);
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
      return { from: vi.fn().mockReturnValue({ where: mockWhere }) } as never;
    });

    // Mock update OTP (mark used)
    const mockUpdateWhere = vi.fn().mockResolvedValue({});
    const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
    vi.mocked(db.update).mockReturnValue({ set: mockUpdateSet } as never);

    // Mock insert session
    const mockReturning = vi.fn().mockResolvedValue([{ id: 1 }]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

    const response = await POST(makeRequest({ email: "test@example.com", code: "123456" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.user).toBeDefined();
  });

  it("returns 429 when rate limit is exceeded", async () => {
    vi.mocked(checkAuthRateLimit).mockResolvedValueOnce({
      allowed: false,
      retryAfterSeconds: 600,
    });

    const response = await POST(makeRequest({ email: "test@example.com", code: "123456" }));
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("600");
  });
});
