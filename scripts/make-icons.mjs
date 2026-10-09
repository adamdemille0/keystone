// Draws the app icons (a gold keystone on navy) as PNGs, with no extra dependencies.
// Run with: npm run icons. Output goes to public/icons/. Keep in sync with public/icons/icon.svg.

import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const outDir = fileURLToPath(new URL('../public/icons/', import.meta.url));

const NAVY = [0x1f, 0x2a, 0x44];
const GOLD = [0xc9, 0x97, 0x3b];

// Keystone outline in 0..1 coordinates (wider at the top). Matches icon.svg.
const KEYSTONE = [
  [0.27, 0.27],
  [0.73, 0.27],
  [0.63, 0.73],
  [0.37, 0.73],
];

function inside([x, y], poly) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

function render(size) {
  const SAMPLES = 4; // 4x4 supersampling for smooth edges
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3); // leading 0 = no PNG filter
    for (let x = 0; x < size; x++) {
      let covered = 0;
      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const p = [(x + (sx + 0.5) / SAMPLES) / size, (y + (sy + 0.5) / SAMPLES) / size];
          if (inside(p, KEYSTONE)) covered++;
        }
      }
      const t = covered / (SAMPLES * SAMPLES);
      for (let c = 0; c < 3; c++) row[1 + x * 3 + c] = Math.round(NAVY[c] + (GOLD[c] - NAVY[c]) * t);
    }
    rows.push(row);
  }
  return encodePng(size, Buffer.concat(rows));
}

// ---------- Minimal PNG encoder (8-bit RGB) ----------

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, raw) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(outDir, { recursive: true });
for (const [name, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
]) {
  writeFileSync(outDir + name, render(size));
  console.log(`Wrote public/icons/${name}`);
}
