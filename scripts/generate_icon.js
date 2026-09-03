import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function generatePng(size) {
  const width = size;
  const height = size;
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  const center = size / 2;
  const radius = size * 0.44;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Circle badge with smooth anti-aliased edge
      if (dist <= radius + 1) {
        // Anti-aliasing factor
        let edgeAlpha = 1.0;
        if (dist > radius - 1) {
          edgeAlpha = Math.max(0, Math.min(1, (radius + 1 - dist) / 2));
        }

        // Emerald background (#10b981)
        let r = 16;
        let g = 185;
        let b = 129;
        let a = Math.round(255 * edgeAlpha);

        // Subtle gradient from top to bottom
        const grad = (y / height) * 30;
        r = Math.max(0, r - grad * 0.3);
        g = Math.max(0, g - grad);
        b = Math.max(0, b - grad * 0.5);

        // Normalized coords [-1, 1] relative to center
        const nx = dx / radius;
        const ny = dy / radius;

        // Draw lightning bolt polygon:
        // Top point (0.05, -0.65) -> middle right (0.35, -0.05) -> middle center (0.05, -0.05)
        // -> bottom point (-0.05, 0.65) -> middle left (-0.35, 0.05) -> middle center (-0.05, 0.05) -> loop
        const inBolt = pointInLightning(nx, ny);

        if (inBolt) {
          r = 255;
          g = 255;
          b = 255;
        }

        rawData[pxOffset] = Math.round(r);
        rawData[pxOffset + 1] = Math.round(g);
        rawData[pxOffset + 2] = Math.round(b);
        rawData[pxOffset + 3] = a;
      } else {
        // Transparent
        rawData[pxOffset] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const ihdr = makeChunk('IHDR', ihdrData);
  const idat = makeChunk('IDAT', compressed);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

// 2D Point-in-polygon check for lightning symbol
function pointInLightning(x, y) {
  // Lightning bolt vertices
  const polygon = [
    [0.1, -0.62],
    [-0.32, 0.02],
    [-0.02, 0.02],
    [-0.15, 0.62],
    [0.32, -0.02],
    [0.02, -0.02],
  ];

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];

    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(8 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4);
  data.copy(chunk, 8);

  const crc = crc32(Buffer.concat([Buffer.from(type), data]));
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeIco(pngBuffers) {
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  const dirEntries = [];
  let currentOffset = 6 + count * 16;

  for (const { size, buffer } of pngBuffers) {
    const dir = Buffer.alloc(16);
    dir.writeUInt8(size >= 256 ? 0 : size, 0); // width: 0 for 256
    dir.writeUInt8(size >= 256 ? 0 : size, 1); // height: 0 for 256
    dir.writeUInt8(0, 2); // color count
    dir.writeUInt8(0, 3); // reserved
    dir.writeUInt16LE(1, 4); // planes
    dir.writeUInt16LE(32, 6); // bpp
    dir.writeUInt32LE(buffer.length, 8); // size
    dir.writeUInt32LE(currentOffset, 12); // offset

    dirEntries.push(dir);
    currentOffset += buffer.length;
  }

  return Buffer.concat([
    header,
    ...dirEntries,
    ...pngBuffers.map(p => p.buffer),
  ]);
}

// Generate assets
const assetsDir = path.resolve(__dirname, '../assets');
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

const png256 = generatePng(256);
const png64 = generatePng(64);
const png32 = generatePng(32);
const png16 = generatePng(16);

fs.writeFileSync(path.join(assetsDir, 'icon.png'), png256);
fs.writeFileSync(path.join(assetsDir, 'tray.png'), png32);

const icoBuffer = makeIco([
  { size: 256, buffer: png256 },
  { size: 64, buffer: png64 },
  { size: 32, buffer: png32 },
  { size: 16, buffer: png16 },
]);
fs.writeFileSync(path.join(assetsDir, 'icon.ico'), icoBuffer);

console.log('Successfully generated icon.png (256x256), tray.png (32x32), and multi-res icon.ico!');
