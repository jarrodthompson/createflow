import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "demo@createflow.app";
  const passwordHash = await bcrypt.hash("demo1234", 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Demo Seller", passwordHash },
  });

  // Fresh demo dataset
  await prisma.product.deleteMany({ where: { userId: user.id } });
  await prisma.etsyShop.deleteMany({ where: { userId: user.id } });

  const mainShop = await prisma.etsyShop.create({
    data: { userId: user.id, name: "My Etsy Shop", status: "connected", isActive: true },
  });
  const paperShop = await prisma.etsyShop.create({
    data: { userId: user.id, name: "Digital Paper Shop", status: "connected", isActive: false },
  });

  const styleDna = await prisma.styleDna.create({
    data: {
      userId: user.id,
      name: "Soft Watercolor Storybook",
      descriptors: JSON.stringify(["Whimsical", "Soft", "Premium", "Feminine"]),
      colorMoods: JSON.stringify(["Pastel", "Muted", "Warm"]),
      avoid: JSON.stringify(["Neon", "Photorealistic", "Text", "Logos", "Watermarks"]),
    },
  });

  const products = [
    {
      name: "Princess Fairy Tale Digital Paper",
      productType: "Digital Paper",
      theme: "Princess Fairy Tale",
      style: "Soft watercolor storybook",
      colorPalette: ["Blush", "Lavender", "Cream", "Dusty blue", "Gold"],
      designCount: 100,
      status: "review",
      etsyStatus: "draft",
      shopId: mainShop.id,
    },
    {
      name: "Floral Cottagecore Digital Paper",
      productType: "Digital Paper",
      theme: "Cottagecore Florals",
      style: "Muted vintage botanical",
      colorPalette: ["Sage", "Terracotta", "Cream", "Dusty rose"],
      designCount: 80,
      status: "listed",
      etsyStatus: "draft",
      shopId: paperShop.id,
    },
    {
      name: "Cute Woodland Animals",
      productType: "Clipart Set",
      theme: "Woodland Animals",
      style: "Soft kawaii illustration",
      colorPalette: ["Moss", "Amber", "Cream", "Brown"],
      designCount: 100,
      status: "generating",
      etsyStatus: "none",
      shopId: mainShop.id,
    },
    {
      name: "Vintage Botanical Wall Art",
      productType: "Printable Wall Art",
      theme: "Vintage Botanicals",
      style: "Antique lithograph",
      colorPalette: ["Ivory", "Olive", "Sepia"],
      designCount: 24,
      status: "ready",
      etsyStatus: "published",
      shopId: mainShop.id,
    },
  ];

  for (const p of products) {
    await prisma.product.create({
      data: {
        userId: user.id,
        shopId: p.shopId,
        styleDnaId: styleDna.id,
        name: p.name,
        productType: p.productType,
        theme: p.theme,
        style: p.style,
        colorPalette: JSON.stringify(p.colorPalette),
        designCount: p.designCount,
        canvasSize: "3600x3600",
        dpi: 300,
        status: p.status,
        etsyStatus: p.etsyStatus,
      },
    });
  }

  // A couple of running jobs for the "Active Jobs" KPI + automation view
  await prisma.generationJob.createMany({
    data: [
      { type: "generation", status: "running", progress: 78, total: 100 },
      { type: "analysis", status: "running", progress: 12, total: 100 },
      { type: "packaging", status: "queued", progress: 0, total: 1 },
      { type: "etsy-upload", status: "completed", progress: 1, total: 1 },
    ],
  });

  console.log("✅ Seeded demo user:", email, "/ password: demo1234");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
