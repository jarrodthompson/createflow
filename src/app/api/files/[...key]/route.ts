import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStorage, contentTypeFor } from "@/server/storage";

/**
 * Serves stored files behind auth + ownership. Keys are
 * shops/{shopId}/products/{productId}/... — we verify the shop belongs to the
 * requesting user before returning bytes.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { key: parts } = await params;
  const key = parts.join("/");

  const shopId = parts[0] === "shops" ? parts[1] : null;
  if (!shopId) return new NextResponse("Not found", { status: 404 });

  const shop = await prisma.etsyShop.findFirst({
    where: { id: shopId, userId: user.id },
    select: { id: true },
  });
  if (!shop) return new NextResponse("Forbidden", { status: 403 });

  const bytes = await getStorage().get(key);
  if (!bytes) return new NextResponse("Not found", { status: 404 });

  const headers: Record<string, string> = {
    "Content-Type": contentTypeFor(key),
    "Cache-Control": "private, max-age=3600",
    // Never let the browser sniff a different type, and neutralise any script
    // embedded in an SVG by sandboxing the response (SVGs can carry <script>).
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
  };
  // ZIP exports are downloads, not inline views.
  if (key.endsWith(".zip")) {
    const filename = key.split("/").pop() ?? "product.zip";
    headers["Content-Disposition"] = `attachment; filename="${filename}"`;
  }

  return new NextResponse(new Uint8Array(bytes), { headers });
}
