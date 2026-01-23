import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Disable TypeScript checking during build
  // The Convex backend is type-checked separately
  typescript: {
    ignoreBuildErrors: true,
  },

  // Set workspace root to next-app directory to avoid monorepo detection
  turbopack: {
    root: __dirname,
    resolveAlias: {
      "convex": path.resolve(__dirname, "../convex"),
    },
  },

  // Webpack config for production builds (fallback)
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "convex": path.resolve(__dirname, "../convex"),
    };
    return config;
  },
};

export default nextConfig;
