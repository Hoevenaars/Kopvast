import type { Metadata } from "next";
import { ComingSoon } from "@/components/workspace/page-frame";

export const metadata: Metadata = { title: "Facturen", robots: { index: false, follow: false } };

export default function CustomerInvoicesPage() {
  return (
    <ComingSoon
      eyebrow="Facturen"
      title="Facturen"
      text="Hier komen later facturen en betaalstatus. Nog geen koppeling met Mollie in deze UI-sprint."
    />
  );
}
