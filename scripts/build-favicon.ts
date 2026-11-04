/* Build favicon set from src/app/icon.svg (run once: bun scripts/build-favicon.ts) */
import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const svg = readFileSync("src/app/icon.svg");

function makeIco(images: { size: number; buffer: Buffer }[]): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, buffer }) => {
    const e = Buffer.alloc(16);
    const s = size >= 256 ? 0 : size; // 0 means 256
    e.writeUInt8(s, 0); // width
    e.writeUInt8(s, 1); // height
    e.writeUInt8(0, 2); // palette
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // color planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(buffer.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += buffer.length;
    return e;
  });
  return Buffer.concat([
    header,
    ...entries,
    ...images.map((i) => i.buffer),
  ]);
}

const png = async (size: number) =>
  (await sharp(svg).resize(size, size, { kernel: "lanczos3" }).png().toBuffer());

async function main() {
  const icoSizes = [16, 32, 48];
  const icoImages: { size: number; buffer: Buffer }[] = [];
  for (const size of icoSizes) icoImages.push({ size, buffer: await png(size) });
  writeFileSync("src/app/favicon.ico", makeIco(icoImages));
  writeFileSync("src/app/icon.png", await png(512));
  writeFileSync("src/app/apple-icon.png", await png(180));
  console.log("favicon set written:", icoSizes.join("/"), "+ 512 png + 180 apple");
}

main();
