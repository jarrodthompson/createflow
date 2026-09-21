"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Package, Download, RefreshCw, FolderTree, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/primitives";
import { fileUrl } from "@/lib/file-url";
import { packageProductAction } from "@/server/actions/packaging";

type PackState = {
  job: { status: string; progress: number; total: number } | null;
  file: { storageKey: string; filename: string; bytes: number } | null;
};

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

const CONTENTS = [
  "Final Images/ — all approved designs",
  "Prompts/prompts.csv",
  "Etsy Listing/ — title, description, tags, metadata.json",
  "Preview Images/",
];

export function PackagePanel({
  productId,
  approvedCount,
  initial,
}: {
  productId: string;
  approvedCount: number;
  initial: PackState;
}) {
  const router = useRouter();
  const [state, setState] = useState<PackState>(initial);
  const active = state.job?.status === "queued" || state.job?.status === "running";

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/products/${productId}/generation`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setState(data.packaging as PackState);
      }
    } catch {
      /* ignore */
    }
  }, [productId]);

  useEffect(() => {
    if (!active) return;
    const t = setInterval(refresh, 1200);
    return () => clearInterval(t);
  }, [active, refresh]);

  const wasActive = useRef(active);
  useEffect(() => {
    if (wasActive.current && !active) router.refresh();
    wasActive.current = active;
  }, [active, router]);

  const pct = state.job?.total ? Math.round((state.job.progress / state.job.total) * 100) : 0;

  return (
    <Card className="p-5">
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
        Package &amp; Download
      </h2>

      {approvedCount === 0 ? (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-muted">
          <AlertTriangle className="h-4 w-4" /> Approve images in the Review Studio to build a
          downloadable package.
        </p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-subtle">
                <FolderTree className="h-3.5 w-3.5" /> Package contents
              </p>
              <ul className="space-y-1 text-sm text-ink">
                {CONTENTS.map((c) => (
                  <li key={c} className="flex gap-2">
                    <span className="text-primary">•</span> {c}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-subtle">{approvedCount} approved image(s)</p>
            </div>

            <div className="flex flex-col justify-center gap-3">
              {active ? (
                <div>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="font-medium text-ink">Building package…</span>
                    <span className="text-muted">{pct}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ) : state.file ? (
                <>
                  <a
                    href={fileUrl(state.file.storageKey)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover"
                  >
                    <Download className="h-4 w-4" /> Download product ({fmtBytes(state.file.bytes)})
                  </a>
                  <form action={packageProductAction}>
                    <input type="hidden" name="productId" value={productId} />
                    <button className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 text-sm font-medium text-ink hover:bg-surface-2">
                      <RefreshCw className="h-4 w-4" /> Rebuild package
                    </button>
                  </form>
                </>
              ) : (
                <form action={packageProductAction}>
                  <input type="hidden" name="productId" value={productId} />
                  <button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover">
                    <Package className="h-4 w-4" /> Build product package
                  </button>
                </form>
              )}
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
