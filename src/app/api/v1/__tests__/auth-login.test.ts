import { vi } from "vitest";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";

vi.mock("@/lib/db/schema", () => ({
  users: { email: "users.email" },
  otpCodes: {},
}));

vi.mock("@/lib/i18n", () => ({ t: vi.fn((k: string) => k) }));

vi.mock("@/lib/email/transport", () => ({
  sendOtpEmail: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from "@/app/api/v1/auth/login/route";
import { sendOtpEmail } from "@/lib/email/transport";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const mockUser = {
  id: 1,
  email: "test@example.com",
  name: "Test",
  active: true,
  otpChannel: "email",
  role: "operator",
};

describe("POST /api/v1/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when email is missing", async () => {
    const response = await POST(makeRequest({}));
    expect(response.status).toBe(400);
  });

  it("returns 404 when user is not found", async () => {
    const mockLimit = vi.fn().mockResolvedValue([]);
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

    const response = await POST(makeRequest({ email: "unknown@example.com" }));
    expect(response.status).toBe(404);
  });

  it("returns 403 when user is inactive", async () => {
    const mockLimit = vi.fn().mockResolvedValue([{ ...mockUser, active: false }]);
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

    const response = await POST(makeRequest({ email: "test@example.com" }));
    expect(response.status).toBe(403);
  });

  it("returns 200 and sends OTP email on success", async () => {
    const mockLimit = vi.fn().mockResolvedValue([mockUser]);
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

    const mockReturning = vi.fn().mockResolvedValue([{ id: 1 }]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

    const response = await POST(makeRequest({ email: "test@example.com" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(sendOtpEmail).toHaveBeenCalled();
  });

  it("returns 500 when email sending fails", async () => {
    const mockLimit = vi.fn().mockResolvedValue([mockUser]);
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

    const mockReturning = vi.fn().mockResolvedValue([{ id: 1 }]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

    vi.mocked(sendOtpEmail).mockRejectedValueOnce(new Error("SMTP error"));

    const response = await POST(makeRequest({ email: "test@example.com" }));
    expect(response.status).toBe(500);
  });
});
