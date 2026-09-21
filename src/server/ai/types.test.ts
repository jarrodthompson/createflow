import { describe, it, expect } from "vitest";
import { normalizeCounts, type CollectionPlan } from "./types";

function plan(counts: number[]): CollectionPlan {
  return {
    concept: "c",
    visualDirection: "v",
    colorDirection: "cd",
    styleRules: ["r"],
    compositionRules: ["cr"],
    categories: counts.map((designCount, i) => ({
      name: `cat${i}`,
      description: "",
      designCount,
    })),
  };
}

describe("normalizeCounts", () => {
  it("leaves counts untouched when they already sum to the total", () => {
    const out = normalizeCounts(plan([10, 10, 10]), 30);
    expect(out.categories.map((c) => c.designCount)).toEqual([10, 10, 10]);
  });

  it("scales counts to hit the requested total exactly", () => {
    const out = normalizeCounts(plan([1, 1, 1]), 100);
    const sum = out.categories.reduce((n, c) => n + c.designCount, 0);
    expect(sum).toBe(100);
  });

  it("never produces a zero-count category", () => {
    const out = normalizeCounts(plan([1, 1, 1, 1, 1]), 6);
    expect(out.categories.every((c) => c.designCount >= 1)).toBe(true);
    expect(out.categories.reduce((n, c) => n + c.designCount, 0)).toBe(6);
  });

  it("handles a single category", () => {
    const out = normalizeCounts(plan([3]), 50);
    expect(out.categories[0].designCount).toBe(50);
  });
});
