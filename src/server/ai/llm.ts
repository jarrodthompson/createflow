import {
  type CreativeDirectorProvider,
  type PlanInput,
  type CollectionPlan,
  type PromptSpec,
  type RegenInput,
  type ListingInput,
  type ListingResult,
  type ListingField,
  type MarketingResult,
  collectionPlanSchema,
  promptSpecSchema,
  listingResultSchema,
  marketingResultSchema,
  normalizeCounts,
} from "./types";
import { z } from "zod";

/** A minimal JSON-returning chat function each real provider supplies. */
export type ChatJSON = (system: string, user: string) => Promise<string>;

function safeJson(raw: string): unknown {
  // Tolerate models that wrap JSON in prose or ```json fences.
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : raw;
  const start = body.indexOf("{");
  const startArr = body.indexOf("[");
  const from =
    start === -1 ? startArr : startArr === -1 ? start : Math.min(start, startArr);
  const slice = from >= 0 ? body.slice(from) : body;
  return JSON.parse(slice);
}

const DIRECTOR_SYSTEM =
  "You are a senior digital-product Creative Director for an Etsy seller. You design cohesive, " +
  "commercially appealing collections of digital designs. You always respond with strict JSON only — " +
  "no prose, no markdown fences.";

function planUserPrompt(input: PlanInput): string {
  return [
    `Design a cohesive "${input.theme}" ${input.productType} collection of ${input.designCount} designs.`,
    input.style ? `Style: ${input.style}.` : "",
    input.colors.length ? `Colour palette: ${input.colors.join(", ")}.` : "",
    input.styleDna
      ? `Style DNA "${input.styleDna.name}": ${input.styleDna.descriptors.join(", ")}; avoid ${input.styleDna.avoid.join(", ")}.`
      : "",
    "Dynamically choose appropriate categories (typically 6-10) and how many designs each should contain.",
    "Return JSON with this exact shape:",
    `{"concept": string, "visualDirection": string, "colorDirection": string, "styleRules": string[], "compositionRules": string[], "categories": [{"name": string, "description": string, "designCount": number}]}`,
    `The category designCount values must sum to exactly ${input.designCount}.`,
  ]
    .filter(Boolean)
    .join("\n");
}

function promptsUserPrompt(input: PlanInput, plan: CollectionPlan): string {
  return [
    `Using this approved plan, write one image-generation prompt per design for all ${input.designCount} designs.`,
    `Theme: ${input.theme}. Style: ${input.style ?? "cohesive"}. Colours: ${input.colors.join(", ") || "harmonious"}.`,
    `Categories and counts: ${plan.categories.map((c) => `${c.name} x${c.designCount}`).join(", ")}.`,
    "Each prompt must keep the collection cohesive, describe a distinct subject, and end with 'no text, no watermark'.",
    "Return JSON only:",
    `{"prompts": [{"index": number, "concept": string, "category": string, "text": string}]}`,
    `Provide exactly ${input.designCount} prompts, index 1..${input.designCount}.`,
  ].join("\n");
}

const promptsWrapperSchema = z.object({ prompts: z.array(promptSpecSchema) });

/**
 * Real LLM-backed Creative Director. Domain prompting + strict Zod validation
 * live here so any provider that can return JSON (Gemini, OpenAI, …) works by
 * supplying a `ChatJSON` function.
 */
export class LLMCreativeDirector implements CreativeDirectorProvider {
  readonly isMock = false;
  constructor(
    readonly name: string,
    private readonly chatJSON: ChatJSON,
  ) {}

  async planCollection(input: PlanInput): Promise<CollectionPlan> {
    const raw = await this.chatJSON(DIRECTOR_SYSTEM, planUserPrompt(input));
    const plan = collectionPlanSchema.parse(safeJson(raw));
    return normalizeCounts(plan, input.designCount);
  }

  async generatePrompts(input: PlanInput, plan: CollectionPlan): Promise<PromptSpec[]> {
    const raw = await this.chatJSON(DIRECTOR_SYSTEM, promptsUserPrompt(input, plan));
    const { prompts } = promptsWrapperSchema.parse(safeJson(raw));
    return prompts
      .slice(0, input.designCount)
      .map((p, i) => ({ ...p, index: i + 1 }));
  }

