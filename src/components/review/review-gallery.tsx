"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Check,
  X,
  RefreshCw,
  ScanSearch,
  CheckCheck,
  AlertTriangle,
  Copy,
  Maximize2,
} from "lucide-react";
import { Card, Badge } from "@/components/ui/primitives";
import { fileUrl } from "@/lib/file-url";
import {
  approveImageAction,
  rejectImageAction,
  regenerateImageAction,
  reanalyzeImageAction,
  editImagePromptAction,
  runQcAction,
  approveAllAction,
} from "@/server/actions/review";

export type ReviewImage = {
  id: string;
  index: number;
  category: string | null;
  storageKey: string | null;
  status: string;
  decision: string | null;
  qualityScore: number | null;
  model: string | null;
  promptText: string;
  analysis: {
    themeMatch: number | null;
    styleConsistency: number | null;
    colorConsistency: number | null;
    composition: number | null;
    visualQuality: number | null;
    hasArtifacts: boolean;
    hasText: boolean;
    hasWatermark: boolean;
    duplicateIndex: number | null;
  } | null;
};

type Filter = "all" | "needs-review" | "approved" | "rejected" | "failed";

function scoreTone(score: number | null): "success" | "warning" | "danger" | "neutral" {
  if (score == null) return "neutral";
  if (score >= 8.5) return "success";
  if (score >= 7) return "warning";
  return "danger";
}

function HiddenField({ id }: { id: string }) {
  return <input type="hidden" name="imageId" value={id} />;
}

