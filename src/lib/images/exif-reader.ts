import exifr from 'exifr';

export interface ExifData {
  /** Date the image was originally taken / scanned */
  scanDate: Date | null;
  /** Image width in pixels */
  width: number | null;
  /** Image height in pixels */
  height: number | null;
  /** Camera / scanner manufacturer */
  make: string | null;
  /** Camera / scanner model */
  model: string | null;
  /** Software used */
  software: string | null;
  /** Image orientation (EXIF tag) */
  orientation: number | null;
  /** X resolution (DPI) */
  xResolution: number | null;
  /** Y resolution (DPI) */
  yResolution: number | null;
  /** Color space */
  colorSpace: string | null;
  /** All raw EXIF data for storage / debugging */
  raw: Record<string, unknown> | null;
}

/**
 * Extract EXIF metadata from a JPEG file.
 *
 * Returns a structured object with the most useful fields for the
 * slide management workflow (scanner info, dates, dimensions).
 * Silently returns null fields when EXIF data is missing or unreadable.
 */
export async function extractExif(filePath: string): Promise<ExifData> {
  try {
    const raw = await exifr.parse(filePath, {
      // Request all standard EXIF blocks
      tiff: true,
      exif: true,
      gps: false,
      ifd1: false,
      interop: false,
      // Return dates as Date objects
      translateValues: true,
      reviveValues: true,
    });

    if (!raw) {
      return emptyExifData();
    }

    return {
      scanDate: parseExifDate(raw.DateTimeOriginal ?? raw.CreateDate ?? raw.ModifyDate),
      width: toNumber(raw.ImageWidth ?? raw.ExifImageWidth),
      height: toNumber(raw.ImageHeight ?? raw.ExifImageHeight),
      make: raw.Make ?? null,
      model: raw.Model ?? null,
      software: raw.Software ?? null,
      orientation: toNumber(raw.Orientation),
      xResolution: toNumber(raw.XResolution),
      yResolution: toNumber(raw.YResolution),
      colorSpace: raw.ColorSpace != null ? String(raw.ColorSpace) : null,
      raw,
    };
  } catch {
    // File may not contain EXIF data at all
    return emptyExifData();
  }
}

function emptyExifData(): ExifData {
  return {
    scanDate: null,
    width: null,
    height: null,
    make: null,
    model: null,
    software: null,
    orientation: null,
    xResolution: null,
    yResolution: null,
    colorSpace: null,
    raw: null,
  };
}

function parseExifDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && !isNaN(value)) return value;
  return null;
}
