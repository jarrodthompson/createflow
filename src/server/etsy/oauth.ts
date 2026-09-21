import "server-only";
import { createHash, randomBytes } from "crypto";
import { env } from "@/lib/env";

export const ETSY_SCOPES = ["listings_r", "listings_w", "shops_r", "shops_w"];
const AUTH_URL = "https://www.etsy.com/oauth/connect";
const TOKEN_URL = "https://api.etsy.com/v3/public/oauth/token";

/** Whether real Etsy OAuth is configured. If not, the app uses a dev mock connect. */
export function etsyConfigured(): boolean {
  return !!(env.ETSY_CLIENT_ID && env.ETSY_CLIENT_SECRET && env.ETSY_REDIRECT_URI);
}

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function createPkce() {
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash("sha256").update(verifier).digest());
  const state = base64url(randomBytes(16));
  return { verifier, challenge, state };
}

export function buildAuthUrl(challenge: string, state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: env.ETSY_CLIENT_ID!,
    redirect_uri: env.ETSY_REDIRECT_URI!,
    scope: ETSY_SCOPES.join(" "),
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export type EtsyTokens = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

export async function exchangeCode(code: string, verifier: string): Promise<EtsyTokens> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: env.ETSY_CLIENT_ID!,
      redirect_uri: env.ETSY_REDIRECT_URI!,
      code,
      code_verifier: verifier,
    }),
  });
  if (!res.ok) throw new Error(`Etsy token exchange failed ${res.status}: ${await res.text()}`);
  return (await res.json()) as EtsyTokens;
}

export async function refreshTokens(refreshToken: string): Promise<EtsyTokens> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: env.ETSY_CLIENT_ID!,
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error(`Etsy token refresh failed ${res.status}: ${await res.text()}`);
  return (await res.json()) as EtsyTokens;
}
