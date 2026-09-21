import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Check, Wand2, Sparkles, ArrowRight, Store, ExternalLink, ShieldCheck } from "lucide-react";
import { createEtsyDraftAction } from "@/server/actions/etsy";
import { requireUser } from "@/server/actions/auth";
import { getProduct } from "@/server/repositories/products";
import { prisma } from "@/lib/prisma";
import { Card, Badge, LinkButton } from "@/components/ui/primitives";
import { planCollectionAction } from "@/server/actions/planning";
import { GenerationPanel } from "@/components/generation/generation-panel";
import { PackagePanel } from "@/components/packaging/package-panel";
import { getImageProvider } from "@/server/ai/image/registry";
import { IMAGE_COST } from "@/server/ai/image/registry";
import { fileUrl } from "@/server/storage";
import { Thumbnail } from "@/components/ui/thumbnail";
import { formatDate, cn } from "@/lib/utils";
import {
  PRODUCT_STATUS_LABELS,
  ETSY_STATUS_LABELS,
  statusTone,
  type ProductStatus,
  type EtsyStatus,
} from "@/lib/constants";

// Lifecycle stages mapped onto product.status ordering.
const PIPELINE = [
  { key: "draft", label: "Product Planning" },
  { key: "planning", label: "AI Planning" },
  { key: "generating", label: "Image Generation" },
  { key: "review", label: "Review & Approve" },
  { key: "ready", label: "Packaged" },
  { key: "listed", label: "Etsy Draft" },
] as const;

