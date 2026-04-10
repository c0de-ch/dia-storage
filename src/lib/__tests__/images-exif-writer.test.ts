import { vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockToFile = vi.fn();
const mockWithExifMerge = vi.fn(() => ({ toFile: mockToFile }));
const mockSharpInstance = {
  withExifMerge: mockWithExifMerge,
  toFile: mockToFile,
};

vi.mock("sharp", () => ({
  default: vi.fn(() => mockSharpInstance),
}));

const mockRename = vi.fn();
const mockCopyFileFn = vi.fn();
const mockUnlinkFn = vi.fn();

vi.mock("node:fs/promises", () => ({
  rename: (...args: unknown[]) => mockRename(...args),
  copyFile: (...args: unknown[]) => mockCopyFileFn(...args),
  unlink: (...args: unknown[]) => mockUnlinkFn(...args),
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import sharp from "sharp";
import {
  formatExifDate,
  writeExifDate,
  writeExifDateToCopy,
} from "@/lib/images/exif-writer";

// ---------------------------------------------------------------------------
// Tests: formatExifDate
// ---------------------------------------------------------------------------

describe("formatExifDate", () => {
  it("formats an ISO date string to EXIF format", () => {
    // Using UTC midnight to avoid timezone issues
    const result = formatExifDate("2024-06-15T00:00:00.000Z");
    // The exact output depends on local timezone, but it should match the EXIF pattern
    expect(result).toMatch(/^\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it("formats a date-only string", () => {
    const result = formatExifDate("2024-06-15");
    expect(result).toMatch(/^2024:06:\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it("pads single-digit month and day with zeros", () => {
    const result = formatExifDate("2024-01-05T12:00:00.000Z");
    expect(result).toMatch(/^2024:01/);
  });

  it("includes time components", () => {
    // Use a specific timezone-safe date
    const d = new Date(2024, 5, 15, 14, 30, 45); // June 15, 2024 14:30:45 local
    const result = formatExifDate(d.toISOString());
    expect(result).toContain("14:30:45");
  });

  it("throws on invalid date string", () => {
    expect(() => formatExifDate("not-a-date")).toThrow(/Data non valida/);
  });

  it("throws on empty string", () => {
    expect(() => formatExifDate("")).toThrow(/Data non valida/);
  });

  it("handles dates far in the past", () => {
    const result = formatExifDate("1975-03-22T10:00:00.000Z");
    expect(result).toMatch(/^1975:03/);
  });
});

// ---------------------------------------------------------------------------
// Tests: writeExifDate
// ---------------------------------------------------------------------------

describe("writeExifDate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToFile.mockResolvedValue({});
    mockRename.mockResolvedValue(undefined);
    mockUnlinkFn.mockResolvedValue(undefined);
  });

  it("creates a sharp instance with the input file", async () => {
    await writeExifDate("/photos/slide.jpg", "2024-06-15");
    expect(sharp).toHaveBeenCalledWith("/photos/slide.jpg");
  });

  it("merges EXIF data with DateTime and DateTimeOriginal", async () => {
    await writeExifDate("/photos/slide.jpg", "2024-06-15");

    expect(mockWithExifMerge).toHaveBeenCalledWith(
      expect.objectContaining({
        IFD0: expect.objectContaining({
          DateTime: expect.stringMatching(/^2024:06/),
        }),
        IFD: expect.objectContaining({
          DateTimeOriginal: expect.stringMatching(/^2024:06/),
          DateTimeDigitized: expect.stringMatching(/^2024:06/),
        }),
      }),
    );
  });

  it("includes ImageDescription when title is provided", async () => {
    await writeExifDate("/photos/slide.jpg", "2024-06-15", "Vacanze estive");

    expect(mockWithExifMerge).toHaveBeenCalledWith(
      expect.objectContaining({
        IFD0: expect.objectContaining({
          ImageDescription: "Vacanze estive",
        }),
      }),
    );
  });

  it("does not include ImageDescription when title is not provided", async () => {
    await writeExifDate("/photos/slide.jpg", "2024-06-15");

    const exifArg = mockWithExifMerge.mock.calls[0][0];
    expect(exifArg.IFD0).not.toHaveProperty("ImageDescription");
  });

  it("writes to a temp file and renames atomically", async () => {
    await writeExifDate("/photos/slide.jpg", "2024-06-15");

    expect(mockToFile).toHaveBeenCalledWith(
      expect.stringMatching(/^\/photos\/\.tmp_exif_slide\.jpg$/),
    );
    expect(mockRename).toHaveBeenCalledWith(
      expect.stringMatching(/^\/photos\/\.tmp_exif_slide\.jpg$/),
      "/photos/slide.jpg",
    );
  });

  it("cleans up temp file on sharp error", async () => {
    mockToFile.mockRejectedValue(new Error("sharp failed"));

    await expect(
      writeExifDate("/photos/slide.jpg", "2024-06-15"),
    ).rejects.toThrow("sharp failed");

    expect(mockUnlinkFn).toHaveBeenCalledWith(
      expect.stringMatching(/^\/photos\/\.tmp_exif_slide\.jpg$/),
    );
  });

  it("does not throw when temp cleanup also fails", async () => {
    mockToFile.mockRejectedValue(new Error("sharp failed"));
    mockUnlinkFn.mockRejectedValue(new Error("ENOENT"));

    await expect(
      writeExifDate("/photos/slide.jpg", "2024-06-15"),
    ).rejects.toThrow("sharp failed");
  });

  it("cleans up temp file on rename error", async () => {
    mockRename.mockRejectedValue(new Error("rename failed"));

    await expect(
      writeExifDate("/photos/slide.jpg", "2024-06-15"),
    ).rejects.toThrow("rename failed");

    expect(mockUnlinkFn).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Tests: writeExifDateToCopy
// ---------------------------------------------------------------------------

describe("writeExifDateToCopy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCopyFileFn.mockResolvedValue(undefined);
    mockToFile.mockResolvedValue({});
    mockRename.mockResolvedValue(undefined);
    mockUnlinkFn.mockResolvedValue(undefined);
  });

  it("copies the source file to the destination first", async () => {
    await writeExifDateToCopy(
      "/source/original.jpg",
      "/dest/copy.jpg",
      "2024-06-15",
    );

    expect(mockCopyFileFn).toHaveBeenCalledWith(
      "/source/original.jpg",
      "/dest/copy.jpg",
    );
  });

  it("writes EXIF to the copy, not the source", async () => {
    await writeExifDateToCopy(
      "/source/original.jpg",
      "/dest/copy.jpg",
      "2024-06-15",
      "Titolo",
    );

    // sharp should be called with the destination path
    expect(sharp).toHaveBeenCalledWith("/dest/copy.jpg");
  });

  it("passes title through to writeExifDate", async () => {
    await writeExifDateToCopy(
      "/source/original.jpg",
      "/dest/copy.jpg",
      "2024-06-15",
      "Montagna",
    );

    expect(mockWithExifMerge).toHaveBeenCalledWith(
      expect.objectContaining({
        IFD0: expect.objectContaining({
          ImageDescription: "Montagna",
        }),
      }),
    );
  });

  it("does not modify the source file", async () => {
    await writeExifDateToCopy(
      "/source/original.jpg",
      "/dest/copy.jpg",
      "2024-06-15",
    );

    // sharp should only be called with the dest path, not the source
    expect(sharp).not.toHaveBeenCalledWith("/source/original.jpg");
  });

  it("throws when copy fails", async () => {
    mockCopyFileFn.mockRejectedValue(new Error("ENOSPC"));
    await expect(
      writeExifDateToCopy("/source/original.jpg", "/dest/copy.jpg", "2024-06-15"),
    ).rejects.toThrow("ENOSPC");
  });
});
