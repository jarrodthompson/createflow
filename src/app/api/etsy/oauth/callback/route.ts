import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { exchangeCode } from "@/server/etsy/oauth";
import { encryptSecret } from "@/lib/crypto";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/sign-in", env.APP_URL));

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const store = await cookies();
  const raw = store.get("etsy_oauth")?.value;
  store.delete("etsy_oauth");

  if (!code || !state || !raw) {
    return NextResponse.redirect(new URL("/settings?error=oauth", env.APP_URL));
  }
  const saved = JSON.parse(raw) as { verifier: string; state: string; shopId: string };
  if (saved.state !== state) {
    return NextResponse.redirect(new URL("/settings?error=state", env.APP_URL));
  }

  const shop = await prisma.etsyShop.findFirst({
    where: { id: saved.shopId, userId: user.id },
  });
  if (!shop) return NextResponse.redirect(new URL("/settings?error=shop", env.APP_URL));

  try {
    const tokens = await exchangeCode(code, saved.verifier);
    // Etsy access tokens are prefixed with the user id: "<user_id>.<token>".
    const etsyUserId = tokens.access_token.split(".")[0];

    // Best-effort: resolve the seller's shop id.
    let etsyShopId: string | null = shop.etsyShopId ?? null;
    try {
      const res = await fetch(
        `https://openapi.etsy.com/v3/application/users/${etsyUserId}/shops`,
        { headers: { "x-api-key": env.ETSY_CLIENT_ID!, Authorization: `Bearer ${tokens.access_token}` } },
      );
      if (res.ok) {
        const data = (await res.json()) as { results?: { shop_id: number }[]; shop_id?: number };
        etsyShopId = String(data.results?.[0]?.shop_id ?? data.shop_id ?? etsyShopId ?? "");
      }
    } catch {
      /* leave etsyShopId as-is */
    }

    await prisma.$transaction([
      prisma.etsyShop.update({
        where: { id: shop.id },
        data: { status: "connected", etsyShopId: etsyShopId || undefined },
      }),
      prisma.apiConnection.create({
        data: {
          shopId: shop.id,
          provider: "etsy",
          encryptedToken: encryptSecret(tokens.access_token),
          encryptedRefresh: encryptSecret(tokens.refresh_token),
          expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        },
      }),
    ]);
    return NextResponse.redirect(new URL("/settings?connected=1", env.APP_URL));
  } catch (err) {
    console.error("Etsy OAuth callback failed:", err);
    return NextResponse.redirect(new URL("/settings?error=token", env.APP_URL));
  }
}
