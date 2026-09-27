import Link from "next/link";
import Image from "next/image";
import { FileText } from "lucide-react";
import { requireUser } from "@/server/actions/auth";
import { getActiveShop } from "@/server/repositories/shops";
import { prisma } from "@/lib/prisma";
import { Card, Badge } from "@/components/ui/primitives";
import { Pagination, parsePage } from "@/components/ui/pagination";
import { Thumbnail } from "@/components/ui/thumbnail";
import { fileUrl } from "@/lib/file-url";
import { formatDate } from "@/lib/utils";
import { statusTone } from "@/lib/constants";

const PER_PAGE = 20;

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await requireUser();
  const [shop, sp] = await Promise.all([getActiveShop(user.id), searchParams]);
  const page = parsePage(sp.page);

  const [listings, total] = shop
    ? await Promise.all([
        prisma.etsyListing.findMany({
          where: { shopId: shop.id },
          orderBy: { updatedAt: "desc" },
          include: { product: { select: { id: true, name: true, thumbnailKey: true, updatedAt: true } } },
          skip: (page - 1) * PER_PAGE,
          take: PER_PAGE,
        }),
        prisma.etsyListing.count({ where: { shopId: shop.id } }),
      ])
    : [[], 0];
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Listings</h1>
        <p className="mt-1 text-sm text-muted">
          Etsy listing drafts{shop ? ` in ${shop.name}` : ""}. Publishing to Etsy arrives in Phase 7.
        </p>
      </div>

      {listings.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <FileText className="h-6 w-6" />
          </div>
          <p className="font-medium text-ink">No listings yet</p>
          <p className="max-w-sm text-sm text-muted">
            Open a product and generate an Etsy listing with AI — it will appear here.
          </p>
          <Link href="/library" className="text-sm font-medium text-primary hover:underline">
            Go to Product Library →
          </Link>
        </Card>
      ) : (
        <Card className="divide-y divide-line">
          {listings.map((l) => (
            <Link
              key={l.id}
              href={l.product ? `/products/${l.product.id}/listing` : "#"}
              className="flex items-center gap-4 p-4 hover:bg-surface-2"
            >
              {l.product?.thumbnailKey ? (
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-line">
                  <Image
                    src={fileUrl(l.product.thumbnailKey, l.product.updatedAt)}
                    alt={l.title}
                    fill
                    unoptimized
                    sizes="44px"
                    className="object-cover"
                  />
                </div>
              ) : (
                <Thumbnail label={l.title} className="h-11 w-11 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">{l.title}</p>
                <p className="truncate text-sm text-muted">
                  {l.product?.name ?? "—"}
                  {l.etsyListingId ? ` · Etsy ID ${l.etsyListingId}` : ""}
                </p>
              </div>
              <Badge tone={statusTone(l.status === "draft" ? "review" : l.status)}>{l.status}</Badge>
              <span className="hidden w-24 text-right text-sm text-subtle sm:block">
                {formatDate(l.updatedAt)}
              </span>
            </Link>
          ))}
        </Card>
      )}

      <Pagination page={page} totalPages={totalPages} basePath="/listings" />
    </div>
  );
}
