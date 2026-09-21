import "server-only";
import { prisma } from "@/lib/prisma";
import { getStorage } from "@/server/storage";
import { getEtsyClientForShop } from "@/server/etsy";

// Default Etsy taxonomy for digital prints; sellers can adjust per shop later.
const DEFAULT_TAXONOMY_ID = 1063;

function parseList(json: string | null): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export type DraftResult =
  | { ok: true; listingId: string; isMock: boolean; images: number }
  | { ok: false; error: string };

/**
 * Create an Etsy DRAFT listing for a product: create draft, upload listing
 * images (approved designs) and the digital ZIP, store the listing id.
 * NEVER publishes — the terminal state is always DRAFT.
 */
export async function createEtsyDraft(productId: string, price: number): Promise<DraftResult> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      shop: true,
      listing: { include: { metadata: true } },
      images: {
        where: { status: "completed", review: { is: { decision: "approved" } } },
        orderBy: { index: "asc" },
        take: 10,
      },
      files: { where: { kind: "zip" }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!product) return { ok: false, error: "Product not found" };
  if (product.shop.status !== "connected") return { ok: false, error: "Connect the shop to Etsy first" };
  if (!product.listing) return { ok: false, error: "Generate an Etsy listing first" };
  if (product.images.length === 0) return { ok: false, error: "Approve some images first" };

  const job = await prisma.generationJob.create({
    data: { productId, type: "etsy-upload", status: "running", startedAt: new Date(), total: product.images.length + 2 },
  });

  try {
    const client = await getEtsyClientForShop(product.shopId);
    const storage = getStorage();
    const apiShopId = product.shop.etsyShopId ?? "mock-shop";
    const meta = product.listing.metadata;

    const { listingId } = await client.createDraftListing(apiShopId, {
      title: product.listing.title,
      description: meta?.description ?? product.name,
      price,
      quantity: 999,
      tags: parseList(meta?.tags ?? null),
      taxonomyId: DEFAULT_TAXONOMY_ID,
    });
    await prisma.generationJob.update({ where: { id: job.id }, data: { progress: 1 } });

    // Upload approved designs as listing images.
    let uploaded = 0;
    for (const img of product.images) {
      if (!img.storageKey) continue;
      const bytes = await storage.get(img.storageKey);
      if (!bytes) continue;
      const ext = img.storageKey.split(".").pop() ?? "png";
      await client.uploadListingImage(apiShopId, listingId, bytes, `${String(img.index).padStart(3, "0")}.${ext}`);
      uploaded++;
      await prisma.generationJob.update({ where: { id: job.id }, data: { progress: 1 + uploaded } });
    }

    // Upload the digital product ZIP.
    const zip = product.files[0];
    if (zip) {
      const bytes = await storage.get(zip.storageKey);
      if (bytes) await client.uploadListingFile(apiShopId, listingId, bytes, zip.filename);
    }

    await prisma.$transaction([
      prisma.etsyListing.update({
        where: { id: product.listing.id },
        data: { etsyListingId: listingId, status: "draft" },
      }),
      prisma.product.update({ where: { id: productId }, data: { etsyStatus: "draft", status: "listed" } }),
      prisma.generationJob.update({
        where: { id: job.id },
        data: { status: "completed", finishedAt: new Date(), progress: product.images.length + 2 },
      }),
    ]);

    return { ok: true, listingId, isMock: client.isMock, images: uploaded };
  } catch (err) {
    const message = (err as Error).message.slice(0, 300);
    await prisma.generationJob.update({
      where: { id: job.id },
      data: { status: "failed", finishedAt: new Date(), error: message },
    });
    await prisma.product.update({ where: { id: productId }, data: { etsyStatus: "failed" } }).catch(() => {});
    return { ok: false, error: message };
  }
}
