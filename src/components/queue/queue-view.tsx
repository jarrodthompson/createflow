"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ListChecks, RefreshCw } from "lucide-react";
import { Card, Badge } from "@/components/ui/primitives";
import { statusTone } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

type Job = {
  id: string;
  type: string;
  status: string;
  progress: number;
  total: number;
  error: string | null;
  productId: string | null;
  productName: string;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

export function QueueView({ initialJobs }: { initialJobs: Job[] }) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);

  const anyActive = jobs.some((j) => j.status === "queued" || j.status === "running");

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/queue", { cache: "no-store" });
      if (res.ok) setJobs((await res.json()).jobs);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!anyActive) return;
    const id = setInterval(refresh, 1500);
    return () => clearInterval(id);
  }, [anyActive, refresh]);

  const active = jobs.filter((j) => j.status === "queued" || j.status === "running");
  const done = jobs.filter((j) => j.status === "completed");
  const failed = jobs.filter((j) => j.status === "failed");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Active" value={active.length} />
        <Stat label="Completed" value={done.length} />
        <Stat label="Failed" value={failed.length} />
      </div>

      {jobs.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <ListChecks className="h-6 w-6" />
          </div>
          <p className="font-medium text-ink">No jobs yet</p>
          <p className="max-w-sm text-sm text-muted">
            Generate images from a product and the background jobs will show here with live
            progress.
          </p>
        </Card>
      ) : (
        <Card className="divide-y divide-line">
          {jobs.map((job) => {
            const pct = job.total ? Math.round((job.progress / job.total) * 100) : 0;
            return (
              <div key={job.id} className="flex items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {job.productId ? (
                      <Link
                        href={`/products/${job.productId}`}
                        className="truncate font-medium text-ink hover:text-primary"
                      >
                        {job.productName}
                      </Link>
                    ) : (
                      <span className="truncate font-medium text-ink">{job.productName}</span>
                    )}
                    <span className="text-xs text-subtle">· {job.type}</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {job.progress} / {job.total} · {formatDate(job.createdAt)}
                    {job.error ? ` · ${job.error}` : ""}
                  </p>
                </div>
                <Badge tone={statusTone(job.status === "running" ? "generating" : job.status)}>
                  {job.status === "running" && <RefreshCw className="h-3 w-3 animate-spin" />}
                  {job.status}
                </Badge>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[var(--radius-cf)] border border-line bg-surface-2 p-4">
      <p className="text-2xl font-semibold text-ink">{value}</p>
      <p className="mt-1 text-xs font-medium text-muted">{label}</p>
    </div>
  );
}
