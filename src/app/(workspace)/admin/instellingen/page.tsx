import type { Metadata } from "next";
import { ComingSoon } from "@/components/workspace/page-frame";

export const metadata: Metadata = { title: "Instellingen", robots: { index: false, follow: false } };

export default function AdminSettingsPage() {
  return (
    <ComingSoon eyebrow="Instellingen" title="Instellingen" text="Rollen, verzendregels en koppelingen. Later, niet in deze UI-sprint." />
  );
}
