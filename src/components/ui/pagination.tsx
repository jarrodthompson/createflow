import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Server-rendered pagination. Builds ?page=N links, preserving other query
 * params. Renders nothing when there's a single page.
 */
export function Pagination({
  page,
  totalPages,
  basePath,
  query = {},
}: {
  page: number;
  totalPages: number;
  basePath: string;
  query?: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;

  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) if (v) sp.set(k, v);
    sp.set("page", String(p));
    return `${basePath}?${sp.toString()}`;
  };

  const linkCls =
    "inline-flex h-9 items-center gap-1 rounded-lg border border-line-strong bg-surface px-3 text-sm font-medium text-ink hover:bg-surface-2";
  const disabledCls =
    "inline-flex h-9 items-center gap-1 rounded-lg border border-line px-3 text-sm font-medium text-subtle opacity-50";

  return (
    <nav className="flex items-center justify-between gap-3 pt-2" aria-label="Pagination">
      {page > 1 ? (
        <Link href={href(page - 1)} className={linkCls}>
          <ChevronLeft className="h-4 w-4" /> Previous
        </Link>
      ) : (
        <span className={disabledCls}>
          <ChevronLeft className="h-4 w-4" /> Previous
        </span>
      )}

      <span className="text-sm text-muted">
        Page <span className="font-medium text-ink">{page}</span> of {totalPages}
      </span>

      {page < totalPages ? (
        <Link href={href(page + 1)} className={linkCls}>
          Next <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span className={disabledCls}>
          Next <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
}

/** Parse a 1-based page number from a searchParams value. */
export function parsePage(value: string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}
