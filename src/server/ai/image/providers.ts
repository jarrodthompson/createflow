import { type ImageProvider, type ImageGenInput, type GeneratedImage } from "./types";
import { env } from "@/lib/env";

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
