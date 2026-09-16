import type { Metadata } from "next";
import { PageIntro } from "@/components/workspace/page-frame";
import { NewAanvraagForm } from "../new-aanvraag-form";

export const metadata: Metadata = { title: "Nieuwe aanvraag", robots: { index: false, follow: false } };

export default function NewAanvraagPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageIntro
        eyebrow="Aanvragen"
        title="Handmatige aanvraag"
        text="Leg een aanvraag vast die niet via het websiteformulier binnenkwam."
      />
      <NewAanvraagForm />
    </div>
  );
}
