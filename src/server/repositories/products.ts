import { prisma } from "@/lib/prisma";

export async function listProducts(userId: string, shopId: string | null) {
  return prisma.product.findMany({
    where: shopId ? { userId, shopId } : { userId },
    orderBy: { updatedAt: "desc" },
    include: { shop: { select: { name: true } } },
  });
}

/** Paginated product list + total count for the given page (1-based). */
export async function listProductsPaged(
  userId: string,
  shopId: string | null,
  page: number,
  perPage: number,
) {
  const where = shopId ? { userId, shopId } : { userId };
  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: { shop: { select: { name: true } } },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.product.count({ where }),
  ]);
  return { items, total, totalPages: Math.max(1, Math.ceil(total / perPage)) };
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
