import { prisma } from "@/lib/prisma";

export async function listProducts(userId: string, shopId: string | null) {
  return prisma.product.findMany({
    where: shopId ? { userId, shopId } : { userId },
    orderBy: { updatedAt: "desc" },
    include: { shop: { select: { name: true } } },
  });
}

export async function getProduct(userId: string, id: string) {
  return prisma.product.findFirst({
    where: { id, userId },
    include: {
      shop: { select: { name: true } },
      styleDna: true,
      collection: { include: { categories: { orderBy: { name: "asc" } } } },
      _count: { select: { prompts: true, images: true } },
    },
  });
}
