import Link from "next/link";
import { Megaphone, Wand2, Sparkles } from "lucide-react";
import { requireUser } from "@/server/actions/auth";
import { getActiveShop } from "@/server/repositories/shops";
import { prisma } from "@/lib/prisma";
import { getCreativeDirector } from "@/server/ai/registry";
import { generateMarketingAction } from "@/server/actions/marketing";
import { Card, Badge } from "@/components/ui/primitives";
import { MarketingContent, type Marketing } from "@/components/marketing/marketing-content";

export default async function MarketingPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const user = await requireUser();
  const [shop, sp] = await Promise.all([getActiveShop(user.id), searchParams]);

  const products = shop
    ? await prisma.product.findMany({
        where: { userId: user.id, shopId: shop.id, status: { not: "archived" } },
        orderBy: { updatedAt: "desc" },
        select: { id: true, name: true },
      })
    : [];

  const selected = sp.product ?? products[0]?.id;
  const director = getCreativeDirector();

  let marketing: Marketing | null = null;
  if (selected) {
    const row = await prisma.setting.findUnique({
      where: { userId_key: { userId: user.id, key: `marketing:${selected}` } },
    });
    if (row) {
      try {
        marketing = JSON.parse(row.value);
      } catch {
        marketing = null;
      }
    }
  }

  return (
    <div className="mx-auto max-w-[1000px] space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-ink">
          <Megaphone className="h-6 w-6 text-primary" /> Marketing
        </h1>
        <p className="mt-1 text-sm text-muted">
          Generate Pinterest, Instagram, Facebook and email copy for a product.
        </p>
      </div>

      {products.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted">
          No products yet.{" "}
          <Link href="/studio" className="font-medium text-primary hover:underline">
            Create one
          </Link>
          .
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {products.map((p) => (
              <Link
                key={p.id}
                href={`/marketing?product=${p.id}`}
                className={`rounded-full px-3 py-1 text-sm font-medium ${
                  selected === p.id ? "bg-primary text-white" : "bg-surface-2 text-muted hover:text-ink"
                }`}
              >
                {p.name}
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <form action={generateMarketingAction}>
              <input type="hidden" name="productId" value={selected} />
              <button className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-white hover:bg-primary-hover">
                <Wand2 className="h-4 w-4" /> {marketing ? "Regenerate" : "Generate"} marketing
              </button>
            </form>
            {director.isMock && (
              <Badge tone="warning">
                <Sparkles className="h-3.5 w-3.5" /> Mock copy (dev)
              </Badge>
            )}
          </div>

          {marketing ? (
            <MarketingContent m={marketing} />
          ) : (
            <Card className="p-10 text-center text-sm text-muted">
              No marketing content yet — click Generate to create copy for this product.
            </Card>
          )}
        </>
      )}
    </div>
  );
}
