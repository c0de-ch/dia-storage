import { vi } from "vitest";

// Use vi.hoisted to declare mock before vi.mock hoisting
const mockExecFileAsync = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  unlink: vi.fn(),
}));

vi.mock("node:crypto", () => ({
  randomBytes: vi.fn(() => ({ toString: () => "abcdef01" })),
}));

vi.mock("node:util", () => ({
  promisify: vi.fn(() => mockExecFileAsync),
}));

import { isHeicFile, readImageBuffer } from "@/lib/images/heic";
import { readFile, unlink } from "node:fs/promises";

describe("isHeicFile", () => {
  it("returns true for .heic files", () => {
    expect(isHeicFile("/photos/IMG_001.heic")).toBe(true);
    expect(isHeicFile("/photos/IMG_001.HEIC")).toBe(true);
  });

  it("returns true for .heif files", () => {
    expect(isHeicFile("/photos/IMG_001.heif")).toBe(true);
    expect(isHeicFile("/photos/IMG_001.HEIF")).toBe(true);
  });

  it("returns false for non-HEIC files", () => {
    expect(isHeicFile("/photos/IMG_001.jpg")).toBe(false);
    expect(isHeicFile("/photos/IMG_001.png")).toBe(false);
    expect(isHeicFile("/photos/IMG_001.tiff")).toBe(false);
  });
});

describe("readImageBuffer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads non-HEIC files directly", async () => {
    const buffer = Buffer.from("jpeg-data");
    vi.mocked(readFile).mockResolvedValue(buffer);

    const result = await readImageBuffer("/photos/IMG_001.jpg");
    expect(result).toBe(buffer);
    expect(readFile).toHaveBeenCalledWith("/photos/IMG_001.jpg");
  });

  it("converts HEIC files to JPEG via heif-convert", async () => {
    const jpegBuffer = Buffer.from("converted-jpeg");
    mockExecFileAsync.mockResolvedValue({ stdout: "", stderr: "" });
    vi.mocked(readFile).mockResolvedValue(jpegBuffer);
    vi.mocked(unlink).mockResolvedValue(undefined);

    const result = await readImageBuffer("/photos/IMG_001.heic");
    expect(result).toEqual(jpegBuffer);
    expect(mockExecFileAsync).toHaveBeenCalled();
  });

  it("cleans up temp file even on conversion error", async () => {
    mockExecFileAsync.mockRejectedValue(new Error("heif-convert not found"));
    vi.mocked(unlink).mockResolvedValue(undefined);

    await expect(readImageBuffer("/photos/IMG_001.heic")).rejects.toThrow("heif-convert not found");
    expect(unlink).toHaveBeenCalled();
  });
});
