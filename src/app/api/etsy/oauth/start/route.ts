import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { etsyConfigured, createPkce, buildAuthUrl } from "@/server/etsy/oauth";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/sign-in", env.APP_URL));

  const shopId = req.nextUrl.searchParams.get("shopId");
  if (!shopId) return NextResponse.redirect(new URL("/settings", env.APP_URL));

  const shop = await prisma.etsyShop.findFirst({ where: { id: shopId, userId: user.id } });
  if (!shop) return NextResponse.redirect(new URL("/settings", env.APP_URL));

  // Dev fallback: no Etsy credentials → simulate a connection so the flow is testable.
  if (!etsyConfigured()) {
    await prisma.$transaction([
      prisma.etsyShop.update({
        where: { id: shop.id },
        data: { status: "connected", etsyShopId: shop.etsyShopId ?? `mock-shop-${Date.now()}` },
      }),
      prisma.apiConnection.create({
        data: { shopId: shop.id, provider: "etsy" },
      }),
    ]);
    return NextResponse.redirect(new URL("/settings?connected=mock", env.APP_URL));
  }

  const { verifier, challenge, state } = createPkce();
  const store = await cookies();
  store.set("etsy_oauth", JSON.stringify({ verifier, state, shopId: shop.id }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return NextResponse.redirect(buildAuthUrl(challenge, state));
}
