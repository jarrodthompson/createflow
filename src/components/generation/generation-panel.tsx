"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Wand2, RefreshCw, ImageIcon, AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Card, Badge } from "@/components/ui/primitives";
import {
  generateImagesAction,
  retryFailedAction,
} from "@/server/actions/generation";

type Counts = {
  queued: number;
  generating: number;
  completed: number;
  failed: number;
  rejected: number;
  total: number;
};
type Status = {
  productStatus: string;
  images: Counts;
  job: { id: string; status: string; progress: number; total: number } | null;
};

export function GenerationPanel({
  productId,
  isMock,
  providerName,
  imageCost,
  pendingCount,
  initial,
}: {
  productId: string;
  isMock: boolean;
  providerName: string;
  imageCost: number;
  pendingCount: number;
  initial: Status;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(initial);

  const active =
    status.images.queued > 0 ||
    status.images.generating > 0 ||
    status.job?.status === "running" ||
    status.job?.status === "queued";

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/products/${productId}/generation`, { cache: "no-store" });
      if (res.ok) setStatus(await res.json());
    } catch {
      /* ignore transient */
    }
  }, [productId]);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(refresh, 1500);
    return () => clearInterval(id);
  }, [active, refresh]);

  // When a run finishes, refresh the server components (thumbnails, status).
  const wasActive = useRef(active);
  useEffect(() => {
    if (wasActive.current && !active) router.refresh();
    wasActive.current = active;
  }, [active, router]);

  const { images } = status;
  const pct = images.total ? Math.round((images.completed / images.total) * 100) : 0;

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
          Image Generation
        </h2>
        {isMock && (
          <Badge tone="warning">Mock images (dev) — set AI_IMAGE_PROVIDER for real</Badge>
        )}
      </div>

      {images.total > 0 && (
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="font-medium text-ink">
              {images.completed} / {images.total} completed
            </span>
            <span className="text-muted">{pct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <Badge tone="success">{images.completed} completed</Badge>
            {images.generating > 0 && <Badge tone="info">{images.generating} generating</Badge>}
            {images.queued > 0 && <Badge tone="neutral">{images.queued} queued</Badge>}
            {images.failed > 0 && <Badge tone="danger">{images.failed} failed</Badge>}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {pendingCount > 0 && !active && (
          <>
            <GenButton productId={productId} scope="test5" label="Generate 5 test" />
            <GenButton productId={productId} scope="test10" label="Generate 10 test" />
            <GenButton
              productId={productId}
              scope="all"
              label={`Generate all (${pendingCount})`}
              primary
            />
          </>
        )}
        {images.failed > 0 && !active && (
          <form action={retryFailedAction}>
            <input type="hidden" name="productId" value={productId} />
            <button className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 text-sm font-medium text-ink hover:bg-surface-2">
              <RefreshCw className="h-4 w-4" /> Retry failed
            </button>
          </form>
        )}
        {active && (
          <span className="inline-flex items-center gap-2 text-sm text-muted">
            <RefreshCw className="h-4 w-4 animate-spin" /> Generating in the background…
          </span>
        )}
        {images.completed > 0 && (
          <Link
            href={`/products/${productId}/review`}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-white hover:bg-primary-hover"
          >
            Review images <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      {pendingCount > 0 && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-subtle">
          <ImageIcon className="h-3.5 w-3.5" />
          {pendingCount} approved prompt{pendingCount === 1 ? "" : "s"} ready · est. cost with{" "}
          {providerName}:{" "}
          <span className="font-medium text-ink">${(pendingCount * imageCost).toFixed(2)}</span>
        </p>
      )}
      {pendingCount === 0 && images.total === 0 && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-subtle">
          <AlertTriangle className="h-3.5 w-3.5" /> Approve prompts in the Prompt Studio first.
        </p>
      )}
    </Card>
  );
}

function GenButton({
  productId,
  scope,
  label,
  primary,
}: {
  productId: string;
  scope: string;
  label: string;
  primary?: boolean;
}) {
  return (
    <form action={generateImagesAction}>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="scope" value={scope} />
      <button
        className={
          primary
            ? "inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-white hover:bg-primary-hover"
            : "inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 text-sm font-medium text-ink hover:bg-surface-2"
        }
      >
        <Wand2 className="h-4 w-4" /> {label}
      </button>
    </form>
  );
}
