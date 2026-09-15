import type { Metadata } from "next";
import { ComingSoon } from "@/components/workspace/page-frame";

export const metadata: Metadata = { title: "Instellingen", robots: { index: false, follow: false } };

export default function CustomerSettingsPage() {
  return (
    <ComingSoon
      eyebrow="Instellingen"
      title="Instellingen"
      text="Account, e-mailadres en voorkeuren. Kritieke instellingen blijven bij Kopvast."
    />
  );
}
