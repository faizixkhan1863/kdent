import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // msedge-tts uses isomorphic-ws internals that must not be bundled.
  serverExternalPackages: ["msedge-tts"],
  images: {
    // AVIF-first: clinic photos get ~30% smaller than WebP on Vercel's CDN.
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
