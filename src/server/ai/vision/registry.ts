import "server-only";
import { env } from "@/lib/env";
import { type VisionProvider } from "./types";
import { MockVisionProvider } from "./mock";
import { OpenAIVisionProvider, GeminiVisionProvider } from "./providers";

export function getVisionProvider(): VisionProvider {
  const choice = env.AI_VISION_PROVIDER.toLowerCase();
  if (choice === "openai") {
    if (env.OPENAI_API_KEY) return new OpenAIVisionProvider();
    console.warn("AI_VISION_PROVIDER=openai but OPENAI_API_KEY missing — using mock.");
  }
  if (choice === "gemini") {
    if (env.GEMINI_API_KEY) return new GeminiVisionProvider();
    console.warn("AI_VISION_PROVIDER=gemini but GEMINI_API_KEY missing — using mock.");
  }
  return new MockVisionProvider();
}
