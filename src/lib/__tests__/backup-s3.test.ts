import { vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSend = vi.fn();
const s3ClientSpy = vi.fn();

vi.mock("@aws-sdk/client-s3", () => {
  class MockS3Client {
    constructor(config: unknown) {
      s3ClientSpy(config);
      this.send = mockSend;
    }
    send: ReturnType<typeof vi.fn>;
  }
  class MockHeadBucketCommand {
    Bucket: string | undefined;
    constructor(params: { Bucket: string }) {
      this.Bucket = params.Bucket;
    }
  }
  class MockGetObjectCommand {
    params: { Bucket: string; Key: string };
    constructor(params: { Bucket: string; Key: string }) {
      this.params = params;
    }
  }
  class MockListObjectsV2Command {
    params: { Bucket: string; Prefix: string; ContinuationToken?: string };
    constructor(params: {
      Bucket: string;
      Prefix: string;
      ContinuationToken?: string;
    }) {
      this.params = params;
    }
  }
  return {
    S3Client: MockS3Client,
    HeadBucketCommand: MockHeadBucketCommand,
    GetObjectCommand: MockGetObjectCommand,
    ListObjectsV2Command: MockListObjectsV2Command,
  };
});

const mockUploadDone = vi.fn();
const uploadSpy = vi.fn();

vi.mock("@aws-sdk/lib-storage", () => {
  class MockUpload {
    constructor(params: unknown) {
      uploadSpy(params);
      this.done = mockUploadDone;
    }
    done: ReturnType<typeof vi.fn>;
  }
  return { Upload: MockUpload };
});

const mockWriteSink = { writable: true };
vi.mock("node:fs", () => ({
  createReadStream: vi.fn(() => "mock-stream"),
  createWriteStream: vi.fn(() => mockWriteSink),
}));

const pipelineMock = vi.fn(() => Promise.resolve());
vi.mock("node:stream/promises", () => ({
  pipeline: (...args: unknown[]) => pipelineMock(...args),
}));

vi.mock("node:fs/promises", () => ({
  stat: vi.fn(() => Promise.resolve({ size: 5_000_000 })),
}));

// Mock config loader
const mockGetConfig = vi.fn();
vi.mock("@/lib/config/loader", () => ({
  getConfig: () => mockGetConfig(),
}));

// db is already mocked in setup.ts but we need fine-grained control
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
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { stat } from "node:fs/promises";
import {
  createS3Client,
  testS3Connection,
  uploadToS3,
  downloadFromS3,
  listS3Keys,
  getS3ConfigFromApp,
  runIncrementalBackup,
  type S3Config,
} from "@/lib/backup/s3";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const baseConfig: S3Config = {
  endpoint: "https://s3.example.com",
  region: "eu-central-1",
  bucket: "dia-backup",
  accessKeyId: "AKID",
  secretAccessKey: "SECRET",
};

function makeAppConfig(overrides?: Partial<{ destinations: unknown[]; enabled: boolean; schedule: string }>) {
  return {
    backup: {
      enabled: true,
      schedule: "0 2 * * *",
      destinations: overrides?.destinations ?? [
        {
          type: "s3",
          endpoint: "https://s3.example.com",
          region: "eu-central-1",
          bucket: "dia-backup",
          accessKeyId: "AKID",
          secretAccessKey: "SECRET",
        },
      ],
      ...overrides,
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createS3Client", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates an S3Client with the given config", () => {
    const client = createS3Client(baseConfig);
    expect(s3ClientSpy).toHaveBeenCalledWith({
      endpoint: baseConfig.endpoint,
      region: baseConfig.region,
      credentials: {
        accessKeyId: baseConfig.accessKeyId,
        secretAccessKey: baseConfig.secretAccessKey,
      },
      forcePathStyle: true,
    });
    expect(client).toBeDefined();
  });

  it("respects explicit forcePathStyle=false", () => {
    createS3Client({ ...baseConfig, forcePathStyle: false });
    expect(s3ClientSpy).toHaveBeenCalledWith(
      expect.objectContaining({ forcePathStyle: false }),
    );
  });

  it("defaults forcePathStyle to true when not specified", () => {
    const { forcePathStyle: _, ...configWithout } = baseConfig;
    createS3Client(configWithout as S3Config);
    expect(s3ClientSpy).toHaveBeenCalledWith(
      expect.objectContaining({ forcePathStyle: true }),
    );
  });
});

describe("testS3Connection", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends a HeadBucket command and returns true on success", async () => {
    mockSend.mockResolvedValue({});
    const result = await testS3Connection(baseConfig);
    expect(result).toBe(true);
    // HeadBucketCommand was instantiated (verified by send being called)
    expect(mockSend).toHaveBeenCalled();
    expect(mockSend).toHaveBeenCalled();
  });

  it("throws when S3 is unreachable", async () => {
    mockSend.mockRejectedValue(new Error("Network error"));
    await expect(testS3Connection(baseConfig)).rejects.toThrow("Network error");
  });

  it("throws when bucket does not exist", async () => {
    mockSend.mockRejectedValue(new Error("NotFound"));
    await expect(testS3Connection(baseConfig)).rejects.toThrow("NotFound");
  });
});

