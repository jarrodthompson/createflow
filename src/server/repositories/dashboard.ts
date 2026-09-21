import { prisma } from "@/lib/prisma";

export async function getDashboardData(userId: string, shopId: string | null) {
  const productWhere = shopId ? { userId, shopId } : { userId };

  const [
    totalProducts,
    draftListings,
    awaitingApproval,
    generating,
    published,
    shopCount,
    activeJobs,
    recentProducts,
    recentDrafts,
  ] = await Promise.all([
    prisma.product.count({ where: { ...productWhere, status: { not: "archived" } } }),
    prisma.product.count({ where: { ...productWhere, etsyStatus: "draft" } }),
    prisma.product.count({ where: { ...productWhere, status: "review" } }),
    prisma.product.count({ where: { ...productWhere, status: "generating" } }),
    prisma.product.count({ where: { ...productWhere, etsyStatus: "published" } }),
    prisma.etsyShop.count({ where: { userId } }),
    prisma.generationJob.count({ where: { status: { in: ["queued", "running"] } } }),
    prisma.product.findMany({
      where: productWhere,
      orderBy: { updatedAt: "desc" },
      take: 4,
      include: { shop: { select: { name: true } } },
    }),
    prisma.product.findMany({
      where: { ...productWhere, etsyStatus: { in: ["draft", "published"] } },
      orderBy: { updatedAt: "desc" },
      take: 4,
      include: { shop: { select: { name: true } } },
    }),
  ]);

  // Revenue: no orders source yet (arrives with Analytics/Etsy in later phases).
  const productRevenueCents = 0;

  return {
    kpis: {
      totalProducts,
      draftListings,
      awaitingApproval,
      generating,
      published,
      shopCount,
      productRevenueCents,
      activeJobs,
    },
    recentProducts,
    recentDrafts,
  };
}
