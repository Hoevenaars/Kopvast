import type { Metadata } from "next";
import { ComingSoon } from "@/components/workspace/page-frame";

export const metadata: Metadata = { title: "Merk", robots: { index: false, follow: false } };

export default function AdminBrandPage() {
  return <ComingSoon eyebrow="Merk" title="Merk" text="Merksets, downloads en interne richtlijnen per klant." />;
}
