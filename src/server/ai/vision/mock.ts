import { createHash } from "crypto";
import { type VisionProvider, type VisionInput, type AnalysisResult } from "./types";

/**
 * Offline mock vision QC. Deterministic scores derived from the image bytes +
 * prompt so results are stable per image. Clearly a dev mock (isMock=true) —
 * never presented as a real quality judgement.
 */
export class MockVisionProvider implements VisionProvider {
  readonly name = "mock";
  readonly isMock = true;

  async analyze(input: VisionInput): Promise<AnalysisResult> {
    await new Promise((r) => setTimeout(r, 60));
    const seedHex = createHash("sha1")
      .update(input.imageBytes)
      .update(input.prompt)
      .digest("hex");
    // Turn hex chunks into 0..1 factors.
    const f = (i: number) => (parseInt(seedHex.slice(i * 2, i * 2 + 2), 16) || 0) / 255;

    // Cohesive mock designs score well (7.4–9.7), with small variation.
    const score = (i: number) => Number((7.4 + f(i) * 2.3).toFixed(1));

    return {
      themeMatch: score(0),
      styleConsistency: score(2),
      colorConsistency: score(4),
      composition: score(6),
      visualQuality: score(8),
      // Very occasional flagged defect so the review UI is exercised.
      hasArtifacts: f(10) > 0.93,
      hasText: false,
      hasWatermark: false,
      hasLogo: false,
      notes: "Automated mock QC — enable a real vision provider for genuine analysis.",
    };
  }
}
