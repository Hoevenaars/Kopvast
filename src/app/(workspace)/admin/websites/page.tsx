import type { Metadata } from "next";
import { ComingSoon } from "@/components/workspace/page-frame";

export const metadata: Metadata = { title: "Websites", robots: { index: false, follow: false } };

export default function AdminWebsitesPage() {
  return <ComingSoon eyebrow="Websites" title="Websites" text="Overzicht van live en in-bouw sites die Kopvast beheert." />;
}
