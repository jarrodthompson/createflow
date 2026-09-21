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
  normalizeCounts,
} from "./types";

/**
 * Deterministic, offline Creative Director used for development and when no
 * AI key is configured. It produces a cohesive, plausible collection plan and
 * one prompt per design without any network call. This is clearly labelled as
 * a mock (isMock = true) and must never be presented as production generation.
 */

// Theme keyword → candidate categories. First matching group wins; otherwise a
// product-type default is used. Keeps a collection coherent instead of random.
const THEME_CATEGORIES: { match: RegExp; categories: string[] }[] = [
  {
    match: /princess|fairy ?tale|royal|castle/i,
    categories: [
      "Princesses",
      "Castles",
      "Carriages",
      "Crowns & Tiaras",
      "Fairies",
      "Enchanted Forests",
      "Magical Objects",
      "Flowers",
      "Storybook Scenes",
      "Decorative Patterns",
    ],
  },
  {
    match: /woodland|forest|animal|critter/i,
    categories: [
      "Foxes",
      "Rabbits",
      "Deer",
      "Owls",
      "Hedgehogs",
      "Mushrooms & Toadstools",
      "Ferns & Foliage",
      "Berries",
      "Forest Scenes",
      "Decorative Patterns",
    ],
  },
  {
    match: /floral|flower|botanical|cottagecore|garden/i,
    categories: [
      "Roses",
      "Wildflowers",
      "Leaves & Foliage",
      "Bouquets",
      "Botanical Wreaths",
      "Herbs",
      "Berries & Buds",
      "Seamless Patterns",
      "Border Frames",
      "Single Stems",
    ],
  },
  {
    match: /christmas|holiday|winter|festive/i,
    categories: [
      "Ornaments",
      "Snowflakes",
      "Evergreens & Wreaths",
      "Gift Boxes",
      "Candles",
      "Winter Animals",
      "Cozy Scenes",
      "Stars",
      "Ribbons & Bows",
      "Seamless Patterns",
    ],
  },
  {
    match: /space|galaxy|celestial|star|moon/i,
    categories: [
      "Planets",
      "Moons & Phases",
      "Stars & Constellations",
      "Rockets",
      "Astronauts",
      "Nebulae",
      "Comets",
      "Galaxies",
      "Night Skies",
      "Seamless Patterns",
    ],
  },
];

const TYPE_DEFAULT_CATEGORIES: Record<string, string[]> = {
  "Digital Paper": [
    "Seamless Patterns",
    "Floral Motifs",
    "Geometric Textures",
    "Watercolor Washes",
    "Decorative Borders",
    "Polka & Dots",
    "Stripes & Lines",
    "Ombre Gradients",
  ],
  "Clipart Set": [
    "Main Subjects",
    "Accents",
    "Foliage",
    "Small Details",
    "Frames & Borders",
    "Decorative Elements",
  ],
  "Printable Wall Art": [
    "Statement Prints",
    "Botanical Studies",
    "Typographic Quotes",
    "Abstract Shapes",
    "Line Art",
  ],
};

const GENERIC_CATEGORIES = [
  "Main Motifs",
  "Accent Elements",
  "Backgrounds",
  "Borders & Frames",
  "Decorative Patterns",
  "Small Details",
];

// Descriptor pools for varied-but-cohesive per-design concepts.
const COMPOSITIONS = [
  "centered composition on a clean background",
  "isolated on a transparent-style background",
  "arranged in a balanced flat-lay",
  "as a repeating seamless tile",
  "framed within a soft decorative border",
  "with generous negative space around the subject",
];
const DETAILS = [
  "delicate linework",
  "soft layered shading",
  "gentle highlights",
  "subtle texture",
  "fine hand-drawn detail",
  "smooth gradients",
];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function chooseCategories(input: PlanInput): string[] {
  const themed = THEME_CATEGORIES.find((t) => t.match.test(input.theme));
  const base =
    themed?.categories ??
    TYPE_DEFAULT_CATEGORIES[input.productType] ??
    GENERIC_CATEGORIES;
  // Use at most ~10 categories, and never more than the design count.
  const max = Math.min(base.length, 10, Math.max(1, input.designCount));
  return base.slice(0, max);
}

function distribute(total: number, buckets: number): number[] {
  const base = Math.floor(total / buckets);
  const remainder = total - base * buckets;
  return Array.from({ length: buckets }, (_, i) => base + (i < remainder ? 1 : 0));
}

