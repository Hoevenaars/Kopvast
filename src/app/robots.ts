import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/klant", "/console", "/inloggen", "/voorstel", "/scout", "/domein"],
    },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
