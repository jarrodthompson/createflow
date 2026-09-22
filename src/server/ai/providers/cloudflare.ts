import { LLMCreativeDirector, type ChatJSON } from "../llm";
import { postWithRetry } from "../fetch-retry";
import { env } from "@/lib/env";

/** Base URL for a Workers AI model run. */
export function cfRunUrl(model: string): string {
  return `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${model}`;
}

export function cloudflareConfigured(): boolean {
  return !!(env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_API_TOKEN);
}

/** Cloudflare Workers AI text provider (free-tier friendly). Returns JSON via prompt. */
const chatJSON: ChatJSON = async (system, user) => {
  const res = await postWithRetry(
    cfRunUrl(env.CLOUDFLARE_TEXT_MODEL),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        // Ask Workers AI for JSON where the model supports it; the caller also
        // tolerates prose/fences, so this is a best-effort hint.
        response_format: { type: "json_object" },
        max_tokens: 4096,
      }),
    },
    { label: "Cloudflare", retries: 4, baseDelayMs: 1200 },
  );
  const data = (await res.json()) as {
    result?: { response?: string | object };
    success?: boolean;
    errors?: { message?: string }[];
  };
  if (data.success === false) {
    throw new Error(`Cloudflare AI error: ${data.errors?.map((e) => e.message).join("; ")}`);
  }
  const out = data.result?.response;
  if (out == null) throw new Error("Cloudflare AI returned no content");
  // Some models return an already-parsed object when json mode is honoured.
  return typeof out === "string" ? out : JSON.stringify(out);
};

export function createCloudflareDirector() {
  if (!cloudflareConfigured()) return null;
  return new LLMCreativeDirector("cloudflare", chatJSON);
}
