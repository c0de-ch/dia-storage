import { vi } from "vitest";
import { EventEmitter } from "node:events";
import { Readable, Writable } from "node:stream";

// ---------------------------------------------------------------------------
// Mocks for node:child_process spawn
// ---------------------------------------------------------------------------

type FakeProc = EventEmitter & {
  stdout: Readable;
  stderr: EventEmitter;
  stdin: unknown;
};

const spawnSpy = vi.fn();
let nextSpawnBehavior: {
  exitCode: number;
  stderrChunks: string[];
  errorOnSpawn?: Error;
} = { exitCode: 0, stderrChunks: [] };

function makeFakeProc(): FakeProc {
  const stdout = new Readable({ read() {} });
  const stderr = new EventEmitter();
  const proc = Object.assign(new EventEmitter(), { stdout, stderr, stdin: null });
  return proc;
}

vi.mock("node:child_process", () => ({
  spawn: (...args: unknown[]) => {
    spawnSpy(...args);
    const proc = makeFakeProc();

    // Defer event emissions to the next tick so the caller can attach listeners.
    setImmediate(() => {
      if (nextSpawnBehavior.errorOnSpawn) {
        proc.emit("error", nextSpawnBehavior.errorOnSpawn);
        return;
      }
      for (const chunk of nextSpawnBehavior.stderrChunks) {
        proc.stderr.emit("data", Buffer.from(chunk));
      }
      proc.stdout.push(null); // end the readable
      proc.emit("close", nextSpawnBehavior.exitCode);
    });

    return proc;
  },
}));

// ---------------------------------------------------------------------------
// Mocks for fs / path helpers
// ---------------------------------------------------------------------------

const mkdirMock = vi.fn(() => Promise.resolve());
const statMock = vi.fn(() => Promise.resolve({ size: 1 }));
const unlinkMock = vi.fn(() => Promise.resolve());

vi.mock("node:fs/promises", () => ({
  mkdir: (...args: unknown[]) => mkdirMock(...args),
  stat: (...args: unknown[]) => statMock(...args),
  unlink: (...args: unknown[]) => unlinkMock(...args),
}));

const writeStreamSinks: Writable[] = [];
const createWriteStreamMock = vi.fn(() => {
  const sink = new Writable({
    write(_chunk, _enc, cb) {
      cb();
    },
  });
  writeStreamSinks.push(sink);
  return sink;
});

vi.mock("node:fs", () => ({
  createWriteStream: (...args: unknown[]) => createWriteStreamMock(...args),
}));

// ---------------------------------------------------------------------------
// Mocks for S3 helpers
// ---------------------------------------------------------------------------

const uploadToS3Mock = vi.fn(() => Promise.resolve());
const downloadFromS3Mock = vi.fn(() => Promise.resolve());
const getS3ConfigFromAppMock = vi.fn();

