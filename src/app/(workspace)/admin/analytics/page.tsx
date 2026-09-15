import type { Metadata } from "next";
import { ComingSoon } from "@/components/workspace/page-frame";

export const metadata: Metadata = { title: "Analytics", robots: { index: false, follow: false } };

export default function AdminAnalyticsPage() {
  return <ComingSoon eyebrow="Analytics" title="Analytics" text="Pipeline, conversie en mailresultaten komen hier." />;
}
