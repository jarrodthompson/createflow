import "server-only";
import { prisma } from "@/lib/prisma";
import { getCreativeDirector } from "@/server/ai/registry";
import type { ListingInput, ListingResult } from "@/server/ai/types";

function parseList(json: string | null): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

type ProductForListing = {
  id: string;
  shopId: string;
  name: string;
  productType: string;
  theme: string;
  style: string | null;
  colorPalette: string | null;
  designCount: number;
  styleDna: {
    name: string;
    descriptors: string | null;
    colorMoods: string | null;
    avoid: string | null;
  } | null;
};

export function toListingInput(product: ProductForListing, approvedCount: number): ListingInput {
  return {
    productName: product.name,
    approvedCount,
    productType: product.productType,
    theme: product.theme,
    style: product.style,
    colors: parseList(product.colorPalette),
    designCount: product.designCount,
    styleDna: product.styleDna
      ? {
          name: product.styleDna.name,
          descriptors: parseList(product.styleDna.descriptors),
          colorMoods: parseList(product.styleDna.colorMoods),
          avoid: parseList(product.styleDna.avoid),
        }
      : null,
  };
}

/** Persist a full listing result to etsy_listings + etsy_metadata (upsert). */
export async function saveListing(
  productId: string,
  shopId: string,
  result: ListingResult,
) {
  const listing = await prisma.etsyListing.upsert({
    where: { productId },
    create: { productId, shopId, title: result.title, status: "draft" },
    update: { title: result.title },
  });
  await prisma.etsyMetadata.upsert({
    where: { listingId: listing.id },
    create: {
      listingId: listing.id,
      description: result.description,
      tags: JSON.stringify(result.tags),
      keywords: JSON.stringify(result.keywords),
      materials: JSON.stringify(result.materials),
      colors: JSON.stringify(result.colors),
      occasions: JSON.stringify(result.occasions),
      styleTags: JSON.stringify(result.styleTags),
      category: result.category,
      attributes: JSON.stringify(result.attributes),
    },
    update: {
      description: result.description,
      tags: JSON.stringify(result.tags),
      keywords: JSON.stringify(result.keywords),
      materials: JSON.stringify(result.materials),
      colors: JSON.stringify(result.colors),
      occasions: JSON.stringify(result.occasions),
      styleTags: JSON.stringify(result.styleTags),
      category: result.category,
      attributes: JSON.stringify(result.attributes),
    },
  });
  return listing;
}

export async function generateProductListing(product: ProductForListing, approvedCount: number) {
  const director = getCreativeDirector();
  const result = await director.generateListing(toListingInput(product, approvedCount));
  await saveListing(product.id, product.shopId, result);
  return { director: director.name, isMock: director.isMock };
}

/** Load a product's listing as a ListingResult (for editing / regeneration). */
export async function loadListingResult(productId: string): Promise<ListingResult | null> {
  const listing = await prisma.etsyListing.findUnique({
    where: { productId },
    include: { metadata: true },
  });
  if (!listing) return null;
  const m = listing.metadata;
  return {
    title: listing.title,
    description: m?.description ?? "",
    tags: parseList(m?.tags ?? null),
    keywords: parseList(m?.keywords ?? null),
    materials: parseList(m?.materials ?? null),
    colors: parseList(m?.colors ?? null),
    occasions: parseList(m?.occasions ?? null),
    styleTags: parseList(m?.styleTags ?? null),
    category: m?.category ?? "",
    attributes: (() => {
      try {
        return m?.attributes ? JSON.parse(m.attributes) : {};
      } catch {
        return {};
      }
    })(),
  };
}
