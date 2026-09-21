import "server-only";
import { prisma } from "@/lib/prisma";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { etsyConfigured, refreshTokens } from "./oauth";
import { RealEtsyClient, MockEtsyClient, type EtsyClient } from "./client";

export { etsyConfigured } from "./oauth";

/** Resolve an Etsy client for a shop: real if connected with tokens, else dev mock. */
export async function getEtsyClientForShop(shopId: string): Promise<EtsyClient> {
  const conn = await prisma.apiConnection.findFirst({
    where: { shopId, provider: "etsy" },
    orderBy: { updatedAt: "desc" },
  });

  if (!etsyConfigured() || !conn?.encryptedToken) {
    return new MockEtsyClient();
  }

  let accessToken = decryptSecret(conn.encryptedToken);
  const refresh = conn.encryptedRefresh ? decryptSecret(conn.encryptedRefresh) : null;

  // Refresh if expiring within 60s.
  if (conn.expiresAt && conn.expiresAt.getTime() < Date.now() + 60_000 && refresh) {
    try {
      const tokens = await refreshTokens(refresh);
      accessToken = tokens.access_token;
      await prisma.apiConnection.update({
        where: { id: conn.id },
        data: {
          encryptedToken: encryptSecret(tokens.access_token),
          encryptedRefresh: encryptSecret(tokens.refresh_token),
          expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        },
      });
    } catch {
      // fall through with existing token
    }
  }

  if (!accessToken) return new MockEtsyClient();
  return new RealEtsyClient(accessToken);
}