export function ReviewGallery({
  productId,
  images,
}: {
  productId: string;
  images: ReviewImage[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const active = images.some((i) => i.status === "queued" || i.status === "generating");
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => router.refresh(), 2000);
    return () => clearInterval(t);
  }, [active, router]);

  const counts = useMemo(() => {
    const c = { all: images.length, "needs-review": 0, approved: 0, rejected: 0, failed: 0 };
    for (const i of images) {
      if (i.status === "failed") c.failed++;
      else if (i.decision === "approved") c.approved++;
      else if (i.status === "rejected" || i.decision === "rejected") c.rejected++;
      else c["needs-review"]++;
    }
    return c;
  }, [images]);

  const analyzed = images.filter((i) => i.qualityScore != null);
  const avg =
    analyzed.length > 0
      ? (analyzed.reduce((n, i) => n + (i.qualityScore ?? 0), 0) / analyzed.length).toFixed(1)
      : "—";

  const filtered = images.filter((i) => {
    switch (filter) {
      case "approved":
        return i.decision === "approved";
      case "rejected":
        return i.status === "rejected" || i.decision === "rejected";
      case "failed":
        return i.status === "failed";
      case "needs-review":
        return i.status === "completed" && !i.decision;
      default:
        return true;
    }
  });

  const open = images.find((i) => i.id === openId) ?? null;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {(["all", "needs-review", "approved", "rejected", "failed"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-sm font-medium capitalize transition-colors ${
                filter === f
                  ? "bg-primary text-white"
                  : "bg-surface-2 text-muted hover:text-ink"
              }`}
            >
              {f.replace("-", " ")} ({counts[f]})
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">
            QC: {analyzed.length}/{images.length} · avg{" "}
            <span className="font-medium text-ink">{avg}</span>
          </span>
          <form action={runQcAction}>
            <input type="hidden" name="productId" value={productId} />
            <button className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 text-sm font-medium text-ink hover:bg-surface-2">
              <ScanSearch className="h-4 w-4" /> Run QC
            </button>
          </form>
          <form action={approveAllAction}>
            <input type="hidden" name="productId" value={productId} />
            <button className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-white hover:bg-primary-hover">
              <CheckCheck className="h-4 w-4" /> Approve all
            </button>
          </form>
        </div>
      </div>

      {active && (
        <p className="inline-flex items-center gap-2 text-sm text-muted">
          <RefreshCw className="h-4 w-4 animate-spin" /> Regenerating images in the background…
        </p>
      )}

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
        {filtered.map((img) => (
          <Card key={img.id} className="overflow-hidden p-0">
            <div className="relative aspect-square bg-surface-2">
              {img.storageKey ? (
                <Image
                  src={fileUrl(img.storageKey)}
                  alt={img.category ?? `Design ${img.index}`}
                  fill
                  unoptimized
                  sizes="200px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-subtle">
                  {img.status}
                </div>
              )}
              <button
                onClick={() => setOpenId(img.id)}
                className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-md bg-surface/90 text-ink hover:bg-surface"
                title="Preview"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
              <div className="absolute left-1.5 top-1.5 flex flex-col gap-1">
                {img.decision === "approved" && <Badge tone="success">Approved</Badge>}
                {(img.status === "rejected" || img.decision === "rejected") && (
                  <Badge tone="danger">Rejected</Badge>
                )}
                {img.analysis?.duplicateIndex != null && (
                  <Badge tone="warning">
                    <Copy className="h-3 w-3" /> Dup #{img.analysis.duplicateIndex}
                  </Badge>
                )}
              </div>
            </div>
            <div className="p-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-subtle">
                  #{String(img.index).padStart(3, "0")}
                </span>
                {img.qualityScore != null && (
                  <Badge tone={scoreTone(img.qualityScore)}>{img.qualityScore.toFixed(1)}</Badge>
                )}
              </div>
              <p className="mt-0.5 truncate text-xs text-muted">{img.category ?? "—"}</p>
              <div className="mt-2 flex gap-1">
                <form action={approveImageAction} className="flex-1">
                  <HiddenField id={img.id} />
                  <button className="flex h-7 w-full items-center justify-center rounded-md bg-success-bg text-success hover:brightness-95" title="Approve">
                    <Check className="h-4 w-4" />
                  </button>
                </form>
                <form action={rejectImageAction} className="flex-1">
                  <HiddenField id={img.id} />
                  <button className="flex h-7 w-full items-center justify-center rounded-md bg-danger-bg text-danger hover:brightness-95" title="Reject">
                    <X className="h-4 w-4" />
                  </button>
                </form>
                <form action={regenerateImageAction} className="flex-1">
                  <HiddenField id={img.id} />
                  <button className="flex h-7 w-full items-center justify-center rounded-md bg-surface-2 text-muted hover:text-ink" title="Regenerate">
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-12 text-center text-sm text-muted">No images in this filter.</p>
      )}

      {open && (
        <PreviewModal image={open} onClose={() => setOpenId(null)} />
      )}
    </div>
  );
}

function Bar({ label, value }: { label: string; value: number | null }) {
  const pct = value != null ? (value / 10) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="font-medium text-ink">{value != null ? value.toFixed(1) : "—"}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function PreviewModal({ image, onClose }: { image: ReviewImage; onClose: () => void }) {
  const a = image.analysis;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90dvh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-surface p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-ink">
              #{String(image.index).padStart(3, "0")} · {image.category ?? "—"}
            </h3>
            <p className="text-sm text-muted">{image.model ?? "not generated"}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-2"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="relative aspect-square overflow-hidden rounded-xl border border-line bg-surface-2">
            {image.storageKey && (
              <Image
                src={fileUrl(image.storageKey)}
                alt={image.category ?? `Design ${image.index}`}
                fill
                unoptimized
                sizes="500px"
                className="object-contain"
              />
            )}
          </div>

          <div className="space-y-4">
            {image.qualityScore != null && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted">Quality score</span>
                <Badge tone={scoreTone(image.qualityScore)}>
                  {image.qualityScore.toFixed(1)} / 10
                </Badge>
              </div>
            )}

            {a ? (
              <div className="space-y-2">
                <Bar label="Theme match" value={a.themeMatch} />
                <Bar label="Style consistency" value={a.styleConsistency} />
                <Bar label="Colour consistency" value={a.colorConsistency} />
                <Bar label="Composition" value={a.composition} />
                <Bar label="Visual quality" value={a.visualQuality} />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {a.hasArtifacts && <Badge tone="danger">Artifacts</Badge>}
                  {a.hasText && <Badge tone="danger">Text</Badge>}
                  {a.hasWatermark && <Badge tone="danger">Watermark</Badge>}
                  {a.duplicateIndex != null && (
                    <Badge tone="warning">
                      <AlertTriangle className="h-3 w-3" /> Similar to #{a.duplicateIndex}
                    </Badge>
                  )}
                  {!a.hasArtifacts && !a.hasText && !a.hasWatermark && a.duplicateIndex == null && (
                    <Badge tone="success">No defects detected</Badge>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted">
                Not analysed yet. Run QC to score this image.
              </p>
            )}

            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-subtle">
                Prompt
              </p>
              <form action={editImagePromptAction} className="space-y-2">
                <input type="hidden" name="imageId" value={image.id} />
                <textarea
                  name="text"
                  defaultValue={image.promptText}
                  rows={4}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line-strong px-3 text-sm font-medium text-ink hover:bg-surface-2">
                  <RefreshCw className="h-4 w-4" /> Save & regenerate
                </button>
              </form>
            </div>

            <div className="flex flex-wrap gap-2 border-t border-line pt-3">
              <form action={approveImageAction}>
                <HiddenField id={image.id} />
                <button className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-white hover:bg-primary-hover">
                  <Check className="h-4 w-4" /> Approve
                </button>
              </form>
              <form action={rejectImageAction}>
                <HiddenField id={image.id} />
                <button className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong px-3 text-sm font-medium text-ink hover:bg-surface-2">
                  <X className="h-4 w-4" /> Reject
                </button>
              </form>
              <form action={reanalyzeImageAction}>
                <HiddenField id={image.id} />
                <button className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong px-3 text-sm font-medium text-ink hover:bg-surface-2">
                  <ScanSearch className="h-4 w-4" /> Re-run QC
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
