import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pixelmatch = require('pixelmatch') as (
  img1: Buffer | Uint8Array,
  img2: Buffer | Uint8Array,
  output: Buffer | Uint8Array | null,
  width: number,
  height: number,
  options?: { threshold?: number; includeAA?: boolean },
) => number;

export interface DiffResult {
  totalPixels: number;
  diffPixels: number;
  diffPercentage: number;
  diffImagePath: string;
}

/**
 * Compare two PNG screenshots and save a diff image.
 * Returns metrics about the visual difference.
 */
export function compareScreenshots(
  sourceImagePath: string,
  targetImagePath: string,
  diffOutputPath: string,
  threshold = 0.1,
): DiffResult {
  const sourceImg = PNG.sync.read(fs.readFileSync(sourceImagePath));
  const targetImg = PNG.sync.read(fs.readFileSync(targetImagePath));

  // Use the larger dimensions so images of different sizes can still be diffed
  const width = Math.max(sourceImg.width, targetImg.width);
  const height = Math.max(sourceImg.height, targetImg.height);

  const sourcePadded = padImage(sourceImg, width, height);
  const targetPadded = padImage(targetImg, width, height);

  const diff = new PNG({ width, height });

  const diffPixels = pixelmatch(
    sourcePadded.data,
    targetPadded.data,
    diff.data,
    width,
    height,
    { threshold, includeAA: false },
  );

  fs.mkdirSync(path.dirname(diffOutputPath), { recursive: true });
  fs.writeFileSync(diffOutputPath, PNG.sync.write(diff));

  const totalPixels = width * height;
  return {
    totalPixels,
    diffPixels,
    diffPercentage: (diffPixels / totalPixels) * 100,
    diffImagePath: diffOutputPath,
  };
}

/**
 * Pad a PNG image with transparent pixels to the target dimensions.
 */
function padImage(img: PNG, targetWidth: number, targetHeight: number): PNG {
  if (img.width === targetWidth && img.height === targetHeight) {
    return img;
  }
  const padded = new PNG({ width: targetWidth, height: targetHeight });
  // Fill with white background
  padded.data.fill(255);
  PNG.bitblt(img, padded, 0, 0, img.width, img.height, 0, 0);
  return padded;
}
