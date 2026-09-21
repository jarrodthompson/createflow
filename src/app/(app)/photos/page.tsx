import Link from "next/link";
import Image from "next/image";
import { Images } from "lucide-react";
import { requireUser } from "@/server/actions/auth";
import { getActiveShop } from "@/server/repositories/shops";
import { prisma } from "@/lib/prisma";
import { Card, Badge } from "@/components/ui/primitives";
import { fileUrl } from "@/lib/file-url";

export default async function PhotoLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const user = await requireUser();
  const [shop, sp] = await Promise.all([getActiveShop(user.id), searchParams]);
  if (!shop) return null;

  const productFilter = sp.product;

  const [products, images] = await Promise.all([
    prisma.product.findMany({
      where: { userId: user.id, shopId: shop.id },
      select: { id: true, name: true, _count: { select: { images: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.image.findMany({
      where: {
        status: "completed",
        storageKey: { not: null },
        product: { userId: user.id, shopId: shop.id, ...(productFilter ? { id: productFilter } : {}) },
      },
      orderBy: { updatedAt: "desc" },
      take: 120,
      include: { product: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="mx-auto max-w-[1300px] space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-ink">
          <Images className="h-6 w-6 text-primary" /> Photo Library
        </h1>
        <p className="mt-1 text-sm text-muted">
          All generated images{shop ? ` in ${shop.name}` : ""} · {images.length} shown
        </p>
      </div>

      {/* Product filters */}
      <div className="flex flex-wrap gap-1.5">
        <Link
          href="/photos"
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            !productFilter ? "bg-primary text-white" : "bg-surface-2 text-muted hover:text-ink"
          }`}
        >
          All
        </Link>
        {products.map((p) => (
          <Link
            key={p.id}
            href={`/photos?product=${p.id}`}
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              productFilter === p.id ? "bg-primary text-white" : "bg-surface-2 text-muted hover:text-ink"
            }`}
          >
            {p.name} ({p._count.images})
          </Link>
        ))}
      </div>

      {images.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Images className="h-6 w-6" />
          </div>
          <p className="font-medium text-ink">No images yet</p>
          <p className="max-w-sm text-sm text-muted">
            Generate images from a product and they will appear here, organised by product.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {images.map((img) => (
            <div key={img.id} className="group relative aspect-square overflow-hidden rounded-lg border border-line bg-surface-2">
              <Image
                src={fileUrl(img.storageKey!, img.updatedAt)}
                alt={img.category ?? img.product.name}
                fill
                unoptimized
                sizes="160px"
                className="object-cover"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="text-[10px] text-white">
                  #{String(img.index).padStart(3, "0")} {img.category ?? ""}
                </span>
              </div>
              {img.qualityScore != null && (
                <div className="absolute right-1 top-1">
                  <Badge tone={img.qualityScore >= 8.5 ? "success" : img.qualityScore >= 7 ? "warning" : "danger"}>
                    {img.qualityScore.toFixed(1)}
                  </Badge>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
