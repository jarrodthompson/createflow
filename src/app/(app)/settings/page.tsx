import { Store, Check, Plus, KeyRound, Sparkles } from "lucide-react";
import { requireUser } from "@/server/actions/auth";
import { getShopsForUser } from "@/server/repositories/shops";
import { etsyConfigured } from "@/server/etsy";
import { getCreativeDirector } from "@/server/ai/registry";
import { getImageProvider } from "@/server/ai/image/registry";
import { getVisionProvider } from "@/server/ai/vision/registry";
import { Card, Badge } from "@/components/ui/primitives";
import { createShopAction } from "@/server/actions/shop";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const user = await requireUser();
  const [shops, sp] = await Promise.all([getShopsForUser(user.id), searchParams]);
  const configured = etsyConfigured();
  const providers = [
    { label: "Text / SEO", value: getCreativeDirector().name },
    { label: "Image", value: getImageProvider().name },
    { label: "Vision QC", value: getVisionProvider().name },
  ];

  return (
    <div className="mx-auto max-w-[900px] space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Settings</h1>
        <p className="mt-1 text-sm text-muted">Account, Etsy shops and AI providers.</p>
      </div>

      {sp.connected && (
        <p className="rounded-lg bg-success-bg px-3 py-2 text-sm text-success">
          {sp.connected === "mock"
            ? "Shop connected in dev mode (mock). Set Etsy API credentials for a real connection."
            : "Etsy shop connected successfully."}
        </p>
      )}
      {sp.error && (
        <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">
          Etsy connection failed ({sp.error}). Please try again.
        </p>
      )}

      {/* Shops */}
      <Card className="p-5">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Etsy Shops</h2>
        {!configured && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-subtle">
            <Sparkles className="h-3.5 w-3.5" /> Etsy API not configured — connecting uses a dev
            mock. Add ETSY_CLIENT_ID / ETSY_CLIENT_SECRET / ETSY_REDIRECT_URI for real OAuth.
          </p>
        )}
        <div className="mt-4 divide-y divide-line">
          {shops.map((shop) => (
            <div key={shop.id} className="flex items-center gap-3 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <Store className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">{shop.name}</p>
                <p className="text-xs text-muted">
                  {shop.status === "connected"
                    ? `Connected${shop.etsyShopId ? ` · ${shop.etsyShopId}` : ""}`
                    : "Not connected"}
                </p>
              </div>
              {shop.status === "connected" ? (
                <Badge tone="success">
                  <Check className="h-3 w-3" /> Connected
                </Badge>
              ) : (
                <a
                  href={`/api/etsy/oauth/start?shopId=${shop.id}`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-white hover:bg-primary-hover"
                >
                  <KeyRound className="h-4 w-4" /> Connect to Etsy
                </a>
              )}
            </div>
          ))}
        </div>

        <form action={createShopAction} className="mt-4 flex gap-2 border-t border-line pt-4">
          <input
            name="name"
            placeholder="New shop name"
            className="h-9 flex-1 rounded-lg border border-line bg-surface px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 text-sm font-medium text-ink hover:bg-surface-2">
            <Plus className="h-4 w-4" /> Add shop
          </button>
        </form>
      </Card>

      {/* AI providers */}
      <Card className="p-5">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">AI Providers</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {providers.map((p) => (
            <div key={p.label} className="rounded-lg border border-line bg-surface-2 p-3">
              <p className="text-xs text-muted">{p.label}</p>
              <p className="mt-1 flex items-center gap-1.5 font-medium capitalize text-ink">
                {p.value}
                {p.value === "mock" && <Badge tone="warning">dev</Badge>}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-subtle">
          Set AI_TEXT_PROVIDER / AI_IMAGE_PROVIDER / AI_VISION_PROVIDER to{" "}
          <span className="font-medium text-ink">cloudflare</span> (free-tier Workers AI, add
          CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN), <span className="font-medium text-ink">openai</span>{" "}
          or <span className="font-medium text-ink">gemini</span>. Keys stay server-side.
        </p>
      </Card>

      {/* Account */}
      <Card className="p-5">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Account</h2>
        <p className="mt-3 text-sm text-ink">{user.name ?? "Seller"}</p>
        <p className="text-sm text-muted">{user.email}</p>
      </Card>
    </div>
  );
}
