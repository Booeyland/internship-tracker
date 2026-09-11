import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["node:sqlite"],
  eslint: { ignoreDuringBuilds: false },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "logo.clearbit.com" }],
  },
};

export default nextConfig;
