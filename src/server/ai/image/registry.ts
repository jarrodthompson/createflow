import "server-only";
import { env } from "@/lib/env";
import { type ImageProvider } from "./types";
import { MockImageProvider } from "./mock";
import { OpenAIImageProvider, GeminiImageProvider } from "./providers";

// Indicative per-image cost (USD) by provider — used for cost estimates.
export const IMAGE_COST: Record<string, number> = {
  mock: 0,
  gemini: 0.03,
  openai: 0.04,
};

export function getImageProvider(): ImageProvider {
  const choice = env.AI_IMAGE_PROVIDER.toLowerCase();
  if (choice === "openai") {
    if (env.OPENAI_API_KEY) return new OpenAIImageProvider();
    console.warn("AI_IMAGE_PROVIDER=openai but OPENAI_API_KEY missing — using mock.");
  }
  if (choice === "gemini") {
    if (env.GEMINI_API_KEY) return new GeminiImageProvider();
    console.warn("AI_IMAGE_PROVIDER=gemini but GEMINI_API_KEY missing — using mock.");
  }
  return new MockImageProvider();
}
