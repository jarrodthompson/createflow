import { PhasePlaceholder } from "@/components/layout/phase-placeholder";

export default function ScheduledJobsPage() {
  return (
    <PhasePlaceholder
      title="Scheduled Jobs"
      phase="Roadmap"
      description={"Recurring and scheduled automation jobs."}
      bullets={["Start / end time and progress","Errors and retry history","Metadata, packaging & Etsy upload jobs"]}
    />
  );
}
