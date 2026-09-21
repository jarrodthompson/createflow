"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "./auth";
import { planProductCollection, toPlanInput } from "@/server/services/creative-director";
import { getCreativeDirector } from "@/server/ai/registry";

async function ownedProduct(userId: string, productId: string) {
  return prisma.product.findFirst({
    where: { id: productId, userId },
    include: { styleDna: true },
  });
}

async function ownedPrompt(userId: string, promptId: string) {
  return prisma.prompt.findFirst({
    where: { id: promptId, product: { userId } },
    include: { product: { include: { styleDna: true } } },
  });
}

function revalidateProduct(productId: string) {
  revalidatePath(`/products/${productId}`);
  revalidatePath(`/products/${productId}/prompts`);
  revalidatePath("/collections");
  revalidatePath("/dashboard");
}

/** Run the AI Creative Director → plan collection + generate prompts. */
export async function planCollectionAction(formData: FormData) {
  const user = await requireUser();
  const productId = String(formData.get("productId") ?? "");
  const product = await ownedProduct(user.id, productId);
  if (!product) redirect("/products");

  await planProductCollection(product);
  await prisma.activityLog.create({
    data: { userId: user.id, action: "collection.planned", detail: product.name },
  });
  revalidateProduct(productId);
  redirect(`/products/${productId}/prompts`);
}

export async function regeneratePromptAction(formData: FormData) {
  const user = await requireUser();
  const promptId = String(formData.get("promptId") ?? "");
  const prompt = await ownedPrompt(user.id, promptId);
  if (!prompt) return;

  const director = getCreativeDirector();
  const input = toPlanInput(prompt.product);
  const text = await director.regeneratePrompt({
    ...input,
    concept: prompt.concept,
    category: prompt.category ?? "",
    previousText: prompt.text,
  });
  await prisma.prompt.update({
    where: { id: prompt.id },
    data: { text, status: "draft" },
  });
  revalidateProduct(prompt.productId);
}

export async function regenerateAllPromptsAction(formData: FormData) {
  const user = await requireUser();
  const productId = String(formData.get("productId") ?? "");
  const product = await ownedProduct(user.id, productId);
  if (!product || !product.collectionId) return;

  const director = getCreativeDirector();
  const input = toPlanInput(product);
  const plan = await director.planCollection(input);
  const prompts = await director.generatePrompts(input, plan);

  await prisma.$transaction([
    prisma.prompt.deleteMany({ where: { productId } }),
    prisma.prompt.createMany({
      data: prompts.map((p) => ({
        productId,
        index: p.index,
        concept: p.concept,
        category: p.category,
        text: p.text,
        status: "draft",
      })),
    }),
  ]);
  revalidateProduct(productId);
}

const updateSchema = z.object({
  concept: z.string().min(1).max(300),
  category: z.string().max(120).optional(),
  text: z.string().min(1).max(2000),
});

export async function updatePromptAction(formData: FormData) {
  const user = await requireUser();
  const promptId = String(formData.get("promptId") ?? "");
  const prompt = await ownedPrompt(user.id, promptId);
  if (!prompt) return;

  const parsed = updateSchema.safeParse({
    concept: formData.get("concept"),
    category: formData.get("category"),
    text: formData.get("text"),
  });
  if (!parsed.success) return;

  await prisma.prompt.update({
    where: { id: prompt.id },
    data: {
      concept: parsed.data.concept,
      category: parsed.data.category || null,
      text: parsed.data.text,
    },
  });
  revalidateProduct(prompt.productId);
}

export async function duplicatePromptAction(formData: FormData) {
  const user = await requireUser();
  const promptId = String(formData.get("promptId") ?? "");
  const prompt = await ownedPrompt(user.id, promptId);
  if (!prompt) return;

  const max = await prisma.prompt.aggregate({
    where: { productId: prompt.productId },
    _max: { index: true },
  });
  await prisma.prompt.create({
    data: {
      productId: prompt.productId,
      index: (max._max.index ?? 0) + 1,
      concept: `${prompt.concept} (copy)`,
      category: prompt.category,
      text: prompt.text,
      status: "draft",
    },
  });
  revalidateProduct(prompt.productId);
}

export async function addPromptAction(formData: FormData) {
  const user = await requireUser();
  const productId = String(formData.get("productId") ?? "");
  const product = await ownedProduct(user.id, productId);
  if (!product) return;

  const max = await prisma.prompt.aggregate({
    where: { productId },
    _max: { index: true },
  });
  await prisma.prompt.create({
    data: {
      productId,
      index: (max._max.index ?? 0) + 1,
      concept: "New concept",
      category: "Uncategorised",
      text: `${product.theme}, ${product.style ?? "cohesive style"}, no text, no watermark`,
      status: "draft",
    },
  });
  revalidateProduct(productId);
}

export async function deletePromptAction(formData: FormData) {
  const user = await requireUser();
  const promptId = String(formData.get("promptId") ?? "");
  const prompt = await ownedPrompt(user.id, promptId);
  if (!prompt) return;
  await prisma.prompt.delete({ where: { id: prompt.id } });
  revalidateProduct(prompt.productId);
}

export async function approvePromptsAction(formData: FormData) {
  const user = await requireUser();
  const productId = String(formData.get("productId") ?? "");
  const product = await ownedProduct(user.id, productId);
  if (!product) return;

  await prisma.prompt.updateMany({
    where: { productId, status: "draft" },
    data: { status: "approved" },
  });
  await prisma.activityLog.create({
    data: { userId: user.id, action: "prompts.approved", detail: product.name },
  });
  revalidateProduct(productId);
}