function buildPlan(input: PlanInput): CollectionPlan {
  const categoryNames = chooseCategories(input);
  const counts = distribute(input.designCount, categoryNames.length);
  const style = input.style?.trim() || "cohesive illustrated";
  const colors = input.colors.length ? input.colors.join(", ") : "a soft, harmonious palette";
  const avoid = input.styleDna?.avoid ?? ["text", "logos", "watermarks", "harsh neon colours"];

  return normalizeCounts(
    {
      concept: `A cohesive ${input.theme} ${input.productType.toLowerCase()} collection rendered in a ${style} aesthetic, designed to feel like a single curated set rather than unrelated pieces.`,
      visualDirection: `Every design shares the same ${style} treatment, consistent line weight, and lighting so the ${categoryNames.length} categories read as one family. Subjects sit comfortably within the canvas with intentional negative space.`,
      colorDirection: `Anchor the whole set to ${colors}. Reuse these hues across every category; avoid introducing colours outside the palette so the collection stays unified.`,
      styleRules: [
        `Maintain a ${style} style across all ${input.designCount} designs`,
        "Keep line weight, shading and level of detail consistent",
        `Avoid ${avoid.join(", ")}`,
        ...(input.styleDna?.descriptors?.length
          ? [`Honour the Style DNA: ${input.styleDna.descriptors.join(", ")}`]
          : []),
      ],
      compositionRules: [
        "Keep the primary subject centered with clear silhouette",
        "Leave clean margins so designs crop well for listings",
        "Balance detail density so pieces sit well together in a grid",
      ],
      categories: categoryNames.map((name, i) => ({
        name,
        description: `${name} interpreted in the ${input.theme} theme and ${style} style.`,
        designCount: counts[i],
      })),
    },
    input.designCount,
  );
}

function buildPromptText(input: PlanInput, category: string, variantIndex: number): string {
  const style = input.style?.trim() || "cohesive illustrated";
  const colors = input.colors.length ? input.colors.join(", ") : "soft harmonious tones";
  const composition = pick(COMPOSITIONS, variantIndex);
  const detail = pick(DETAILS, variantIndex + 1);
  const singular = category.replace(/s$/, "").toLowerCase();
  return `${input.theme} ${singular}, ${style} style, ${composition}, ${detail}, colour palette of ${colors}, unified with the rest of the collection, no text, no watermark, high resolution`;
}

export class MockCreativeDirector implements CreativeDirectorProvider {
  readonly name = "mock";
  readonly isMock = true;

  async planCollection(input: PlanInput): Promise<CollectionPlan> {
    return buildPlan(input);
  }

  async generatePrompts(input: PlanInput, plan: CollectionPlan): Promise<PromptSpec[]> {
    const prompts: PromptSpec[] = [];
    let index = 1;
    for (const category of plan.categories) {
      for (let v = 0; v < category.designCount; v++) {
        prompts.push({
          index,
          category: category.name,
          concept: `${category.name} — variation ${v + 1}`,
          text: buildPromptText(input, category.name, index),
        });
        index++;
      }
    }
    return prompts;
  }

  async regeneratePrompt(input: RegenInput): Promise<string> {
    // Deterministic-but-varied: nudge the variant seed off the previous text.
    const seed = (input.previousText?.length ?? 0) + input.concept.length + 3;
    return buildPromptText(input, input.category, seed);
  }

  async generateListing(input: ListingInput): Promise<ListingResult> {
    await new Promise((r) => setTimeout(r, 80));
    return buildListing(input, hashStr(input.productName + input.theme));
  }

  async regenerateListingField(field: ListingField, input: ListingInput): Promise<never> {
    // Fresh seed each time so the field meaningfully changes on regenerate.
    const seed = hashStr(field + input.productName) + Date.now();
    const listing = buildListing(input, seed);
    return listing[field] as never;
  }

  async generateMarketing(input: ListingInput): Promise<MarketingResult> {
    await new Promise((r) => setTimeout(r, 80));
    const theme = input.theme;
    const type = input.productType.toLowerCase();
    const n = input.approvedCount || input.designCount;
    // Plain words (no leading #) — the UI adds the # when rendering.
    const hashtags = [
      theme.replace(/\s+/g, ""),
      "digitaldownload",
      "digitalpaper",
      "scrapbooking",
      "printable",
      "etsyseller",
      "papercraft",
    ].map((h) => h.toLowerCase());
    return {
      pinterestTitle: `${theme} ${input.productType} — ${n} Printable Designs`,
      pinterestDescription: `Gorgeous ${theme.toLowerCase()} ${type} for scrapbooking, journals & crafts. ${n} high-res files, instant download. Pin for later! ✨`,
      pinterestTags: [theme.toLowerCase(), type, "printable", "digital paper", "craft"],
      instagramCaption: `New in the shop! 🌿 ${theme} ${input.productType} — ${n} cohesive designs ready to download and create with. Perfect for journals, planners & handmade gifts.`,
      instagramHashtags: hashtags,
      facebookPost: `Just dropped: our ${theme} ${input.productType} set — ${n} beautifully coordinated designs. Instant digital download, ready for your next project. Link in bio!`,
      emailSubject: `✨ New: ${theme} ${input.productType} (${n} designs)`,
      emailBody: `Hi there,\n\nOur new ${theme} ${input.productType} collection just launched — ${n} cohesive, high-resolution designs perfect for scrapbooking, planners and handmade projects.\n\nGrab your instant download today.\n\nHappy creating!`,
    };
  }
}

