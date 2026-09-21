import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Recent generation jobs for the current user (for the Generation Queue view). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const jobs = await prisma.generationJob.findMany({
    where: { product: { userId: user.id } },
    orderBy: { createdAt: "desc" },
    take: 25,
    include: { product: { select: { id: true, name: true } } },
  });

  return NextResponse.json({
    jobs: jobs.map((j) => ({
      id: j.id,
      type: j.type,
      status: j.status,
      progress: j.progress,
      total: j.total,
      error: j.error,
      productId: j.productId,
      productName: j.product?.name ?? "—",
      createdAt: j.createdAt,
      startedAt: j.startedAt,
      finishedAt: j.finishedAt,
    })),
  });
}
