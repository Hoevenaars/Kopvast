import type { Metadata } from "next";
import { ScanForm } from "@/components/scan-form";

export const metadata: Metadata = {
  title: "Websitekansen",
  description:
    "Voer je website in en krijg maximaal drie concrete bevindingen, plus de vaste prijs en scope van Kopvast Website.",
};

export default function KansenPage() {
  return (
    <section className="container-page py-16 md:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs tracking-[0.18em] text-olive uppercase">Websitekansen</p>
        <h1 className="mt-4 font-heading text-4xl leading-tight text-ink md:text-6xl">
          Wat laat je website nu liggen?
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-olive">
          Je krijgt maximaal drie concrete bevindingen van de openbare homepage. Daarna zie je de
          vaste prijs, de scope en hoe je verder kunt. Geen verzonnen omzetclaims.
        </p>
      </div>
      <div className="mt-12">
        <ScanForm />
      </div>
    </section>
  );
}
