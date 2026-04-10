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

const mockGetConfig = vi.fn();
vi.mock("@/lib/config/loader", () => ({
  getConfig: () => mockGetConfig(),
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
}) {
  return {
    backup: {
      enabled: overrides?.enabled ?? true,
      schedule: overrides?.schedule ?? "0 2 * * *",
      destinations: overrides?.destinations ?? [{ type: "s3" }],
    },
  };
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
    mockRunIncrementalBackup.mockResolvedValue({ uploaded: 1, errors: [] });
    mockRunNasBackup.mockResolvedValue({ copied: 1, errors: [] });
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

  it("runs NAS backup when local destination is configured", async () => {
    mockGetConfig.mockReturnValue(makeConfig({ destinations: [{ type: "local" }] }));

    startBackupScheduler();

    const callback = mockSchedule.mock.calls[0][1] as () => Promise<void>;
    await callback();

    expect(mockRunNasBackup).toHaveBeenCalled();
    expect(mockRunIncrementalBackup).not.toHaveBeenCalled();
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

  it("skips execution when a backup is already in progress", async () => {
    mockGetConfig.mockReturnValue(makeConfig({ destinations: [{ type: "s3" }] }));

    // Make the backup hang
    let resolveBackup!: () => void;
    mockRunIncrementalBackup.mockImplementation(
      () => new Promise<{ uploaded: number; errors: never[] }>((r) => {
        resolveBackup = () => r({ uploaded: 0, errors: [] });
      }),
    );

    startBackupScheduler();

    const callback = mockSchedule.mock.calls[0][1] as () => Promise<void>;

    // Start first execution (it will hang)
    const first = callback();
    // Start second execution (should be skipped because isRunning=true)
    await callback();

    expect(mockRunIncrementalBackup).toHaveBeenCalledTimes(1);

    // Clean up: resolve the hanging backup
    resolveBackup();
    await first;
  });

  it("handles errors in backup gracefully", async () => {
    mockGetConfig.mockReturnValue(makeConfig({ destinations: [{ type: "s3" }] }));
    mockRunIncrementalBackup.mockRejectedValue(new Error("S3 down"));

    startBackupScheduler();

    const callback = mockSchedule.mock.calls[0][1] as () => Promise<void>;

    // Should not throw
    await expect(callback()).resolves.toBeUndefined();
  });

  it("resets isRunning even when backup throws", async () => {
    mockGetConfig.mockReturnValue(makeConfig({ destinations: [{ type: "s3" }] }));
    mockRunIncrementalBackup.mockRejectedValue(new Error("S3 down"));

    startBackupScheduler();

    const callback = mockSchedule.mock.calls[0][1] as () => Promise<void>;
    await callback();

    // Should be able to run again (isRunning was reset)
    mockRunIncrementalBackup.mockResolvedValue({ uploaded: 0, errors: [] });
    await callback();
    expect(mockRunIncrementalBackup).toHaveBeenCalledTimes(2);
  });
});
