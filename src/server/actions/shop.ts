"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, destroySession } from "@/lib/auth";
import { getStorage } from "@/server/storage";

export async function setActiveShop(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const shopId = String(formData.get("shopId") ?? "");
  const shop = await prisma.etsyShop.findFirst({ where: { id: shopId, userId: user.id } });
  if (!shop) return;

  await prisma.$transaction([
    prisma.etsyShop.updateMany({ where: { userId: user.id }, data: { isActive: false } }),
    prisma.etsyShop.update({ where: { id: shop.id }, data: { isActive: true } }),
  ]);

  revalidatePath("/", "layout");
}

export async function createShopAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const name = String(formData.get("name") ?? "").trim().slice(0, 80) || "New Shop";
  await prisma.etsyShop.create({
    data: { userId: user.id, name, status: "disconnected", isActive: false },
  });
  revalidatePath("/settings");
  revalidatePath("/", "layout");
}

/** Permanently delete a shop and everything under it (products, listings, assets). */
export async function deleteShopAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const shopId = String(formData.get("shopId") ?? "");
  const shop = await prisma.etsyShop.findFirst({ where: { id: shopId, userId: user.id } });
  if (!shop) return;

  const total = await prisma.etsyShop.count({ where: { userId: user.id } });
  if (total <= 1) return; // keep at least one shop

  await getStorage().deletePrefix(`shops/${shop.id}/`).catch(() => {});
  await prisma.etsyShop.delete({ where: { id: shop.id } }); // cascades products, listings, connections

  // If we removed the active shop, promote another.
  if (shop.isActive) {
    const next = await prisma.etsyShop.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });
    if (next) await prisma.etsyShop.update({ where: { id: next.id }, data: { isActive: true } });
  }

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  revalidatePath("/dashboard");
}

export async function signOutAction() {
  await destroySession();
  redirect("/sign-in");
}
