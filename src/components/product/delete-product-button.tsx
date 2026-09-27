"use client";

import { Trash2 } from "lucide-react";
import { deleteProductAction } from "@/server/actions/product";

/** Delete a product with a confirm guard (destructive, irreversible). */
export function DeleteProductButton({
  productId,
  name,
  variant = "compact",
}: {
  productId: string;
  name: string;
  variant?: "compact" | "full";
}) {
  const cls =
    variant === "full"
      ? "inline-flex h-9 items-center gap-1.5 rounded-lg border border-danger/40 bg-danger-bg px-3 text-sm font-medium text-danger hover:brightness-95"
      : "inline-flex h-8 items-center gap-1.5 rounded-lg border border-danger/40 bg-danger-bg px-2.5 text-xs font-medium text-danger hover:brightness-95";
  return (
    <form
      action={deleteProductAction}
      onSubmit={(e) => {
        if (
          !window.confirm(
            `Delete "${name}"? This permanently removes its images, prompts, files and listing. This cannot be undone.`,
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="productId" value={productId} />
      <button type="submit" className={cls}>
        <Trash2 className={variant === "full" ? "h-4 w-4" : "h-3.5 w-3.5"} /> Delete
      </button>
    </form>
  );
}
