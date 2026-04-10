import { vi } from "vitest";

// Mock sharp with a builder pattern
const mockToFile = vi.fn();
const mockJpeg = vi.fn(() => ({ toFile: mockToFile }));
const mockResize = vi.fn(() => ({ jpeg: mockJpeg }));
const mockMetadata = vi.fn();
const mockSharpInstance = {
  resize: mockResize,
  jpeg: mockJpeg,
  toFile: mockToFile,
  metadata: mockMetadata,
};

vi.mock("sharp", () => ({
  default: vi.fn(() => mockSharpInstance),
}));

import sharp from "sharp";
import {
  generateThumbnail,
  generateMedium,
  getImageDimensions,
} from "@/lib/images/thumbnails";

// ---------------------------------------------------------------------------
// generateThumbnail
// ---------------------------------------------------------------------------
describe("generateThumbnail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToFile.mockResolvedValue({ width: 400, height: 267 });
  });

  it("calls sharp with the input path", async () => {
    await generateThumbnail("/input/photo.jpg", "/output/thumb.jpg");
    expect(sharp).toHaveBeenCalledWith("/input/photo.jpg");
  });

  it("resizes to 400px width without enlargement", async () => {
    await generateThumbnail("/input/photo.jpg", "/output/thumb.jpg");
    expect(mockResize).toHaveBeenCalledWith({
      width: 400,
      withoutEnlargement: true,
    });
  });

  it("uses JPEG quality 80", async () => {
    await generateThumbnail("/input/photo.jpg", "/output/thumb.jpg");
    expect(mockJpeg).toHaveBeenCalledWith({ quality: 80 });
  });

  it("writes to the output path", async () => {
    await generateThumbnail("/input/photo.jpg", "/output/thumb.jpg");
    expect(mockToFile).toHaveBeenCalledWith("/output/thumb.jpg");
  });

  it("returns the resulting dimensions", async () => {
    mockToFile.mockResolvedValue({ width: 400, height: 267 });
    const result = await generateThumbnail("/input/photo.jpg", "/output/thumb.jpg");
    expect(result).toEqual({ width: 400, height: 267 });
  });
});

// ---------------------------------------------------------------------------
// generateMedium
// ---------------------------------------------------------------------------
describe("generateMedium", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToFile.mockResolvedValue({ width: 1600, height: 1067 });
  });

  it("calls sharp with the input path", async () => {
    await generateMedium("/input/photo.jpg", "/output/medium.jpg");
    expect(sharp).toHaveBeenCalledWith("/input/photo.jpg");
  });

  it("resizes to 1600px width without enlargement", async () => {
    await generateMedium("/input/photo.jpg", "/output/medium.jpg");
    expect(mockResize).toHaveBeenCalledWith({
      width: 1600,
      withoutEnlargement: true,
    });
  });

  it("uses JPEG quality 85", async () => {
    await generateMedium("/input/photo.jpg", "/output/medium.jpg");
    expect(mockJpeg).toHaveBeenCalledWith({ quality: 85 });
  });

  it("writes to the output path", async () => {
    await generateMedium("/input/photo.jpg", "/output/medium.jpg");
    expect(mockToFile).toHaveBeenCalledWith("/output/medium.jpg");
  });

  it("returns the resulting dimensions", async () => {
    const result = await generateMedium("/input/photo.jpg", "/output/medium.jpg");
    expect(result).toEqual({ width: 1600, height: 1067 });
  });
});

// ---------------------------------------------------------------------------
// getImageDimensions
// ---------------------------------------------------------------------------
describe("getImageDimensions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns width and height from metadata", async () => {
    mockMetadata.mockResolvedValue({ width: 4000, height: 2667 });

    const result = await getImageDimensions("/input/photo.jpg");

    expect(sharp).toHaveBeenCalledWith("/input/photo.jpg");
    expect(result).toEqual({ width: 4000, height: 2667 });
  });

  it("throws when width is missing from metadata", async () => {
    mockMetadata.mockResolvedValue({ height: 2667 });

    await expect(getImageDimensions("/input/bad.jpg")).rejects.toThrow(
      /Impossibile leggere le dimensioni/
    );
  });

  it("throws when height is missing from metadata", async () => {
    mockMetadata.mockResolvedValue({ width: 4000 });

    await expect(getImageDimensions("/input/bad.jpg")).rejects.toThrow(
      /Impossibile leggere le dimensioni/
    );
  });

  it("throws when both dimensions are missing", async () => {
    mockMetadata.mockResolvedValue({});

    await expect(getImageDimensions("/input/bad.jpg")).rejects.toThrow(
      /Impossibile leggere le dimensioni/
    );
  });

  it("includes file path in error message", async () => {
    mockMetadata.mockResolvedValue({});

    await expect(getImageDimensions("/some/path/image.jpg")).rejects.toThrow(
      "/some/path/image.jpg"
    );
  });
});
