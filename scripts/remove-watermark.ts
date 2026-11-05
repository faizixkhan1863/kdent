/* Pass 2: remove AI-added watermark text from bottom-right */
import ZAI from "z-ai-web-dev-sdk";
import { readFileSync, writeFileSync } from "node:fs";

async function main() {
  const src = readFileSync("/tmp/doc-themed.png");
  const dataUrl = `data:image/png;base64,${src.toString("base64")}`;
  const zai = await ZAI.create();
  const res = await zai.images.generations.edit({
    prompt:
      "Remove the small green tooth logo and the garbled text watermark in the bottom right corner of the image. Fill that area naturally by extending the white coat fabric and its folds, and the soft mint green background where applicable. Keep absolutely everything else in the image exactly identical: the man's face, hair, beard, white coat, blue scrubs, mint gradient background. No text, no logos, no watermarks anywhere in the image.",
    images: [{ url: dataUrl }],
    size: "864x1152",
  });
  const b64 = res.data?.[0]?.base64;
  if (!b64) throw new Error("no image returned");
  writeFileSync("/tmp/doc-final.png", Buffer.from(b64, "base64"));
  console.log("saved /tmp/doc-final.png");
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
