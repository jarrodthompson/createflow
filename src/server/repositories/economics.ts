import { prisma } from "@/lib/prisma";

export type Assumptions = {
  defaultPrice: number;
  aiCostPerImage: number;
  productionCost: number;
  etsyListingFee: number;
  transactionFeePct: number;
  paymentFeePct: number;
  paymentFeeFixed: number;
};

// Defaults are ASSUMPTIONS — Etsy's actual fees vary by country/plan and should
// be confirmed with Etsy. They are fully editable in the Unit Economics page.
export const DEFAULT_ASSUMPTIONS: Assumptions = {
  defaultPrice: 5,
  aiCostPerImage: 0.03,
  productionCost: 0,
  etsyListingFee: 0.2,
  transactionFeePct: 6.5,
  paymentFeePct: 3,
  paymentFeeFixed: 0.25,
};

const KEY = "unit_economics";

export async function getAssumptions(userId: string): Promise<Assumptions> {
  const row = await prisma.setting.findUnique({
    where: { userId_key: { userId, key: KEY } },
  });
  if (!row) return DEFAULT_ASSUMPTIONS;
  try {
    return { ...DEFAULT_ASSUMPTIONS, ...JSON.parse(row.value) };
  } catch {
    return DEFAULT_ASSUMPTIONS;
  }
}

export async function saveAssumptions(userId: string, a: Assumptions) {
  await prisma.setting.upsert({
    where: { userId_key: { userId, key: KEY } },
    create: { userId, key: KEY, value: JSON.stringify(a) },
    update: { value: JSON.stringify(a) },
  });
}

export type ProductEconomics = {
  id: string;
  name: string;
  images: number;
  aiCost: number;
  productionCost: number;
  etsyFees: number;
  totalCost: number;
  price: number;
  profit: number;
  margin: number;
};

export function computeEconomics(
  product: { id: string; name: string; images: number },
  a: Assumptions,
): ProductEconomics {
  const price = a.defaultPrice;
  const aiCost = product.images * a.aiCostPerImage;
  const etsyFees =
    a.etsyListingFee +
    (price * (a.transactionFeePct + a.paymentFeePct)) / 100 +
    a.paymentFeeFixed;
  const totalCost = aiCost + a.productionCost + etsyFees;
  const profit = price - totalCost;
  const margin = price > 0 ? (profit / price) * 100 : 0;
  return {
    id: product.id,
    name: product.name,
    images: product.images,
    aiCost,
    productionCost: a.productionCost,
    etsyFees,
    totalCost,
    price,
    profit,
    margin,
  };
}
