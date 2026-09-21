export type ImageGenInput = {
  prompt: string;
  palette: string[];
  index: number;
  category?: string | null;
  theme?: string;
  size?: string; // e.g. "3600x3600"
};

export type GeneratedImage = {
  bytes: Buffer;
  contentType: string;
  ext: string;
  model: string;
};

export interface ImageProvider {
  readonly name: string;
  readonly isMock: boolean;
  generate(input: ImageGenInput): Promise<GeneratedImage>;
}

// Common Etsy/craft colour names → hex. Unknown names fall back to a stable hash.
const NAMED: Record<string, string> = {
  blush: "#f4c6c6",
  lavender: "#cfc3e8",
  cream: "#f6efe2",
  ivory: "#f8f4e9",
  gold: "#c9a24b",
  "dusty blue": "#93a9c0",
  "dusty rose": "#c99aa0",
  sage: "#a9b89a",
  terracotta: "#c07a56",
  moss: "#7d8a5c",
  amber: "#d59a3a",
  brown: "#8a6a4f",
  olive: "#7a7a45",
  sepia: "#8a6e4b",
  rose: "#d6889a",
  white: "#ffffff",
  black: "#2b2724",
};

export function colorToHex(name: string): string {
  const key = name.trim().toLowerCase();
  if (NAMED[key]) return NAMED[key];
  // Deterministic pastel from the string.
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 360;
  return `hsl(${h}, 45%, 78%)`;
}
