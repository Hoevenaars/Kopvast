import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async redirects() {
    return [
      { source: "/kansen", destination: "/websitecheck", permanent: true },
      { source: "/resultaten", destination: "/werk", permanent: true },
      { source: "/sjablonen", destination: "/marketingmiddelen", permanent: true },
      { source: "/merkidentiteit", destination: "/merk", permanent: true },
      { source: "/over-ons", destination: "/over-kopvast", permanent: true },
    ];
  },
};

export default nextConfig;
