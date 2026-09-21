import { requireUser } from "@/server/actions/auth";
import { prisma } from "@/lib/prisma";
import { QueueView } from "@/components/queue/queue-view";

export default async function QueuePage() {
  const user = await requireUser();
  const jobs = await prisma.generationJob.findMany({
    where: { product: { userId: user.id } },
    orderBy: { createdAt: "desc" },
    take: 25,
    include: { product: { select: { id: true, name: true } } },
  });

  const initialJobs = jobs.map((j) => ({
    id: j.id,
    type: j.type,
    status: j.status,
    progress: j.progress,
    total: j.total,
    error: j.error,
    productId: j.productId,
    productName: j.product?.name ?? "—",
    createdAt: j.createdAt.toISOString(),
    startedAt: j.startedAt?.toISOString() ?? null,
    finishedAt: j.finishedAt?.toISOString() ?? null,
  }));

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Generation Queue</h1>
        <p className="mt-1 text-sm text-muted">
          Background image-generation jobs with live progress.
        </p>
      </div>
      <QueueView initialJobs={initialJobs} />
    </div>
  );
}
