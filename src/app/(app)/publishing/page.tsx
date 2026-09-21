import Link from "next/link";
import Image from "next/image";
import { UploadCloud, CheckCircle2, Clock, ArrowRight, ShieldCheck } from "lucide-react";
import { requireUser } from "@/server/actions/auth";
import { getActiveShop } from "@/server/repositories/shops";
import { prisma } from "@/lib/prisma";
import { Card, Badge } from "@/components/ui/primitives";
import { Thumbnail } from "@/components/ui/thumbnail";
import { fileUrl } from "@/lib/file-url";

export default async function PublishingPage() {
  const user = await requireUser();
  const shop = await getActiveShop(user.id);
  const connected = shop?.status === "connected";

  const products = shop
    ? await prisma.product.findMany({
        where: { userId: user.id, shopId: shop.id, status: { not: "archived" } },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          thumbnailKey: true,
          files: { where: { kind: "zip" }, select: { id: true }, take: 1 },
          listing: { select: { etsyListingId: true } },
        },
      })
    : [];

  const drafted = products.filter((p) => p.listing?.etsyListingId);
  const ready = products.filter(
    (p) => !p.listing?.etsyListingId && p.files.length > 0 && p.listing && connected,
  );
  const inProgress = products.filter(
    (p) => !p.listing?.etsyListingId && !(p.files.length > 0 && p.listing && connected),
  );

  return (
    <div className="mx-auto max-w-[1000px] space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-ink">
          <UploadCloud className="h-6 w-6 text-primary" /> Publishing
        </h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
          Push approved products to Etsy as drafts.
          <span className="inline-flex items-center gap-1 text-subtle">
            <ShieldCheck className="h-3.5 w-3.5" /> You publish from Etsy — never automatic.
          </span>
        </p>
      </div>

      {!connected && (
        <p className="rounded-lg bg-warning-bg px-3 py-2 text-sm text-warning">
          {shop ? `${shop.name} isn't connected to Etsy yet.` : "No shop selected."}{" "}
          <Link href="/settings" className="font-medium underline">
            Connect in Settings
          </Link>
          .
        </p>
      )}

      <Section title="Ready to draft" icon={<Clock className="h-4 w-4" />} empty="No products are fully packaged with a listing yet.">
        {ready.map((p) => (
          <Row key={p.id} p={p} cta="Create Etsy Draft" tone="warning" label="Ready" />
        ))}
      </Section>

      <Section title="On Etsy (draft)" icon={<CheckCircle2 className="h-4 w-4" />} empty="No Etsy drafts created yet.">
        {drafted.map((p) => (
          <Row key={p.id} p={p} cta="View" tone="success" label="Draft" />
        ))}
      </Section>

      <Section title="In progress" icon={<ArrowRight className="h-4 w-4" />} empty="Nothing in progress.">
        {inProgress.map((p) => (
          <Row key={p.id} p={p} cta="Continue" tone="neutral" label="In progress" />
        ))}
      </Section>
    </div>
  );
}

function Section({
  title,
  icon,
  empty,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  empty: string;
  children: React.ReactNode;
}) {
  const items = Array.isArray(children) ? children : [children];
  const hasItems = items.some(Boolean);
  return (
    <div className="space-y-2">
      <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
        {icon} {title}
      </h2>
      {hasItems ? (
        <Card className="divide-y divide-line">{children}</Card>
      ) : (
        <p className="rounded-lg border border-line bg-surface px-4 py-4 text-sm text-muted">{empty}</p>
      )}
    </div>
  );
}

function Row({
  p,
  cta,
  tone,
  label,
}: {
  p: { id: string; name: string; thumbnailKey: string | null };
  cta: string;
  tone: "neutral" | "warning" | "success";
  label: string;
}) {
  return (
    <Link href={`/products/${p.id}`} className="flex items-center gap-4 p-4 hover:bg-surface-2">
      {p.thumbnailKey ? (
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-line">
          <Image src={fileUrl(p.thumbnailKey)} alt={p.name} fill unoptimized sizes="40px" className="object-cover" />
        </div>
      ) : (
        <Thumbnail label={p.name} className="h-10 w-10 shrink-0" />
      )}
      <span className="min-w-0 flex-1 truncate font-medium text-ink">{p.name}</span>
      <Badge tone={tone}>{label}</Badge>
      <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
        {cta} <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
  );
}
