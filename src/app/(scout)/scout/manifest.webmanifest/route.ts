import { scoutAppUrl } from "@/lib/scout/config";

export function GET() {
  const app = scoutAppUrl();
  const origin = app.replace(/\/scout$/, "");
  const start = app.includes("scout.kopvast.nl") ? "/" : "/scout";
  return Response.json(
    {
      id: origin,
      name: "Kopvast Scout",
      short_name: "Scout",
      description: "Mobiele ingang van de Kopvast acquisitiemachine.",
      start_url: start,
      scope: start,
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
        params: { title: "title", text: "text", url: "url" },
      },
    },
    {
      headers: {
        "Content-Type": "application/manifest+json; charset=utf-8",
        "X-Robots-Tag": "noindex",
      },
    }
  );
}
