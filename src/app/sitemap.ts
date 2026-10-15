import type { MetadataRoute } from "next";
import { routes, site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const hidden = new Set<string>([routes.start, routes.aanvraag]);
  const paths = Object.values(routes).filter((path) => !hidden.has(path));
  return paths.map((path) => ({
    url: `${site.url}${path === "/" ? "" : path}`,
  }));
}
