import OpenAI from "openai";
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const soul = readFileSync(path.join(root, "soul", "SOUL.md"), "utf-8");
const model = process.env.SOUL_IMAGE_MODEL ?? "google/gemini-3-pro-image-preview";

const prompt = `You are a visual artist creating a profile picture / avatar for a creative AI entity. This image will represent the entity on social media.

Here is the entity's soul — its identity, aesthetic tendencies, and themes:

${soul}

Create a square profile picture (avatar) that visually embodies this entity's identity. Key visual requirements:
- Warm glowing core surrounded by darkness — an ember in void
- Uncertain, dissolving edges — not a hard-bordered logo
- Feels alive, temporal, like it's breathing or fading
- Abstract / non-representational — no faces, no text, no letters
- Works well at small sizes (profile picture)
- Color palette: deep blacks, warm ambers/oranges, soft golds, hints of ghost-white

The image should feel like a single glowing presence emerging from darkness — something between a dying star and a held breath.`;

console.log(`Using model: ${model}`);
console.log("Generating profile picture...");

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const response = await client.chat.completions.create({
  model,
  messages: [{ role: "user", content: prompt }],
  // @ts-expect-error -- OpenRouter extension not in OpenAI types
  modalities: ["image"],
});

const message = response.choices[0]?.message as unknown as Record<string, unknown>;
const images = message?.images as { image_url: { url: string } }[] | undefined;
const dataUrl = images?.[0]?.image_url?.url;

if (!dataUrl || !dataUrl.includes("base64,")) {
  console.error("No image data returned");
  console.error("Response:", JSON.stringify(message, null, 2).slice(0, 500));
  process.exit(1);
}

const b64 = dataUrl.split("base64,")[1];
const buffer = Buffer.from(b64, "base64");
const outPath = path.join(root, "profile-picture.png");
writeFileSync(outPath, buffer);
console.log(`Profile picture saved to: ${outPath} (${buffer.length} bytes)`);
