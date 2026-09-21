"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "./auth";
import { getQueue } from "@/server/queue";

function revalidateProduct(productId: string) {
  revalidatePath(`/products/${productId}`);
  revalidatePath(`/products/${productId}/review`);
  revalidatePath("/queue");
  revalidatePath("/dashboard");
}

const scopeSchema = z.enum(["test5", "test10", "all"]);

/**
 * Create image rows for approved prompts that don't have an image yet, then
 * enqueue a generation job. Scope supports cost-controlled test batches.
 */
export async function generateImagesAction(formData: FormData) {
  const user = await requireUser();
  const productId = String(formData.get("productId") ?? "");
  const scope = scopeSchema.catch("all").parse(formData.get("scope"));

  const product = await prisma.product.findFirst({
    where: { id: productId, userId: user.id },
  });
  if (!product) return;

  // Approved prompts that don't already have a live image.
  const prompts = await prisma.prompt.findMany({
    where: { productId, status: "approved" },
    orderBy: { index: "asc" },
    include: {
      images: { where: { status: { in: ["queued", "generating", "completed"] } }, select: { id: true } },
    },
  });
  let pending = prompts.filter((p) => p.images.length === 0);
  if (scope === "test5") pending = pending.slice(0, 5);
  if (scope === "test10") pending = pending.slice(0, 10);
  if (pending.length === 0) return;

  await prisma.image.createMany({
    data: pending.map((p) => ({
      productId,
      promptId: p.id,
      index: p.index,
      category: p.category,
      status: "queued",
    })),
  });

  const job = await prisma.generationJob.create({
    data: { productId, type: "generation", status: "queued", total: pending.length },
  });

  await getQueue().enqueue(productId, job.id);
  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: "generation.started",
      detail: `${product.name}: ${pending.length} images`,
    },
  });
  revalidateProduct(productId);
}

export async function retryFailedAction(formData: FormData) {
  const user = await requireUser();
  const productId = String(formData.get("productId") ?? "");
  const product = await prisma.product.findFirst({
    where: { id: productId, userId: user.id },
  });
  if (!product) return;

  const failed = await prisma.image.count({ where: { productId, status: "failed" } });
  if (failed === 0) return;

  await prisma.image.updateMany({ where: { productId, status: "failed" }, data: { status: "queued" } });
  const job = await prisma.generationJob.create({
    data: { productId, type: "generation", status: "queued", total: failed },
  });
  await getQueue().enqueue(productId, job.id);
  revalidateProduct(productId);
}

export async function retryImageAction(formData: FormData) {
  const user = await requireUser();
  const imageId = String(formData.get("imageId") ?? "");
  const image = await prisma.image.findFirst({
    where: { id: imageId, product: { userId: user.id } },
  });
  if (!image) return;

  await prisma.image.update({ where: { id: imageId }, data: { status: "queued" } });
  const job = await prisma.generationJob.create({
    data: { productId: image.productId, type: "generation", status: "queued", total: 1 },
  });
  await getQueue().enqueue(image.productId, job.id);
  revalidateProduct(image.productId);
}
