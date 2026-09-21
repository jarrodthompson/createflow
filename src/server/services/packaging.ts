import "server-only";
import JSZip from "jszip";
import { prisma } from "@/lib/prisma";
import { getStorage } from "@/server/storage";

function parseList(json: string | null): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function csvCell(v: string): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function slug(name: string): string {
  return name.trim().replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "product";
}

/** Basic listing text derived from product fields (Phase 6 replaces with AI/SEO metadata). */
function basicListing(product: {
  name: string;
  productType: string;
  theme: string;
  style: string | null;
  colorPalette: string | null;
  designCount: number;
  dpi: number;
  canvasSize: string | null;
}) {
  const colors = parseList(product.colorPalette);
  const title = `${product.theme} ${product.productType} | ${product.designCount} Designs | Digital Download`;
  const description = [
    `${product.name}`,
    "",
    `A cohesive set of ${product.designCount} ${product.productType.toLowerCase()} designs in a ${product.style ?? "beautifully unified"} style.`,
    "",
    "WHAT YOU GET:",
    `• ${product.designCount} high-resolution files`,
    `• ${product.canvasSize ?? "3600 x 3600"} px at ${product.dpi} DPI`,
    "• Instant digital download",
    "",
    "This is a digital product — no physical item will be shipped.",
  ].join("\n");
  const tags = [
    product.theme.toLowerCase(),
    product.productType.toLowerCase(),
    "digital download",
    "digital paper",
    ...colors.slice(0, 3).map((c) => c.toLowerCase()),
    "printable",
    "scrapbooking",
    "commercial use",
  ]
    .filter(Boolean)
    .slice(0, 13);

  return { title, description, tags, colors };
}

/**
 * Package a product into a downloadable ZIP with the standard structure:
 *   <Product>/Final Images/*.ext
 *   <Product>/Prompts/prompts.csv
 *   <Product>/Etsy Listing/{title,description,tags}.txt, metadata.json
 *   <Product>/Preview Images/*
 * Only APPROVED, completed images are included. Runs as a background job.
 */
export async function runProductPackaging(productId: string, jobId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      prompts: { orderBy: { index: "asc" } },
      images: {
        where: { status: "completed", review: { is: { decision: "approved" } } },
        orderBy: { index: "asc" },
        include: { prompt: { select: { concept: true, category: true, text: true } } },
      },
      listing: { include: { metadata: true } },
    },
  });
  if (!product) return { error: "not found" };

  await prisma.generationJob.update({
    where: { id: jobId },
    data: { status: "running", startedAt: new Date(), total: product.images.length + 1, progress: 0 },
  });

  const storage = getStorage();
  const zip = new JSZip();
  const root = zip.folder(slug(product.name))!;
  const finalDir = root.folder("Final Images")!;
  const previewDir = root.folder("Preview Images")!;

  // Final images
  let progress = 0;
  for (const img of product.images) {
    if (!img.storageKey) continue;
    const bytes = await storage.get(img.storageKey);
    if (!bytes) continue;
    const ext = img.storageKey.split(".").pop() ?? "png";
    const filename = `${String(img.index).padStart(3, "0")}.${ext}`;
    finalDir.file(filename, bytes);
    if (progress < 5) previewDir.file(`preview-${String(progress + 1).padStart(2, "0")}.${ext}`, bytes);
    progress++;
    await prisma.generationJob.update({ where: { id: jobId }, data: { progress } });
  }

  // prompts.csv
  const header = ["#", "concept", "category", "prompt", "status"].join(",");
  const rows = product.prompts.map((p) =>
    [p.index, csvCell(p.concept), csvCell(p.category ?? ""), csvCell(p.text), p.status].join(","),
  );
  root.folder("Prompts")!.file("prompts.csv", [header, ...rows].join("\n"));

  // Etsy listing files — prefer stored metadata (Phase 6), else derive a basic draft.
  const listingDir = root.folder("Etsy Listing")!;
  const meta = product.listing?.metadata;
  // Reflect the number of designs actually packaged (approved), not the plan.
  const basic = basicListing({ ...product, designCount: product.images.length });
  const title = product.listing?.title || basic.title;
  const description = meta?.description || basic.description;
  const tags = meta?.tags ? parseList(meta.tags) : basic.tags;

  listingDir.file("title.txt", title);
  listingDir.file("description.txt", description);
  listingDir.file("tags.txt", tags.join(", "));
  listingDir.file(
    "metadata.json",
    JSON.stringify(
      {
        product: {
          name: product.name,
          type: product.productType,
          theme: product.theme,
          style: product.style,
          designCount: product.images.length,
          canvas: product.canvasSize,
          dpi: product.dpi,
          colors: basic.colors,
        },
        listing: {
          title,
          tags,
          keywords: meta?.keywords ? parseList(meta.keywords) : [],
          materials: meta?.materials ? parseList(meta.materials) : [],
          occasions: meta?.occasions ? parseList(meta.occasions) : [],
          category: meta?.category ?? null,
          isDigital: true,
        },
        generatedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );

  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  const zipKey = `shops/${product.shopId}/products/${product.id}/exports/${slug(product.name)}.zip`;
  await storage.put(zipKey, buffer, "application/zip");

  await prisma.$transaction([
    prisma.productFile.deleteMany({ where: { productId, kind: "zip" } }),
    prisma.productFile.create({
      data: {
        productId,
        kind: "zip",
        storageKey: zipKey,
        filename: `${slug(product.name)}.zip`,
        bytes: buffer.length,
      },
    }),
    prisma.product.update({ where: { id: productId }, data: { status: "ready" } }),
    prisma.generationJob.update({
      where: { id: jobId },
      data: { status: "completed", finishedAt: new Date(), progress: product.images.length + 1 },
    }),
  ]);

  return { images: product.images.length, bytes: buffer.length };
}
