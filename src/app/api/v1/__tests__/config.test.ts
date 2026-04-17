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
  settings: { key: "settings.key" },
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

import { GET, PUT } from "@/app/api/v1/config/route";
import { getSessionFromCookies } from "@/lib/auth/session";

const mockAdmin = { id: 1, email: "admin@example.com", name: "Admin", active: true, role: "admin" };

describe("GET /api/v1/config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionFromCookies).mockResolvedValue(mockAdmin as never);
  });

  it("returns 403 for non-admin users", async () => {
    vi.mocked(getSessionFromCookies).mockResolvedValue({ ...mockAdmin, role: "operator" } as never);
    const response = await GET(new NextRequest("http://localhost:3000/api/v1/config"));
    expect(response.status).toBe(403);
  });

  it("returns config with sensitive fields masked", async () => {
    const configs = [
      { key: "smtpHost", value: "smtp.example.com" },
      { key: "smtpPassword", value: "my-secret-password" },
      { key: "anthropicApiKey", value: "sk-ant-1234567890" },
      { key: "s3SecretKey", value: "abc" },
    ];

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockResolvedValue(configs),
    } as never);

    const response = await GET(new NextRequest("http://localhost:3000/api/v1/config"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.config.smtpHost).toBe("smtp.example.com"); // not masked
    expect(body.config.smtpPassword).toBe("****word"); // masked
    expect(body.config.anthropicApiKey).toBe("****7890"); // masked
    expect(body.config.s3SecretKey).toBe("****"); // too short, fully masked
  });
});

describe("PUT /api/v1/config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionFromCookies).mockResolvedValue(mockAdmin as never);
  });

  it("returns 400 when body is empty", async () => {
    const response = await PUT(new NextRequest("http://localhost:3000/api/v1/config", {
      method: "PUT",
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
    }));
    expect(response.status).toBe(400);
  });

  it("upserts config values", async () => {
    const mockOnConflict = vi.fn().mockResolvedValue({});
    const mockValues = vi.fn().mockReturnValue({ onConflictDoUpdate: mockOnConflict });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

    const response = await PUT(new NextRequest("http://localhost:3000/api/v1/config", {
      method: "PUT",
      body: JSON.stringify({ smtpHost: "smtp.new.com", smtpPort: 587 }),
      headers: { "content-type": "application/json" },
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(db.insert).toHaveBeenCalled();
  });
});
