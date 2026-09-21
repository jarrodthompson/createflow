"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "./auth";
import { getQueue } from "@/server/queue";

/** Build (or rebuild) the downloadable product ZIP from approved images. */
export async function packageProductAction(formData: FormData) {
  const user = await requireUser();
  const productId = String(formData.get("productId") ?? "");
  const product = await prisma.product.findFirst({ where: { id: productId, userId: user.id } });
  if (!product) return;

  const approved = await prisma.image.count({
    where: { productId, status: "completed", review: { is: { decision: "approved" } } },
  });
  if (approved === 0) return;

  const job = await prisma.generationJob.create({
    data: { productId, type: "packaging", status: "queued", total: approved + 1 },
  });
  await getQueue().enqueuePackaging(productId, job.id);
  await prisma.activityLog.create({
    data: { userId: user.id, action: "product.packaging", detail: product.name },
  });

  revalidatePath(`/products/${productId}`);
  revalidatePath("/library");
  revalidatePath("/queue");
}
