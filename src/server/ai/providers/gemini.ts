import { LLMCreativeDirector, type ChatJSON } from "../llm";
import { postWithRetry } from "../fetch-retry";
import { env } from "@/lib/env";

const MODEL = "gemini-flash-latest";

/** Google Gemini text provider (REST). Real implementation — needs GEMINI_API_KEY. */
const chatJSON: ChatJSON = async (system, user) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;
  const res = await postWithRetry(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.8 },
      }),
    },
    { label: "Gemini", retries: 5, baseDelayMs: 1500 },
  );
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no content");
  return text;
};

export function createGeminiDirector() {
  if (!env.GEMINI_API_KEY) return null;
  return new LLMCreativeDirector("gemini", chatJSON);
}
