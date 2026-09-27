"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "./auth";
import { getActiveShop } from "@/server/repositories/shops";
import { getStorage } from "@/server/storage";
import { PRODUCT_TYPES, CANVAS_PRESETS, DPI_PRESETS } from "@/lib/constants";

export type ProductFormState = { error?: string } | undefined;

const schema = z.object({
  name: z.string().min(2, "Give your product a name").max(120),
  productType: z.enum(PRODUCT_TYPES),
  theme: z.string().min(2, "Describe the theme"),
  style: z.string().max(200).optional(),
  colors: z.string().optional(), // comma-separated
  designCount: z.coerce.number().int().min(1, "At least 1 design").max(500),
  canvasSize: z.enum(CANVAS_PRESETS),
  dpi: z.coerce.number().refine((n) => (DPI_PRESETS as readonly number[]).includes(n), "Invalid DPI"),
  provider: z.string().optional(),
});

export async function createProductAction(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const user = await requireUser();
  const shop = await getActiveShop(user.id);
  if (!shop) return { error: "Connect or create a shop first." };

  const parsed = schema.safeParse({
    name: formData.get("name"),
    productType: formData.get("productType"),
    theme: formData.get("theme"),
    style: formData.get("style"),
    colors: formData.get("colors"),
    designCount: formData.get("designCount"),
    canvasSize: formData.get("canvasSize"),
    dpi: formData.get("dpi"),
    provider: formData.get("provider"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const colorPalette = (parsed.data.colors ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  const product = await prisma.product.create({
    data: {
      userId: user.id,
      shopId: shop.id,
      name: parsed.data.name,
      productType: parsed.data.productType,
      theme: parsed.data.theme,
      style: parsed.data.style || null,
      colorPalette: JSON.stringify(colorPalette),
      designCount: parsed.data.designCount,
      canvasSize: parsed.data.canvasSize,
      dpi: parsed.data.dpi,
      status: "draft", // Phase 2 will advance this to "planning" via the AI creative director
    },
  });

  await prisma.activityLog.create({
    data: { userId: user.id, action: "product.created", detail: product.name },
  });

  revalidatePath("/dashboard");
  revalidatePath("/products");
  redirect(`/products/${product.id}`);
}

export async function archiveProductAction(formData: FormData) {
  const user = await requireUser();
  const productId = String(formData.get("productId") ?? "");
  const next = String(formData.get("next") ?? "archived");
  const product = await prisma.product.findFirst({ where: { id: productId, userId: user.id } });
  if (!product) return;
  await prisma.product.update({
    where: { id: productId },
    data: { status: next === "archived" ? "archived" : "ready" },
  });
  revalidatePath("/library");
  revalidatePath("/products");
  revalidatePath("/dashboard");
}

/** Permanently delete a product and all its assets (images, prompts, files, listing). */
export async function deleteProductAction(formData: FormData) {
  const user = await requireUser();
  const productId = String(formData.get("productId") ?? "");
  const product = await prisma.product.findFirst({
    where: { id: productId, userId: user.id },
    select: { id: true, shopId: true, name: true },
  });
  if (!product) redirect("/library");

  // Remove all stored assets for this product (images + exports).
  await getStorage()
    .deletePrefix(`shops/${product.shopId}/products/${product.id}/`)
    .catch(() => {});

  await prisma.$transaction([
    // EtsyListing.product is an optional relation (no cascade) — remove it first
    // so its metadata cascades; the product delete cascades the rest.
    prisma.etsyListing.deleteMany({ where: { productId } }),
    prisma.product.delete({ where: { id: productId } }),
  ]);
  await prisma.activityLog.create({
    data: { userId: user.id, action: "product.deleted", detail: product.name },
  });

  revalidatePath("/library");
  revalidatePath("/products");
  revalidatePath("/dashboard");
  revalidatePath("/photos");
  redirect("/library");
}

export async function duplicateProductAction(formData: FormData) {
  const user = await requireUser();
  const productId = String(formData.get("productId") ?? "");
  const src = await prisma.product.findFirst({ where: { id: productId, userId: user.id } });
  if (!src) return;

  // Clone the product definition only (not generated assets).
  const copy = await prisma.product.create({
    data: {
      userId: user.id,
      shopId: src.shopId,
      styleDnaId: src.styleDnaId,
      name: `${src.name} (copy)`,
      productType: src.productType,
      theme: src.theme,
      style: src.style,
      colorPalette: src.colorPalette,
      designCount: src.designCount,
      canvasSize: src.canvasSize,
      dpi: src.dpi,
      status: "draft",
    },
  });
  revalidatePath("/library");
  revalidatePath("/products");
  redirect(`/products/${copy.id}`);
}
