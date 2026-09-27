"use client";

import { Trash2 } from "lucide-react";
import { deleteShopAction } from "@/server/actions/shop";

/** Delete a shop with a confirm guard (removes all its products + assets). */
export function DeleteShopButton({ shopId, name }: { shopId: string; name: string }) {
  return (
    <form
      action={deleteShopAction}
      onSubmit={(e) => {
        if (
          !window.confirm(
            `Delete "${name}"? This permanently removes the shop and ALL its products, listings and images. This cannot be undone.`,
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="shopId" value={shopId} />
      <button
        type="submit"
        title="Delete shop"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-danger-bg hover:text-danger"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </form>
  );
}
