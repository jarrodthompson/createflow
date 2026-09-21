import { z } from "zod";

export type VisionInput = {
  imageBytes: Buffer;
  contentType: string;
  prompt: string;
  theme: string;
  style?: string | null;
  palette: string[];
};

export const analysisSchema = z.object({
  themeMatch: z.number().min(0).max(10),
  styleConsistency: z.number().min(0).max(10),
  colorConsistency: z.number().min(0).max(10),
  composition: z.number().min(0).max(10),
  visualQuality: z.number().min(0).max(10),
  hasArtifacts: z.boolean(),
  hasText: z.boolean(),
  hasWatermark: z.boolean(),
  hasLogo: z.boolean().default(false),
  notes: z.string().default(""),
});
export type AnalysisResult = z.infer<typeof analysisSchema>;

export function overallScore(a: AnalysisResult): number {
  const base =
    (a.themeMatch + a.styleConsistency + a.colorConsistency + a.composition + a.visualQuality) / 5;
  // Penalise defects the seller cares about.
  const penalty =
    (a.hasArtifacts ? 1.5 : 0) +
    (a.hasText ? 1.0 : 0) +
    (a.hasWatermark ? 2.0 : 0) +
    (a.hasLogo ? 1.5 : 0);
  return Math.max(0, Math.min(10, base - penalty));
}

export interface VisionProvider {
  readonly name: string;
  readonly isMock: boolean;
  analyze(input: VisionInput): Promise<AnalysisResult>;
}
