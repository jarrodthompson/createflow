import { DollarSign } from "lucide-react";
import { requireUser } from "@/server/actions/auth";
import { getActiveShop } from "@/server/repositories/shops";
import { prisma } from "@/lib/prisma";
import {
  getAssumptions,
  computeEconomics,
  type ProductEconomics,
} from "@/server/repositories/economics";
import { saveUnitEconomicsAction } from "@/server/actions/settings";
import { Card, Badge } from "@/components/ui/primitives";
import { formatCurrency } from "@/lib/utils";

const money = (n: number) => `$${n.toFixed(2)}`;

export default async function UnitEconomicsPage() {
  const user = await requireUser();
  const shop = await getActiveShop(user.id);
  const assumptions = await getAssumptions(user.id);

  const products = shop
    ? await prisma.product.findMany({
        where: { userId: user.id, shopId: shop.id, status: { not: "archived" } },
        orderBy: { updatedAt: "desc" },
        select: { id: true, name: true, _count: { select: { images: true } } },
      })
    : [];

  const rows: ProductEconomics[] = products.map((p) =>
    computeEconomics({ id: p.id, name: p.name, images: p._count.images }, assumptions),
  );
  const avgMargin =
    rows.length > 0 ? rows.reduce((n, r) => n + r.margin, 0) / rows.length : 0;

  const field =
    "h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-ink">
          <DollarSign className="h-6 w-6 text-primary" /> Unit Economics
        </h1>
        <p className="mt-1 text-sm text-muted">
          Cost, price and margin per product. Fee values are editable assumptions — confirm your
          real fees with Etsy.
        </p>
      </div>

      {/* Assumptions */}
      <Card className="p-5">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Assumptions</h2>
        <form action={saveUnitEconomicsAction} className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Assumption name="defaultPrice" label="Selling price ($)" value={assumptions.defaultPrice} field={field} />
          <Assumption name="aiCostPerImage" label="AI cost / image ($)" value={assumptions.aiCostPerImage} field={field} />
          <Assumption name="productionCost" label="Other cost ($)" value={assumptions.productionCost} field={field} />
          <Assumption name="etsyListingFee" label="Etsy listing fee ($)" value={assumptions.etsyListingFee} field={field} />
          <Assumption name="transactionFeePct" label="Transaction fee (%)" value={assumptions.transactionFeePct} field={field} />
          <Assumption name="paymentFeePct" label="Payment fee (%)" value={assumptions.paymentFeePct} field={field} />
          <Assumption name="paymentFeeFixed" label="Payment fixed ($)" value={assumptions.paymentFeeFixed} field={field} />
          <div className="flex items-end">
            <button className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-white hover:bg-primary-hover">
              Save
            </button>
          </div>
        </form>
      </Card>

      {/* Table */}
      {rows.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted">No products yet.</Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-wider text-subtle">
                <th className="px-4 py-2.5">Product</th>
                <th className="px-4 py-2.5 text-right">Images</th>
                <th className="px-4 py-2.5 text-right">AI cost</th>
                <th className="px-4 py-2.5 text-right">Etsy fees</th>
                <th className="px-4 py-2.5 text-right">Total cost</th>
                <th className="px-4 py-2.5 text-right">Price</th>
                <th className="px-4 py-2.5 text-right">Profit</th>
                <th className="px-4 py-2.5 text-right">Margin</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-line">
                  <td className="px-4 py-3 font-medium text-ink">{r.name}</td>
                  <td className="px-4 py-3 text-right text-muted">{r.images}</td>
                  <td className="px-4 py-3 text-right text-muted">{money(r.aiCost)}</td>
                  <td className="px-4 py-3 text-right text-muted">{money(r.etsyFees)}</td>
                  <td className="px-4 py-3 text-right text-muted">{money(r.totalCost)}</td>
                  <td className="px-4 py-3 text-right text-ink">{money(r.price)}</td>
                  <td className={`px-4 py-3 text-right font-medium ${r.profit >= 0 ? "text-success" : "text-danger"}`}>
                    {money(r.profit)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Badge tone={r.margin >= 50 ? "success" : r.margin >= 0 ? "warning" : "danger"}>
                      {r.margin.toFixed(0)}%
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="text-sm">
                <td className="px-4 py-3 font-medium text-ink" colSpan={7}>
                  Average margin across {rows.length} product{rows.length === 1 ? "" : "s"}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-ink">
                  {avgMargin.toFixed(0)}%
                </td>
              </tr>
            </tfoot>
          </table>
        </Card>
      )}

      <p className="text-xs text-subtle">
        Estimated figures based on your assumptions and {formatCurrency(0)} in recorded sales.
        Real order data connects with Etsy analytics in a future update.
      </p>
    </div>
  );
}

function Assumption({
  name,
  label,
  value,
  field,
}: {
  name: string;
  label: string;
  value: number;
  field: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-ink">{label}</label>
      <input name={name} type="number" step="0.01" min="0" defaultValue={value} className={field} />
    </div>
  );
}
