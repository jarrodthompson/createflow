import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Live generation status for polling (progress bars, queue view). */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { productId } = await params;
  const product = await prisma.product.findFirst({
    where: { id: productId, userId: user.id },
    select: { id: true, status: true },
  });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [counts, latestJob, packagingJob, zipFile] = await Promise.all([
    prisma.image.groupBy({
      by: ["status"],
      where: { productId },
      _count: { _all: true },
    }),
    prisma.generationJob.findFirst({
      where: { productId, type: "generation" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.generationJob.findFirst({
      where: { productId, type: "packaging" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.productFile.findFirst({
      where: { productId, kind: "zip" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const byStatus: Record<string, number> = {};
  for (const c of counts) byStatus[c.status] = c._count._all;

  return NextResponse.json({
    productStatus: product.status,
    images: {
      queued: byStatus.queued ?? 0,
      generating: byStatus.generating ?? 0,
      completed: byStatus.completed ?? 0,
      failed: byStatus.failed ?? 0,
      rejected: byStatus.rejected ?? 0,
      total: counts.reduce((n, c) => n + c._count._all, 0),
    },
    job: latestJob
      ? {
          id: latestJob.id,
          status: latestJob.status,
          progress: latestJob.progress,
          total: latestJob.total,
        }
      : null,
    packaging: {
      job: packagingJob
        ? {
            status: packagingJob.status,
            progress: packagingJob.progress,
            total: packagingJob.total,
          }
        : null,
      file: zipFile
        ? { storageKey: zipFile.storageKey, filename: zipFile.filename, bytes: zipFile.bytes }
        : null,
    },
  });
}
