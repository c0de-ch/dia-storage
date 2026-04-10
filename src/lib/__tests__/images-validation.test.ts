import {
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  isValidJpeg,
  validateImageFile,
} from "@/lib/images/validation";

// ---------------------------------------------------------------------------
// Helpers — build a minimal File-like object for testing
// ---------------------------------------------------------------------------
function makeFile(
  overrides: {
    name?: string;
    type?: string;
    size?: number;
    headerBytes?: number[];
  } = {}
): File {
  const {
    name = "PICT0001.JPG",
    type = "image/jpeg",
    size,
    headerBytes = [0xff, 0xd8, 0xff, 0xe0],
  } = overrides;

  const bytes = new Uint8Array(headerBytes);
  const blob = new Blob([bytes], { type });

  // If a custom size is requested, override the size property
  const file = new File([blob], name, { type });
  if (size !== undefined) {
    Object.defineProperty(file, "size", { value: size });
  }

  return file;
}

// ---------------------------------------------------------------------------
// Constants sanity checks
// ---------------------------------------------------------------------------
describe("validation constants", () => {
  it("MAX_FILE_SIZE_BYTES is 50 MB", () => {
    expect(MAX_FILE_SIZE_BYTES).toBe(50 * 1024 * 1024);
  });

  it("only allows image/jpeg MIME type", () => {
    expect(ALLOWED_MIME_TYPES).toEqual(["image/jpeg"]);
  });

  it("allows .jpg and .jpeg extensions", () => {
    expect(ALLOWED_EXTENSIONS).toEqual([".jpg", ".jpeg"]);
  });
});

// ---------------------------------------------------------------------------
// isValidJpeg — magic bytes check
// ---------------------------------------------------------------------------
describe("isValidJpeg", () => {
  it("returns true for valid JPEG magic bytes (FF D8 FF)", () => {
    expect(isValidJpeg(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe(true);
  });

  it("returns true for JPEG with different APP marker (FF D8 FF E1)", () => {
    expect(isValidJpeg(Buffer.from([0xff, 0xd8, 0xff, 0xe1]))).toBe(true);
  });

  it("returns false for PNG magic bytes", () => {
    expect(isValidJpeg(Buffer.from([0x89, 0x50, 0x4e, 0x47]))).toBe(false);
  });

  it("returns false for empty buffer", () => {
    expect(isValidJpeg(Buffer.from([]))).toBe(false);
  });

  it("returns false for buffer shorter than 3 bytes", () => {
    expect(isValidJpeg(Buffer.from([0xff, 0xd8]))).toBe(false);
  });

  it("returns false for arbitrary bytes", () => {
    expect(isValidJpeg(Buffer.from([0x00, 0x00, 0x00]))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateImageFile
// ---------------------------------------------------------------------------
describe("validateImageFile", () => {
  describe("valid files", () => {
    it("accepts a valid .JPG file", async () => {
      const result = await validateImageFile(makeFile({ name: "PICT0001.JPG" }));
      expect(result).toEqual({ valid: true });
    });

    it("accepts a valid .jpeg file (lowercase)", async () => {
      const result = await validateImageFile(makeFile({ name: "photo.jpeg" }));
      expect(result).toEqual({ valid: true });
    });

    it("accepts a valid .jpg file (lowercase)", async () => {
      const result = await validateImageFile(makeFile({ name: "photo.jpg" }));
      expect(result).toEqual({ valid: true });
    });
  });

  describe("empty / missing file", () => {
    it("rejects a zero-size file", async () => {
      const file = makeFile({ size: 0 });
      const result = await validateImageFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("vuoto");
    });
  });

  describe("MIME type rejection", () => {
    it("rejects image/png", async () => {
      const file = makeFile({ type: "image/png", name: "photo.jpg" });
      const result = await validateImageFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("non supportato");
    });

    it("rejects application/pdf", async () => {
      const file = makeFile({ type: "application/pdf", name: "doc.jpg" });
      const result = await validateImageFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("non supportato");
    });
  });

  describe("extension rejection", () => {
    it("rejects .png extension", async () => {
      const file = makeFile({ name: "photo.png" });
      const result = await validateImageFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Estensione");
    });

    it("rejects .tiff extension", async () => {
      const file = makeFile({ name: "scan.tiff" });
      const result = await validateImageFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Estensione");
    });

    it("rejects file with no extension", async () => {
      const file = makeFile({ name: "noextension" });
      const result = await validateImageFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Estensione");
    });
  });

  describe("file size rejection", () => {
    it("rejects file exceeding 50 MB", async () => {
      const file = makeFile({ size: MAX_FILE_SIZE_BYTES + 1 });
      const result = await validateImageFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("troppo grande");
    });

    it("accepts file exactly at the 50 MB limit", async () => {
      const file = makeFile({ size: MAX_FILE_SIZE_BYTES });
      const result = await validateImageFile(file);
      expect(result).toEqual({ valid: true });
    });
  });

  describe("magic bytes rejection", () => {
    it("rejects a file with PNG magic bytes but JPEG mime/extension", async () => {
      const file = makeFile({
        headerBytes: [0x89, 0x50, 0x4e, 0x47],
        name: "fake.jpg",
        type: "image/jpeg",
      });
      const result = await validateImageFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("magic bytes");
    });
  });
});
