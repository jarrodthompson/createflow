import Link from "next/link";
import Image from "next/image";
import { FilePen, ExternalLink } from "lucide-react";
import { requireUser } from "@/server/actions/auth";
import { getActiveShop } from "@/server/repositories/shops";
import { prisma } from "@/lib/prisma";
import { Card, Badge } from "@/components/ui/primitives";
import { Thumbnail } from "@/components/ui/thumbnail";
import { fileUrl } from "@/lib/file-url";
import { formatDate } from "@/lib/utils";

export default async function DraftsPage() {
  const user = await requireUser();
  const shop = await getActiveShop(user.id);

  const drafts = shop
    ? await prisma.etsyListing.findMany({
        where: { shopId: shop.id, etsyListingId: { not: null } },
        orderBy: { updatedAt: "desc" },
        include: { product: { select: { id: true, name: true, thumbnailKey: true, updatedAt: true } } },
      })
    : [];

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Etsy Drafts</h1>
        <p className="mt-1 text-sm text-muted">
          Draft listings created on Etsy{shop ? ` for ${shop.name}` : ""}. You publish them from
          Etsy — CreateFlow never publishes automatically.
        </p>
      </div>

      {drafts.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <FilePen className="h-6 w-6" />
          </div>
          <p className="font-medium text-ink">No Etsy drafts yet</p>
          <p className="max-w-sm text-sm text-muted">
            Package a product, generate its listing, then create an Etsy draft from the product page.
          </p>
          <Link href="/library" className="text-sm font-medium text-primary hover:underline">
            Go to Product Library →
          </Link>
        </Card>
      ) : (
        <Card className="divide-y divide-line">
          {drafts.map((d) => {
            const isMock = d.etsyListingId?.startsWith("mock-");
            return (
              <div key={d.id} className="flex items-center gap-4 p-4">
                {d.product?.thumbnailKey ? (
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-line">
                    <Image
                      src={fileUrl(d.product.thumbnailKey, d.product.updatedAt)}
                      alt={d.title}
                      fill
                      unoptimized
                      sizes="44px"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <Thumbnail label={d.title} className="h-11 w-11 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{d.title}</p>
                  <p className="truncate text-sm text-muted">
                    Etsy ID <span className="font-mono">{d.etsyListingId}</span>
                  </p>
                </div>
                <Badge tone="warning">Draft</Badge>
                <span className="hidden w-24 text-right text-sm text-subtle sm:block">
                  {formatDate(d.updatedAt)}
                </span>
                <div className="flex gap-1.5">
                  {d.product && (
                    <Link
                      href={`/products/${d.product.id}/listing`}
                      className="inline-flex h-8 items-center rounded-lg border border-line-strong px-2.5 text-xs font-medium text-ink hover:bg-surface-2"
                    >
                      Edit
                    </Link>
                  )}
                  {!isMock && (
                    <a
                      href={`https://www.etsy.com/your/shops/me/tools/listings/${d.etsyListingId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-line-strong px-2.5 text-xs font-medium text-ink hover:bg-surface-2"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Etsy
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
