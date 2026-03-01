#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const BASE_SIZE = 1024;
const TARGET_SIZES = [512, 192, 180];
const SAFE_AREA_RATIO = 0.95;
const ALPHA_TRIM_THRESHOLD = 8;
const EDGE_BG_TOLERANCE = 42;
const EDGE_BG_LUMA_TOLERANCE = 56;
const DEFAULT_INPUT = "./assets/tire.png";
const OUTPUT_DIR = "./public/icons";
const LEGACY_OUTPUT_DIR = "./icons";

function buildBackgroundSvg(size) {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <radialGradient id="bgCore" cx="50%" cy="32%" r="78%">
      <stop offset="0%" stop-color="#b3f1ff"/>
      <stop offset="38%" stop-color="#5fb8ff"/>
      <stop offset="100%" stop-color="#0d61ef"/>
    </radialGradient>
    <linearGradient id="bgVignette" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0f5ce8" stop-opacity="0"/>
      <stop offset="100%" stop-color="#0b3aa8" stop-opacity="0.48"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="#0d61ef"/>
  <rect width="${size}" height="${size}" fill="url(#bgCore)"/>
  <rect width="${size}" height="${size}" fill="url(#bgVignette)"/>
</svg>`.trim();
}

async function removeEdgeBackground(inputPath) {
  const { data, info } = await sharp(inputPath)
    .rotate()
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const width = info.width;
  const height = info.height;
  const channels = info.channels;

  const corners = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1]
  ].map(([x, y]) => {
    const i = (y * width + x) * channels;
    return {
      r: data[i],
      g: data[i + 1],
      b: data[i + 2],
      a: data[i + 3]
    };
  });

  const hasOpaqueCorner = corners.some((c) => c.a > ALPHA_TRIM_THRESHOLD);
  if (!hasOpaqueCorner) {
    return sharp(data, { raw: { width, height, channels } }).png().toBuffer();
  }

  const bg = corners.reduce((acc, c) => ({
    r: acc.r + c.r,
    g: acc.g + c.g,
    b: acc.b + c.b
  }), { r: 0, g: 0, b: 0 });
  bg.r = Math.round(bg.r / corners.length);
  bg.g = Math.round(bg.g / corners.length);
  bg.b = Math.round(bg.b / corners.length);
  const bgLuma = (bg.r + bg.g + bg.b) / 3;
  if (bgLuma < 170) {
    return sharp(data, { raw: { width, height, channels } }).png().toBuffer();
  }

  const sqTolerance = EDGE_BG_TOLERANCE * EDGE_BG_TOLERANCE;
  const isEdgeBackground = (pixelIndex) => {
    const i = pixelIndex * channels;
    const a = data[i + 3];
    if (a <= ALPHA_TRIM_THRESHOLD) return true;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const dr = r - bg.r;
    const dg = g - bg.g;
    const db = b - bg.b;
    const distSq = (dr * dr) + (dg * dg) + (db * db);
    if (distSq > sqTolerance) return false;
    const luma = (r + g + b) / 3;
    return Math.abs(luma - bgLuma) <= EDGE_BG_LUMA_TOLERANCE;
  };

  const total = width * height;
  const visited = new Uint8Array(total);
  const stack = [];
  const pushIfBg = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const pixelIndex = (y * width) + x;
    if (visited[pixelIndex]) return;
    if (!isEdgeBackground(pixelIndex)) return;
    visited[pixelIndex] = 1;
    stack.push(pixelIndex);
  };

  for (let x = 0; x < width; x += 1) {
    pushIfBg(x, 0);
    pushIfBg(x, height - 1);
  }
  for (let y = 1; y < height - 1; y += 1) {
    pushIfBg(0, y);
    pushIfBg(width - 1, y);
  }

  while (stack.length > 0) {
    const pixelIndex = stack.pop();
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    pushIfBg(x - 1, y);
    pushIfBg(x + 1, y);
    pushIfBg(x, y - 1);
    pushIfBg(x, y + 1);
  }

  let removed = 0;
  for (let pixelIndex = 0; pixelIndex < total; pixelIndex += 1) {
    if (!visited[pixelIndex]) continue;
    data[(pixelIndex * channels) + 3] = 0;
    removed += 1;
  }

  if (removed === 0) {
    return sharp(data, { raw: { width, height, channels } }).png().toBuffer();
  }

  return sharp(data, { raw: { width, height, channels } }).png().toBuffer();
}

async function trimByAlpha(inputBuffer) {
  const { data, info } = await sharp(inputBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const width = info.width;
  const height = info.height;
  const channels = info.channels;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * channels + 3];
      if (alpha <= ALPHA_TRIM_THRESHOLD) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < 0 || maxY < 0) {
    return sharp(inputBuffer).png().toBuffer();
  }

  const trimmedWidth = Math.max(1, maxX - minX + 1);
  const trimmedHeight = Math.max(1, maxY - minY + 1);
  return sharp(data, { raw: { width, height, channels } })
    .extract({ left: minX, top: minY, width: trimmedWidth, height: trimmedHeight })
    .png()
    .toBuffer();
}

async function createBaseIcon(inputPath) {
  const fitBox = Math.round(BASE_SIZE * SAFE_AREA_RATIO);
  const bgRemovedBuffer = await removeEdgeBackground(inputPath);
  const trimmedBuffer = await trimByAlpha(bgRemovedBuffer);
  const tireBuffer = await sharp(trimmedBuffer)
    .resize(fitBox, fitBox, {
      fit: "cover",
      position: "centre",
      kernel: sharp.kernel.lanczos3,
      withoutEnlargement: false
    })
    .png()
    .toBuffer();

  const backgroundBuffer = Buffer.from(buildBackgroundSvg(BASE_SIZE));
  return sharp(backgroundBuffer)
    .composite([{ input: tireBuffer, gravity: "center" }])
    .flatten({ background: "#0d61ef" })
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
  const files = ["icon-1024.png", "icon-512.png", "icon-192.png", "icon-180.png"];
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
