import { extractExif } from "@/lib/images/exif-reader";

// Mock exifr
vi.mock("exifr", () => ({
  default: {
    parse: vi.fn(),
  },
}));

import exifr from "exifr";

const mockedParse = vi.mocked(exifr.parse);

// ---------------------------------------------------------------------------
// extractExif
// ---------------------------------------------------------------------------
describe("extractExif", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Full EXIF data
  // -------------------------------------------------------------------------
  describe("with complete EXIF data", () => {
    const fullExif = {
      DateTimeOriginal: new Date("2024-03-15T14:30:00Z"),
      ImageWidth: 4608,
      ImageHeight: 3456,
      Make: "Reflecta",
      Model: "DigitDia Evolution",
      Software: "CyberView X 5.0",
      Orientation: 1,
      XResolution: 3600,
      YResolution: 3600,
      ColorSpace: "sRGB",
    };

    beforeEach(() => {
      mockedParse.mockResolvedValue(fullExif);
    });

    it("extracts scanDate from DateTimeOriginal", async () => {
      const result = await extractExif("/path/to/PICT0001.JPG");
      expect(result.scanDate).toEqual(new Date("2024-03-15T14:30:00Z"));
    });

    it("extracts width and height", async () => {
      const result = await extractExif("/path/to/PICT0001.JPG");
      expect(result.width).toBe(4608);
      expect(result.height).toBe(3456);
    });

    it("extracts make and model", async () => {
      const result = await extractExif("/path/to/PICT0001.JPG");
      expect(result.make).toBe("Reflecta");
      expect(result.model).toBe("DigitDia Evolution");
    });

    it("extracts software", async () => {
      const result = await extractExif("/path/to/PICT0001.JPG");
      expect(result.software).toBe("CyberView X 5.0");
    });

    it("extracts orientation", async () => {
      const result = await extractExif("/path/to/PICT0001.JPG");
      expect(result.orientation).toBe(1);
    });

    it("extracts resolution", async () => {
      const result = await extractExif("/path/to/PICT0001.JPG");
      expect(result.xResolution).toBe(3600);
      expect(result.yResolution).toBe(3600);
    });

    it("extracts colorSpace as string", async () => {
      const result = await extractExif("/path/to/PICT0001.JPG");
      expect(result.colorSpace).toBe("sRGB");
    });

    it("stores the raw EXIF object", async () => {
      const result = await extractExif("/path/to/PICT0001.JPG");
      expect(result.raw).toBe(fullExif);
    });
  });

  // -------------------------------------------------------------------------
  // Date fallback chain
  // -------------------------------------------------------------------------
  describe("date field fallback", () => {
    it("falls back to CreateDate when DateTimeOriginal is missing", async () => {
      const createDate = new Date("2024-06-01T10:00:00Z");
      mockedParse.mockResolvedValue({
        CreateDate: createDate,
        ModifyDate: new Date("2024-06-02T10:00:00Z"),
      });

      const result = await extractExif("/path/to/img.jpg");
      expect(result.scanDate).toEqual(createDate);
    });

    it("falls back to ModifyDate when both DateTimeOriginal and CreateDate are missing", async () => {
      const modifyDate = new Date("2024-07-01T12:00:00Z");
      mockedParse.mockResolvedValue({
        ModifyDate: modifyDate,
      });

      const result = await extractExif("/path/to/img.jpg");
      expect(result.scanDate).toEqual(modifyDate);
    });

    it("returns null scanDate when no date fields are present", async () => {
      mockedParse.mockResolvedValue({
        Make: "Test",
      });

      const result = await extractExif("/path/to/img.jpg");
      expect(result.scanDate).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Date parsing from string
  // -------------------------------------------------------------------------
  describe("date parsing", () => {
    it("parses a valid date string", async () => {
      mockedParse.mockResolvedValue({
        DateTimeOriginal: "2023-12-25T00:00:00Z",
      });

      const result = await extractExif("/path/to/img.jpg");
      expect(result.scanDate).toBeInstanceOf(Date);
      expect(result.scanDate!.getFullYear()).toBe(2023);
    });

    it("returns null for an invalid date string", async () => {
      mockedParse.mockResolvedValue({
        DateTimeOriginal: "not-a-date",
      });

      const result = await extractExif("/path/to/img.jpg");
      expect(result.scanDate).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Width/height fallback to ExifImage fields
  // -------------------------------------------------------------------------
  describe("dimension fallbacks", () => {
    it("uses ExifImageWidth when ImageWidth is missing", async () => {
      mockedParse.mockResolvedValue({
        ExifImageWidth: 3000,
        ExifImageHeight: 2000,
      });

      const result = await extractExif("/path/to/img.jpg");
      expect(result.width).toBe(3000);
      expect(result.height).toBe(2000);
    });

    it("prefers ImageWidth over ExifImageWidth", async () => {
      mockedParse.mockResolvedValue({
        ImageWidth: 4608,
        ExifImageWidth: 3000,
        ImageHeight: 3456,
        ExifImageHeight: 2000,
      });

      const result = await extractExif("/path/to/img.jpg");
      expect(result.width).toBe(4608);
      expect(result.height).toBe(3456);
    });
  });

  // -------------------------------------------------------------------------
  // Null / empty EXIF
  // -------------------------------------------------------------------------
  describe("missing or null EXIF data", () => {
    it("returns all nulls when exifr.parse returns null", async () => {
      mockedParse.mockResolvedValue(null);

      const result = await extractExif("/path/to/img.jpg");
      expect(result.scanDate).toBeNull();
      expect(result.width).toBeNull();
      expect(result.height).toBeNull();
      expect(result.make).toBeNull();
      expect(result.model).toBeNull();
      expect(result.software).toBeNull();
      expect(result.orientation).toBeNull();
      expect(result.xResolution).toBeNull();
      expect(result.yResolution).toBeNull();
      expect(result.colorSpace).toBeNull();
      expect(result.raw).toBeNull();
    });

    it("returns all nulls when exifr.parse returns undefined", async () => {
      mockedParse.mockResolvedValue(undefined);

      const result = await extractExif("/path/to/img.jpg");
      expect(result.raw).toBeNull();
      expect(result.scanDate).toBeNull();
    });

    it("returns null for missing optional fields", async () => {
      mockedParse.mockResolvedValue({});

      const result = await extractExif("/path/to/img.jpg");
      expect(result.make).toBeNull();
      expect(result.model).toBeNull();
      expect(result.software).toBeNull();
      expect(result.orientation).toBeNull();
      expect(result.colorSpace).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Error handling
  // -------------------------------------------------------------------------
  describe("error handling", () => {
    it("returns empty ExifData when exifr throws", async () => {
      mockedParse.mockRejectedValue(new Error("Cannot read file"));

      const result = await extractExif("/nonexistent/file.jpg");
      expect(result.scanDate).toBeNull();
      expect(result.width).toBeNull();
      expect(result.height).toBeNull();
      expect(result.make).toBeNull();
      expect(result.model).toBeNull();
      expect(result.software).toBeNull();
      expect(result.orientation).toBeNull();
      expect(result.raw).toBeNull();
    });

    it("does not throw when exifr throws", async () => {
      mockedParse.mockRejectedValue(new Error("Corrupt JPEG"));

      await expect(
        extractExif("/path/to/corrupt.jpg")
      ).resolves.not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // exifr.parse call args
  // -------------------------------------------------------------------------
  describe("exifr.parse options", () => {
    it("passes the file path to exifr.parse", async () => {
      mockedParse.mockResolvedValue(null);

      await extractExif("/data/incoming/PICT0042.JPG");
      expect(mockedParse).toHaveBeenCalledWith(
        "/data/incoming/PICT0042.JPG",
        expect.objectContaining({
          tiff: true,
          exif: true,
          gps: false,
        })
      );
    });

    it("disables GPS and interop parsing", async () => {
      mockedParse.mockResolvedValue(null);

      await extractExif("/path/to/img.jpg");
      expect(mockedParse).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          gps: false,
          ifd1: false,
          interop: false,
        })
      );
    });
  });

  // -------------------------------------------------------------------------
  // toNumber edge cases
  // -------------------------------------------------------------------------
  describe("numeric field coercion", () => {
    it("returns null for NaN values", async () => {
      mockedParse.mockResolvedValue({
        ImageWidth: NaN,
        Orientation: NaN,
      });

      const result = await extractExif("/path/to/img.jpg");
      expect(result.width).toBeNull();
      expect(result.orientation).toBeNull();
    });

    it("returns null for string values in numeric fields", async () => {
      mockedParse.mockResolvedValue({
        ImageWidth: "not-a-number",
        XResolution: "high",
      });

      const result = await extractExif("/path/to/img.jpg");
      expect(result.width).toBeNull();
      expect(result.xResolution).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // ColorSpace coercion
  // -------------------------------------------------------------------------
  describe("colorSpace coercion", () => {
    it("converts numeric ColorSpace to string", async () => {
      mockedParse.mockResolvedValue({
        ColorSpace: 1,
      });

      const result = await extractExif("/path/to/img.jpg");
      expect(result.colorSpace).toBe("1");
    });

    it("returns null for undefined ColorSpace", async () => {
      mockedParse.mockResolvedValue({});

      const result = await extractExif("/path/to/img.jpg");
      expect(result.colorSpace).toBeNull();
    });

    it("returns null for null ColorSpace", async () => {
      mockedParse.mockResolvedValue({ ColorSpace: null });

      const result = await extractExif("/path/to/img.jpg");
      expect(result.colorSpace).toBeNull();
    });
  });
});
