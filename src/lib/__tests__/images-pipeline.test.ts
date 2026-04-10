import { vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("node:fs/promises", () => ({
  writeFile: vi.fn(),
  rename: vi.fn(),
  copyFile: vi.fn(),
  unlink: vi.fn(),
}));

const mockIsValidJpeg = vi.fn();
vi.mock("@/lib/images/validation", () => ({
  isValidJpeg: (buf: Buffer) => mockIsValidJpeg(buf),
}));

const mockComputeChecksumFromBuffer = vi.fn();
const mockComputeChecksum = vi.fn();
vi.mock("@/lib/images/checksum", () => ({
  computeChecksumFromBuffer: (buf: Buffer) => mockComputeChecksumFromBuffer(buf),
  computeChecksum: (path: string) => mockComputeChecksum(path),
}));

const mockExtractExif = vi.fn();
vi.mock("@/lib/images/exif-reader", () => ({
  extractExif: (path: string) => mockExtractExif(path),
}));

const mockWriteExifDate = vi.fn();
vi.mock("@/lib/images/exif-writer", () => ({
  writeExifDate: (...args: unknown[]) => mockWriteExifDate(...args),
}));

const mockGenerateThumbnail = vi.fn();
const mockGenerateMedium = vi.fn();
const mockGetImageDimensions = vi.fn();
vi.mock("@/lib/images/thumbnails", () => ({
  generateThumbnail: (...args: unknown[]) => mockGenerateThumbnail(...args),
  generateMedium: (...args: unknown[]) => mockGenerateMedium(...args),
  getImageDimensions: (...args: unknown[]) => mockGetImageDimensions(...args),
}));

const mockGetIncomingDir = vi.fn();
const mockGetOriginalPath = vi.fn();
const mockGetThumbnailPath = vi.fn();
const mockGetMediumPath = vi.fn();
const mockEnsureDir = vi.fn();
vi.mock("@/lib/storage/paths", () => ({
  getIncomingDir: (...args: unknown[]) => mockGetIncomingDir(...args),
  getOriginalPath: (...args: unknown[]) => mockGetOriginalPath(...args),
  getThumbnailPath: (...args: unknown[]) => mockGetThumbnailPath(...args),
  getMediumPath: (...args: unknown[]) => mockGetMediumPath(...args),
  ensureDir: (...args: unknown[]) => mockEnsureDir(...args),
}));

// Fine-grained DB mock
const mockDbSelectLimit = vi.fn();
const mockDbSelectWhere = vi.fn(() => ({ limit: mockDbSelectLimit }));
const mockDbSelectFrom = vi.fn(() => ({ where: mockDbSelectWhere }));
const mockDbSelect = vi.fn(() => ({ from: mockDbSelectFrom }));
const mockDbInsertReturning = vi.fn();
const mockDbInsertValues = vi.fn(() => ({ returning: mockDbInsertReturning }));
const mockDbInsert = vi.fn(() => ({ values: mockDbInsertValues }));
const mockDbUpdateWhere = vi.fn();
const mockDbUpdateSet = vi.fn(() => ({ where: mockDbUpdateWhere }));
const mockDbUpdate = vi.fn(() => ({ set: mockDbUpdateSet }));

vi.mock("@/lib/db", () => ({
  db: {
    select: (...args: unknown[]) => mockDbSelect(...args),
    insert: (...args: unknown[]) => mockDbInsert(...args),
    update: (...args: unknown[]) => mockDbUpdate(...args),
  },
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { writeFile, copyFile, unlink } from "node:fs/promises";
import {
  processIncomingImage,
  archiveSlide,
  archiveBatch,
} from "@/lib/images/pipeline";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeJpegBuffer(): Buffer {
  // Real JPEG magic bytes at the start
  const buf = Buffer.alloc(100);
  buf[0] = 0xff;
  buf[1] = 0xd8;
  buf[2] = 0xff;
  return buf;
}

function defaultExif() {
  return {
    scanDate: null,
    width: 4000,
    height: 2667,
    make: "Reflecta",
    model: "DigitDia",
    software: null,
    orientation: null,
    xResolution: null,
    yResolution: null,
    colorSpace: null,
    raw: {},
  };
}

// Slide row as returned from DB
function makeSlideRow(overrides?: Record<string, unknown>) {
  return {
    id: 1,
    batchId: "batch-123",
    uploadedBy: 1,
    originalFilename: "PICT0001.JPG",
    storagePath: "/data/incoming/batch-123/PICT0001.JPG",
    thumbnailPath: "/data/incoming/batch-123/thumb_PICT0001.JPG",
    mediumPath: null,
    checksum: "abc123",
    fileSize: 5000000,
    width: 4000,
    height: 2667,
    scanDate: null,
    exifData: {},
    status: "incoming",
    backedUp: false,
    backedUpAt: null,
    exifWritten: false,
    title: null,
    dateTaken: null,
    dateTakenPrecise: null,
    location: null,
    notes: null,
    magazineId: null,
    slotNumber: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    searchVector: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests: processIncomingImage
// ---------------------------------------------------------------------------

describe("processIncomingImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsValidJpeg.mockReturnValue(true);
    mockComputeChecksumFromBuffer.mockReturnValue("abc123hash");
    // No duplicate found
    mockDbSelectLimit.mockResolvedValue([]);
    mockGetIncomingDir.mockReturnValue("/data/incoming/batch-001");
    mockEnsureDir.mockResolvedValue(undefined);
    (writeFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    mockExtractExif.mockResolvedValue(defaultExif());
    mockGetImageDimensions.mockResolvedValue({ width: 4000, height: 2667 });
    mockGenerateThumbnail.mockResolvedValue({ width: 400, height: 267 });
    mockDbInsertReturning.mockResolvedValue([
      makeSlideRow({
        id: 42,
        checksum: "abc123hash",
        originalFilename: "PICT0001.JPG",
        storagePath: "/data/incoming/batch-001/PICT0001.JPG",
        thumbnailPath: "/data/incoming/batch-001/thumb_PICT0001.JPG",
        status: "incoming",
      }),
    ]);
    // For getSlideCountForBatch inner call
    mockDbSelectFrom.mockReturnValue({ where: mockDbSelectWhere });
    mockDbSelectWhere.mockImplementation(() => {
      // For the duplicate check
      return { limit: mockDbSelectLimit };
    });
  });

  it("validates the JPEG buffer", async () => {
    const buf = makeJpegBuffer();
    await processIncomingImage(buf, "PICT0001.JPG", 1, "batch-001");
    expect(mockIsValidJpeg).toHaveBeenCalledWith(buf);
  });

  it("throws when buffer is not a valid JPEG", async () => {
    mockIsValidJpeg.mockReturnValue(false);
    await expect(
      processIncomingImage(Buffer.alloc(10), "bad.jpg", 1, "batch-001"),
    ).rejects.toThrow(/non è un JPEG valido/);
  });

  it("computes a checksum from the buffer", async () => {
    const buf = makeJpegBuffer();
    await processIncomingImage(buf, "PICT0001.JPG", 1, "batch-001");
    expect(mockComputeChecksumFromBuffer).toHaveBeenCalledWith(buf);
  });

  it("throws on duplicate checksum", async () => {
    mockDbSelectLimit.mockResolvedValue([{ id: 99 }]);
    await expect(
      processIncomingImage(makeJpegBuffer(), "PICT0001.JPG", 1, "batch-001"),
    ).rejects.toThrow(/Immagine duplicata/);
  });

  it("saves the file to the incoming directory", async () => {
    const buf = makeJpegBuffer();
    await processIncomingImage(buf, "PICT0001.JPG", 1, "batch-001");

    expect(mockEnsureDir).toHaveBeenCalledWith("/data/incoming/batch-001");
    expect(writeFile).toHaveBeenCalledWith(
      "/data/incoming/batch-001/PICT0001.JPG",
      buf,
    );
  });

  it("extracts EXIF data from the saved file", async () => {
    await processIncomingImage(makeJpegBuffer(), "PICT0001.JPG", 1, "batch-001");
    expect(mockExtractExif).toHaveBeenCalledWith("/data/incoming/batch-001/PICT0001.JPG");
  });

  it("generates a thumbnail", async () => {
    await processIncomingImage(makeJpegBuffer(), "PICT0001.JPG", 1, "batch-001");
    expect(mockGenerateThumbnail).toHaveBeenCalledWith(
      "/data/incoming/batch-001/PICT0001.JPG",
      "/data/incoming/batch-001/thumb_PICT0001.JPG",
    );
  });

  it("falls back to getImageDimensions when EXIF has no dimensions", async () => {
    mockExtractExif.mockResolvedValue({ ...defaultExif(), width: null, height: null });
    await processIncomingImage(makeJpegBuffer(), "PICT0001.JPG", 1, "batch-001");
    expect(mockGetImageDimensions).toHaveBeenCalledWith("/data/incoming/batch-001/PICT0001.JPG");
  });

  it("does not call getImageDimensions when EXIF has dimensions", async () => {
    mockExtractExif.mockResolvedValue(defaultExif());
    await processIncomingImage(makeJpegBuffer(), "PICT0001.JPG", 1, "batch-001");
    expect(mockGetImageDimensions).not.toHaveBeenCalled();
  });

  it("inserts a DB record and returns the processed slide", async () => {
    const result = await processIncomingImage(makeJpegBuffer(), "PICT0001.JPG", 1, "batch-001");

    expect(mockDbInsert).toHaveBeenCalled();
    expect(result).toEqual({
      id: 42,
      checksum: "abc123hash",
      originalFilename: "PICT0001.JPG",
      storagePath: "/data/incoming/batch-001/PICT0001.JPG",
      thumbnailPath: "/data/incoming/batch-001/thumb_PICT0001.JPG",
      width: 4000,
      height: 2667,
      status: "incoming",
    });
  });

  it("updates the batch slide count", async () => {
    await processIncomingImage(makeJpegBuffer(), "PICT0001.JPG", 1, "batch-001");
    // update is called for uploadBatches slide count
    expect(mockDbUpdate).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Tests: archiveSlide
// ---------------------------------------------------------------------------

describe("archiveSlide", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnsureDir.mockResolvedValue(undefined);
    (copyFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (unlink as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    mockGenerateMedium.mockResolvedValue({ width: 1600, height: 1067 });
    mockGenerateThumbnail.mockResolvedValue({ width: 400, height: 267 });
    mockWriteExifDate.mockResolvedValue(undefined);
    mockGetOriginalPath.mockReturnValue("/data/originals/2024/06/slide_1.jpg");
    mockGetThumbnailPath.mockReturnValue("/data/thumbnails/2024/06/slide_1.jpg");
    mockGetMediumPath.mockReturnValue("/data/medium/2024/06/slide_1.jpg");

    // DB returns the incoming slide
    mockDbSelectLimit.mockResolvedValue([makeSlideRow()]);
    mockDbUpdateWhere.mockResolvedValue(undefined);
    mockDbInsertReturning.mockResolvedValue([]);
  });

  it("throws when slide is not found", async () => {
    mockDbSelectLimit.mockResolvedValue([]);
    await expect(archiveSlide(999, {})).rejects.toThrow(/non trovata/);
  });

  it("throws when slide is not in incoming status", async () => {
    mockDbSelectLimit.mockResolvedValue([makeSlideRow({ status: "active" })]);
    await expect(archiveSlide(1, {})).rejects.toThrow(/non è nello stato "incoming"/);
  });

  it("throws when slide has no storagePath", async () => {
    mockDbSelectLimit.mockResolvedValue([makeSlideRow({ storagePath: null })]);
    await expect(archiveSlide(1, {})).rejects.toThrow(/non ha un percorso/);
  });

  it("generates medium resolution version", async () => {
    await archiveSlide(1, {});
    expect(mockGenerateMedium).toHaveBeenCalledWith(
      "/data/incoming/batch-123/PICT0001.JPG",
      "/data/medium/2024/06/slide_1.jpg",
    );
  });

  it("copies original to permanent storage", async () => {
    await archiveSlide(1, {});
    expect(copyFile).toHaveBeenCalledWith(
      "/data/incoming/batch-123/PICT0001.JPG",
      "/data/originals/2024/06/slide_1.jpg",
    );
  });

  it("copies thumbnail to permanent storage", async () => {
    await archiveSlide(1, {});
    expect(copyFile).toHaveBeenCalledWith(
      "/data/incoming/batch-123/thumb_PICT0001.JPG",
      "/data/thumbnails/2024/06/slide_1.jpg",
    );
  });

  it("regenerates thumbnail when thumbnailPath is missing", async () => {
    mockDbSelectLimit.mockResolvedValue([makeSlideRow({ thumbnailPath: null })]);
    await archiveSlide(1, {});
    expect(mockGenerateThumbnail).toHaveBeenCalledWith(
      "/data/originals/2024/06/slide_1.jpg",
      "/data/thumbnails/2024/06/slide_1.jpg",
    );
  });

  it("writes EXIF date when dateTaken is provided", async () => {
    await archiveSlide(1, { dateTaken: "2024-06-15" });
    expect(mockWriteExifDate).toHaveBeenCalledWith(
      "/data/originals/2024/06/slide_1.jpg",
      "2024-06-15",
      undefined,
    );
  });

  it("writes EXIF date with title when both are provided", async () => {
    await archiveSlide(1, { dateTaken: "2024-06-15", title: "Vacanze" });
    expect(mockWriteExifDate).toHaveBeenCalledWith(
      "/data/originals/2024/06/slide_1.jpg",
      "2024-06-15",
      "Vacanze",
    );
  });

  it("does not write EXIF when dateTaken is not provided", async () => {
    await archiveSlide(1, {});
    expect(mockWriteExifDate).not.toHaveBeenCalled();
  });

  it("updates the DB record to active status", async () => {
    await archiveSlide(1, { title: "Test" });
    expect(mockDbUpdate).toHaveBeenCalled();
    expect(mockDbUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: "active" }),
    );
  });

  it("creates an audit log entry", async () => {
    await archiveSlide(1, {});
    expect(mockDbInsert).toHaveBeenCalled();
  });

  it("cleans up incoming files", async () => {
    await archiveSlide(1, {});
    expect(unlink).toHaveBeenCalledWith("/data/incoming/batch-123/PICT0001.JPG");
  });

  it("does not throw when cleanup of incoming files fails", async () => {
    (unlink as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("ENOENT"));
    await expect(archiveSlide(1, {})).resolves.toBeUndefined();
  });

  it("uses provided dateTaken for directory structure", async () => {
    await archiveSlide(1, { dateTaken: "1985-07-20" });
    // getOriginalPath should be called with a Date based on the metadata
    expect(mockGetOriginalPath).toHaveBeenCalledWith(1, expect.any(Date));
  });

  it("ensures directories exist for original, thumbnail, and medium", async () => {
    await archiveSlide(1, {});
    // ensureDir is called for medium, original, and thumbnail directories
    expect(mockEnsureDir).toHaveBeenCalledTimes(3);
  });
});

// ---------------------------------------------------------------------------
// Tests: archiveBatch
// ---------------------------------------------------------------------------

describe("archiveBatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnsureDir.mockResolvedValue(undefined);
    (copyFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (unlink as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    mockGenerateMedium.mockResolvedValue({ width: 1600, height: 1067 });
    mockWriteExifDate.mockResolvedValue(undefined);
    mockGetOriginalPath.mockReturnValue("/data/originals/2024/06/slide_1.jpg");
    mockGetThumbnailPath.mockReturnValue("/data/thumbnails/2024/06/slide_1.jpg");
    mockGetMediumPath.mockReturnValue("/data/medium/2024/06/slide_1.jpg");
    mockDbInsertReturning.mockResolvedValue([]);
    mockDbUpdateWhere.mockResolvedValue(undefined);
  });

  it("archives all incoming slides in the batch", async () => {
    // First call: archiveBatch queries slides; subsequent: archiveSlide queries each slide
    let callCount = 0;
    mockDbSelectWhere.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // archiveBatch query - returns slide IDs
        return Promise.resolve([{ id: 1 }, { id: 2 }]);
      }
      // archiveSlide query - returns full slide row
      return { limit: vi.fn().mockResolvedValue([makeSlideRow()]) };
    });

    const result = await archiveBatch("batch-123", { title: "Test" });

    expect(result.archived).toBe(2);
    expect(result.errors).toHaveLength(0);
  });

  it("returns empty results for batch with no incoming slides", async () => {
    mockDbSelectWhere.mockResolvedValue([]);

    const result = await archiveBatch("batch-empty", {});

    expect(result.archived).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it("collects errors per slide without aborting the batch", async () => {
    let callCount = 0;
    mockDbSelectWhere.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve([{ id: 1 }, { id: 2 }]);
      }
      if (callCount === 2) {
        // First slide: found but will fail on archive
        return { limit: vi.fn().mockResolvedValue([makeSlideRow()]) };
      }
      // Second slide: not found
      return { limit: vi.fn().mockResolvedValue([]) };
    });

    const result = await archiveBatch("batch-123", {});

    // First slide should succeed, second should fail (not found)
    expect(result.archived).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].slideId).toBe(2);
  });

  it("updates batch status to archived when all slides succeed", async () => {
    mockDbSelectWhere.mockImplementation(() => {
      return Promise.resolve([]);
    });

    // Override for first call that queries batch slides
    let firstCall = true;
    mockDbSelectFrom.mockImplementation(() => {
      if (firstCall) {
        firstCall = false;
        return { where: vi.fn().mockResolvedValue([]) };
      }
      return { where: mockDbSelectWhere };
    });

    await archiveBatch("batch-123", {});

    // batch update should be called (no errors case)
    expect(mockDbUpdate).toHaveBeenCalled();
  });
});
