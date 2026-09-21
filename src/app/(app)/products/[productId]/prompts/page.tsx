import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus, RefreshCw, CheckCheck, Sparkles } from "lucide-react";
import { requireUser } from "@/server/actions/auth";
import { prisma } from "@/lib/prisma";
import { getCreativeDirector } from "@/server/ai/registry";
import { Card, Badge } from "@/components/ui/primitives";
import { PromptRow } from "@/components/prompts/prompt-row";
import {
  addPromptAction,
  regenerateAllPromptsAction,
  approvePromptsAction,
} from "@/server/actions/planning";

function parseList(json: string | null): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export default async function PromptStudioPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const user = await requireUser();

  const product = await prisma.product.findFirst({
    where: { id: productId, userId: user.id },
    include: {
      collection: { include: { categories: { orderBy: { name: "asc" } } } },
      prompts: { orderBy: { index: "asc" } },
    },
  });
  if (!product) notFound();

  const director = getCreativeDirector();
  const { collection, prompts } = product;
  const approved = prompts.filter((p) => p.status === "approved").length;
  const drafts = prompts.length - approved;

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <Link
        href={`/products/${productId}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back to product
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Prompt Studio</h1>
          <p className="mt-1 text-sm text-muted">
            {product.name} · {prompts.length} prompts
          </p>
        </div>
        {director.isMock && (
          <Badge tone="warning">
            <Sparkles className="h-3.5 w-3.5" /> Mock AI (dev) — set AI_TEXT_PROVIDER for real
          </Badge>
        )}
      </div>

      {!collection ? (
        <Card className="p-10 text-center">
          <p className="font-medium text-ink">This product hasn&apos;t been planned yet.</p>
          <p className="mt-1 text-sm text-muted">
            Run the AI Creative Director from the product page to plan a collection and generate
            prompts.
          </p>
          <Link
            href={`/products/${productId}`}
            className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
          >
            Go to product →
          </Link>
        </Card>
      ) : (
        <>
          {/* Collection concept */}
          <Card className="p-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              Collection Concept
            </h2>
            <p className="mt-3 text-sm text-ink">{collection.concept}</p>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <Detail label="Visual direction" value={collection.visualDirection} />
              <Detail label="Colour direction" value={collection.colorDirection} />
              <ListDetail label="Style rules" items={parseList(collection.styleRules)} />
              <ListDetail label="Composition rules" items={parseList(collection.compositionRules)} />
            </div>
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-subtle">
                Categories
              </p>
              <div className="flex flex-wrap gap-2">
                {collection.categories.map((c) => (
                  <span
                    key={c.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3 py-1 text-sm text-ink"
                  >
                    {c.name}
                    <span className="rounded-full bg-primary-soft px-1.5 text-xs font-medium text-primary">
                      {c.designCount}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </Card>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2 text-sm text-muted">
              <Badge tone="neutral">{drafts} draft</Badge>
              <Badge tone="success">{approved} approved</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <form action={addPromptAction}>
                <input type="hidden" name="productId" value={productId} />
                <button className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 text-sm font-medium text-ink hover:bg-surface-2">
                  <Plus className="h-4 w-4" /> Add Prompt
                </button>
              </form>
              <form action={regenerateAllPromptsAction}>
                <input type="hidden" name="productId" value={productId} />
                <button className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 text-sm font-medium text-ink hover:bg-surface-2">
                  <RefreshCw className="h-4 w-4" /> Regenerate All
                </button>
              </form>
              <form action={approvePromptsAction}>
                <input type="hidden" name="productId" value={productId} />
                <button className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-white hover:bg-primary-hover">
                  <CheckCheck className="h-4 w-4" /> Approve Prompts
                </button>
              </form>
            </div>
          </div>

          {/* Prompt table */}
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-wider text-subtle">
                  <th className="px-3 py-2.5 font-semibold">#</th>
                  <th className="px-3 py-2.5 font-semibold">Concept</th>
                  <th className="px-3 py-2.5 font-semibold">Category</th>
                  <th className="px-3 py-2.5 font-semibold">Prompt</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                  <th className="px-3 py-2.5 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {prompts.map((p) => (
                  <PromptRow
                    key={p.id}
                    prompt={{
                      id: p.id,
                      index: p.index,
                      concept: p.concept,
                      category: p.category,
                      text: p.text,
                      status: p.status,
                    }}
                  />
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-subtle">{label}</p>
      <p className="mt-1 text-sm text-ink">{value ?? "—"}</p>
    </div>
  );
}

function ListDetail({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-subtle">{label}</p>
      <ul className="mt-1 space-y-0.5 text-sm text-ink">
        {items.map((it) => (
          <li key={it} className="flex gap-2">
            <span className="text-primary">•</span> {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
