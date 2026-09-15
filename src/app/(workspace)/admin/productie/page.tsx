import type { Metadata } from "next";
import { ComingSoon } from "@/components/workspace/page-frame";

export const metadata: Metadata = { title: "Productie", robots: { index: false, follow: false } };

export default function AdminProductionPage() {
  return (
    <ComingSoon eyebrow="Productie" title="Productie" text="Lopende websites, merkwerk en maatwerk na een gewonnen lead." />
  );
}
