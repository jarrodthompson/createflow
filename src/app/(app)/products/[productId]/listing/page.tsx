import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Wand2, Search } from "lucide-react";
import { requireUser } from "@/server/actions/auth";
import { prisma } from "@/lib/prisma";
import { loadListingResult } from "@/server/services/listing";
import { getCreativeDirector } from "@/server/ai/registry";
import { generateListingAction } from "@/server/actions/listing";
import { Card } from "@/components/ui/primitives";
import { ListingEditor } from "@/components/listing/listing-editor";

export default async function ListingPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const user = await requireUser();

  const product = await prisma.product.findFirst({
    where: { id: productId, userId: user.id },
    select: { id: true, name: true },
  });
  if (!product) notFound();

  const [listing, result] = await Promise.all([
    prisma.etsyListing.findUnique({ where: { productId }, select: { updatedAt: true } }),
    loadListingResult(productId),
  ]);
  const director = getCreativeDirector();

  return (
    <div className="mx-auto max-w-[900px] space-y-5">
      <Link
        href={`/products/${productId}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back to product
      </Link>

      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-ink">
          <Search className="h-6 w-6 text-primary" /> Etsy Listing &amp; SEO
        </h1>
        <p className="mt-1 text-sm text-muted">{product.name}</p>
      </div>

      {!result ? (
        <Card className="p-10 text-center">
          <p className="font-medium text-ink">No listing generated yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            Generate an optimised Etsy title, description, tags, keywords and attributes with AI.
            Everything is fully editable, and you can regenerate any part.
          </p>
          <form action={generateListingAction} className="mt-5">
            <input type="hidden" name="productId" value={productId} />
            <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover">
              <Wand2 className="h-4 w-4" /> Generate Etsy listing with AI
            </button>
          </form>
        </Card>
      ) : (
        <ListingEditor
          key={listing?.updatedAt.toISOString() ?? "v0"}
          productId={productId}
          data={result}
          isMock={director.isMock}
        />
      )}
    </div>
  );
}
