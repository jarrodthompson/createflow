import "server-only";
import { prisma } from "@/lib/prisma";
import { getImageProvider } from "@/server/ai/image/registry";
import { getStorage } from "@/server/storage";

function parseList(json: string | null): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function imageKey(shopId: string, productId: string, index: number, ext: string) {
  return `shops/${shopId}/products/${productId}/images/${String(index).padStart(3, "0")}.${ext}`;
}

/** Generate + store a single image. Returns true on success. */
async function processImage(imageId: string, attempts = 2): Promise<boolean> {
  const image = await prisma.image.findUnique({
    where: { id: imageId },
    include: { prompt: true, product: true },
  });
  if (!image || !image.product) return false;

  await prisma.image.update({ where: { id: imageId }, data: { status: "generating" } });
  const provider = getImageProvider();
  const storage = getStorage();
  const palette = parseList(image.product.colorPalette);

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const result = await provider.generate({
        prompt: image.prompt?.text ?? image.product.theme,
        palette,
        index: image.index,
        category: image.category ?? image.prompt?.category,
        theme: image.product.theme,
        size: image.product.canvasSize ?? undefined,
      });
      const key = imageKey(image.product.shopId, image.productId, image.index, result.ext);
      await storage.put(key, result.bytes, result.contentType);
      await prisma.image.update({
        where: { id: imageId },
        data: { status: "completed", storageKey: key, model: result.model },
      });
      // Use the first completed image as the product thumbnail.
      await prisma.product.updateMany({
        where: { id: image.productId, thumbnailKey: null },
        data: { thumbnailKey: key },
      });
      return true;
    } catch (err) {
      if (attempt === attempts) {
        await prisma.image.update({
          where: { id: imageId },
          data: { status: "failed", model: (err as Error).message.slice(0, 200) },
        });
        return false;
      }
    }
  }
  return false;
}

/** Simple bounded-concurrency map. */
async function mapConcurrent<T>(items: T[], limit: number, fn: (t: T) => Promise<void>) {
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      await fn(items[idx]);
    }
  });
  await Promise.all(workers);
}

/**
 * Process every queued image for a product under one job, updating progress in
 * the DB as it goes. Shared by the inline dev queue and the BullMQ worker, so
 * it is browser-independent and resumable (re-run picks up queued images).
 */
export async function runProductGeneration(productId: string, jobId: string) {
  const queued = await prisma.image.findMany({
    where: { productId, status: { in: ["queued", "failed"] } },
    select: { id: true },
  });

  await prisma.generationJob.update({
    where: { id: jobId },
    data: { status: "running", startedAt: new Date(), total: queued.length, progress: 0 },
  });
  await prisma.product.update({ where: { id: productId }, data: { status: "generating" } });

  let done = 0;
  await mapConcurrent(queued, 4, async ({ id }) => {
    await processImage(id);
    done++;
    await prisma.generationJob.update({ where: { id: jobId }, data: { progress: done } });
  });

  const remaining = await prisma.image.count({
    where: { productId, status: { in: ["queued", "generating"] } },
  });
  const failed = await prisma.image.count({ where: { productId, status: "failed" } });

  await prisma.generationJob.update({
    where: { id: jobId },
    data: {
      status: failed > 0 ? "failed" : "completed",
      finishedAt: new Date(),
      error: failed > 0 ? `${failed} image(s) failed` : null,
    },
  });

  if (remaining === 0) {
    await prisma.product.update({ where: { id: productId }, data: { status: "review" } });
  }
  return { done, failed };
}
