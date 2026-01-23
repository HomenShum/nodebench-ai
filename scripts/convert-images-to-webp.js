/**
 * Image Optimization Script
 *
 * Converts PNG and JPG images in public/assets to WebP format for better performance.
 * WebP provides 25-35% better compression than PNG/JPG with equivalent quality.
 */

import sharp from 'sharp';
import { readdir, stat } from 'fs/promises';
import { join, extname, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PUBLIC_ASSETS = join(__dirname, '..', 'public', 'assets');
const QUALITY = 80; // WebP quality (80 = good balance between size and quality)

async function getImageFiles(dir) {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      // Recursively search subdirectories
      const subFiles = await getImageFiles(fullPath);
      files.push(...subFiles);
    } else if (entry.isFile()) {
      const ext = extname(entry.name).toLowerCase();
      if (['.png', '.jpg', '.jpeg'].includes(ext)) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

async function convertToWebP(imagePath) {
  const outputPath = imagePath.replace(/\.(png|jpe?g)$/i, '.webp');
  const fileName = basename(imagePath);

  try {
    const originalStats = await stat(imagePath);
    const originalSize = originalStats.size;

    // Convert to WebP
    await sharp(imagePath)
      .webp({ quality: QUALITY })
      .toFile(outputPath);

    const newStats = await stat(outputPath);
    const newSize = newStats.size;
    const savings = ((originalSize - newSize) / originalSize * 100).toFixed(1);

    console.log(`✓ ${fileName}`);
    console.log(`  Original: ${(originalSize / 1024).toFixed(1)} KB`);
    console.log(`  WebP:     ${(newSize / 1024).toFixed(1)} KB`);
    console.log(`  Savings:  ${savings}%\n`);

    return { originalSize, newSize };
  } catch (error) {
    console.error(`✗ Failed to convert ${fileName}:`, error.message);
    return { originalSize: 0, newSize: 0 };
  }
}

async function main() {
  console.log('🖼️  Image Optimization Script\n');
  console.log(`Scanning ${PUBLIC_ASSETS} for PNG/JPG images...\n`);

  const imageFiles = await getImageFiles(PUBLIC_ASSETS);

  if (imageFiles.length === 0) {
    console.log('No PNG or JPG images found.');
    return;
  }

  console.log(`Found ${imageFiles.length} images to convert.\n`);

  let totalOriginal = 0;
  let totalNew = 0;

  for (const imagePath of imageFiles) {
    const { originalSize, newSize } = await convertToWebP(imagePath);
    totalOriginal += originalSize;
    totalNew += newSize;
  }

  const totalSavings = ((totalOriginal - totalNew) / totalOriginal * 100).toFixed(1);

  console.log('═'.repeat(50));
  console.log('📊 SUMMARY');
  console.log('═'.repeat(50));
  console.log(`Total original size: ${(totalOriginal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Total WebP size:     ${(totalNew / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Total savings:       ${totalSavings}% (${((totalOriginal - totalNew) / 1024 / 1024).toFixed(2)} MB)`);
  console.log('\n✓ Image optimization complete!');
  console.log('\nNext steps:');
  console.log('1. Update image references from .png to .webp in your code');
  console.log('2. Run production build: npm run build');
  console.log('3. Test with Lighthouse: npm run perf:lighthouse');
}

main().catch(console.error);
