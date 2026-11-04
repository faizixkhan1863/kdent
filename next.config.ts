import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  images: {
    // AVIF-first: clinic photos get ~30% smaller than WebP on Vercel's CDN.
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
