import { vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockStart = vi.fn();
const mockStop = vi.fn();
const mockSchedule = vi.fn(() => ({ start: mockStart, stop: mockStop }));
const mockValidate = vi.fn(() => true);

vi.mock("node-cron", () => ({
  default: {
    schedule: (...args: unknown[]) => mockSchedule(...args),
    validate: (expr: string) => mockValidate(expr),
  },
}));

const mockRunIncrementalBackup = vi.fn();
vi.mock("@/lib/backup/s3", () => ({
  runIncrementalBackup: (...args: unknown[]) => mockRunIncrementalBackup(...args),
}));

const mockRunNasBackup = vi.fn();
vi.mock("@/lib/backup/nas", () => ({
  runNasBackup: (...args: unknown[]) => mockRunNasBackup(...args),
}));

const mockBackupDatabaseToS3 = vi.fn();
vi.mock("@/lib/backup/database", () => ({
  backupDatabaseToS3: (...args: unknown[]) => mockBackupDatabaseToS3(...args),
}));

const mockPurgeOldAuditLogs = vi.fn();
vi.mock("@/lib/audit/retention", () => ({
  purgeOldAuditLogs: (...args: unknown[]) => mockPurgeOldAuditLogs(...args),
}));

const mockGetConfig = vi.fn();
vi.mock("@/lib/config/loader", () => ({
  getConfig: () => mockGetConfig(),
}));

const mockExecute = vi.fn();
const mockTransaction = vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
  fn({ execute: mockExecute }),
);
vi.mock("@/lib/db", () => ({
  db: {
    transaction: (fn: (tx: unknown) => Promise<unknown>) => mockTransaction(fn),
    execute: (...args: unknown[]) => mockExecute(...args),
  },
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import {
  startBackupScheduler,
  stopBackupScheduler,
  isSchedulerRunning,
} from "@/lib/backup/scheduler";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(overrides?: {
  enabled?: boolean;
  schedule?: string;
  destinations?: Array<{ type: string }>;
  auditRetainDays?: number;
}) {
  return {
    backup: {
      enabled: overrides?.enabled ?? true,
      schedule: overrides?.schedule ?? "0 2 * * *",
      destinations: overrides?.destinations ?? [{ type: "s3" }],
      auditRetainDays: overrides?.auditRetainDays ?? 365,
    },
  };
}

function mockLockAcquired(acquired: boolean) {
  mockExecute.mockResolvedValue([{ acquired }]);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("startBackupScheduler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset module-level state by stopping any previously started scheduler
    stopBackupScheduler();
    mockGetConfig.mockReturnValue(makeConfig());
    mockValidate.mockReturnValue(true);
    mockLockAcquired(true);
    mockTransaction.mockImplementation(async (fn) => fn({ execute: mockExecute }));
  });

  it("creates a cron job with the configured schedule", () => {
    startBackupScheduler();

    expect(mockSchedule).toHaveBeenCalledWith(
      "0 2 * * *",
      expect.any(Function),
    );
    expect(mockStart).toHaveBeenCalled();
  });

  it("uses the schedule from config", () => {
    mockGetConfig.mockReturnValue(makeConfig({ schedule: "0 3 * * 0" }));

    startBackupScheduler();

    expect(mockSchedule).toHaveBeenCalledWith(
      "0 3 * * 0",
      expect.any(Function),
    );
  });

  it("does not start when backup is disabled", () => {
    mockGetConfig.mockReturnValue(makeConfig({ enabled: false }));

    startBackupScheduler();

    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it("does not start when cron expression is invalid", () => {
    mockValidate.mockReturnValue(false);

    startBackupScheduler();

    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it("ignores duplicate start requests", () => {
    startBackupScheduler();
    startBackupScheduler();

    expect(mockSchedule).toHaveBeenCalledTimes(1);
  });

  it("sets isSchedulerRunning to true", () => {
    expect(isSchedulerRunning()).toBe(false);
    startBackupScheduler();
    expect(isSchedulerRunning()).toBe(true);
  });
});

describe("stopBackupScheduler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stopBackupScheduler();
    mockGetConfig.mockReturnValue(makeConfig());
    mockValidate.mockReturnValue(true);
    mockLockAcquired(true);
    mockTransaction.mockImplementation(async (fn) => fn({ execute: mockExecute }));
  });

  it("stops the scheduled task", () => {
    startBackupScheduler();
    stopBackupScheduler();

    expect(mockStop).toHaveBeenCalled();
    expect(isSchedulerRunning()).toBe(false);
  });

  it("is safe to call when scheduler is not running", () => {
    expect(() => stopBackupScheduler()).not.toThrow();
  });

  it("allows restarting after stop", () => {
    startBackupScheduler();
    stopBackupScheduler();
    startBackupScheduler();

    expect(mockSchedule).toHaveBeenCalledTimes(2);
    expect(isSchedulerRunning()).toBe(true);
  });
});

describe("isSchedulerRunning", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stopBackupScheduler();
    mockGetConfig.mockReturnValue(makeConfig());
    mockValidate.mockReturnValue(true);
    mockLockAcquired(true);
    mockTransaction.mockImplementation(async (fn) => fn({ execute: mockExecute }));
  });

  it("returns false when not started", () => {
    expect(isSchedulerRunning()).toBe(false);
  });

  it("returns true when started", () => {
    startBackupScheduler();
    expect(isSchedulerRunning()).toBe(true);
  });

  it("returns false after stop", () => {
    startBackupScheduler();
    stopBackupScheduler();
    expect(isSchedulerRunning()).toBe(false);
  });
});

