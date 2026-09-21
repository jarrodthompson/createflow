import Link from "next/link";
import { Layers } from "lucide-react";
import { requireUser } from "@/server/actions/auth";
import { getActiveShop } from "@/server/repositories/shops";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/primitives";

export default async function CollectionsPage() {
  const user = await requireUser();
  const shop = await getActiveShop(user.id);

  const collections = shop
    ? await prisma.collection.findMany({
        where: { shopId: shop.id },
        orderBy: { updatedAt: "desc" },
        include: {
          categories: { orderBy: { name: "asc" } },
          products: { select: { id: true, name: true, designCount: true } },
        },
      })
    : [];

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Collections</h1>
        <p className="mt-1 text-sm text-muted">
          Cohesive, AI-planned collections{shop ? ` in ${shop.name}` : ""}.
        </p>
      </div>

      {collections.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 p-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Layers className="h-6 w-6" />
          </div>
          <p className="font-medium text-ink">No collections yet</p>
          <p className="max-w-sm text-sm text-muted">
            Create a product in the Studio and run the AI Creative Director — the planned
            collection will appear here.
          </p>
          <Link href="/studio" className="mt-1 text-sm font-medium text-primary hover:underline">
            Open the Studio →
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {collections.map((c) => (
            <Card key={c.id} className="p-5">
              <h2 className="font-semibold text-ink">{c.name}</h2>
              {c.concept && <p className="mt-1 line-clamp-2 text-sm text-muted">{c.concept}</p>}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {c.categories.map((cat) => (
                  <span
                    key={cat.id}
                    className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-2 px-2.5 py-0.5 text-xs text-ink"
                  >
                    {cat.name}
                    <span className="text-subtle">{cat.designCount}</span>
                  </span>
                ))}
              </div>
              <div className="mt-4 border-t border-line pt-3 text-sm">
                {c.products.map((p) => (
                  <Link
                    key={p.id}
                    href={`/products/${p.id}`}
                    className="flex justify-between py-1 text-muted hover:text-primary"
                  >
                    <span>{p.name}</span>
                    <span className="text-subtle">{p.designCount} designs</span>
                  </Link>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
