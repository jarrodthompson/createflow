import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import { requireUser } from "@/server/actions/auth";
import { prisma } from "@/lib/prisma";
import { getVisionProvider } from "@/server/ai/vision/registry";
import { Badge } from "@/components/ui/primitives";
import { ReviewGallery, type ReviewImage } from "@/components/review/review-gallery";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const user = await requireUser();

  const product = await prisma.product.findFirst({
    where: { id: productId, userId: user.id },
    select: { id: true, name: true },
  });
  if (!product) notFound();

  const images = await prisma.image.findMany({
    where: { productId, status: { not: "queued" } },
    orderBy: { index: "asc" },
    include: { analysis: true, review: true, prompt: { select: { text: true } } },
  });

  const vision = getVisionProvider();

  const mapped: ReviewImage[] = images.map((i) => ({
    id: i.id,
    index: i.index,
    category: i.category,
    storageKey: i.storageKey,
    version: i.updatedAt.getTime(),
    status: i.status,
    decision: i.review?.decision ?? null,
    qualityScore: i.qualityScore,
    model: i.model,
    promptText: i.prompt?.text ?? "",
    analysis: i.analysis
      ? {
          themeMatch: i.analysis.themeMatch,
          styleConsistency: i.analysis.styleConsistency,
          colorConsistency: i.analysis.colorConsistency,
          composition: i.analysis.composition,
          visualQuality: i.analysis.visualQuality,
          hasArtifacts: i.analysis.hasArtifacts,
          hasText: i.analysis.hasText,
          hasWatermark: i.analysis.hasWatermark,
          duplicateIndex: (() => {
            try {
              return i.analysis.raw ? JSON.parse(i.analysis.raw).duplicateIndex ?? null : null;
            } catch {
              return null;
            }
          })(),
        }
      : null,
  }));

  return (
    <div className="mx-auto max-w-[1300px] space-y-5">
      <Link
        href={`/products/${productId}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back to product
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Review Studio</h1>
          <p className="mt-1 text-sm text-muted">
            {product.name} · {images.length} generated
          </p>
        </div>
        {vision.isMock && (
          <Badge tone="warning">
            <Sparkles className="h-3.5 w-3.5" /> Mock QC (dev) — set AI_VISION_PROVIDER for real
          </Badge>
        )}
      </div>

      {images.length === 0 ? (
        <p className="rounded-xl border border-line bg-surface p-10 text-center text-sm text-muted">
          No images generated yet. Generate images from the product page first.
        </p>
      ) : (
        <ReviewGallery productId={productId} images={mapped} />
      )}
    </div>
  );
}
