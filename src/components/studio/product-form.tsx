"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Wand2 } from "lucide-react";
import { Card, buttonClass } from "@/components/ui/primitives";
import { createProductAction, type ProductFormState } from "@/server/actions/product";
import { PRODUCT_TYPES, CANVAS_PRESETS, DPI_PRESETS } from "@/lib/constants";

const field =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30";
const labelCls = "mb-1.5 block text-sm font-medium text-ink";

// Indicative per-image generation cost by provider (USD). Real metering lands in Phase 3.
const PROVIDER_RATES: Record<string, number> = { mock: 0, gemini: 0.003, openai: 0.04 };

function BuildButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonClass() + " w-full sm:w-auto"}>
      <Wand2 className="h-4 w-4" />
      {pending ? "Building…" : "Build Product"}
    </button>
  );
}

export function ProductForm() {
  const [state, action] = useActionState<ProductFormState, FormData>(
    createProductAction,
    undefined,
  );
  const [count, setCount] = useState(100);
  const [provider, setProvider] = useState("mock");

  const estCost = (count * (PROVIDER_RATES[provider] ?? 0)).toFixed(2);

  return (
    <form action={action} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              Product
            </h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className={labelCls}>Product name</label>
                <input
                  name="name"
                  required
                  className={field}
                  placeholder="Princess Fairy Tale Digital Paper"
                />
              </div>
              <div>
                <label className={labelCls}>Product type</label>
                <select name="productType" className={field} defaultValue="Digital Paper">
                  {PRODUCT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              Theme &amp; Style
            </h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className={labelCls}>Theme</label>
                <input
                  name="theme"
                  required
                  className={field}
                  placeholder="Princess Fairy Tale"
                />
              </div>
              <div>
                <label className={labelCls}>Style</label>
                <input
                  name="style"
                  className={field}
                  placeholder="Soft watercolor storybook"
                />
              </div>
              <div>
                <label className={labelCls}>Colour palette</label>
                <input
                  name="colors"
                  className={field}
                  placeholder="Blush, Lavender, Cream, Dusty blue, Gold"
                />
                <p className="mt-1 text-xs text-subtle">Separate colours with commas.</p>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              Image Settings
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className={labelCls}>Number of designs</label>
                <input
                  name="designCount"
                  type="number"
                  min={1}
                  max={500}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value) || 0)}
                  className={field}
                />
              </div>
              <div>
                <label className={labelCls}>Canvas</label>
                <select name="canvasSize" className={field} defaultValue="3600x3600">
                  {CANVAS_PRESETS.map((c) => (
                    <option key={c} value={c}>
                      {c.replace("x", " × ")}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Resolution</label>
                <select name="dpi" className={field} defaultValue={300}>
                  {DPI_PRESETS.map((d) => (
                    <option key={d} value={d}>
                      {d} DPI
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>
        </div>

        {/* Right rail: provider + cost + build */}
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              AI Provider
            </h2>
            <div className="mt-4">
              <label className={labelCls}>Image provider</label>
              <select
                name="provider"
                className={field}
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
              >
                <option value="mock">Mock (dev — no key needed)</option>
                <option value="gemini">Gemini</option>
                <option value="openai">OpenAI</option>
              </select>
              <p className="mt-2 text-xs text-subtle">
                Real image generation is wired in Phase 3. Mock lets you build the full
                workflow with no API key.
              </p>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              Cost Estimate
            </h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Designs</dt>
                <dd className="font-medium text-ink">{count}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Provider</dt>
                <dd className="font-medium text-ink capitalize">{provider}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2">
                <dt className="text-muted">Est. generation cost</dt>
                <dd className="font-semibold text-ink">${estCost}</dd>
              </div>
            </dl>
            <p className="mt-2 text-xs text-subtle">
              Indicative only — actual cost is metered per image at generation time.
            </p>
          </Card>

          {state?.error && (
            <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{state.error}</p>
          )}

          <BuildButton />
          <p className="text-xs text-subtle">
            Building creates the product and (in Phase 2) hands it to the AI Creative Director
            to plan a cohesive collection.
          </p>
        </div>
      </div>
    </form>
  );
}