describe("scheduled task callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stopBackupScheduler();
    mockValidate.mockReturnValue(true);
    mockLockAcquired(true);
    mockTransaction.mockImplementation(async (fn) => fn({ execute: mockExecute }));
    mockRunIncrementalBackup.mockResolvedValue({ uploaded: 1, errors: [] });
    mockRunNasBackup.mockResolvedValue({ copied: 1, errors: [] });
    mockBackupDatabaseToS3.mockResolvedValue("db-backups/test.dump");
    mockPurgeOldAuditLogs.mockResolvedValue(0);
  });

  it("runs S3 backup when s3 destination is configured", async () => {
    mockGetConfig.mockReturnValue(makeConfig({ destinations: [{ type: "s3" }] }));

    startBackupScheduler();

    // Extract and invoke the callback
    const callback = mockSchedule.mock.calls[0][1] as () => Promise<void>;
    await callback();

    expect(mockRunIncrementalBackup).toHaveBeenCalled();
    expect(mockRunNasBackup).not.toHaveBeenCalled();
  });

  it("also uploads a DB dump when s3 destination is configured", async () => {
    mockGetConfig.mockReturnValue(makeConfig({ destinations: [{ type: "s3" }] }));

    startBackupScheduler();

    const callback = mockSchedule.mock.calls[0][1] as () => Promise<void>;
    await callback();

    expect(mockBackupDatabaseToS3).toHaveBeenCalled();
  });

  it("does not abort file backup when DB dump fails", async () => {
    mockGetConfig.mockReturnValue(makeConfig({ destinations: [{ type: "s3" }] }));
    mockBackupDatabaseToS3.mockRejectedValue(new Error("pg_dump down"));

    startBackupScheduler();

    const callback = mockSchedule.mock.calls[0][1] as () => Promise<void>;
    await expect(callback()).resolves.toBeUndefined();

    expect(mockRunIncrementalBackup).toHaveBeenCalled();
  });

  it("runs NAS backup when local destination is configured", async () => {
    mockGetConfig.mockReturnValue(makeConfig({ destinations: [{ type: "local" }] }));

    startBackupScheduler();

    const callback = mockSchedule.mock.calls[0][1] as () => Promise<void>;
    await callback();

    expect(mockRunNasBackup).toHaveBeenCalled();
    expect(mockRunIncrementalBackup).not.toHaveBeenCalled();
    expect(mockBackupDatabaseToS3).not.toHaveBeenCalled();
  });

  it("runs NAS backup when smb destination is configured", async () => {
    mockGetConfig.mockReturnValue(makeConfig({ destinations: [{ type: "smb" }] }));

    startBackupScheduler();

    const callback = mockSchedule.mock.calls[0][1] as () => Promise<void>;
    await callback();

    expect(mockRunNasBackup).toHaveBeenCalled();
  });

  it("runs both S3 and NAS when both are configured", async () => {
    mockGetConfig.mockReturnValue(
      makeConfig({ destinations: [{ type: "s3" }, { type: "local" }] }),
    );

    startBackupScheduler();

    const callback = mockSchedule.mock.calls[0][1] as () => Promise<void>;
    await callback();

    expect(mockRunIncrementalBackup).toHaveBeenCalled();
    expect(mockRunNasBackup).toHaveBeenCalled();
  });

  it("skips execution when the advisory lock is already held", async () => {
    mockGetConfig.mockReturnValue(makeConfig({ destinations: [{ type: "s3" }] }));
    mockLockAcquired(false);

    startBackupScheduler();

    const callback = mockSchedule.mock.calls[0][1] as () => Promise<void>;
    await callback();

    expect(mockRunIncrementalBackup).not.toHaveBeenCalled();
    expect(mockBackupDatabaseToS3).not.toHaveBeenCalled();
    expect(mockRunNasBackup).not.toHaveBeenCalled();
  });

  it("handles errors in backup gracefully", async () => {
    mockGetConfig.mockReturnValue(makeConfig({ destinations: [{ type: "s3" }] }));
    mockRunIncrementalBackup.mockRejectedValue(new Error("S3 down"));

    startBackupScheduler();

    const callback = mockSchedule.mock.calls[0][1] as () => Promise<void>;

    // Should not throw
    await expect(callback()).resolves.toBeUndefined();
  });

  it("allows subsequent runs after a backup throws", async () => {
    mockGetConfig.mockReturnValue(makeConfig({ destinations: [{ type: "s3" }] }));
    mockRunIncrementalBackup.mockRejectedValueOnce(new Error("S3 down"));

    startBackupScheduler();

    const callback = mockSchedule.mock.calls[0][1] as () => Promise<void>;
    await callback();

    mockRunIncrementalBackup.mockResolvedValue({ uploaded: 0, errors: [] });
    await callback();
    expect(mockRunIncrementalBackup).toHaveBeenCalledTimes(2);
  });
});
