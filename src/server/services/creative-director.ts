import "server-only";
import { prisma } from "@/lib/prisma";
import { getCreativeDirector } from "@/server/ai/registry";
import type { PlanInput } from "@/server/ai/types";

function parseList(json: string | null): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

type ProductForPlan = {
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

export function toPlanInput(product: ProductForPlan): PlanInput {
  return {
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

/**
 * Runs the AI Creative Director for a product: plans a cohesive collection and
 * generates one prompt per design, persisting everything atomically. Safe to
 * re-run — it replaces the product's existing collection and prompts.
 */
export async function planProductCollection(product: ProductForPlan) {
  const director = getCreativeDirector();
  const input = toPlanInput(product);

  const plan = await director.planCollection(input);
  const prompts = await director.generatePrompts(input, plan);

  await prisma.$transaction(async (tx) => {
    // Clear any previous planning output for this product.
    await tx.prompt.deleteMany({ where: { productId: product.id } });
    const priorCollectionId = (
      await tx.product.findUnique({
        where: { id: product.id },
        select: { collectionId: true },
      })
    )?.collectionId;

    const collection = await tx.collection.create({
      data: {
        shopId: product.shopId,
        name: `${product.name} Collection`,
        concept: plan.concept,
        visualDirection: plan.visualDirection,
        colorDirection: plan.colorDirection,
        styleRules: JSON.stringify(plan.styleRules),
        compositionRules: JSON.stringify(plan.compositionRules),
        categories: {
          create: plan.categories.map((c) => ({
            name: c.name,
            designCount: c.designCount,
          })),
        },
      },
    });

    await tx.product.update({
      where: { id: product.id },
      data: { collectionId: collection.id, status: "planning" },
    });

    await tx.prompt.createMany({
      data: prompts.map((p) => ({
        productId: product.id,
        index: p.index,
        concept: p.concept,
        category: p.category,
        text: p.text,
        status: "draft",
      })),
    });

    // Remove an orphaned previous collection if it had no other products.
    if (priorCollectionId && priorCollectionId !== collection.id) {
      const others = await tx.product.count({
        where: { collectionId: priorCollectionId },
      });
      if (others === 0) {
        await tx.collection.delete({ where: { id: priorCollectionId } });
      }
    }
  });

  return { director: director.name, isMock: director.isMock, promptCount: prompts.length };
}
