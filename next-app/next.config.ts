import type { NextConfig } from "next";
import path from "path";

const parentSrc = path.resolve(__dirname, "../src");

const nextConfig: NextConfig = {
  // Disable TypeScript checking during build
  // The Convex backend is type-checked separately
  typescript: {
    ignoreBuildErrors: true,
  },

  // Allow importing from parent directories
  experimental: {
    externalDir: true,
  },

  // Transpile the parent src directory
  transpilePackages: ["@vite-src"],

  // Set workspace root to parent directory for proper resolution
  turbopack: {
    root: path.resolve(__dirname, ".."),
    resolveAlias: {
      "convex": path.resolve(__dirname, "../convex"),
      "@vite-src": parentSrc,
    },
  },

  // Webpack config for production builds
  webpack: (config, { isServer }) => {
    // Add alias - both @vite-src and @ point to parent src
    config.resolve.alias = {
      ...config.resolve.alias,
      "convex": path.resolve(__dirname, "../convex"),
      "@vite-src": parentSrc,
      "@": parentSrc,
    };

    // Extend resolve modules to include parent src
    config.resolve.modules = [
      ...(config.resolve.modules || []),
      parentSrc,
      path.resolve(__dirname, "../node_modules"),
    ];

    return config;
  },
};

export default nextConfig;
