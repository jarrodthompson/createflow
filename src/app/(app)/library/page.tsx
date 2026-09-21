import Link from "next/link";
import Image from "next/image";
import { LibraryBig, Download, Copy, Archive, ArchiveRestore, FileText, ExternalLink } from "lucide-react";
import { requireUser } from "@/server/actions/auth";
import { getActiveShop } from "@/server/repositories/shops";
import { prisma } from "@/lib/prisma";
import { Card, Badge } from "@/components/ui/primitives";
import { Thumbnail } from "@/components/ui/thumbnail";
import { fileUrl } from "@/lib/file-url";
import { formatDate } from "@/lib/utils";
import {
  PRODUCT_STATUS_LABELS,
  statusTone,
  type ProductStatus,
} from "@/lib/constants";
import { archiveProductAction, duplicateProductAction } from "@/server/actions/product";

export default async function LibraryPage() {
  const user = await requireUser();
  const shop = await getActiveShop(user.id);

  const products = shop
    ? await prisma.product.findMany({
        where: { userId: user.id, shopId: shop.id },
        orderBy: { updatedAt: "desc" },
        include: {
          files: { where: { kind: "zip" }, orderBy: { createdAt: "desc" }, take: 1 },
          _count: { select: { images: true } },
        },
      })
    : [];

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Product Library</h1>
        <p className="mt-1 text-sm text-muted">
          Browse, download and manage your digital products{shop ? ` in ${shop.name}` : ""}.
        </p>
      </div>

      {products.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <LibraryBig className="h-6 w-6" />
          </div>
          <p className="font-medium text-ink">Your library is empty</p>
          <Link href="/studio" className="text-sm font-medium text-primary hover:underline">
            Create your first product →
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const zip = p.files[0];
            const archived = p.status === "archived";
            return (
              <Card key={p.id} className="flex flex-col overflow-hidden">
                <div className="relative aspect-[4/3] bg-surface-2">
                  {p.thumbnailKey ? (
                    <Image
                      src={fileUrl(p.thumbnailKey)}
                      alt={p.name}
                      fill
                      unoptimized
                      sizes="360px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Thumbnail label={p.name} className="h-14 w-14" />
                    </div>
                  )}
                  <div className="absolute left-2 top-2">
                    <Badge tone={statusTone(p.status)}>
                      {PRODUCT_STATUS_LABELS[p.status as ProductStatus] ?? p.status}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-4">
                  <Link href={`/products/${p.id}`} className="font-medium text-ink hover:text-primary">
                    {p.name}
                  </Link>
                  <p className="mt-0.5 text-sm text-muted">
                    {p.productType} · {p._count.images} image{p._count.images === 1 ? "" : "s"}
                  </p>
                  <p className="mt-0.5 text-xs text-subtle">Updated {formatDate(p.updatedAt)}</p>

                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-3">
                    <Link
                      href={`/products/${p.id}`}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line-strong px-2.5 text-xs font-medium text-ink hover:bg-surface-2"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Open
                    </Link>
                    <Link
                      href={`/products/${p.id}/listing`}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line-strong px-2.5 text-xs font-medium text-ink hover:bg-surface-2"
                    >
                      <FileText className="h-3.5 w-3.5" /> Listing
                    </Link>
                    {zip && (
                      <a
                        href={fileUrl(zip.storageKey)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-xs font-medium text-white hover:bg-primary-hover"
                      >
                        <Download className="h-3.5 w-3.5" /> Download
                      </a>
                    )}
                    <form action={duplicateProductAction}>
                      <input type="hidden" name="productId" value={p.id} />
                      <button className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line-strong px-2.5 text-xs font-medium text-ink hover:bg-surface-2">
                        <Copy className="h-3.5 w-3.5" /> Duplicate
                      </button>
                    </form>
                    <form action={archiveProductAction}>
                      <input type="hidden" name="productId" value={p.id} />
                      <input type="hidden" name="next" value={archived ? "ready" : "archived"} />
                      <button className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line-strong px-2.5 text-xs font-medium text-ink hover:bg-surface-2">
                        {archived ? (
                          <>
                            <ArchiveRestore className="h-3.5 w-3.5" /> Restore
                          </>
                        ) : (
                          <>
                            <Archive className="h-3.5 w-3.5" /> Archive
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
