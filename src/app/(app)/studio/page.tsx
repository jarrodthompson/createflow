import { ProductForm } from "@/components/studio/product-form";

export default function StudioPage() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">AI Product Studio</h1>
        <p className="mt-1 text-sm text-muted">
          Define a product and let CreateFlow plan, generate and package it end to end.
        </p>
      </div>
      <ProductForm />
    </div>
  );
}
