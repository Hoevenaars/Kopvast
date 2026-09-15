import type { Metadata } from "next";
import { ComingSoon } from "@/components/workspace/page-frame";

export const metadata: Metadata = { title: "Support", robots: { index: false, follow: false } };

export default function CustomerSupportPage() {
  return (
    <ComingSoon
      eyebrow="Support"
      title="Support"
      text="Vragen en hulp komen hier terecht. Kleine wijzigingen stuur je via Wijzigingen; grotere wensen beoordeelt Kopvast."
    />
  );
}
