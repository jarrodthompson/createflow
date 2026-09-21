import Link from "next/link";
import { Plus, Package } from "lucide-react";
import { requireUser } from "@/server/actions/auth";
import { getActiveShop } from "@/server/repositories/shops";
import { listProducts } from "@/server/repositories/products";
import { Card, Badge, LinkButton } from "@/components/ui/primitives";
import { Thumbnail } from "@/components/ui/thumbnail";
import { formatDate } from "@/lib/utils";
import {
  PRODUCT_STATUS_LABELS,
  ETSY_STATUS_LABELS,
  statusTone,
  type ProductStatus,
  type EtsyStatus,
} from "@/lib/constants";

export default async function ProductsPage() {
  const user = await requireUser();
  const shop = await getActiveShop(user.id);
  const products = await listProducts(user.id, shop?.id ?? null);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Products</h1>
          <p className="mt-1 text-sm text-muted">
            {products.length} product{products.length === 1 ? "" : "s"}
            {shop ? ` in ${shop.name}` : ""}
          </p>
        </div>
        <LinkButton href="/studio">
          <Plus className="h-4 w-4" /> Create Product
        </LinkButton>
      </div>

      {products.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 p-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Package className="h-6 w-6" />
          </div>
          <p className="font-medium text-ink">No products yet</p>
          <p className="max-w-sm text-sm text-muted">
            Head to the Studio to define your first digital product and build a cohesive
            collection with AI.
          </p>
          <LinkButton href="/studio" className="mt-1">
            <Plus className="h-4 w-4" /> Create your first product
          </LinkButton>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden grid-cols-[1fr_140px_120px_130px_110px] gap-4 border-b border-line px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-subtle lg:grid">
            <span>Product</span>
            <span>Designs</span>
            <span>Status</span>
            <span>Etsy</span>
            <span className="text-right">Updated</span>
          </div>
          <div className="divide-y divide-line">
            {products.map((p) => (
              <Link
                key={p.id}
                href={`/products/${p.id}`}
                className="grid grid-cols-1 items-center gap-4 px-4 py-3 hover:bg-surface-2 lg:grid-cols-[1fr_140px_120px_130px_110px]"
              >
                <div className="flex items-center gap-3">
                  <Thumbnail label={p.name} className="h-10 w-10 shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{p.name}</p>
                    <p className="truncate text-sm text-muted">
                      {p.productType} · {p.theme}
                    </p>
                  </div>
                </div>
                <span className="text-sm text-muted">{p.designCount} designs</span>
                <Badge tone={statusTone(p.status)}>
                  {PRODUCT_STATUS_LABELS[p.status as ProductStatus] ?? p.status}
                </Badge>
                <Badge tone={statusTone(p.etsyStatus)}>
                  {ETSY_STATUS_LABELS[p.etsyStatus as EtsyStatus] ?? p.etsyStatus}
                </Badge>
                <span className="text-right text-sm text-subtle">{formatDate(p.updatedAt)}</span>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
