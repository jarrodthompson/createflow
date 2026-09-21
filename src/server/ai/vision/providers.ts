import { type VisionProvider, type VisionInput, type AnalysisResult, analysisSchema } from "./types";
import { env } from "@/lib/env";

const SYSTEM =
  "You are a strict quality-control reviewer for Etsy digital products. Analyse the image and " +
  "respond with JSON only.";

function userText(input: VisionInput): string {
  return [
    `Evaluate this design for an Etsy "${input.theme}" collection.`,
    input.style ? `Intended style: ${input.style}.` : "",
    input.palette.length ? `Intended palette: ${input.palette.join(", ")}.` : "",
    `Prompt used: ${input.prompt}`,
    "Score each 0-10 and detect defects. Return JSON only with exactly:",
    `{"themeMatch":n,"styleConsistency":n,"colorConsistency":n,"composition":n,"visualQuality":n,"hasArtifacts":bool,"hasText":bool,"hasWatermark":bool,"hasLogo":bool,"notes":string}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function parse(raw: string): AnalysisResult {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : raw;
  const from = body.indexOf("{");
  return analysisSchema.parse(JSON.parse(from >= 0 ? body.slice(from) : body));
}

export class OpenAIVisionProvider implements VisionProvider {
  readonly name = "openai";
  readonly isMock = false;

  async analyze(input: VisionInput): Promise<AnalysisResult> {
    const dataUrl = `data:${input.contentType};base64,${input.imageBytes.toString("base64")}`;
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: [
              { type: "text", text: userText(input) },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI vision error ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return parse(data.choices?.[0]?.message?.content ?? "");
  }
}

export class GeminiVisionProvider implements VisionProvider {
  readonly name = "gemini";
  readonly isMock = false;

  async analyze(input: VisionInput): Promise<AnalysisResult> {
    const model = "gemini-1.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [
          {
            role: "user",
            parts: [
              { text: userText(input) },
              { inlineData: { mimeType: input.contentType, data: input.imageBytes.toString("base64") } },
            ],
          },
        ],
        generationConfig: { responseMimeType: "application/json" },
      }),
    });
    if (!res.ok) throw new Error(`Gemini vision error ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    return parse(data.candidates?.[0]?.content?.parts?.[0]?.text ?? "");
  }
}
