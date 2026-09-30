// scripts/compress-images.mjs
// Batch compress studio photos to WebP (max 1920px wide, quality 82)
// Run: node scripts/compress-images.mjs

import sharp from 'sharp';
import { readdir, stat, rename, unlink } from 'fs/promises';
import { join, extname, basename } from 'path';
import { existsSync } from 'fs';

const STUDIO_DIR = './public/studio-photos';
const MAX_WIDTH = 1920;
const WEBP_QUALITY = 82;    // 0-100, 82 is visually lossless for web
const JPEG_QUALITY = 82;

async function formatBytes(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

async function compressImage(filePath) {
  const ext = extname(filePath).toLowerCase();
  const isJpeg = ext === '.jpg' || ext === '.jpeg';
  const isPng = ext === '.png';
  if (!isJpeg && !isPng) return null;

  const before = (await stat(filePath)).size;
  const dir = filePath.substring(0, filePath.lastIndexOf('/'));
  const nameWithoutExt = basename(filePath).replace(/\.[^.]+$/, '').replace(/\.[^.]+$/, ''); // handles .JPG.jpeg double ext

  // Output as WebP in same directory
  const outPath = join(dir, `${nameWithoutExt}.webp`);

  await sharp(filePath)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY, effort: 4 })
    .toFile(outPath);

  const after = (await stat(outPath)).size;
  const saved = ((1 - after / before) * 100).toFixed(1);

  return { filePath, outPath, before, after, saved };
}

async function main() {
  console.log(`\n🗜️  Shree Beauty Studio — Image Compressor`);
  console.log(`   Output: WebP @ ${WEBP_QUALITY}% quality, max ${MAX_WIDTH}px wide\n`);

  const files = await readdir(STUDIO_DIR);
  const images = files
    .filter(f => /\.(jpe?g|png)$/i.test(f))
    .map(f => join(STUDIO_DIR, f).replace(/\\/g, '/'));

  let totalBefore = 0, totalAfter = 0;

  for (const imgPath of images) {
    const result = await compressImage(imgPath);
    if (!result) continue;

    totalBefore += result.before;
    totalAfter += result.after;

    const beforeFmt = await formatBytes(result.before);
    const afterFmt = await formatBytes(result.after);
    console.log(`  ✅ ${basename(result.filePath)}`);
    console.log(`     ${beforeFmt} → ${afterFmt} (saved ${result.saved}%)\n`);

    // Remove original after successful conversion
    await unlink(result.filePath);
    console.log(`     🗑️  Deleted original`);
  }

  console.log(`\n────────────────────────────────────────`);
  console.log(`📦 Total before : ${await formatBytes(totalBefore)}`);
  console.log(`📦 Total after  : ${await formatBytes(totalAfter)}`);
  console.log(`💾 Total saved  : ${await formatBytes(totalBefore - totalAfter)} (${((1 - totalAfter / totalBefore) * 100).toFixed(1)}%)`);
  console.log(`────────────────────────────────────────\n`);
}

main().catch(console.error);
