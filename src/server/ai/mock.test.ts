import { describe, it, expect } from "vitest";
import { MockCreativeDirector } from "./mock";
import type { PlanInput, ListingInput, CreativeDirectorProvider } from "./types";

const input: PlanInput = {
  productType: "Digital Paper",
  theme: "Princess Fairy Tale",
  style: "soft watercolor",
  colors: ["Blush", "Gold"],
  designCount: 100,
  styleDna: null,
};

const listingInput: ListingInput = { ...input, productName: "Princess Paper", approvedCount: 100 };

describe("MockCreativeDirector", () => {
  const cd: CreativeDirectorProvider = new MockCreativeDirector();

  it("plans categories summing to the design count", async () => {
    const plan = await cd.planCollection(input);
    const sum = plan.categories.reduce((n, c) => n + c.designCount, 0);
    expect(sum).toBe(100);
    expect(plan.categories.length).toBeGreaterThan(1);
  });

  it("generates exactly one prompt per design", async () => {
    const plan = await cd.planCollection(input);
    const prompts = await cd.generatePrompts(input, plan);
    expect(prompts).toHaveLength(100);
    expect(prompts[0].index).toBe(1);
    expect(prompts.every((p) => p.text.includes("no watermark"))).toBe(true);
  });

  it("generates a listing with at most 13 tags and a title under 140 chars", async () => {
    const listing = await cd.generateListing(listingInput);
    expect(listing.tags.length).toBeLessThanOrEqual(13);
    expect(listing.title.length).toBeLessThanOrEqual(140);
    expect(listing.description.length).toBeGreaterThan(0);
  });

  it("regenerates a title that is a valid non-empty string", async () => {
    const listing = await cd.generateListing(listingInput);
    const newTitle = await cd.regenerateListingField("title", listingInput, listing);
    expect(typeof newTitle).toBe("string");
    expect((newTitle as string).length).toBeGreaterThan(0);
  });

  it("generates marketing copy for every channel", async () => {
    const m = await cd.generateMarketing(listingInput);
    expect(m.pinterestTitle).toBeTruthy();
    expect(m.instagramCaption).toBeTruthy();
    expect(m.facebookPost).toBeTruthy();
    expect(m.emailSubject).toBeTruthy();
    expect(m.instagramHashtags.every((h) => !h.startsWith("#"))).toBe(true);
  });
});
