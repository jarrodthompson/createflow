"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "./auth";
import { createEtsyDraft } from "@/server/services/etsy-draft";

const priceSchema = z.coerce.number().min(0.2).max(10000).catch(5);

/** Create (or recreate) an Etsy DRAFT listing. Never publishes. */
export async function createEtsyDraftAction(formData: FormData) {
  const user = await requireUser();
  const productId = String(formData.get("productId") ?? "");
  const price = priceSchema.parse(formData.get("price"));

  const product = await prisma.product.findFirst({ where: { id: productId, userId: user.id } });
  if (!product) return;

  const result = await createEtsyDraft(productId, price);
  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: result.ok ? "etsy.draft.created" : "etsy.draft.failed",
      detail: result.ok ? `${product.name} → ${result.listingId}` : result.error,
    },
  });

  revalidatePath(`/products/${productId}`);
  revalidatePath("/drafts");
  revalidatePath("/listings");
  revalidatePath("/dashboard");
  revalidatePath("/queue");
}
