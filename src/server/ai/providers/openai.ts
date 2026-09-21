import { LLMCreativeDirector, type ChatJSON } from "../llm";
import { env } from "@/lib/env";

const MODEL = "gpt-4o-mini";

/** OpenAI text provider (Chat Completions, JSON mode). Needs OPENAI_API_KEY. */
const chatJSON: ChatJSON = async (system, user) => {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.8,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("OpenAI returned no content");
  return text;
};

export function createOpenAIDirector() {
  if (!env.OPENAI_API_KEY) return null;
  return new LLMCreativeDirector("openai", chatJSON);
}
