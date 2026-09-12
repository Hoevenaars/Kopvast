import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["", "/websites", "/merkidentiteit", "/sjablonen", "/werkwijze", "/resultaten", "/over-ons", "/kansen", "/aanvraag", "/privacy", "/cookies", "/voorwaarden"];
  return paths.map((path) => ({
    url: `${site.url}${path}`,
    lastModified: new Date(),
  }));
}
