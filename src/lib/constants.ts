// Constrained status vocabularies (portable in place of DB enums).

export const PRODUCT_STATUSES = [
  "draft",
  "planning",
  "generating",
  "review",
  "ready",
  "listed",
  "archived",
] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  draft: "Draft",
  planning: "Planning",
  generating: "Generating",
  review: "Ready for Review",
  ready: "Ready",
  listed: "Listed",
  archived: "Archived",
};

export const ETSY_STATUSES = [
  "none",
  "draft",
  "scheduled",
  "published",
  "failed",
] as const;
export type EtsyStatus = (typeof ETSY_STATUSES)[number];

export const ETSY_STATUS_LABELS: Record<EtsyStatus, string> = {
  none: "Not listed",
  draft: "Etsy Draft",
  scheduled: "Scheduled",
  published: "Published",
  failed: "Failed",
};

export const PRODUCT_TYPES = [
  "Digital Paper",
  "Clipart Set",
  "Printable Wall Art",
  "Planner / Journal",
  "Pattern Set",
  "Sticker Set",
  "Coloring Pages",
  "SVG Bundle",
] as const;

export const CANVAS_PRESETS = ["3600x3600", "3000x3000", "4500x5400", "2550x3300"] as const;
export const DPI_PRESETS = [300, 150, 72] as const;

// Badge tone per status (maps to design-system tokens)
export function statusTone(status: string): "neutral" | "info" | "warning" | "success" | "danger" {
  switch (status) {
    case "ready":
    case "listed":
    case "published":
      return "success";
    case "generating":
    case "planning":
    case "scheduled":
      return "info";
    case "review":
      return "warning";
    case "failed":
      return "danger";
    default:
      return "neutral";
  }
}
