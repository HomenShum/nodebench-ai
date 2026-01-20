import { defineConfig, splitVendorChunkPlugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
/// <reference types="vitest" />

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    splitVendorChunkPlugin(),
    // The code below enables dev tools like taking screenshots of your site
    // while it is being developed on chef.convex.dev.
    // Feel free to remove this code if you're no longer developing your app with Chef.
    mode === "development"
      ? {
          name: "inject-chef-dev",
          transform(code: string, id: string) {
            if (id.includes("main.tsx")) {
              return {
                code: `${code}

/* Added by Vite plugin inject-chef-dev */
window.addEventListener('message', async (message) => {
  if (message.source !== window.parent) return;
  if (message.data.type !== 'chefPreviewRequest') return;

  const worker = await import('https://chef.convex.dev/scripts/worker.bundled.mjs');
  await worker.respondToMessage(message);
});
            `,
                map: null,
              };
            }
            return null;
          },
        }
      : null,
    // End of code for taking screenshots on chef.convex.dev.
  ].filter(Boolean),
  resolve: {
    // Order matters: keep specific aliases above the generic "@/" alias.
    alias: [
      { find: "@features", replacement: path.resolve(__dirname, "./src/features").replace(/\\/g, "/") },
      { find: "@shared", replacement: path.resolve(__dirname, "./src/shared").replace(/\\/g, "/") },
      { find: "shared", replacement: path.resolve(__dirname, "./shared").replace(/\\/g, "/") },
      { find: /^@\//, replacement: `${path.resolve(__dirname, "./src").replace(/\\/g, "/")}/` },
    ],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "rehype-raw", "rehype-sanitize", "rehype-parse", "hast-util-raw"],
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
  build: {
    // The heaviest routes/editors are lazy-loaded; keep this warning slightly higher
    // so it flags meaningful regressions without noise.
    chunkSizeWarningLimit: 1800,
    minify: "esbuild",
    target: "es2020",
    cssMinify: true,
    rollupOptions: {
      output: {
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
}));
