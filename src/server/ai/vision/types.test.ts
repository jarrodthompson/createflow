import { describe, it, expect } from "vitest";
import { overallScore, type AnalysisResult } from "./types";

const clean: AnalysisResult = {
  themeMatch: 9,
  styleConsistency: 9,
  colorConsistency: 9,
  composition: 9,
  visualQuality: 9,
  hasArtifacts: false,
  hasText: false,
  hasWatermark: false,
  hasLogo: false,
  notes: "",
};

describe("overallScore", () => {
  it("averages the five sub-scores when there are no defects", () => {
    expect(overallScore(clean)).toBeCloseTo(9, 5);
  });

  it("penalises watermarks the most", () => {
    const withWatermark = { ...clean, hasWatermark: true };
    expect(overallScore(withWatermark)).toBeCloseTo(7, 5);
  });

  it("stacks penalties and never drops below 0", () => {
    const bad: AnalysisResult = {
      ...clean,
      themeMatch: 2,
      styleConsistency: 2,
      colorConsistency: 2,
      composition: 2,
      visualQuality: 2,
      hasArtifacts: true,
      hasText: true,
      hasWatermark: true,
      hasLogo: true,
    };
    expect(overallScore(bad)).toBe(0);
  });

  it("clamps to a maximum of 10", () => {
    expect(overallScore({ ...clean, themeMatch: 10, styleConsistency: 10, colorConsistency: 10, composition: 10, visualQuality: 10 })).toBeLessThanOrEqual(10);
  });
});
