/* Doctor portrait face edit — backend script */
import ZAI from "z-ai-web-dev-sdk";
import { readFileSync, writeFileSync } from "node:fs";

const src = readFileSync("public/kdent/doctor-portrait.jpg");
const dataUrl = `data:image/jpeg;base64,${src.toString("base64")}`;

const prompts: Record<string, string> = {
  v1: "Professional medical headshot of a Pakistani male dentist in his mid 40s with a different face: rounder fuller face shape, shorter neatly trimmed dark beard with slight gray streaks, warm confident subtle smile, brown eyes. Keep identical: white doctor coat over blue surgical scrubs, soft mint green gradient studio background, same centered pose and framing, photorealistic studio lighting",
  v2: "Professional medical headshot of a Pakistani male dentist in his late 30s with a different face: slimmer face with sharper jawline, full dark beard neatly groomed, wearing thin modern rectangular eyeglasses, calm confident expression. Keep identical: white doctor coat over blue surgical scrubs, soft mint green gradient studio background, same centered pose and framing, photorealistic studio lighting",
};

async function main() {
  const which = process.argv[2];
  const out = process.argv[3];
  const zai = await ZAI.create();
  const res = await zai.images.generations.edit({
    prompt: prompts[which],
    images: [{ url: dataUrl }],
    size: "864x1152",
  });
  const b64 = res.data?.[0]?.base64;
  if (!b64) throw new Error("no image returned");
  writeFileSync(out, Buffer.from(b64, "base64"));
  console.log("saved", out);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
