import { InterestForm } from "@/components/interest-form";
import { acquisitionSource, type AcquisitionStartParams } from "@/lib/acquisition-start";

export function AcquisitionStartForm({ choice, website, company }: AcquisitionStartParams) {
  const subject = website ? "website-vernieuwen" : "website-nieuw";
  return (
    <InterestForm
      source={acquisitionSource(choice)}
      subject={subject}
      company={company}
      website={website}
      cta={choice}
      submitLabel={choice === "info" ? "Bevestig je interesse" : "Vraag een voorstel aan"}
    />
  );
}
