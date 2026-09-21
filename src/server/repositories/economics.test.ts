import { describe, it, expect } from "vitest";
import { computeEconomics, DEFAULT_ASSUMPTIONS } from "./economics";

describe("computeEconomics", () => {
  it("computes AI cost from image count", () => {
    const r = computeEconomics({ id: "1", name: "P", images: 10 }, DEFAULT_ASSUMPTIONS);
    expect(r.aiCost).toBeCloseTo(0.3, 5); // 10 * 0.03
  });

  it("computes Etsy fees from price and percentages", () => {
    const r = computeEconomics({ id: "1", name: "P", images: 0 }, DEFAULT_ASSUMPTIONS);
    // 0.20 listing + 5 * (6.5+3)/100 + 0.25 = 0.925
    expect(r.etsyFees).toBeCloseTo(0.925, 5);
  });

  it("derives profit and margin", () => {
    const r = computeEconomics({ id: "1", name: "P", images: 10 }, DEFAULT_ASSUMPTIONS);
    expect(r.profit).toBeCloseTo(r.price - r.totalCost, 5);
    expect(r.margin).toBeCloseTo((r.profit / r.price) * 100, 5);
  });

  it("handles a zero price without dividing by zero", () => {
    const r = computeEconomics({ id: "1", name: "P", images: 5 }, { ...DEFAULT_ASSUMPTIONS, defaultPrice: 0 });
    expect(Number.isFinite(r.margin)).toBe(true);
    expect(r.margin).toBe(0);
  });
});