describe("uploadToS3", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUploadDone.mockResolvedValue({});
  });

  it("uploads a file with multipart upload", async () => {
    await uploadToS3("/data/originals/2024/06/slide_1.jpg", "originals/2024/06/slide_1.jpg", baseConfig);

    expect(uploadSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          Bucket: "dia-backup",
          Key: "originals/2024/06/slide_1.jpg",
          Body: "mock-stream",
          ContentType: "image/jpeg",
          ContentLength: 5_000_000,
        }),
        partSize: 10 * 1024 * 1024,
        queueSize: 4,
      }),
    );
    expect(mockUploadDone).toHaveBeenCalled();
  });

  it("stats the file to get content length", async () => {
    await uploadToS3("/path/to/file.jpg", "key.jpg", baseConfig);
    expect(stat).toHaveBeenCalledWith("/path/to/file.jpg");
  });

  it("falls back to app config when no explicit config", async () => {
    mockGetConfig.mockReturnValue(makeAppConfig());
    await uploadToS3("/path/to/file.jpg", "key.jpg");
    expect(uploadSpy).toHaveBeenCalled();
  });

  it("throws when no S3 config is available", async () => {
    mockGetConfig.mockReturnValue(makeAppConfig({ destinations: [] }));
    await expect(uploadToS3("/path/to/file.jpg", "key.jpg")).rejects.toThrow(
      /Configurazione S3 non trovata/,
    );
  });

  it("throws when upload fails", async () => {
    mockUploadDone.mockRejectedValue(new Error("Upload failed"));
    await expect(
      uploadToS3("/path/to/file.jpg", "key.jpg", baseConfig),
    ).rejects.toThrow("Upload failed");
  });
});