vi.mock("@/lib/backup/s3", () => ({
  uploadToS3: (...args: unknown[]) => uploadToS3Mock(...args),
  downloadFromS3: (...args: unknown[]) => downloadFromS3Mock(...args),
  getS3ConfigFromApp: () => getS3ConfigFromAppMock(),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import {
  dumpDatabaseToFile,
  backupDatabaseToS3,
  restoreDatabaseFromFile,
  restoreDatabaseFromS3,
} from "@/lib/backup/database";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setSpawnSuccess() {
  nextSpawnBehavior = { exitCode: 0, stderrChunks: [] };
}

function setSpawnFailure(code: number, stderr = "boom") {
  nextSpawnBehavior = { exitCode: code, stderrChunks: [stderr] };
}

function setSpawnError(err: Error) {
  nextSpawnBehavior = { exitCode: 0, stderrChunks: [], errorOnSpawn: err };
}

beforeEach(() => {
  vi.clearAllMocks();
  setSpawnSuccess();
  writeStreamSinks.length = 0;
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("dumpDatabaseToFile", () => {
  it("creates the parent directory and runs pg_dump", async () => {
    await dumpDatabaseToFile("/tmp/dia/db.dump");

    expect(mkdirMock).toHaveBeenCalledWith("/tmp/dia", { recursive: true });
    expect(spawnSpy).toHaveBeenCalledWith(
      "pg_dump",
      expect.arrayContaining(["--format=custom", "--no-owner", "--no-privileges"]),
      expect.objectContaining({ stdio: ["ignore", "pipe", "pipe"] }),
    );
  });

  it("rejects when pg_dump exits with a non-zero code and surfaces stderr", async () => {
    setSpawnFailure(1, "permission denied");
    await expect(dumpDatabaseToFile("/tmp/dia/db.dump")).rejects.toThrow(
      /pg_dump uscito con codice 1: permission denied/,
    );
  });

  it("rejects when the spawned process emits an error", async () => {
    setSpawnError(new Error("ENOENT pg_dump"));
    await expect(dumpDatabaseToFile("/tmp/dia/db.dump")).rejects.toThrow(
      "ENOENT pg_dump",
    );
  });
});

describe("backupDatabaseToS3", () => {
  it("throws when no S3 config is configured", async () => {
    getS3ConfigFromAppMock.mockReturnValue(null);
    await expect(backupDatabaseToS3()).rejects.toThrow(
      /Configurazione S3 non trovata/,
    );
  });

  it("dumps the DB, uploads to s3, and cleans up the local file", async () => {
    getS3ConfigFromAppMock.mockReturnValue({
      endpoint: "https://s3.example.com",
      region: "eu-central-1",
      bucket: "dia",
      accessKeyId: "k",
      secretAccessKey: "s",
    });

    const key = await backupDatabaseToS3();

    expect(key).toMatch(/^db-backups\/dia-storage-.*\.dump$/);
    expect(spawnSpy).toHaveBeenCalledWith(
      "pg_dump",
      expect.any(Array),
      expect.any(Object),
    );
    expect(uploadToS3Mock).toHaveBeenCalledWith(
      expect.stringContaining("dia-storage-"),
      expect.stringMatching(/^db-backups\/dia-storage-.*\.dump$/),
      expect.objectContaining({ bucket: "dia" }),
    );
    expect(unlinkMock).toHaveBeenCalled();
  });

  it("still unlinks the local dump when the upload fails", async () => {
    getS3ConfigFromAppMock.mockReturnValue({
      endpoint: "e",
      region: "r",
      bucket: "b",
      accessKeyId: "k",
      secretAccessKey: "s",
    });
    uploadToS3Mock.mockRejectedValueOnce(new Error("S3 down"));

    await expect(backupDatabaseToS3()).rejects.toThrow("S3 down");
    expect(unlinkMock).toHaveBeenCalled();
  });

  it("swallows unlink failures in the cleanup path", async () => {
    getS3ConfigFromAppMock.mockReturnValue({
      endpoint: "e",
      region: "r",
      bucket: "b",
      accessKeyId: "k",
      secretAccessKey: "s",
    });
    unlinkMock.mockRejectedValueOnce(new Error("EACCES"));

    // Should not throw — unlink error is suppressed by .catch(() => undefined).
    const key = await backupDatabaseToS3();
    expect(key).toMatch(/^db-backups\//);
  });
});

describe("restoreDatabaseFromFile", () => {
  it("stats the source file before spawning pg_restore", async () => {
    await restoreDatabaseFromFile("/tmp/restore.dump");

    expect(statMock).toHaveBeenCalledWith("/tmp/restore.dump");
    expect(spawnSpy).toHaveBeenCalledWith(
      "pg_restore",
      expect.arrayContaining([
        "--clean",
        "--if-exists",
        "--no-owner",
        "--no-privileges",
      ]),
      expect.any(Object),
    );
  });

  it("rejects when the source file is missing", async () => {
    statMock.mockRejectedValueOnce(Object.assign(new Error("ENOENT"), { code: "ENOENT" }));
    await expect(restoreDatabaseFromFile("/tmp/missing.dump")).rejects.toThrow(
      "ENOENT",
    );
  });

  it("rejects when pg_restore exits with non-zero code", async () => {
    setSpawnFailure(2, "fatal: role missing");
    await expect(restoreDatabaseFromFile("/tmp/restore.dump")).rejects.toThrow(
      /pg_restore uscito con codice 2: fatal: role missing/,
    );
  });

  it("rejects when pg_restore emits a spawn error", async () => {
    setSpawnError(new Error("ENOENT pg_restore"));
    await expect(restoreDatabaseFromFile("/tmp/restore.dump")).rejects.toThrow(
      "ENOENT pg_restore",
    );
  });
});

describe("restoreDatabaseFromS3", () => {
  it("downloads the key and restores it, then cleans up", async () => {
    await restoreDatabaseFromS3("db-backups/dia-storage-1.dump");

    expect(mkdirMock).toHaveBeenCalled();
    expect(downloadFromS3Mock).toHaveBeenCalledWith(
      "db-backups/dia-storage-1.dump",
      expect.stringContaining("dia-storage-1.dump"),
    );
    expect(spawnSpy).toHaveBeenCalledWith(
      "pg_restore",
      expect.any(Array),
      expect.any(Object),
    );
    expect(unlinkMock).toHaveBeenCalled();
  });

  it("cleans up the local file even when restore fails", async () => {
    setSpawnFailure(1, "broken");
    await expect(
      restoreDatabaseFromS3("db-backups/dia-storage-2.dump"),
    ).rejects.toThrow(/pg_restore/);
    expect(unlinkMock).toHaveBeenCalled();
  });
});
