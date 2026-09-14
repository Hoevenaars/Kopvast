import type { Metadata } from "next";
import { ScanForm } from "@/components/scan-form";

export const metadata: Metadata = {
  title: "Websitecheck",
  description: "Vul je websiteadres in en ontvang maximaal drie concrete aandachtspunten.",
};

export default function WebsiteCheckPage() {
  return (
    <section className="container-page py-16 md:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs tracking-[0.18em] text-olive uppercase">Websitecheck</p>
        <h1 className="font-heading mt-4 text-4xl leading-tight text-ink md:text-6xl">
          Benieuwd wat wij zien?
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-olive">
          Vul je websiteadres in en ontvang maximaal drie concrete aandachtspunten. Geen oordeel over je
          bedrijf. Geen verzonnen omzetclaims.
        </p>
      </div>
      <div className="mt-12">
        <ScanForm />
      </div>
    </section>
  );
}
