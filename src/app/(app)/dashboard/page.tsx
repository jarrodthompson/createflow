import Link from "next/link";
import {
  Package,
  FilePen,
  Clock,
  Loader2,
  CheckCircle2,
  Store,
  DollarSign,
  Activity,
  Plus,
  Wand2,
  FileText,
  LibraryBig,
  ArrowRight,
  Sparkles,
  Search,
  BarChart3,
  Images,
} from "lucide-react";
import { requireUser } from "@/server/actions/auth";
import { getActiveShop } from "@/server/repositories/shops";
import { getDashboardData } from "@/server/repositories/dashboard";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { QuickAction } from "@/components/dashboard/quick-action";
import { Card, Section, Badge, LinkButton } from "@/components/ui/primitives";
import { Thumbnail } from "@/components/ui/thumbnail";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  PRODUCT_STATUS_LABELS,
  ETSY_STATUS_LABELS,
  statusTone,
  type ProductStatus,
  type EtsyStatus,
} from "@/lib/constants";

const EXPLORE = [
  { label: "AI Product Studio", href: "/studio", icon: Wand2 },
  { label: "Prompt Studio", href: "/studio", icon: Sparkles },
  { label: "Etsy SEO", href: "/listings", icon: Search },
  { label: "Unit Economics", href: "/unit-economics", icon: DollarSign },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Photo Library", href: "/photos", icon: Images },
];

export default async function DashboardPage() {
  const user = await requireUser();
  const shop = await getActiveShop(user.id);
  const { kpis, recentProducts, recentDrafts } = await getDashboardData(
    user.id,
    shop?.id ?? null,
  );

  const kpiCards = [
    { label: "Total Products", value: kpis.totalProducts, icon: Package },
    { label: "Draft Listings", value: kpis.draftListings, icon: FilePen },
    { label: "Awaiting Approval", value: kpis.awaitingApproval, icon: Clock },
    { label: "Generating", value: kpis.generating, icon: Loader2 },
    { label: "Published", value: kpis.published, icon: CheckCircle2 },
    { label: "Etsy Shops", value: kpis.shopCount, icon: Store },
    { label: "Product Revenue", value: formatCurrency(kpis.productRevenueCents), icon: DollarSign },
    { label: "Active Jobs", value: kpis.activeJobs, icon: Activity },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">CreateFlow</h1>
        <p className="mt-1 text-sm text-muted">
          AI Etsy digital product creation &amp; listing management
          {shop && (
            <>
              {" · "}
              <span className="text-subtle">{shop.name}</span>
            </>
          )}
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
        {kpiCards.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      {/* Quick actions */}
      <Section title="Quick Actions">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction
            href="/studio"
            title="Create Product"
            description="Create a new AI-powered digital product."
            icon={Plus}
          />
          <QuickAction
            href="/studio"
            title="Open Studio"
            description="Generate images, prompts and product assets."
            icon={Wand2}
          />
          <QuickAction
            href="/listings"
            title="Create Listing"
            description="Create an Etsy listing using AI."
            icon={FileText}
          />
          <QuickAction
            href="/library"
            title="Product Library"
            description="View and manage your digital products."
            icon={LibraryBig}
          />
        </div>
      </Section>

      {/* Two-column: recent + explore */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Recent products */}
          <Section
            title="Recent Products"
            action={
              <Link href="/products" className="text-sm font-medium text-primary hover:underline">
                View all →
              </Link>
            }
          >
            <Card className="divide-y divide-line">
              {recentProducts.length === 0 && (
                <EmptyRow message="No products yet. Create your first one in the Studio." />
              )}
              {recentProducts.map((p) => (
                <div key={p.id} className="flex items-center gap-4 p-4">
                  <Thumbnail label={p.name} className="h-11 w-11 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/products/${p.id}`}
                      className="block truncate font-medium text-ink hover:text-primary"
                    >
                      {p.name}
                    </Link>
                    <p className="truncate text-sm text-muted">
                      {p.productType} · {p.designCount} designs
                    </p>
                  </div>
                  <Badge tone={statusTone(p.status)}>
                    {PRODUCT_STATUS_LABELS[p.status as ProductStatus] ?? p.status}
                  </Badge>
                  <span className="hidden w-24 text-right text-sm text-subtle sm:block">
                    {formatDate(p.updatedAt)}
                  </span>
                </div>
              ))}
            </Card>
          </Section>

          {/* Recent Etsy drafts */}
          <Section
            title="Recent Etsy Drafts"
            action={
              <Link href="/drafts" className="text-sm font-medium text-primary hover:underline">
                View all →
              </Link>
            }
          >
            <Card className="divide-y divide-line">
              {recentDrafts.length === 0 && (
                <EmptyRow message="No Etsy drafts yet. They appear here once you generate listings." />
              )}
              {recentDrafts.map((p) => (
                <div key={p.id} className="flex items-center gap-4 p-4">
                  <Thumbnail label={p.name} className="h-10 w-10 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{p.name}</p>
                    <p className="truncate text-sm text-muted">
                      {p.shop.name} · {p.designCount} images
                    </p>
                  </div>
                  <Badge tone={statusTone(p.etsyStatus)}>
                    {ETSY_STATUS_LABELS[p.etsyStatus as EtsyStatus] ?? p.etsyStatus}
                  </Badge>
                  <span className="hidden w-24 text-right text-sm text-subtle sm:block">
                    {formatDate(p.updatedAt)}
                  </span>
                </div>
              ))}
            </Card>
          </Section>
        </div>

        {/* Explore */}
        <div className="lg:col-span-1">
          <Card className="p-5">
            <h2 className="font-semibold text-ink">Explore</h2>
            <div className="mt-3 space-y-1">
              {EXPLORE.map((e) => {
                const Icon = e.icon;
                return (
                  <Link
                    key={e.label}
                    href={e.href}
                    className="group flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-surface-2"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 text-primary group-hover:bg-surface-3">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="flex-1 text-sm font-medium text-ink">{e.label}</span>
                    <ArrowRight className="h-4 w-4 text-subtle group-hover:text-primary" />
                  </Link>
                );
              })}
            </div>
            <div className="mt-4 border-t border-line pt-4">
              <LinkButton href="/studio" className="w-full">
                <Plus className="h-4 w-4" /> New Product
              </LinkButton>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function EmptyRow({ message }: { message: string }) {
  return <p className="p-6 text-center text-sm text-muted">{message}</p>;
}