function rotate<T>(arr: T[], by: number): T[] {
  if (arr.length === 0) return arr;
  const n = ((by % arr.length) + arr.length) % arr.length;
  return [...arr.slice(n), ...arr.slice(0, n)];
}

const DESC_INTROS = [
  (name: string, n: number, type: string, theme: string, style: string) =>
    `A beautifully cohesive collection of ${n} ${type.toLowerCase()} designs inspired by ${theme}, rendered in a ${style} style so every piece works together.`,
  (name: string, n: number, type: string, theme: string, style: string) =>
    `${name} brings together ${n} ${style} ${type.toLowerCase()} designs in one curated ${theme} set — perfect for a polished, coordinated look.`,
  (name: string, n: number, type: string, theme: string, style: string) =>
    `Elevate your projects with ${n} hand-crafted ${theme} ${type.toLowerCase()} designs, unified by a ${style} aesthetic.`,
];

// ---- Etsy listing builder (mock) ----
const TITLE_TEMPLATES = [
  (t: string, ty: string, n: number) => `${t} ${ty} | ${n} Designs | Digital Download`,
  (t: string, ty: string, n: number) => `${n} ${t} ${ty} Bundle | Printable Digital Download`,
  (t: string, ty: string, n: number) => `${t} ${ty} Set of ${n} | Instant Download | Commercial Use`,
  (t: string, ty: string, n: number) => `Printable ${t} ${ty} | ${n}-Piece Collection`,
  (t: string, ty: string, n: number) => `${t} Digital ${ty} Pack | ${n} Files | Scrapbook & Craft`,
];

const OCCASION_POOL = ["Birthday", "Wedding", "Baby Shower", "Holiday", "Everyday", "Nursery"];

function clampTag(s: string): string {
  return s.trim().slice(0, 20);
}

function buildListing(input: ListingInput, seed: number): ListingResult {
  const type = input.productType;
  const theme = input.theme;
  const n = input.approvedCount || input.designCount;
  const style = input.style?.trim() || "cohesive";
  const colors = input.colors.length ? input.colors : ["pastel", "cream", "gold"];

  const title = clampTitle(TITLE_TEMPLATES[seed % TITLE_TEMPLATES.length](theme, type, n));

  const description = [
    `${input.productName}`,
    "",
    DESC_INTROS[seed % DESC_INTROS.length](input.productName, n, type, theme, style),
    "",
    "★ WHAT'S INCLUDED",
    `• ${n} high-resolution files`,
    `• ${input.designCount >= n ? `${input.designCount}-design themed collection` : "themed collection"}`,
    "• Instant digital download — no physical item is shipped",
    "",
    "★ PERFECT FOR",
    "Scrapbooking, junk journals, planners, invitations, wall art, packaging and more.",
    "",
    "★ NOTE",
    "Colours may vary slightly between screens and printers. For personal and small-business use.",
  ].join("\n");

  // 13 distinct, meaningful tags — no keyword stuffing / repetition.
  const tagCandidates = [
    theme.toLowerCase(),
    `${theme.toLowerCase()} ${type.toLowerCase()}`,
    type.toLowerCase(),
    "digital download",
    "printable",
    `${style} art`,
    "scrapbook paper",
    "junk journal",
    "commercial use",
    "planner stickers",
    ...colors.slice(0, 2).map((c) => `${c.toLowerCase()} decor`),
    "instant download",
    "craft supply",
    "clipart bundle",
  ];
  const tags = Array.from(new Set(rotate(tagCandidates, seed).map(clampTag)))
    .filter(Boolean)
    .slice(0, 13);

  const keywords = rotate(
    [
      `${theme} ${type}`,
      `${theme} digital paper`,
      `printable ${theme}`,
      `${style} ${theme} designs`,
      `${theme} bundle`,
      `${theme} clipart`,
      `${theme} scrapbook paper`,
    ],
    seed,
  )
    .slice(0, 5)
    .map((k) => k.toLowerCase());

  return {
    title,
    description,
    tags,
    keywords,
    materials: ["Digital file", "High-resolution PNG", "300 DPI"],
    colors: colors.map((c) => c.replace(/\b\w/g, (m) => m.toUpperCase())),
    occasions: OCCASION_POOL.slice(0, 3 + (seed % 3)),
    styleTags: [style, "whimsical", "premium"].map((s) => s.replace(/\b\w/g, (m) => m.toUpperCase())),
    category: `${type}`,
    attributes: { fileType: "PNG", dpi: "300", canvas: input.designCount ? "3600x3600" : "" },
  };
}

function clampTitle(s: string): string {
  return s.length <= 140 ? s : s.slice(0, 137) + "...";
}