describe("runIncrementalBackup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetConfig.mockReturnValue(makeAppConfig());
    mockUploadDone.mockResolvedValue({});
    (stat as ReturnType<typeof vi.fn>).mockResolvedValue({ size: 1_000_000 });
  });

  it("throws when S3 config is not available", async () => {
    mockGetConfig.mockReturnValue(makeAppConfig({ destinations: [] }));
    await expect(runIncrementalBackup()).rejects.toThrow(
      /Configurazione S3 non disponibile/,
    );
  });

  it("uploads pending slides and returns count", async () => {
    // pending slides
    mockSelectFromWhere.mockResolvedValue([
      { id: 1, storagePath: "/data/originals/2024/06/slide_1.jpg", status: "active", backedUp: false },
      { id: 2, storagePath: "/data/originals/2024/06/slide_2.jpg", status: "active", backedUp: false },
    ]);

    // insert history row
    mockInsertReturning.mockResolvedValue([{ id: 100 }]);

    const result = await runIncrementalBackup();

    expect(result.uploaded).toBe(2);
    expect(result.errors).toHaveLength(0);
    expect(mockUploadDone).toHaveBeenCalledTimes(2);
  });

  it("skips slides without storagePath", async () => {
    mockSelectFromWhere.mockResolvedValue([
      { id: 1, storagePath: null, status: "active", backedUp: false },
    ]);
    mockInsertReturning.mockResolvedValue([{ id: 100 }]);

    const result = await runIncrementalBackup();

    expect(result.uploaded).toBe(0);
    expect(result.errors).toHaveLength(0);
    expect(mockUploadDone).not.toHaveBeenCalled();
  });

  it("collects per-slide errors without aborting the batch", async () => {
    mockSelectFromWhere.mockResolvedValue([
      { id: 1, storagePath: "/data/originals/2024/06/slide_1.jpg", status: "active", backedUp: false },
      { id: 2, storagePath: "/data/originals/2024/06/slide_2.jpg", status: "active", backedUp: false },
    ]);
    mockInsertReturning.mockResolvedValue([{ id: 100 }]);

    // First upload succeeds, second fails
    mockUploadDone.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error("S3 timeout"));

    const result = await runIncrementalBackup();

    expect(result.uploaded).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toEqual({ slideId: 2, error: "S3 timeout" });
  });

  it("records backup history on success", async () => {
    mockSelectFromWhere.mockResolvedValue([
      { id: 1, storagePath: "/data/originals/2024/06/slide_1.jpg", status: "active", backedUp: false },
    ]);
    mockInsertReturning.mockResolvedValue([{ id: 50 }]);

    await runIncrementalBackup();

    // insert was called for history row
    expect(mockInsert).toHaveBeenCalled();
    // update was called for the slide AND the history row
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("handles no pending slides", async () => {
    mockSelectFromWhere.mockResolvedValue([]);
    mockInsertReturning.mockResolvedValue([{ id: 50 }]);

    const result = await runIncrementalBackup();

    expect(result.uploaded).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it("handles non-Error throws from upload", async () => {
    mockSelectFromWhere.mockResolvedValue([
      { id: 1, storagePath: "/data/originals/2024/06/slide_1.jpg", status: "active", backedUp: false },
    ]);
    mockInsertReturning.mockResolvedValue([{ id: 100 }]);
    mockUploadDone.mockRejectedValue("string error");

    const result = await runIncrementalBackup();

    expect(result.errors[0].error).toBe("string error");
  });
});

describe("getS3ConfigFromApp", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null when no s3 destination is configured", () => {
    mockGetConfig.mockReturnValue(makeAppConfig({ destinations: [] }));
    expect(getS3ConfigFromApp()).toBeNull();
  });

  it("returns null when the s3 destination is missing credentials", () => {
    mockGetConfig.mockReturnValue(
      makeAppConfig({
        destinations: [
          { type: "s3", endpoint: "https://s3.example.com", bucket: "b" },
        ],
      }),
    );
    expect(getS3ConfigFromApp()).toBeNull();
  });

  it("defaults region to us-east-1 when not provided", () => {
    mockGetConfig.mockReturnValue(
      makeAppConfig({
        destinations: [
          {
            type: "s3",
            endpoint: "https://s3.example.com",
            bucket: "b",
            accessKeyId: "k",
            secretAccessKey: "s",
          },
        ],
      }),
    );
    const cfg = getS3ConfigFromApp();
    expect(cfg).toMatchObject({ region: "us-east-1", bucket: "b" });
  });
});

