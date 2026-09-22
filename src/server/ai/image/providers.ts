import { type ImageProvider, type ImageGenInput, type GeneratedImage } from "./types";
import { postWithRetry } from "../fetch-retry";
import { cfRunUrl } from "../providers/cloudflare";
import { env } from "@/lib/env";

function detectImage(bytes: Buffer): { contentType: string; ext: string } {
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return { contentType: "image/png", ext: "png" };
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return { contentType: "image/jpeg", ext: "jpg" };
  if (bytes[0] === 0x52 && bytes[1] === 0x49) return { contentType: "image/webp", ext: "webp" };
  return { contentType: "image/png", ext: "png" };
}

/** OpenAI image provider (gpt-image-1). Real implementation — needs OPENAI_API_KEY. */
export class OpenAIImageProvider implements ImageProvider {
  readonly name = "openai";
  readonly isMock = false;

  async generate(input: ImageGenInput): Promise<GeneratedImage> {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: input.prompt,
        size: "1024x1024",
        n: 1,
      }),
    });
    if (!res.ok) throw new Error(`OpenAI image error ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { data?: { b64_json?: string }[] };
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) throw new Error("OpenAI image returned no data");
    return {
      bytes: Buffer.from(b64, "base64"),
      contentType: "image/png",
      ext: "png",
      model: "gpt-image-1",
    };
  }
}

/** Google Gemini image provider (generateContent). Real — needs GEMINI_API_KEY. */
export class GeminiImageProvider implements ImageProvider {
  readonly name = "gemini";
  readonly isMock = false;

  async generate(input: ImageGenInput): Promise<GeneratedImage> {
    const model = "gemini-3.1-flash-image";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: input.prompt }] }],
        generationConfig: { responseModalities: ["IMAGE"] },
      }),
    });
    if (!res.ok) throw new Error(`Gemini image error ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { inlineData?: { mimeType?: string; data?: string } }[] } }[];
    };
    const part = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
    const b64 = part?.inlineData?.data;
    if (!b64) throw new Error("Gemini image returned no data");
    const mime = part?.inlineData?.mimeType ?? "image/png";
    return {
      bytes: Buffer.from(b64, "base64"),
      contentType: mime,
      ext: mime.includes("jpeg") ? "jpg" : mime.includes("webp") ? "webp" : "png",
      model,
    };
  }
}

/** Cloudflare Workers AI image provider (FLUX schnell). Free-tier friendly. */
export class CloudflareImageProvider implements ImageProvider {
  readonly name = "cloudflare";
  readonly isMock = false;

  async generate(input: ImageGenInput): Promise<GeneratedImage> {
    const model = env.CLOUDFLARE_IMAGE_MODEL;
    const res = await postWithRetry(
      cfRunUrl(model),
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        // FLUX schnell caps at 8 steps and ~2048-char prompts.
        body: JSON.stringify({ prompt: input.prompt.slice(0, 2000), steps: 6 }),
      },
      { label: "Cloudflare image", retries: 3, baseDelayMs: 1500 },
    );

    const ct = res.headers.get("content-type") ?? "";
    let bytes: Buffer;
    if (ct.includes("application/json")) {
      // FLUX schnell returns { result: { image: "<base64>" } }.
      const data = (await res.json()) as {
        result?: { image?: string };
        success?: boolean;
        errors?: { message?: string }[];
      };
      if (!data.result?.image) {
        throw new Error(`Cloudflare image error: ${data.errors?.map((e) => e.message).join("; ") || "no image"}`);
      }
      bytes = Buffer.from(data.result.image, "base64");
    } else {
      // Some image models (e.g. SDXL) return raw binary.
      bytes = Buffer.from(await res.arrayBuffer());
    }
    const { contentType, ext } = detectImage(bytes);
    return { bytes, contentType, ext, model };
  }
}
