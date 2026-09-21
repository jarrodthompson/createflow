import { PhasePlaceholder } from "@/components/layout/phase-placeholder";

export default function ReviewsPage() {
  return (
    <PhasePlaceholder
      title="Reviews"
      phase="Roadmap"
      description={"Etsy reviews and rating trends."}
      bullets={["Average rating & recent reviews","Review trends over time","Designed to connect to Etsy review data"]}
    />
  );
}
