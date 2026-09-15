import type { Metadata } from "next";
import { ComingSoon } from "@/components/workspace/page-frame";

export const metadata: Metadata = { title: "Prospects", robots: { index: false, follow: false } };

export default function AdminProspectsPage() {
  return (
    <ComingSoon
      eyebrow="Prospects"
      title="Prospects"
      text="Hier komt de acquisitieflow: website + e-mail opslaan, scannen, reviewen en daarna mailen."
    />
  );
}
