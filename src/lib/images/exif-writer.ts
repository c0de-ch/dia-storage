import sharp from 'sharp';
import { rename, copyFile, unlink } from 'node:fs/promises';
import { join, dirname, basename } from 'node:path';

/**
 * Format a date string into EXIF DateTimeOriginal format: "YYYY:MM:DD HH:MM:SS".
 *
 * Accepts ISO 8601 strings, "YYYY-MM-DD", "YYYY-MM-DD HH:mm:ss", etc.
 * Falls back to midnight if no time component is present.
 */
export function formatExifDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    throw new Error(`Data non valida: ${dateStr}`);
  }

  const pad = (n: number) => String(n).padStart(2, '0');

  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());

  return `${year}:${month}:${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Write EXIF DateTimeOriginal (and optionally a title via ImageDescription)
 * into a JPEG file using sharp's `withExifMerge`.
 *
 * To avoid corruption on failure, the write is performed on a temporary file
 * which is then renamed to replace the original atomically.
 */
export async function writeExifDate(
  filePath: string,
  date: string,
  title?: string,
): Promise<void> {
  const dir = dirname(filePath);
  const tmpFile = join(dir, `.tmp_exif_${basename(filePath)}`);

  try {
    // Build the EXIF IFD payload
    // EXIF IFD tags: DateTimeOriginal = 0x9003, UserComment = 0x9286
    // IFD0 tags: ImageDescription = 0x010e, DateTime = 0x0132
    const exifDate = formatExifDate(date);

    // IFD0 (main image) tags as a buffer according to the EXIF spec
    const ifd0: Record<string, string> = {
      DateTime: exifDate,
    };

    if (title) {
      ifd0['ImageDescription'] = title;
    }

    // Build EXIF IFD with DateTimeOriginal
    const exifIfd: Record<string, string> = {
      DateTimeOriginal: exifDate,
      DateTimeDigitized: exifDate,
    };

    // Encode the EXIF data into the format sharp expects.
    // sharp.withExifMerge accepts an object keyed by IFD name.
    const exifData: Record<string, Record<string, string>> = {
      IFD0: ifd0,
      IFD: exifIfd,
    };

    await sharp(filePath)
      .withExifMerge(exifData)
      .toFile(tmpFile);

    // Atomic rename: tmp -> original
    await rename(tmpFile, filePath);
  } catch (err) {
    // Clean up temp file if it exists
    try {
      await unlink(tmpFile);
    } catch {
      // Ignore cleanup errors
    }
    throw err;
  }
}

/**
 * Copy a file and write EXIF data to the copy, leaving the original untouched.
 * Useful when you want to preserve the source file.
 */
export async function writeExifDateToCopy(
  sourcePath: string,
  destPath: string,
  date: string,
  title?: string,
): Promise<void> {
  await copyFile(sourcePath, destPath);
  await writeExifDate(destPath, date, title);
}
