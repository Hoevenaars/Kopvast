import type { MetadataRoute } from "next";
import { scoutAppUrl } from "@/lib/scout/config";

export default function scoutManifest(): MetadataRoute.Manifest {
  const app = scoutAppUrl();
  const origin = app.replace(/\/scout$/, "");
  return {
    id: origin,
    name: "Kopvast Scout",
    short_name: "Scout",
    description: "Mobiele ingang van de Kopvast acquisitiemachine.",
    start_url: app.includes("scout.kopvast.nl") ? "/" : "/scout",
    scope: app.includes("scout.kopvast.nl") ? "/" : "/scout",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f3f0e8",
    theme_color: "#121212",
    lang: "nl",
    icons: [
      { src: "/scout/icon", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/scout/icon", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    share_target: {
      action: "/share",
      method: "GET",
      enctype: "application/x-www-form-urlencoded",
      params: {
        title: "title",
        text: "text",
        url: "url",
      },
    },
  } as MetadataRoute.Manifest;
}
