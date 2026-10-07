import "server-only";
import { env } from "@/lib/env";

const API = "https://openapi.etsy.com/v3/application";

/**
 * Etsy's `x-api-key` value. This environment's API requires the combined
 * `keystring:shared_secret` form (ETSY_CLIENT_ID:ETSY_CLIENT_SECRET); if no
 * secret is set it falls back to the keystring alone.
 */
export function etsyApiKey(): string {
  const key = env.ETSY_CLIENT_ID ?? "";
  return env.ETSY_CLIENT_SECRET ? `${key}:${env.ETSY_CLIENT_SECRET}` : key;
}

export type DraftListingInput = {
  title: string;
  description: string;
  price: number; // in major units (e.g. 5.00)
  quantity: number;
  tags: string[];
  taxonomyId: number;
  whoMade?: string;
  whenMade?: string;
};

export interface EtsyClient {
  readonly isMock: boolean;
  createDraftListing(shopId: string, input: DraftListingInput): Promise<{ listingId: string }>;
  uploadListingImage(shopId: string, listingId: string, bytes: Buffer, filename: string): Promise<void>;
  uploadListingFile(shopId: string, listingId: string, bytes: Buffer, filename: string): Promise<void>;
}

/** Real Etsy Open API v3 client. Creates DRAFT listings only — never publishes. */
export class RealEtsyClient implements EtsyClient {
  readonly isMock = false;
  constructor(private accessToken: string) {}

  private headers(extra: Record<string, string> = {}) {
    return {
      "x-api-key": etsyApiKey(),
      Authorization: `Bearer ${this.accessToken}`,
      ...extra,
    };
  }

  async createDraftListing(shopId: string, input: DraftListingInput) {
    const body = new URLSearchParams();
    body.set("quantity", String(input.quantity));
    body.set("title", input.title);
    body.set("description", input.description);
    body.set("price", input.price.toFixed(2));
    body.set("who_made", input.whoMade ?? "i_did");
    body.set("when_made", input.whenMade ?? "2020_2025");
    body.set("taxonomy_id", String(input.taxonomyId));
    body.set("type", "download"); // digital product
    // state defaults to "draft" on the create-draft endpoint — we never set it active.
    for (const tag of input.tags.slice(0, 13)) body.append("tags", tag);

    const res = await fetch(`${API}/shops/${shopId}/listings`, {
      method: "POST",
      headers: this.headers({ "Content-Type": "application/x-www-form-urlencoded" }),
      body,
    });
    if (!res.ok) throw new Error(`Etsy createDraftListing ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { listing_id: number };
    return { listingId: String(data.listing_id) };
  }

  async uploadListingImage(shopId: string, listingId: string, bytes: Buffer, filename: string) {
    const form = new FormData();
    form.set("image", new Blob([new Uint8Array(bytes)]), filename);
    const res = await fetch(`${API}/shops/${shopId}/listings/${listingId}/images`, {
      method: "POST",
      headers: this.headers(),
      body: form,
    });
    if (!res.ok) throw new Error(`Etsy uploadListingImage ${res.status}: ${await res.text()}`);
  }

  async uploadListingFile(shopId: string, listingId: string, bytes: Buffer, filename: string) {
    const form = new FormData();
    form.set("file", new Blob([new Uint8Array(bytes)]), filename);
    form.set("name", filename);
    const res = await fetch(`${API}/shops/${shopId}/listings/${listingId}/files`, {
      method: "POST",
      headers: this.headers(),
      body: form,
    });
    if (!res.ok) throw new Error(`Etsy uploadListingFile ${res.status}: ${await res.text()}`);
  }
}

/**
 * Dev mock Etsy client — simulates draft creation without any Etsy account, so
 * the full flow is testable offline. Clearly a mock (isMock=true). Never
 * presents itself as a real Etsy draft.
 */
export class MockEtsyClient implements EtsyClient {
  readonly isMock = true;
  async createDraftListing() {
    await new Promise((r) => setTimeout(r, 150));
    return { listingId: `mock-${Date.now()}` };
  }
  async uploadListingImage() {
    await new Promise((r) => setTimeout(r, 40));
  }
  async uploadListingFile() {
    await new Promise((r) => setTimeout(r, 40));
  }
}
