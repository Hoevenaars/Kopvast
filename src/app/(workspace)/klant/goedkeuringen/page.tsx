import type { Metadata } from "next";
import { ComingSoon } from "@/components/workspace/page-frame";

export const metadata: Metadata = { title: "Goedkeuringen", robots: { index: false, follow: false } };

export default function CustomerApprovalsPage() {
  return (
    <ComingSoon
      eyebrow="Goedkeuringen"
      title="Goedkeuringen"
      text="Later geef je hier expliciet akkoord op ontwerp, content, preview, merkrefresh, maatwerk of livegang."
    />
  );
}
