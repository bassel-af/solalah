import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["@xyflow/react"],
  },
};

export default nextConfig;
