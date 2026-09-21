import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export function QuickAction({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="group rounded-[var(--radius-cf)] border border-line bg-surface-2 p-5 transition-colors hover:bg-surface-3"
    >
      <Icon className="h-6 w-6 text-primary" strokeWidth={1.75} />
      <p className="mt-4 font-semibold text-ink">{title}</p>
      <p className="mt-1 text-sm text-muted">{description}</p>
    </Link>
  );
}