function parseList(json: string | null): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const user = await requireUser();
  const product = await getProduct(user.id, productId);
  if (!product) notFound();

  const colors = parseList(product.colorPalette);
  const currentIndex = PIPELINE.findIndex((s) => s.key === product.status);

  // Generation status + preview grid (Phase 3) + packaging (Phase 5)
  const [pendingCount, imageCounts, latestJob, previewImages, approvedCount, packagingJob, zipFile] =
    await Promise.all([
    prisma.prompt.count({
      where: {
        productId,
        status: "approved",
        images: { none: { status: { in: ["queued", "generating", "completed"] } } },
      },
    }),
    prisma.image.groupBy({ by: ["status"], where: { productId }, _count: { _all: true } }),
    prisma.generationJob.findFirst({ where: { productId }, orderBy: { createdAt: "desc" } }),
    prisma.image.findMany({
      where: { productId, status: "completed" },
      orderBy: { index: "asc" },
      take: 18,
      select: { id: true, index: true, storageKey: true, category: true },
    }),
    prisma.image.count({
      where: { productId, status: "completed", review: { is: { decision: "approved" } } },
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
  const [etsyListing, shopConn] = await Promise.all([
    prisma.etsyListing.findUnique({
      where: { productId },
      select: { id: true, title: true, etsyListingId: true, status: true, metadata: { select: { tags: true } } },
    }),
    prisma.etsyShop.findUnique({
      where: { id: product.shopId },
      select: { status: true, etsyShopId: true },
    }),
  ]);
  const shopConnected = shopConn?.status === "connected";
  const byStatus: Record<string, number> = {};
  for (const c of imageCounts) byStatus[c.status] = c._count._all;
  const imagesStatus = {
    queued: byStatus.queued ?? 0,
    generating: byStatus.generating ?? 0,
    completed: byStatus.completed ?? 0,
    failed: byStatus.failed ?? 0,
    rejected: byStatus.rejected ?? 0,
    total: imageCounts.reduce((n, c) => n + c._count._all, 0),
  };
  const imageProvider = getImageProvider();
  const hasApproved = product._count.prompts > 0 && (pendingCount > 0 || imagesStatus.total > 0);

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <Link
        href="/products"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back to products
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4">
        <Thumbnail label={product.name} className="h-16 w-16 shrink-0" />
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{product.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {product.productType} · {product.theme} · {product.shop.name}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge tone={statusTone(product.status)}>
            {PRODUCT_STATUS_LABELS[product.status as ProductStatus] ?? product.status}
          </Badge>
          <Badge tone={statusTone(product.etsyStatus)}>
            Etsy: {ETSY_STATUS_LABELS[product.etsyStatus as EtsyStatus] ?? product.etsyStatus}
          </Badge>
        </div>
      </div>

      {/* Pipeline */}
      <Card className="p-5">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
          Workflow
        </h2>
        <ol className="mt-4 flex flex-wrap gap-2">
          {PIPELINE.map((stage, i) => {
            const done = i < currentIndex;
            const active = i === currentIndex;
            return (
              <li
                key={stage.key}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                  active
                    ? "border-primary bg-primary-soft text-ink"
                    : done
                      ? "border-line bg-surface-2 text-muted"
                      : "border-line bg-surface text-subtle",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold",
                    active
                      ? "bg-primary text-white"
                      : done
                        ? "bg-success text-white"
                        : "bg-surface-3 text-muted",
                  )}
                >
                  {done ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                {stage.label}
              </li>
            );
          })}
        </ol>
      </Card>

      {/* Next step: AI Creative Director */}
      <Card className="p-5">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
          AI Creative Director
        </h2>
        {product.collection ? (
          <div className="mt-3">
            <p className="text-sm text-ink">{product.collection.concept}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {product.collection.categories.map((c) => (
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
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <LinkButton href={`/products/${product.id}/prompts`}>
                Open Prompt Studio <ArrowRight className="h-4 w-4" />
              </LinkButton>
              <span className="text-sm text-muted">
                {product._count.prompts} prompt{product._count.prompts === 1 ? "" : "s"} generated
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-3">
            <p className="text-sm text-muted">
              Let the AI Creative Director analyse your theme and plan a cohesive collection —
              categories, style rules and one prompt per design.
            </p>
            <form action={planCollectionAction} className="mt-4">
              <input type="hidden" name="productId" value={product.id} />
              <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover">
                <Wand2 className="h-4 w-4" /> Plan collection with AI
              </button>
            </form>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-subtle">
              <Sparkles className="h-3.5 w-3.5" /> Plans {product.designCount} designs into
              categories and writes a prompt for each.
            </p>
          </div>
        )}
      </Card>

      {/* Image generation (Phase 3) */}
      {hasApproved && (
        <GenerationPanel
          productId={product.id}
          isMock={imageProvider.isMock}
          providerName={imageProvider.name}
          imageCost={IMAGE_COST[imageProvider.name] ?? 0}
          pendingCount={pendingCount}
          initial={{ productStatus: product.status, images: imagesStatus, job: latestJob }}
        />
      )}

      {/* Generated preview grid */}
      {previewImages.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              Generated Images
            </h2>
            <span className="text-sm text-muted">{imagesStatus.completed} completed</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {previewImages.map((img) =>
              img.storageKey ? (
                <div
                  key={img.id}
                  className="relative aspect-square overflow-hidden rounded-lg border border-line bg-surface-2"
                >
                  <Image
                    src={fileUrl(img.storageKey)}
                    alt={img.category ?? `Design ${img.index}`}
                    fill
                    unoptimized
                    sizes="120px"
                    className="object-cover"
                  />
                </div>
              ) : null,
            )}
          </div>
        </Card>
      )}

      {/* Etsy Listing & SEO (Phase 6) */}
      <Card className="p-5" id="listing">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              Etsy Listing &amp; SEO
            </h2>
            {etsyListing ? (
              <>
                <p className="mt-2 font-medium text-ink">{etsyListing.title}</p>
                <p className="mt-0.5 text-sm text-muted">
                  {parseList(etsyListing.metadata?.tags ?? null).length} tags · listing draft ready
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted">
                Generate an optimised title, description, tags and keywords with AI.
              </p>
            )}
          </div>
          <LinkButton href={`/products/${product.id}/listing`} variant={etsyListing ? "outline" : "primary"}>
            {etsyListing ? "Edit listing" : "Create listing"}
            <ArrowRight className="h-4 w-4" />
          </LinkButton>
        </div>
      </Card>

      {/* Packaging & download (Phase 5) */}
      {imagesStatus.total > 0 && (
        <PackagePanel
          productId={product.id}
          approvedCount={approvedCount}
          initial={{
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
          }}
        />
      )}

      {/* Etsy Draft (Phase 7) */}
      {imagesStatus.total > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              Etsy Draft
            </h2>
            <span className="inline-flex items-center gap-1 text-xs text-subtle">
              <ShieldCheck className="h-3.5 w-3.5" /> Never auto-published
            </span>
          </div>

          {etsyListing?.etsyListingId ? (
            <div className="mt-3">
              <p className="flex items-center gap-2 text-sm text-ink">
                <Check className="h-4 w-4 text-success" /> Draft created — listing ID{" "}
                <span className="font-mono">{etsyListing.etsyListingId}</span>
                {etsyListing.etsyListingId.startsWith("mock-") && <Badge tone="warning">dev mock</Badge>}
              </p>
              <p className="mt-1 text-sm text-muted">
                The listing is a <strong>draft</strong> in your Etsy shop. Review and publish it
                yourself from Etsy — CreateFlow never publishes for you.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {!etsyListing.etsyListingId.startsWith("mock-") && (
                  <a
                    href={`https://www.etsy.com/your/shops/me/tools/listings/${etsyListing.etsyListingId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 text-sm font-medium text-ink hover:bg-surface-2"
                  >
                    <ExternalLink className="h-4 w-4" /> Open on Etsy
                  </a>
                )}
                <form action={createEtsyDraftAction}>
                  <input type="hidden" name="productId" value={product.id} />
                  <input type="hidden" name="price" value="5" />
                  <button className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 text-sm font-medium text-ink hover:bg-surface-2">
                    Recreate draft
                  </button>
                </form>
              </div>
            </div>
          ) : !shopConnected ? (
            <div className="mt-3">
              <p className="text-sm text-muted">Connect this shop to Etsy to create a draft listing.</p>
              <LinkButton href="/settings" variant="outline" className="mt-3">
                <Store className="h-4 w-4" /> Connect shop in Settings
              </LinkButton>
            </div>
          ) : !etsyListing ? (
            <p className="mt-3 text-sm text-muted">
              Generate an Etsy listing first, then create the draft here.
            </p>
          ) : approvedCount === 0 ? (
            <p className="mt-3 text-sm text-muted">Approve some images before creating a draft.</p>
          ) : (
            <form action={createEtsyDraftAction} className="mt-3 flex flex-wrap items-end gap-3">
              <input type="hidden" name="productId" value={product.id} />
              <div>
                <label className="mb-1 block text-xs font-medium text-ink">Price (USD)</label>
                <input
                  name="price"
                  type="number"
                  step="0.01"
                  min="0.20"
                  defaultValue="5.00"
                  className="h-10 w-28 rounded-lg border border-line bg-surface px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover">
                <Store className="h-4 w-4" /> Create Etsy Draft
              </button>
              <p className="w-full text-xs text-subtle">
                Creates a draft, uploads {approvedCount} listing image(s) and the digital ZIP. You
                publish from Etsy when ready.
              </p>
            </form>
          )}
        </Card>
      )}

      {/* Details grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Details</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Product type" value={product.productType} />
            <Row label="Theme" value={product.theme} />
            <Row label="Style" value={product.style ?? "—"} />
            <Row label="Designs" value={`${product.designCount}`} />
            <Row label="Canvas" value={product.canvasSize?.replace("x", " × ") ?? "—"} />
            <Row label="Resolution" value={`${product.dpi} DPI`} />
            <Row label="Created" value={formatDate(product.createdAt)} />
          </dl>
        </Card>

        <Card className="p-5">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Colour Palette
          </h2>
          {colors.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {colors.map((c) => (
                <span
                  key={c}
                  className="rounded-full border border-line bg-surface-2 px-3 py-1 text-sm text-ink"
                >
                  {c}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted">No palette specified.</p>
          )}

          {product.styleDna && (
            <>
              <h2 className="mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                Style DNA
              </h2>
              <p className="mt-2 text-sm font-medium text-ink">{product.styleDna.name}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {parseList(product.styleDna.descriptors).map((d) => (
                  <Badge key={d} tone="neutral">
                    {d}
                  </Badge>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  );
}
