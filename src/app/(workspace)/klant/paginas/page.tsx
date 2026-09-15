import type { Metadata } from "next";
import { ComingSoon } from "@/components/workspace/page-frame";

export const metadata: Metadata = { title: "Pagina's", robots: { index: false, follow: false } };

export default function CustomerPagesPage() {
  return (
    <ComingSoon
      eyebrow="Pagina's"
      title="Pagina's"
      text="Later pas je hier inhoud aan binnen de onderdelen die Kopvast heeft bepaald: hero, diensten, over ons en CTA. Geen vrije pagebuilder."
    />
  );
}
