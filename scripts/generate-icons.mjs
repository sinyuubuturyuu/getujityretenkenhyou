#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const BASE_SIZE = 1024;
const TARGET_SIZES = [512, 192];
const SAFE_AREA_RATIO = 0.85;
const DEFAULT_INPUT = "./assets/tire.png";
const OUTPUT_DIR = "./public/icons";
const LEGACY_OUTPUT_DIR = "./icons";

function buildBackgroundSvg(size) {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f2f2f2"/>
      <stop offset="100%" stop-color="#e9e9e9"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#bg)"/>
</svg>`.trim();
}

async function createBaseIcon(inputPath) {
  const fitBox = Math.round(BASE_SIZE * SAFE_AREA_RATIO);
  const tireBuffer = await sharp(inputPath)
    .rotate()
    .trim({ threshold: 16 })
    .resize(fitBox, fitBox, {
      fit: "contain",
      kernel: sharp.kernel.lanczos3,
      withoutEnlargement: false,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toBuffer();

  const backgroundBuffer = Buffer.from(buildBackgroundSvg(BASE_SIZE));
  return sharp(backgroundBuffer)
    .composite([{ input: tireBuffer, gravity: "center" }])
    .flatten({ background: "#eeeeee" })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

async function writeSizes(baseBuffer, outDir) {
  const outputs = [
    { size: BASE_SIZE, filename: "icon-1024.png", fromBase: true },
    ...TARGET_SIZES.map((size) => ({
      size,
      filename: `icon-${size}.png`,
      fromBase: false
    }))
  ];

  for (const output of outputs) {
    const filePath = path.join(outDir, output.filename);
    const pipeline = output.fromBase
      ? sharp(baseBuffer)
      : sharp(baseBuffer)
          .resize(output.size, output.size, { kernel: sharp.kernel.lanczos3 })
          .sharpen();
    await pipeline
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toFile(filePath);
    console.log(`Generated ${path.relative(process.cwd(), filePath)}`);
  }
}

async function syncToLegacyDir(outDir, legacyDir) {
  const files = ["icon-1024.png", "icon-512.png", "icon-192.png"];
  await fs.mkdir(legacyDir, { recursive: true });
  for (const file of files) {
    const src = path.join(outDir, file);
    const dest = path.join(legacyDir, file);
    await fs.copyFile(src, dest);
    console.log(`Synced ${path.relative(process.cwd(), dest)}`);
  }
}

async function main() {
  const argInput = process.argv[2] ?? DEFAULT_INPUT;
  const inputPath = path.resolve(process.cwd(), argInput);
  const outDir = path.resolve(process.cwd(), OUTPUT_DIR);
  const legacyDir = path.resolve(process.cwd(), LEGACY_OUTPUT_DIR);

  try {
    await fs.access(inputPath);
  } catch {
    console.error(`Input image not found: ${argInput}`);
    console.error("Usage: npm run gen:icons -- <input-image-path>");
    process.exit(1);
  }

  await fs.mkdir(outDir, { recursive: true });
  const baseIcon = await createBaseIcon(inputPath);
  await writeSizes(baseIcon, outDir);
  await syncToLegacyDir(outDir, legacyDir);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
