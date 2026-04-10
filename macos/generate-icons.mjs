import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = join(__dirname, 'DiaUploader/icon-source.svg');
const outDir = join(__dirname, 'DiaUploader/Assets.xcassets/AppIcon.appiconset');

const svg = readFileSync(svgPath);

// macOS icon sizes: size@scale -> actual pixels
const sizes = [
  { size: 16, scale: 1, pixels: 16 },
  { size: 16, scale: 2, pixels: 32 },
  { size: 32, scale: 1, pixels: 32 },
  { size: 32, scale: 2, pixels: 64 },
  { size: 128, scale: 1, pixels: 128 },
  { size: 128, scale: 2, pixels: 256 },
  { size: 256, scale: 1, pixels: 256 },
  { size: 256, scale: 2, pixels: 512 },
  { size: 512, scale: 1, pixels: 512 },
  { size: 512, scale: 2, pixels: 1024 },
];

const images = [];

for (const { size, scale, pixels } of sizes) {
  const filename = scale === 1
    ? `icon_${size}x${size}.png`
    : `icon_${size}x${size}@2x.png`;

  await sharp(svg, { density: Math.round(72 * (pixels / 1024) * (1024 / 100)) })
    .resize(pixels, pixels, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(join(outDir, filename));

  images.push({
    filename,
    idiom: 'mac',
    scale: `${scale}x`,
    size: `${size}x${size}`,
  });

  console.log(`Generated ${filename} (${pixels}x${pixels}px)`);
}

// Update Contents.json
const contents = {
  images: images.map(({ filename, idiom, scale, size }) => ({
    filename,
    idiom,
    scale,
    size,
  })),
  info: {
    author: 'xcode',
    version: 1,
  },
};

writeFileSync(join(outDir, 'Contents.json'), JSON.stringify(contents, null, 2) + '\n');
console.log('Updated Contents.json');
