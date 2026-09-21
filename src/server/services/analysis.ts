import "server-only";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { getStorage } from "@/server/storage";
import { getVisionProvider } from "@/server/ai/vision/registry";
import { overallScore } from "@/server/ai/vision/types";

function parseList(json: string | null): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** Analyse one image: content hash, duplicate check, vision QC, persisted analysis. */
export async function analyzeImage(imageId: string): Promise<boolean> {
  const image = await prisma.image.findUnique({
    where: { id: imageId },
    include: { prompt: true, product: true },
  });
  if (!image || !image.product || !image.storageKey) return false;

  const bytes = await getStorage().get(image.storageKey);
  if (!bytes) return false;

  const hash = createHash("sha1").update(bytes).digest("hex");

  // Duplicate detection: another completed image in this product with same hash.
  const dup = await prisma.image.findFirst({
    where: {
      productId: image.productId,
      hash,
      id: { not: image.id },
      status: { in: ["completed", "rejected"] },
    },
    select: { id: true, index: true },
  });

  const provider = getVisionProvider();
  const result = await provider.analyze({
    imageBytes: bytes,
    contentType: image.storageKey.endsWith(".svg") ? "image/svg+xml" : "image/png",
    prompt: image.prompt?.text ?? image.product.theme,
    theme: image.product.theme,
    style: image.product.style,
    palette: parseList(image.product.colorPalette),
  });
  const overall = overallScore(result);

  await prisma.$transaction([
    prisma.image.update({
      where: { id: image.id },
      data: { hash, qualityScore: overall },
    }),
    prisma.imageAnalysis.upsert({
      where: { imageId: image.id },
      create: {
        imageId: image.id,
        themeMatch: result.themeMatch,
        styleConsistency: result.styleConsistency,
        colorConsistency: result.colorConsistency,
        composition: result.composition,
        visualQuality: result.visualQuality,
        hasArtifacts: result.hasArtifacts,
        hasText: result.hasText,
        hasWatermark: result.hasWatermark,
        duplicateOf: dup ? dup.id : null,
        raw: JSON.stringify({ ...result, overall, duplicateIndex: dup?.index ?? null }),
      },
      update: {
        themeMatch: result.themeMatch,
        styleConsistency: result.styleConsistency,
        colorConsistency: result.colorConsistency,
        composition: result.composition,
        visualQuality: result.visualQuality,
        hasArtifacts: result.hasArtifacts,
        hasText: result.hasText,
        hasWatermark: result.hasWatermark,
        duplicateOf: dup ? dup.id : null,
        raw: JSON.stringify({ ...result, overall, duplicateIndex: dup?.index ?? null }),
      },
    }),
  ]);
  return true;
}

async function mapConcurrent<T>(items: T[], limit: number, fn: (t: T) => Promise<void>) {
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) await fn(items[i++]);
  });
  await Promise.all(workers);
}

/** Run QC over every completed image of a product, updating job progress. */
export async function runProductAnalysis(productId: string, jobId: string) {
  const images = await prisma.image.findMany({
    where: { productId, status: "completed" },
    select: { id: true },
  });

  await prisma.generationJob.update({
    where: { id: jobId },
    data: { status: "running", startedAt: new Date(), total: images.length, progress: 0 },
  });

  let done = 0;
  await mapConcurrent(images, 4, async ({ id }) => {
    await analyzeImage(id);
    done++;
    await prisma.generationJob.update({ where: { id: jobId }, data: { progress: done } });
  });

  await prisma.generationJob.update({
    where: { id: jobId },
    data: { status: "completed", finishedAt: new Date() },
  });
  return { done };
}
