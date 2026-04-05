import sharp from 'sharp';

export interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * Generate a thumbnail image: 400px wide, JPEG quality 80.
 * Height is calculated automatically to preserve the aspect ratio.
 */
export async function generateThumbnail(
  inputPath: string,
  outputPath: string,
): Promise<ImageDimensions> {
  const info = await sharp(inputPath)
    .resize({ width: 400, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toFile(outputPath);

  return { width: info.width, height: info.height };
}

/**
 * Generate a medium-resolution image: 1600px wide, JPEG quality 85.
 * Height is calculated automatically to preserve the aspect ratio.
 */
export async function generateMedium(
  inputPath: string,
  outputPath: string,
): Promise<ImageDimensions> {
  const info = await sharp(inputPath)
    .resize({ width: 1600, withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toFile(outputPath);

  return { width: info.width, height: info.height };
}

/**
 * Read the dimensions of an image file without decoding the full pixel data.
 */
export async function getImageDimensions(
  filePath: string,
): Promise<ImageDimensions> {
  const metadata = await sharp(filePath).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error(`Impossibile leggere le dimensioni dell'immagine: ${filePath}`);
  }

  return { width: metadata.width, height: metadata.height };
}