describe("downloadFromS3", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pipelineMock.mockResolvedValue(undefined);
  });

  it("streams the S3 object body into the destination write stream", async () => {
    mockSend.mockResolvedValue({ Body: "mock-body" });

    await downloadFromS3("some/key", "/tmp/out.dump", baseConfig);

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(pipelineMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to app config when no explicit config is provided", async () => {
    mockGetConfig.mockReturnValue(makeAppConfig());
    mockSend.mockResolvedValue({ Body: "mock-body" });

    await downloadFromS3("some/key", "/tmp/out.dump");

    expect(mockSend).toHaveBeenCalled();
  });

  it("throws when no S3 config is available", async () => {
    mockGetConfig.mockReturnValue(makeAppConfig({ destinations: [] }));
    await expect(downloadFromS3("k", "/tmp/x")).rejects.toThrow(
      /Configurazione S3 non trovata/,
    );
  });

  it("throws when the S3 object has an empty body", async () => {
    mockSend.mockResolvedValue({ Body: null });
    await expect(
      downloadFromS3("some/key", "/tmp/out.dump", baseConfig),
    ).rejects.toThrow(/Oggetto S3 vuoto/);
  });
});

describe("listS3Keys", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns objects sorted by lastModified desc", async () => {
    const older = new Date("2024-01-01T00:00:00Z");
    const newer = new Date("2024-06-01T00:00:00Z");
    mockSend.mockResolvedValueOnce({
      Contents: [
        { Key: "a.dump", Size: 100, LastModified: older },
        { Key: "b.dump", Size: 200, LastModified: newer },
      ],
      IsTruncated: false,
    });

    const results = await listS3Keys("db-backups/", baseConfig);

    expect(results.map((r) => r.key)).toEqual(["b.dump", "a.dump"]);
    expect(results[0]).toMatchObject({ size: 200, lastModified: newer });
  });

  it("paginates through ContinuationToken-driven responses", async () => {
    const d1 = new Date("2024-01-01T00:00:00Z");
    const d2 = new Date("2024-02-01T00:00:00Z");
    mockSend
      .mockResolvedValueOnce({
        Contents: [{ Key: "a", Size: 1, LastModified: d1 }],
        IsTruncated: true,
        NextContinuationToken: "tok1",
      })
      .mockResolvedValueOnce({
        Contents: [{ Key: "b", Size: 2, LastModified: d2 }],
        IsTruncated: false,
      });

    const results = await listS3Keys("prefix/", baseConfig);

    expect(mockSend).toHaveBeenCalledTimes(2);
    expect(results).toHaveLength(2);
  });

  it("skips entries with missing Key or LastModified", async () => {
    mockSend.mockResolvedValueOnce({
      Contents: [
        { Key: undefined, Size: 1, LastModified: new Date() },
        { Key: "ok", LastModified: undefined },
        { Key: "good", Size: 10, LastModified: new Date("2024-03-01Z") },
      ],
      IsTruncated: false,
    });

    const results = await listS3Keys("p/", baseConfig);
    expect(results.map((r) => r.key)).toEqual(["good"]);
  });

  it("treats missing Contents as empty", async () => {
    mockSend.mockResolvedValueOnce({ IsTruncated: false });
    const results = await listS3Keys("p/", baseConfig);
    expect(results).toEqual([]);
  });

  it("defaults size to 0 when Size is missing", async () => {
    mockSend.mockResolvedValueOnce({
      Contents: [{ Key: "k", LastModified: new Date("2024-01-01Z") }],
      IsTruncated: false,
    });
    const [first] = await listS3Keys("p/", baseConfig);
    expect(first.size).toBe(0);
  });

  it("falls back to app config when no explicit config is provided", async () => {
    mockGetConfig.mockReturnValue(makeAppConfig());
    mockSend.mockResolvedValueOnce({ Contents: [], IsTruncated: false });
    await listS3Keys("prefix/");
    expect(mockSend).toHaveBeenCalled();
  });

  it("throws when no S3 config is available", async () => {
    mockGetConfig.mockReturnValue(makeAppConfig({ destinations: [] }));
    await expect(listS3Keys("prefix/")).rejects.toThrow(
      /Configurazione S3 non trovata/,
    );
  });
});
