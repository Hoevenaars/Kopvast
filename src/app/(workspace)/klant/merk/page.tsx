import type { Metadata } from "next";
import { ComingSoon } from "@/components/workspace/page-frame";

export const metadata: Metadata = { title: "Mijn merk", robots: { index: false, follow: false } };

export default function CustomerBrandPage() {
  return (
    <ComingSoon
      eyebrow="Mijn merk"
      title="Mijn merk"
      text="Hier komen logo's, kleuren, typografie, toon en downloads. Kopvast beheert de merkstructuur; jij ziet en gebruikt de bestanden."
    />
  );
}
