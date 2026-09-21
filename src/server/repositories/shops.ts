import { prisma } from "@/lib/prisma";

export async function getShopsForUser(userId: string) {
  return prisma.etsyShop.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
}

export async function getActiveShop(userId: string) {
  const active = await prisma.etsyShop.findFirst({ where: { userId, isActive: true } });
  if (active) return active;
  // Fall back to the first shop and mark it active.
  const first = await prisma.etsyShop.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  if (first && !first.isActive) {
    await prisma.etsyShop.update({ where: { id: first.id }, data: { isActive: true } });
  }
  return first;
}
