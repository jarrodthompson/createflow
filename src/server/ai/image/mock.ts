import { type ImageProvider, type ImageGenInput, type GeneratedImage, colorToHex } from "./types";

/**
 * Offline mock image provider. Produces a REAL, distinct SVG asset per design
 * — a palette-driven generative composition — so the review gallery, packaging
 * and downloads all work without any AI key. Clearly a dev mock (isMock=true);
 * never presented as production generation.
 */

// Small seeded PRNG so each design is distinct but reproducible.
function rng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function buildSvg(input: ImageGenInput): string {
  const size = 1200; // display resolution; production sizing comes from real providers
  const palette = (input.palette.length ? input.palette : ["cream", "sage", "gold", "blush"]).map(
    colorToHex,
  );
  const seed = hashStr(input.prompt) + input.index * 97;
  const rand = rng(seed);
  const bg = palette[0];
  const bg2 = palette[palette.length - 1];

  const shapes: string[] = [];
  const shapeCount = 5 + Math.floor(rand() * 6);
  for (let i = 0; i < shapeCount; i++) {
    const c = palette[Math.floor(rand() * palette.length)];
    const cx = Math.floor(rand() * size);
    const cy = Math.floor(rand() * size);
    const r = 60 + Math.floor(rand() * 260);
    const opacity = (0.25 + rand() * 0.5).toFixed(2);
    if (rand() > 0.5) {
      shapes.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c}" opacity="${opacity}"/>`);
    } else {
      const w = r * (0.8 + rand());
      const h = r * (0.8 + rand());
      const rot = Math.floor(rand() * 360);
      shapes.push(
        `<rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" rx="${(r / 3).toFixed(0)}" fill="${c}" opacity="${opacity}" transform="rotate(${rot} ${cx} ${cy})"/>`,
      );
    }
  }

  const label = (input.category ?? input.theme ?? "Design").toString();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${bg}"/>
      <stop offset="1" stop-color="${bg2}"/>
    </linearGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="6"/></filter>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#g)"/>
  <g filter="url(#soft)">${shapes.join("")}</g>
  <rect x="40" y="40" width="${size - 80}" height="${size - 80}" fill="none" stroke="${colorToHex("gold")}" stroke-opacity="0.5" stroke-width="6" rx="24"/>
  <text x="${size / 2}" y="${size - 70}" font-family="Georgia, serif" font-size="42" fill="#2b2724" fill-opacity="0.55" text-anchor="middle">${label} · ${String(input.index).padStart(3, "0")}</text>
</svg>`;
}

export class MockImageProvider implements ImageProvider {
  readonly name = "mock";
  readonly isMock = true;

  async generate(input: ImageGenInput): Promise<GeneratedImage> {
    // Tiny delay so progress is observable in the queue UI.
    await new Promise((r) => setTimeout(r, 120));
    const svg = buildSvg(input);
    return {
      bytes: Buffer.from(svg, "utf8"),
      contentType: "image/svg+xml",
      ext: "svg",
      model: "mock-generative-svg",
    };
  }
}
