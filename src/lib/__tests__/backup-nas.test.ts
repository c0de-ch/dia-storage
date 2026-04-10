import { vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockAccess = vi.fn();
const mockCopyFile = vi.fn();
const mockStat = vi.fn();
const mockWriteFile = vi.fn();
const mockUnlink = vi.fn();

vi.mock("node:fs/promises", () => ({
  access: (...args: unknown[]) => mockAccess(...args),
  copyFile: (...args: unknown[]) => mockCopyFile(...args),
  stat: (...args: unknown[]) => mockStat(...args),
  writeFile: (...args: unknown[]) => mockWriteFile(...args),
  unlink: (...args: unknown[]) => mockUnlink(...args),
  constants: { R_OK: 4, W_OK: 2 },
}));

const mockEnsureDir = vi.fn();
const mockGetStorageBasePath = vi.fn(() => "/data");
vi.mock("@/lib/storage/paths", () => ({
  ensureDir: (...args: unknown[]) => mockEnsureDir(...args),
  getStorageBasePath: () => mockGetStorageBasePath(),
}));

const mockGetConfig = vi.fn();
vi.mock("@/lib/config/loader", () => ({
  getConfig: () => mockGetConfig(),
}));

// Fine-grained DB mock
const mockSelectFromWhere = vi.fn();
const mockSelectFrom = vi.fn(() => ({ where: mockSelectFromWhere }));
const mockSelect = vi.fn(() => ({ from: mockSelectFrom }));
const mockInsertReturning = vi.fn();
const mockInsertValues = vi.fn(() => ({ returning: mockInsertReturning }));
const mockInsert = vi.fn(() => ({ values: mockInsertValues }));
const mockUpdateWhere = vi.fn();
const mockUpdateSet = vi.fn(() => ({ where: mockUpdateWhere }));
const mockUpdate = vi.fn(() => ({ set: mockUpdateSet }));

vi.mock("@/lib/db", () => ({
  db: {
    select: () => mockSelect(),
    insert: () => mockInsert(),
    update: () => mockUpdate(),
  },
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import {
  testNasConnection,
  copyToNas,
  runNasBackup,
} from "@/lib/backup/nas";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAppConfig(destOverride?: unknown[]) {
  return {
    backup: {
      enabled: true,
      schedule: "0 2 * * *",
      destinations: destOverride ?? [
        { type: "local", path: "/mnt/nas/dia-backup" },
      ],
    },
    storage: { basePath: "/data" },
  };
}

// ---------------------------------------------------------------------------
// Tests: testNasConnection
// ---------------------------------------------------------------------------

describe("testNasConnection", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns true when mount is accessible and writable", async () => {
    mockAccess.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockUnlink.mockResolvedValue(undefined);

    const result = await testNasConnection("/mnt/nas");
    expect(result).toBe(true);
    expect(mockAccess).toHaveBeenCalledWith("/mnt/nas", 4 | 2);
  });

  it("writes and removes a probe file", async () => {
    mockAccess.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockUnlink.mockResolvedValue(undefined);

    await testNasConnection("/mnt/nas");

    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringMatching(/^\/mnt\/nas\/\.dia_probe_\d+$/),
      "probe",
    );
    expect(mockUnlink).toHaveBeenCalledWith(
      expect.stringMatching(/^\/mnt\/nas\/\.dia_probe_\d+$/),
    );
  });

  it("throws when path does not exist", async () => {
    mockAccess.mockRejectedValue(new Error("ENOENT: no such file or directory"));
    await expect(testNasConnection("/mnt/missing")).rejects.toThrow("ENOENT");
  });

  it("throws when path is not writable (permission denied)", async () => {
    mockAccess.mockRejectedValue(new Error("EACCES: permission denied"));
    await expect(testNasConnection("/mnt/readonly")).rejects.toThrow("EACCES");
  });

  it("throws a descriptive error when probe file write fails", async () => {
    mockAccess.mockResolvedValue(undefined);
    mockWriteFile.mockRejectedValue(new Error("ENOSPC: no space left"));

    await expect(testNasConnection("/mnt/full")).rejects.toThrow(
      /non è scrivibile/,
    );
  });

  it("includes the mount path in the error message", async () => {
    mockAccess.mockResolvedValue(undefined);
    mockWriteFile.mockRejectedValue(new Error("disk error"));

    await expect(testNasConnection("/mnt/broken")).rejects.toThrow("/mnt/broken");
  });

  it("wraps non-Error throws in the error message", async () => {
    mockAccess.mockResolvedValue(undefined);
    mockWriteFile.mockRejectedValue("string error");

    await expect(testNasConnection("/mnt/broken")).rejects.toThrow("string error");
  });
});

// ---------------------------------------------------------------------------
// Tests: copyToNas
// ---------------------------------------------------------------------------

