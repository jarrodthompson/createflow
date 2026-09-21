"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "./auth";
import { getCreativeDirector } from "@/server/ai/registry";
import { toListingInput } from "@/server/services/listing";

const key = (productId: string) => `marketing:${productId}`;

export async function generateMarketingAction(formData: FormData) {
  const user = await requireUser();
  const productId = String(formData.get("productId") ?? "");
  const product = await prisma.product.findFirst({
    where: { id: productId, userId: user.id },
    include: { styleDna: true },
  });
  if (!product) return;

  const approved = await prisma.image.count({
    where: { productId, status: "completed", review: { is: { decision: "approved" } } },
  });
  const director = getCreativeDirector();
  const content = await director.generateMarketing(toListingInput(product, approved));

  await prisma.setting.upsert({
    where: { userId_key: { userId: user.id, key: key(productId) } },
    create: { userId: user.id, key: key(productId), value: JSON.stringify(content) },
    update: { value: JSON.stringify(content) },
  });
  await prisma.activityLog.create({
    data: { userId: user.id, action: "marketing.generated", detail: product.name },
  });
  revalidatePath("/marketing");
}
