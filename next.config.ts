import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.78.87"],
  serverExternalPackages: ["sharp"],
  // Every <Image> src in the app points at an auth-protected /api/v1/slides/*
  // route. Next's image optimizer fetches the source server-side WITHOUT the
  // user's session cookie, so it gets a 401 and the preview breaks. These
  // images are already pre-sized (thumbnails/medium), so optimization buys
  // nothing — serve them directly (browser request carries the cookie).
  images: { unoptimized: true },
};

export default nextConfig;
