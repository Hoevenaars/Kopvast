import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { scoutAppUrl } from "@/lib/scout/config";
import { scoutPublicBase } from "@/lib/scout/base-path";
import { ScoutBottomNav } from "@/components/scout/bottom-nav";

export const metadata: Metadata = {
  metadataBase: new URL(scoutAppUrl().replace(/\/scout$/, "") || "https://scout.kopvast.nl"),
  applicationName: "Kopvast Scout",
  title: {
    default: "Kopvast Scout",
    template: "%s · Scout",
  },
  description: "Mobiele ingang van de Kopvast acquisitiemachine.",
  robots: { index: false, follow: false },
  manifest: "/scout/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Scout",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/scout/icon",
    apple: "/scout/icon",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-title": "Scout",
  },
};

export const viewport: Viewport = {
  themeColor: "#f3f0e8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function ScoutLayout({ children }: { children: ReactNode }) {
  const base = await scoutPublicBase();
  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-lg flex-1 flex-col bg-ivory px-5 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))]">
      {children}
      <ScoutBottomNav base={base} />
    </div>
  );
}
