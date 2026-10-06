import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { site } from "@/lib/site";

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: site.name,
      url: site.url,
      email: site.email,
      description: site.description,
    },
    {
      "@type": "WebSite",
      name: site.name,
      url: site.url,
      inLanguage: "nl-NL",
      description: site.description,
    },
  ],
};

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <SiteHeader />
      <main id="inhoud" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
