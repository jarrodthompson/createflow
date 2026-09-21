import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Warm placeholder tile used until real generated images exist (Phase 3+). */
export function Thumbnail({ label, className }: { label?: string; className?: string }) {
  const initials = label
    ?.split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg border border-line bg-primary-soft text-primary",
        className,
      )}
    >
      {initials ? (
        <span className="text-sm font-semibold">{initials}</span>
      ) : (
        <ImageIcon className="h-5 w-5" />
      )}
    </div>
  );
}