describe("copyToNas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCopyFile.mockResolvedValue(undefined);
    mockEnsureDir.mockResolvedValue(undefined);
  });

  it("ensures the destination directory exists", async () => {
    await copyToNas("/data/originals/2024/06/slide_1.jpg", "/mnt/nas/originals/2024/06/slide_1.jpg");
    expect(mockEnsureDir).toHaveBeenCalledWith("/mnt/nas/originals/2024/06");
  });

  it("copies the file to the destination", async () => {
    await copyToNas("/source/file.jpg", "/dest/file.jpg");
    expect(mockCopyFile).toHaveBeenCalledWith("/source/file.jpg", "/dest/file.jpg");
  });

  it("throws when copy fails", async () => {
    mockCopyFile.mockRejectedValue(new Error("ENOSPC"));
    await expect(
      copyToNas("/source/file.jpg", "/dest/file.jpg"),
    ).rejects.toThrow("ENOSPC");
  });
});

// ---------------------------------------------------------------------------
// Tests: runNasBackup
// ---------------------------------------------------------------------------

describe("runNasBackup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetConfig.mockReturnValue(makeAppConfig());
    mockAccess.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockUnlink.mockResolvedValue(undefined);
    mockCopyFile.mockResolvedValue(undefined);
    mockEnsureDir.mockResolvedValue(undefined);
    mockStat.mockResolvedValue({ size: 2_000_000 });
  });

  it("throws when NAS config is missing", async () => {
    mockGetConfig.mockReturnValue(makeAppConfig([]));
    await expect(runNasBackup()).rejects.toThrow(/Configurazione NAS non trovata/);
  });

  it("tests NAS connection before starting backup", async () => {
    mockSelectFromWhere.mockResolvedValue([]);
    mockInsertReturning.mockResolvedValue([{ id: 1 }]);

    await runNasBackup();

    expect(mockAccess).toHaveBeenCalledWith("/mnt/nas/dia-backup", 4 | 2);
  });

  it("copies pending slides and returns count", async () => {
    mockSelectFromWhere.mockResolvedValue([
      { id: 1, storagePath: "/data/originals/2024/06/slide_1.jpg", status: "active", backedUp: false },
      { id: 2, storagePath: "/data/originals/2024/06/slide_2.jpg", status: "active", backedUp: false },
    ]);
    mockInsertReturning.mockResolvedValue([{ id: 10 }]);

    const result = await runNasBackup();

    expect(result.copied).toBe(2);
    expect(result.errors).toHaveLength(0);
    expect(mockCopyFile).toHaveBeenCalledTimes(2);
  });

  it("skips slides with no storagePath", async () => {
    mockSelectFromWhere.mockResolvedValue([
      { id: 1, storagePath: null, status: "active", backedUp: false },
    ]);
    mockInsertReturning.mockResolvedValue([{ id: 10 }]);

    const result = await runNasBackup();

    expect(result.copied).toBe(0);
    expect(mockCopyFile).not.toHaveBeenCalled();
  });

  it("collects per-slide errors without aborting", async () => {
    mockSelectFromWhere.mockResolvedValue([
      { id: 1, storagePath: "/data/originals/2024/06/slide_1.jpg", status: "active", backedUp: false },
      { id: 2, storagePath: "/data/originals/2024/06/slide_2.jpg", status: "active", backedUp: false },
    ]);
    mockInsertReturning.mockResolvedValue([{ id: 10 }]);

    // First copy succeeds, second fails
    mockCopyFile
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("IO error"));

    const result = await runNasBackup();

    expect(result.copied).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toEqual({ slideId: 2, error: "IO error" });
  });

  it("records backup history", async () => {
    mockSelectFromWhere.mockResolvedValue([
      { id: 1, storagePath: "/data/originals/2024/06/slide_1.jpg", status: "active", backedUp: false },
    ]);
    mockInsertReturning.mockResolvedValue([{ id: 10 }]);

    await runNasBackup();

    expect(mockInsert).toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("handles empty pending list", async () => {
    mockSelectFromWhere.mockResolvedValue([]);
    mockInsertReturning.mockResolvedValue([{ id: 10 }]);

    const result = await runNasBackup();

    expect(result.copied).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it("handles non-Error throws from copy", async () => {
    mockSelectFromWhere.mockResolvedValue([
      { id: 1, storagePath: "/data/originals/2024/06/slide_1.jpg", status: "active", backedUp: false },
    ]);
    mockInsertReturning.mockResolvedValue([{ id: 10 }]);
    mockCopyFile.mockRejectedValue("string error");

    const result = await runNasBackup();

    expect(result.errors[0].error).toBe("string error");
  });

  it("supports smb type destination", async () => {
    mockGetConfig.mockReturnValue(
      makeAppConfig([{ type: "smb", path: "/mnt/smb-share" }]),
    );
    mockSelectFromWhere.mockResolvedValue([]);
    mockInsertReturning.mockResolvedValue([{ id: 10 }]);

    await runNasBackup();

    expect(mockAccess).toHaveBeenCalledWith("/mnt/smb-share", 4 | 2);
  });
});
