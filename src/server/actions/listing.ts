"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "./auth";
import { getCreativeDirector } from "@/server/ai/registry";
import {
  generateProductListing,
  loadListingResult,
  toListingInput,
} from "@/server/services/listing";
import type { ListingField } from "@/server/ai/types";

async function ownedProduct(userId: string, productId: string) {
  return prisma.product.findFirst({
    where: { id: productId, userId },
    include: { styleDna: true },
  });
}

async function approvedCount(productId: string) {
  return prisma.image.count({
    where: { productId, status: "completed", review: { is: { decision: "approved" } } },
  });
}

function revalidate(productId: string) {
  revalidatePath(`/products/${productId}/listing`);
  revalidatePath(`/products/${productId}`);
  revalidatePath("/listings");
  revalidatePath("/library");
}

/** Generate a full Etsy listing with AI. */
export async function generateListingAction(formData: FormData) {
  const user = await requireUser();
  const productId = String(formData.get("productId") ?? "");
  const product = await ownedProduct(user.id, productId);
  if (!product) return;
  await generateProductListing(product, await approvedCount(productId));
  await prisma.activityLog.create({
    data: { userId: user.id, action: "listing.generated", detail: product.name },
  });
  revalidate(productId);
}

const parseCsv = (v: FormDataEntryValue | null) =>
  String(v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const saveSchema = z.object({ title: z.string().min(1).max(140), description: z.string().min(1) });

/** Save manual edits to every listing field. */
export async function updateListingAction(formData: FormData) {
  const user = await requireUser();
  const productId = String(formData.get("productId") ?? "");
  const product = await ownedProduct(user.id, productId);
  if (!product) return;

  const parsed = saveSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
  });
  if (!parsed.success) return;

  const listing = await prisma.etsyListing.findUnique({ where: { productId } });
  if (!listing) return;

  const tags = parseCsv(formData.get("tags")).slice(0, 13);

  await prisma.$transaction([
    prisma.etsyListing.update({ where: { productId }, data: { title: parsed.data.title } }),
    prisma.etsyMetadata.update({
      where: { listingId: listing.id },
      data: {
        description: parsed.data.description,
        tags: JSON.stringify(tags),
        keywords: JSON.stringify(parseCsv(formData.get("keywords"))),
        materials: JSON.stringify(parseCsv(formData.get("materials"))),
        colors: JSON.stringify(parseCsv(formData.get("colors"))),
        occasions: JSON.stringify(parseCsv(formData.get("occasions"))),
        styleTags: JSON.stringify(parseCsv(formData.get("styleTags"))),
        category: String(formData.get("category") ?? ""),
      },
    }),
  ]);
  revalidate(productId);
}

/** Regenerate one component (title / description / tags / keywords). `field` is bound. */
export async function regenerateListingFieldAction(field: ListingField, formData: FormData) {
  const user = await requireUser();
  const productId = String(formData.get("productId") ?? "");
  if (!["title", "description", "tags", "keywords"].includes(field)) return;

  const product = await ownedProduct(user.id, productId);
  if (!product) return;
  const current = await loadListingResult(productId);
  if (!current) return;

  const director = getCreativeDirector();
  const input = toListingInput(product, await approvedCount(productId));
  const value = await director.regenerateListingField(field, input, current);

  const listing = await prisma.etsyListing.findUnique({ where: { productId } });
  if (!listing) return;

  if (field === "title") {
    await prisma.etsyListing.update({ where: { productId }, data: { title: String(value) } });
  } else if (field === "description") {
    await prisma.etsyMetadata.update({
      where: { listingId: listing.id },
      data: { description: String(value) },
    });
  } else {
    await prisma.etsyMetadata.update({
      where: { listingId: listing.id },
      data: { [field]: JSON.stringify(value) },
    });
  }
  revalidate(productId);
}
