import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
/// <reference types="vitest" />

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
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
    include: [
      "react",
      "react-dom",
      "rehype-raw",
      "rehype-sanitize",
      "rehype-parse",
      "hast-util-raw",
    ],
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }

          const normalizedId = id.replace(/\\/g, "/");

          if (
            normalizedId.includes("/node_modules/react/") ||
            normalizedId.includes("/node_modules/react-dom/")
          ) {
            return "react-vendor";
          }

          if (
            normalizedId.includes("/node_modules/convex/") ||
            normalizedId.includes("/node_modules/@convex-dev/")
          ) {
            return "convex-vendor";
          }

          if (
            normalizedId.includes("/node_modules/ai/") ||
            normalizedId.includes("/node_modules/@ai-sdk/") ||
            normalizedId.includes("/node_modules/openai/") ||
            normalizedId.includes("/node_modules/@google/") ||
            normalizedId.includes("/node_modules/@anthropic-ai/")
          ) {
            return "ai-vendor";
          }

          if (
            normalizedId.includes("/node_modules/vega/") ||
            normalizedId.includes("/node_modules/vega-lite/") ||
            normalizedId.includes("/node_modules/vega-embed/") ||
            normalizedId.includes("/node_modules/recharts/")
          ) {
            return "chart-vendor";
          }

          if (
            normalizedId.includes("/node_modules/@tiptap/") ||
            normalizedId.includes("/node_modules/@blocknote/")
          ) {
            return "editor-core-vendor";
          }

          if (
            normalizedId.includes("/node_modules/prosemirror-") ||
            normalizedId.includes("/node_modules/prosemirror/")
          ) {
            return "prosemirror-vendor";
          }

          if (
            normalizedId.includes("/node_modules/micromark") ||
            normalizedId.includes("/node_modules/mdast-") ||
            normalizedId.includes("/node_modules/hast-") ||
            normalizedId.includes("/node_modules/unist-") ||
            normalizedId.includes("/node_modules/vfile") ||
            normalizedId.includes("/node_modules/react-markdown/") ||
            normalizedId.includes("/node_modules/rehype-") ||
            normalizedId.includes("/node_modules/remark-") ||
            normalizedId.includes("/node_modules/dompurify/")
          ) {
            return "markdown-vendor";
          }

          if (
            normalizedId.includes("/node_modules/prismjs/") ||
            normalizedId.includes("/node_modules/refractor/") ||
            normalizedId.includes("/node_modules/react-syntax-highlighter/")
          ) {
            return "syntax-vendor";
          }

          if (
            normalizedId.includes("/node_modules/ag-grid-") ||
            normalizedId.includes("/node_modules/react-data-grid/") ||
            normalizedId.includes("/node_modules/react-virtualized-auto-sizer/") ||
            normalizedId.includes("/node_modules/react-window/")
          ) {
            return "data-vendor";
          }

          if (
            normalizedId.includes("/node_modules/react-spreadsheet/") ||
            normalizedId.includes("/node_modules/xlsx/") ||
            normalizedId.includes("/node_modules/papaparse/") ||
            normalizedId.includes("/node_modules/fast-formula-parser/") ||
            normalizedId.includes("/node_modules/chevrotain/") ||
            normalizedId.includes("/node_modules/jstat/")
          ) {
            return "spreadsheet-vendor";
          }

          if (
            normalizedId.includes("/node_modules/emoji-mart/") ||
            normalizedId.includes("/node_modules/emoji-mart-data/")
          ) {
            return "emoji-vendor";
          }

          if (normalizedId.includes("/node_modules/parse5/")) {
            return "html-vendor";
          }

          if (
            normalizedId.includes("/node_modules/yjs/") ||
            normalizedId.includes("/node_modules/y-protocols/") ||
            normalizedId.includes("/node_modules/lib0/")
          ) {
            return "collab-vendor";
          }

          if (normalizedId.includes("/node_modules/reactflow/")) {
            return "flow-vendor";
          }

          if (
            normalizedId.includes("/node_modules/@mantine/") ||
            normalizedId.includes("/node_modules/lucide-react/") ||
            normalizedId.includes("/node_modules/framer-motion/") ||
            normalizedId.includes("/node_modules/sonner/")
          ) {
            return "ui-vendor";
          }

          return "vendor";
        },
      },
    },
  },
}));
