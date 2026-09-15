import type { Metadata } from "next";
import { PageIntro } from "@/components/workspace/page-frame";
import { NewProspectForm } from "../new-prospect-form";

export const metadata: Metadata = { title: "Nieuwe prospect", robots: { index: false, follow: false } };

export default function NewAcquisitionPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageIntro
        eyebrow="Acquisitie"
        title="Nieuwe prospect"
        text="Voeg een website toe. Kopvast analyseert de site en bereidt een persoonlijke acquisitiemail voor."
      />
      <NewProspectForm />
    </div>
  );
}
