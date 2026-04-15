import { vi } from "vitest";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";

vi.mock("@/lib/db/schema", () => ({
  backupHistory: { id: "backupHistory.id", startedAt: "backupHistory.startedAt" },
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

import { POST as triggerPost } from "@/app/api/v1/backup/trigger/route";
import { GET as statusGet } from "@/app/api/v1/backup/status/route";
import { GET as historyGet } from "@/app/api/v1/backup/history/route";
import { getSessionFromCookies } from "@/lib/auth/session";

const mockAdmin = { id: 1, email: "admin@example.com", name: "Admin", active: true, role: "admin" };

// --- Trigger ---

describe("POST /api/v1/backup/trigger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionFromCookies).mockResolvedValue(mockAdmin as never);
  });

  it("returns 403 for non-admin users", async () => {
    vi.mocked(getSessionFromCookies).mockResolvedValue({ ...mockAdmin, role: "operator" } as never);
    const response = await triggerPost(new NextRequest("http://localhost:3000/api/v1/backup/trigger", {
      method: "POST",
      body: JSON.stringify({ destination: "s3" }),
      headers: { "content-type": "application/json" },
    }));
    expect(response.status).toBe(403);
  });

  it("returns 400 for invalid destination", async () => {
    const response = await triggerPost(new NextRequest("http://localhost:3000/api/v1/backup/trigger", {
      method: "POST",
      body: JSON.stringify({ destination: "ftp" }),
      headers: { "content-type": "application/json" },
    }));
    expect(response.status).toBe(400);
  });

  it("creates backup record for s3 destination", async () => {
    const backup = { id: 1, type: "s3", status: "in_progress" };
    const mockReturning = vi.fn().mockResolvedValue([backup]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

    const response = await triggerPost(new NextRequest("http://localhost:3000/api/v1/backup/trigger", {
      method: "POST",
      body: JSON.stringify({ destination: "s3" }),
      headers: { "content-type": "application/json" },
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.backupId).toBe(1);
  });

  it("creates backup record for nas destination", async () => {
    const backup = { id: 2, type: "nas", status: "in_progress" };
    const mockReturning = vi.fn().mockResolvedValue([backup]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

    const response = await triggerPost(new NextRequest("http://localhost:3000/api/v1/backup/trigger", {
      method: "POST",
      body: JSON.stringify({ destination: "nas" }),
      headers: { "content-type": "application/json" },
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.backupId).toBe(2);
  });
});

// --- Status ---

describe("GET /api/v1/backup/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionFromCookies).mockResolvedValue(mockAdmin as never);
  });

  it("returns null when no backup found", async () => {
    const mockLimit = vi.fn().mockResolvedValue([]);
    const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({ orderBy: mockOrderBy }),
    } as never);

    const response = await statusGet(new NextRequest("http://localhost:3000/api/v1/backup/status"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.backup).toBeNull();
  });

  it("returns latest backup status", async () => {
    const backup = { id: 1, type: "s3", status: "completed", startedAt: new Date() };
    const mockLimit = vi.fn().mockResolvedValue([backup]);
    const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({ orderBy: mockOrderBy }),
    } as never);

    const response = await statusGet(new NextRequest("http://localhost:3000/api/v1/backup/status"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.backup.status).toBe("completed");
  });
});

// --- History ---

describe("GET /api/v1/backup/history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionFromCookies).mockResolvedValue(mockAdmin as never);
  });

  it("returns list of backup history", async () => {
    const backups = [
      { id: 1, type: "s3", status: "completed" },
      { id: 2, type: "nas", status: "failed" },
    ];

    const mockOffset = vi.fn().mockResolvedValue(backups);
    const mockLimit = vi.fn().mockReturnValue({ offset: mockOffset });
    const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({ orderBy: mockOrderBy }),
    } as never);

    const response = await historyGet(new NextRequest("http://localhost:3000/api/v1/backup/history"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.backups).toHaveLength(2);
  });
});
