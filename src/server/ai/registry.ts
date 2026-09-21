import "server-only";
import { env } from "@/lib/env";
import { type CreativeDirectorProvider } from "./types";
import { MockCreativeDirector } from "./mock";
import { createGeminiDirector } from "./providers/gemini";
import { createOpenAIDirector } from "./providers/openai";

/**
 * Selects the Creative Director provider from AI_TEXT_PROVIDER. Falls back to
 * the mock (with a warning) when a real provider is requested but its key is
 * missing — so development never breaks, and mock output is always labelled.
 */
export function getCreativeDirector(): CreativeDirectorProvider {
  const choice = env.AI_TEXT_PROVIDER.toLowerCase();

  if (choice === "gemini") {
    const p = createGeminiDirector();
    if (p) return p;
    console.warn("AI_TEXT_PROVIDER=gemini but GEMINI_API_KEY missing — using mock.");
  }
  if (choice === "openai") {
    const p = createOpenAIDirector();
    if (p) return p;
    console.warn("AI_TEXT_PROVIDER=openai but OPENAI_API_KEY missing — using mock.");
  }
  return new MockCreativeDirector();
}
