"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "./auth";
import { saveAssumptions } from "@/server/repositories/economics";

const num = (v: FormDataEntryValue | null, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

export async function saveUnitEconomicsAction(formData: FormData) {
  const user = await requireUser();
  await saveAssumptions(user.id, {
    defaultPrice: num(formData.get("defaultPrice"), 5),
    aiCostPerImage: num(formData.get("aiCostPerImage"), 0.03),
    productionCost: num(formData.get("productionCost"), 0),
    etsyListingFee: num(formData.get("etsyListingFee"), 0.2),
    transactionFeePct: num(formData.get("transactionFeePct"), 6.5),
    paymentFeePct: num(formData.get("paymentFeePct"), 3),
    paymentFeeFixed: num(formData.get("paymentFeeFixed"), 0.25),
  });
  revalidatePath("/unit-economics");
  revalidatePath("/analytics");
}
