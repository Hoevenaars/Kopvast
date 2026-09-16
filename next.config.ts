import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
  async redirects() {
    return [
      { source: "/kansen", destination: "/websitecheck", permanent: true },
      { source: "/resultaten", destination: "/werk", permanent: true },
      { source: "/sjablonen", destination: "/marketingmiddelen", permanent: true },
      { source: "/merkidentiteit", destination: "/merk", permanent: true },
      { source: "/over-ons", destination: "/over-kopvast", permanent: true },
      { source: "/console", destination: "/klant", permanent: true },
      { source: "/console/bestanden", destination: "/klant/media", permanent: true },
      { source: "/console/verzoeken", destination: "/klant/wijzigingen", permanent: true },
      { source: "/admin/leads", destination: "/admin/aanvragen", permanent: true },
      { source: "/admin/leads/:id", destination: "/admin/aanvragen/:id", permanent: true },
      { source: "/admin/mail", destination: "/admin/mails", permanent: true },
      { source: "/admin/prospects", destination: "/admin/acquisitie", permanent: false },
      { source: "/admin/prospects/:id", destination: "/admin/acquisitie/:id", permanent: false },
    ];
  },
};

export default nextConfig;
