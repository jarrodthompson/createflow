import { z } from "zod";

/**
 * AI provider abstraction — capability interfaces.
 * Phase 2 implements the creative/text capability. Image + Vision providers
 * (Phases 3–4) will follow the same registry pattern.
 */

export type PlanInput = {
  productType: string;
  theme: string;
  style?: string | null;
  colors: string[];
  designCount: number;
  styleDna?: {
    name: string;
    descriptors: string[];
    colorMoods: string[];
    avoid: string[];
  } | null;
};

// ---- Structured plan the Creative Director returns ----
export const collectionPlanSchema = z.object({
  concept: z.string().min(1),
  visualDirection: z.string().min(1),
  colorDirection: z.string().min(1),
  styleRules: z.array(z.string()).min(1),
  compositionRules: z.array(z.string()).min(1),
  categories: z
    .array(
      z.object({
        name: z.string().min(1),
        description: z.string().default(""),
        designCount: z.number().int().min(1),
      }),
    )
    .min(1),
});
export type CollectionPlan = z.infer<typeof collectionPlanSchema>;

export const promptSpecSchema = z.object({
  index: z.number().int().min(1),
  concept: z.string().min(1),
  category: z.string().min(1),
  text: z.string().min(1),
});
export type PromptSpec = z.infer<typeof promptSpecSchema>;

export type RegenInput = PlanInput & {
  concept: string;
  category: string;
  previousText?: string;
};

// ---- Etsy listing / SEO ----
export type ListingInput = PlanInput & { productName: string; approvedCount: number };

export const listingResultSchema = z.object({
  title: z.string().min(1).max(140),
  description: z.string().min(1),
  tags: z.array(z.string()).max(13),
  keywords: z.array(z.string()),
  materials: z.array(z.string()),
  colors: z.array(z.string()),
  occasions: z.array(z.string()),
  styleTags: z.array(z.string()),
  category: z.string(),
  attributes: z.record(z.string(), z.string()).default({}),
});
export type ListingResult = z.infer<typeof listingResultSchema>;

export type ListingField = "title" | "description" | "tags" | "keywords";

// ---- Marketing content ----
export const marketingResultSchema = z.object({
  pinterestTitle: z.string(),
  pinterestDescription: z.string(),
  pinterestTags: z.array(z.string()),
  instagramCaption: z.string(),
  instagramHashtags: z.array(z.string()),
  facebookPost: z.string(),
  emailSubject: z.string(),
  emailBody: z.string(),
});
export type MarketingResult = z.infer<typeof marketingResultSchema>;

/** The text/creative capability of an AI provider. */
export interface CreativeDirectorProvider {
  readonly name: string;
  readonly isMock: boolean;
  planCollection(input: PlanInput): Promise<CollectionPlan>;
  generatePrompts(input: PlanInput, plan: CollectionPlan): Promise<PromptSpec[]>;
  regeneratePrompt(input: RegenInput): Promise<string>;
  generateListing(input: ListingInput): Promise<ListingResult>;
  regenerateListingField(
    field: ListingField,
    input: ListingInput,
    current: ListingResult,
  ): Promise<Pick<ListingResult, ListingField>[ListingField]>;
  generateMarketing(input: ListingInput): Promise<MarketingResult>;
}

/** Ensure category design counts sum exactly to the requested total. */
export function normalizeCounts(plan: CollectionPlan, total: number): CollectionPlan {
  const cats = plan.categories.map((c) => ({ ...c }));
  const sum = cats.reduce((n, c) => n + c.designCount, 0);
  if (sum === total || cats.length === 0) return { ...plan, categories: cats };

  // Scale proportionally, then fix rounding drift on the largest category.
  let running = 0;
  cats.forEach((c, i) => {
    if (i === cats.length - 1) {
      c.designCount = Math.max(1, total - running);
    } else {
      c.designCount = Math.max(1, Math.round((c.designCount / sum) * total));
      running += c.designCount;
    }
  });
  // Final guard against overshoot from the Math.max(1,...) floors.
  let drift = cats.reduce((n, c) => n + c.designCount, 0) - total;
  for (let i = cats.length - 1; i >= 0 && drift > 0; i--) {
    const take = Math.min(drift, cats[i].designCount - 1);
    cats[i].designCount -= take;
    drift -= take;
  }
  return { ...plan, categories: cats };
}
