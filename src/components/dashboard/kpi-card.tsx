import type { LucideIcon } from "lucide-react";

export function KpiCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-[var(--radius-cf)] border border-line bg-surface-2 p-4">
      <Icon className="h-5 w-5 text-primary" strokeWidth={1.75} />
      <p className="mt-4 text-2xl font-semibold leading-none text-ink">{value}</p>
      <p className="mt-1.5 text-xs font-medium text-muted">{label}</p>
    </div>
  );
}
