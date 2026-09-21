import { BarChart3, Package, Layers, FileText, FilePen, CheckCircle2, ImageIcon, DollarSign, Percent } from "lucide-react";
import { requireUser } from "@/server/actions/auth";
import { getActiveShop } from "@/server/repositories/shops";
import { prisma } from "@/lib/prisma";
import { getAssumptions, computeEconomics } from "@/server/repositories/economics";
import { Card } from "@/components/ui/primitives";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { formatCurrency } from "@/lib/utils";
import { PRODUCT_STATUS_LABELS, type ProductStatus } from "@/lib/constants";

export default async function AnalyticsPage() {
  const user = await requireUser();
  const shop = await getActiveShop(user.id);
  const assumptions = await getAssumptions(user.id);
  const where = shop ? { userId: user.id, shopId: shop.id } : { userId: user.id };

  const [products, collections, listings, drafts, published, completedImages, byStatus] =
    await Promise.all([
      prisma.product.count({ where: { ...where, status: { not: "archived" } } }),
      shop ? prisma.collection.count({ where: { shopId: shop.id } }) : 0,
      prisma.etsyListing.count({ where: shop ? { shopId: shop.id } : {} }),
      prisma.product.count({ where: { ...where, etsyStatus: "draft" } }),
      prisma.product.count({ where: { ...where, etsyStatus: "published" } }),
      prisma.image.count({ where: { product: where, status: "completed" } }),
      prisma.product.groupBy({ by: ["status"], where, _count: { _all: true } }),
    ]);

  const aiCost = completedImages * assumptions.aiCostPerImage;

  // Per-product economics for average margin + best performers by images.
  const productRows = shop
    ? await prisma.product.findMany({
        where: { ...where, status: { not: "archived" } },
        select: { id: true, name: true, _count: { select: { images: true } } },
        orderBy: { images: { _count: "desc" } },
        take: 5,
      })
    : [];
  const econ = productRows.map((p) =>
    computeEconomics({ id: p.id, name: p.name, images: p._count.images }, assumptions),
  );
  const avgMargin = econ.length ? econ.reduce((n, r) => n + r.margin, 0) / econ.length : 0;

  const statusCounts: Record<string, number> = {};
  for (const s of byStatus) statusCounts[s.status] = s._count._all;
  const maxStatus = Math.max(1, ...Object.values(statusCounts));

  const kpis = [
    { label: "Total Products", value: products, icon: Package },
    { label: "Collections", value: collections, icon: Layers },
    { label: "Listings", value: listings, icon: FileText },
    { label: "Etsy Drafts", value: drafts, icon: FilePen },
    { label: "Published", value: published, icon: CheckCircle2 },
    { label: "Images Generated", value: completedImages, icon: ImageIcon },
    { label: "AI Cost to date", value: `$${aiCost.toFixed(2)}`, icon: DollarSign },
    { label: "Avg Margin", value: `${avgMargin.toFixed(0)}%`, icon: Percent },
  ];

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-ink">
          <BarChart3 className="h-6 w-6 text-primary" /> Analytics
        </h1>
        <p className="mt-1 text-sm text-muted">
          Creation and cost performance{shop ? ` for ${shop.name}` : ""}.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Products by Stage
          </h2>
          <div className="mt-4 space-y-3">
            {Object.keys(statusCounts).length === 0 && (
              <p className="text-sm text-muted">No products yet.</p>
            )}
            {Object.entries(statusCounts).map(([status, count]) => (
              <div key={status}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-ink">
                    {PRODUCT_STATUS_LABELS[status as ProductStatus] ?? status}
                  </span>
                  <span className="text-muted">{count}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(count / maxStatus) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Top Products by Assets
          </h2>
          <div className="mt-4 space-y-2">
            {econ.length === 0 && <p className="text-sm text-muted">No products yet.</p>}
            {econ.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <span className="truncate text-ink">{r.name}</span>
                <span className="text-muted">
                  {r.images} images · {r.margin.toFixed(0)}% margin
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <p className="text-xs text-subtle">
        Revenue and sales analytics ({formatCurrency(0)} recorded) connect to live Etsy order data
        in a future update. Figures above are creation metrics and cost estimates.
      </p>
    </div>
  );
}