  async regeneratePrompt(input: RegenInput): Promise<string> {
    const user = [
      `Rewrite a single image-generation prompt for the "${input.category}" category of a ${input.theme} ${input.productType} collection.`,
      `Concept: ${input.concept}. Style: ${input.style ?? "cohesive"}. Colours: ${input.colors.join(", ") || "harmonious"}.`,
      input.previousText ? `Make it meaningfully different from: "${input.previousText}".` : "",
      "End with 'no text, no watermark'. Return JSON only: {\"text\": string}",
    ]
      .filter(Boolean)
      .join("\n");
    const raw = await this.chatJSON(DIRECTOR_SYSTEM, user);
    const parsed = z.object({ text: z.string().min(1) }).parse(safeJson(raw));
    return parsed.text;
  }

  async generateListing(input: ListingInput): Promise<ListingResult> {
    const user = [
      `Write an optimised Etsy listing for a digital product: "${input.productName}".`,
      `Theme: ${input.theme}. Type: ${input.productType}. Style: ${input.style ?? "cohesive"}.`,
      `Designs: ${input.approvedCount || input.designCount}. Colours: ${input.colors.join(", ") || "harmonious"}.`,
      "Follow Etsy best practices: a compelling title (<=140 chars), a scannable description, and EXACTLY up to 13 tags, each <=20 chars, all distinct — NO keyword stuffing or repetition.",
      "Return JSON only:",
      `{"title":string,"description":string,"tags":string[],"keywords":string[],"materials":string[],"colors":string[],"occasions":string[],"styleTags":string[],"category":string,"attributes":{}}`,
    ].join("\n");
    const raw = await this.chatJSON(LISTING_SYSTEM, user);
    const parsed = listingResultSchema.parse(safeJson(raw));
    return { ...parsed, tags: parsed.tags.slice(0, 13) };
  }

  async regenerateListingField(
    field: ListingField,
    input: ListingInput,
    current: ListingResult,
  ): Promise<ListingResult[ListingField]> {
    const constraints: Record<ListingField, string> = {
      title: "a single compelling Etsy title, <=140 chars",
      description: "a scannable Etsy description with short sections",
      tags: "up to 13 distinct tags, each <=20 chars, no repetition or stuffing",
      keywords: "5-8 buyer search phrases",
    };
    const shape: Record<ListingField, string> = {
      title: `{"value": string}`,
      description: `{"value": string}`,
      tags: `{"value": string[]}`,
      keywords: `{"value": string[]}`,
    };
    const user = [
      `Rewrite ONLY the ${field} for this Etsy listing for "${input.productName}" (${input.theme} ${input.productType}).`,
      `Make it meaningfully different from the current ${field}: ${JSON.stringify(current[field])}.`,
      `Requirements: ${constraints[field]}.`,
      `Return JSON only: ${shape[field]}`,
    ].join("\n");
    const raw = await this.chatJSON(LISTING_SYSTEM, user);
    const isArray = field === "tags" || field === "keywords";
    const schema = z.object({ value: isArray ? z.array(z.string()) : z.string() });
    const { value } = schema.parse(safeJson(raw));
    if (field === "tags" && Array.isArray(value)) return value.slice(0, 13);
    return value as ListingResult[ListingField];
  }

  async generateMarketing(input: ListingInput): Promise<MarketingResult> {
    const user = [
      `Write marketing content for an Etsy digital product: "${input.productName}".`,
      `Theme: ${input.theme}. Type: ${input.productType}. Designs: ${input.approvedCount || input.designCount}.`,
      "Create platform-appropriate copy (Pinterest, Instagram, Facebook, email). Hashtags without the # prefix.",
      "Return JSON only:",
      `{"pinterestTitle":string,"pinterestDescription":string,"pinterestTags":string[],"instagramCaption":string,"instagramHashtags":string[],"facebookPost":string,"emailSubject":string,"emailBody":string}`,
    ].join("\n");
    const raw = await this.chatJSON(MARKETING_SYSTEM, user);
    return marketingResultSchema.parse(safeJson(raw));
  }
}

const MARKETING_SYSTEM =
  "You are a social media marketer for Etsy digital-product sellers. You write engaging, " +
  "platform-native copy that drives clicks without being spammy. Respond with strict JSON only.";

const LISTING_SYSTEM =
  "You are an Etsy SEO specialist for digital products. You write listings that rank and convert " +
  "without keyword stuffing. You respond with strict JSON only — no prose, no markdown fences.";
