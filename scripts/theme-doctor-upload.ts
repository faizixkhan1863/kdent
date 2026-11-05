/* Re-theme uploaded doctor photo: crop to 3:4 + blue bg -> mint gradient bg */
import ZAI from "z-ai-web-dev-sdk";
import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const SRC = "upload/Gemini_Generated_Image_y90zzdy90zzdy90z.jpeg";

const PROMPT =
  "Replace the flat light blue studio background with a soft vertical gradient background in pale porcelain mint green: very light mint white at the top fading gently into a soft mint green at the bottom, matching a luxury dental clinic brand aesthetic. Keep the man completely unchanged: same face, same hairstyle, same dark beard, same expression, same white doctor coat, same blue scrub shirt, same pose and framing. Photorealistic, studio lighting, seamless background";

async function main() {
  // 1) crop 1536x2752 -> 1536x2048 (3:4), eyes ~30% from top
  const cropped = await sharp(SRC)
    .extract({ left: 0, top: 100, width: 1536, height: 2048 })
    .resize(864, 1152, { kernel: "lanczos3" })
    .jpeg({ quality: 95 })
    .toBuffer();

  writeFileSync("/tmp/doc-cropped.jpg", cropped);
  const dataUrl = `data:image/jpeg;base64,${cropped.toString("base64")}`;

  // 2) AI edit: background re-theme only
  const zai = await ZAI.create();
  const res = await zai.images.generations.edit({
    prompt: PROMPT,
    images: [{ url: dataUrl }],
    size: "864x1152",
  });
  const b64 = res.data?.[0]?.base64;
  if (!b64) throw new Error("no image returned");
  writeFileSync("/tmp/doc-themed.png", Buffer.from(b64, "base64"));
  console.log("themed image saved to /tmp/doc-themed.png");
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
