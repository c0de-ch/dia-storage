/** Maximum file size: 50 MB */
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

/** Allowed MIME types for upload */
export const ALLOWED_MIME_TYPES = ['image/jpeg'] as const;

/** Allowed file extensions */
export const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg'] as const;

/**
 * Check whether a buffer starts with the JPEG magic bytes (FF D8 FF).
 */
export function isValidJpeg(buffer: Buffer): boolean {
  if (buffer.length < 3) return false;
  return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate an uploaded image file for type and size constraints.
 *
 * Checks:
 * - File must be present and non-empty
 * - MIME type must be image/jpeg
 * - File extension must be .jpg or .jpeg
 * - Size must not exceed MAX_FILE_SIZE_BYTES
 */
export async function validateImageFile(file: File): Promise<ValidationResult> {
  if (!file || file.size === 0) {
    return { valid: false, error: 'Nessun file fornito o file vuoto' };
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    return {
      valid: false,
      error: `Tipo file non supportato: ${file.type}. Sono accettati solo file JPEG.`,
    };
  }

  // Check extension
  const name = file.name.toLowerCase();
  const hasValidExtension = ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
  if (!hasValidExtension) {
    return {
      valid: false,
      error: `Estensione file non valida. Sono accettate solo: ${ALLOWED_EXTENSIONS.join(', ')}`,
    };
  }

  // Check size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const maxMB = MAX_FILE_SIZE_BYTES / (1024 * 1024);
    const fileMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File troppo grande (${fileMB} MB). Dimensione massima: ${maxMB} MB.`,
    };
  }

  // Validate magic bytes from the first few bytes of the file
  const headerSlice = file.slice(0, 3);
  const headerBuffer = Buffer.from(await headerSlice.arrayBuffer());
  if (!isValidJpeg(headerBuffer)) {
    return {
      valid: false,
      error: 'Il file non sembra essere un JPEG valido (magic bytes non corretti).',
    };
  }

  return { valid: true };
}
