import type { Metadata } from "next";
import { ComingSoon } from "@/components/workspace/page-frame";

export const metadata: Metadata = { title: "Automations", robots: { index: false, follow: false } };

export default function AdminAutomationsPage() {
  return (
    <ComingSoon
      eyebrow="Automations"
      title="Automations"
      text="Scan, analyse, mailqueue en follow-up. Het dashboard toont straks alleen de uitzonderingen."
    />
  );
}
