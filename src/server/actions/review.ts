"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "./auth";
import { getQueue } from "@/server/queue";
import { getStorage } from "@/server/storage";
import { analyzeImage } from "@/server/services/analysis";

function revalidate(productId: string) {
  revalidatePath(`/products/${productId}/review`);
  revalidatePath(`/products/${productId}`);
  revalidatePath("/queue");
  revalidatePath("/dashboard");
}

async function ownedImage(userId: string, imageId: string) {
  return prisma.image.findFirst({
    where: { id: imageId, product: { userId } },
    include: { prompt: true },
  });
}

/** Run AI quality control over all completed images (background job). */
export async function runQcAction(formData: FormData) {
  const user = await requireUser();
  const productId = String(formData.get("productId") ?? "");
  const product = await prisma.product.findFirst({ where: { id: productId, userId: user.id } });
  if (!product) return;

  const count = await prisma.image.count({ where: { productId, status: "completed" } });
  if (count === 0) return;

  const job = await prisma.generationJob.create({
    data: { productId, type: "analysis", status: "queued", total: count },
  });
  await getQueue().enqueueAnalysis(productId, job.id);
  revalidate(productId);
}

/** Re-run QC on a single image (synchronous). */
export async function reanalyzeImageAction(formData: FormData) {
  const user = await requireUser();
  const imageId = String(formData.get("imageId") ?? "");
  const image = await ownedImage(user.id, imageId);
  if (!image) return;
  await analyzeImage(image.id);
  revalidate(image.productId);
}

async function setDecision(userId: string, imageId: string, decision: "approved" | "rejected") {
  const image = await ownedImage(userId, imageId);
  if (!image) return null;
  await prisma.$transaction([
    prisma.imageReview.upsert({
      where: { imageId },
      create: { imageId, decision, reviewedAt: new Date() },
      update: { decision, reviewedAt: new Date() },
    }),
    // Reject moves the image out of the usable set; approve keeps it completed.
    // Never delete the image — the seller can always change their mind.
    prisma.image.update({
      where: { id: imageId },
      data: { status: decision === "rejected" ? "rejected" : "completed" },
    }),
  ]);
  return image;
}

export async function approveImageAction(formData: FormData) {
  const user = await requireUser();
  const image = await setDecision(user.id, String(formData.get("imageId") ?? ""), "approved");
  if (image) revalidate(image.productId);
}

export async function rejectImageAction(formData: FormData) {
  const user = await requireUser();
  const image = await setDecision(user.id, String(formData.get("imageId") ?? ""), "rejected");
  if (image) revalidate(image.productId);
}

export async function approveAllAction(formData: FormData) {
  const user = await requireUser();
  const productId = String(formData.get("productId") ?? "");
  const product = await prisma.product.findFirst({ where: { id: productId, userId: user.id } });
  if (!product) return;

  const images = await prisma.image.findMany({
    where: { productId, status: "completed", review: { is: null } },
    select: { id: true },
  });
  await prisma.$transaction(
    images.map((img) =>
      prisma.imageReview.upsert({
        where: { imageId: img.id },
        create: { imageId: img.id, decision: "approved" },
        update: { decision: "approved" },
      }),
    ),
  );
  revalidate(productId);
}

/** Regenerate an image: remove the old asset and re-queue it. */
export async function regenerateImageAction(formData: FormData) {
  const user = await requireUser();
  const imageId = String(formData.get("imageId") ?? "");
  const image = await ownedImage(user.id, imageId);
  if (!image) return;

  if (image.storageKey) await getStorage().delete(image.storageKey);
  await prisma.$transaction([
    prisma.imageReview.deleteMany({ where: { imageId } }),
    prisma.image.update({
      where: { id: imageId },
      data: { status: "queued", storageKey: null, qualityScore: null, hash: null },
    }),
  ]);
  const job = await prisma.generationJob.create({
    data: { productId: image.productId, type: "generation", status: "queued", total: 1 },
  });
  await getQueue().enqueue(image.productId, job.id);
  revalidate(image.productId);
}

const editSchema = z.object({ text: z.string().min(1).max(2000) });

/** Edit the prompt behind an image, then regenerate it. */
export async function editImagePromptAction(formData: FormData) {
  const user = await requireUser();
  const imageId = String(formData.get("imageId") ?? "");
  const parsed = editSchema.safeParse({ text: formData.get("text") });
  if (!parsed.success) return;

  const image = await ownedImage(user.id, imageId);
  if (!image || !image.promptId) return;

  await prisma.prompt.update({ where: { id: image.promptId }, data: { text: parsed.data.text } });
  if (image.storageKey) await getStorage().delete(image.storageKey);
  await prisma.$transaction([
    prisma.imageReview.deleteMany({ where: { imageId } }),
    prisma.image.update({
      where: { id: imageId },
      data: { status: "queued", storageKey: null, qualityScore: null, hash: null },
    }),
  ]);
  const job = await prisma.generationJob.create({
    data: { productId: image.productId, type: "generation", status: "queued", total: 1 },
  });
  await getQueue().enqueue(image.productId, job.id);
  revalidate(image.productId);
}
