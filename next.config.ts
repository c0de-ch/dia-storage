import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.78.87"],
  serverExternalPackages: ["sharp"],
};

export default nextConfig;
