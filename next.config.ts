import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["pdf-parse"],
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
