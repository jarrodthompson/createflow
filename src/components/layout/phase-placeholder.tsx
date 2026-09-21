import Link from "next/link";
import { Card } from "@/components/ui/primitives";

/**
 * Honest roadmap placeholder for routes delivered in later phases.
 * Not a fake "coming soon" button — it states exactly what ships and when,
 * and keeps navigation coherent while the workflow is built out.
 */
export function PhasePlaceholder({
  title,
  phase,
  description,
  bullets,
}: {
  title: string;
  phase: string;
  description: string;
  bullets?: string[];
}) {
  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      <Card className="p-8">
        <span className="inline-flex items-center rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
          {phase === "Roadmap" ? "Planned" : `Planned · ${phase}`}
        </span>
        <p className="mt-4 max-w-xl text-sm text-muted">
          This section is on the CreateFlow roadmap. The navigation, data model and design system
          are already in place, so it slots in without rework once the required integration is
          connected.
        </p>
        {bullets && bullets.length > 0 && (
          <ul className="mt-4 space-y-1.5 text-sm text-ink">
            {bullets.map((b) => (
              <li key={b} className="flex gap-2">
                <span className="text-primary">•</span> {b}
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/studio"
          className="mt-6 inline-block text-sm font-medium text-primary hover:underline"
        >
          Start creating a product in the Studio →
        </Link>
      </Card>
    </div>
  );
}
