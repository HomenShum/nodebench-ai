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
    // Enable minification optimizations
    minify: 'esbuild',
    // Target modern browsers for smaller output
    target: 'es2020',
    // Optimize CSS
    cssMinify: true,
    rollupOptions: {
      output: {
        // Use content hashing for better caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }

          const normalizedId = id.replace(/\\/g, "/");

          // Core React - keep separate for maximum caching
          if (
            normalizedId.includes("/node_modules/react/") ||
            normalizedId.includes("/node_modules/react-dom/")
          ) {
            return "react-vendor";
          }

          // Scheduler (React dependency) - separate for caching
          if (normalizedId.includes("/node_modules/scheduler/")) {
            return "react-vendor";
          }

          // Convex SDK - frequently used, separate chunk
          if (
            normalizedId.includes("/node_modules/convex/") ||
            normalizedId.includes("/node_modules/@convex-dev/")
          ) {
            return "convex-vendor";
          }

          // AI SDKs - split into smaller chunks
          if (normalizedId.includes("/node_modules/@anthropic-ai/")) {
            return "ai-anthropic-vendor";
          }
          if (normalizedId.includes("/node_modules/openai/")) {
            return "ai-openai-vendor";
          }
          if (normalizedId.includes("/node_modules/@google/")) {
            return "ai-google-vendor";
          }
          if (
            normalizedId.includes("/node_modules/ai/") ||
            normalizedId.includes("/node_modules/@ai-sdk/")
          ) {
            return "ai-vendor";
          }

          // Charts - separate Vega (larger) from Recharts (smaller)
          if (
            normalizedId.includes("/node_modules/vega/") ||
            normalizedId.includes("/node_modules/vega-lite/") ||
            normalizedId.includes("/node_modules/vega-embed/")
          ) {
            return "vega-vendor";
          }
          if (normalizedId.includes("/node_modules/recharts/")) {
            return "recharts-vendor";
          }

          // Editor core
          if (
            normalizedId.includes("/node_modules/@tiptap/") ||
            normalizedId.includes("/node_modules/@blocknote/")
          ) {
            return "editor-core-vendor";
          }

          // ProseMirror
          if (
            normalizedId.includes("/node_modules/prosemirror-") ||
            normalizedId.includes("/node_modules/prosemirror/")
          ) {
            return "prosemirror-vendor";
          }

          // Markdown processing
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

          // Syntax highlighting - lazy loaded, separate chunk
          if (
            normalizedId.includes("/node_modules/prismjs/") ||
            normalizedId.includes("/node_modules/refractor/") ||
            normalizedId.includes("/node_modules/react-syntax-highlighter/")
          ) {
            return "syntax-vendor";
          }

          // Data grid components
          if (
            normalizedId.includes("/node_modules/ag-grid-") ||
            normalizedId.includes("/node_modules/react-data-grid/")
          ) {
            return "data-grid-vendor";
          }

          // Virtualization (used in multiple places)
          if (
            normalizedId.includes("/node_modules/react-virtualized-auto-sizer/") ||
            normalizedId.includes("/node_modules/react-window/")
          ) {
            return "virtualization-vendor";
          }

          // Spreadsheet - lazy loaded feature
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

          // Emoji picker - lazy loaded
          if (
            normalizedId.includes("/node_modules/emoji-mart/") ||
            normalizedId.includes("/node_modules/emoji-mart-data/")
          ) {
            return "emoji-vendor";
          }

          // HTML parsing
          if (normalizedId.includes("/node_modules/parse5/")) {
            return "html-vendor";
          }

          // Collaboration (Yjs)
          if (
            normalizedId.includes("/node_modules/yjs/") ||
            normalizedId.includes("/node_modules/y-protocols/") ||
            normalizedId.includes("/node_modules/lib0/")
          ) {
            return "collab-vendor";
          }

          // React Flow
          if (normalizedId.includes("/node_modules/reactflow/")) {
            return "flow-vendor";
          }

          // DnD Kit
          if (normalizedId.includes("/node_modules/@dnd-kit/")) {
            return "dnd-vendor";
          }

          // Framer Motion - animation library
          if (normalizedId.includes("/node_modules/framer-motion/")) {
            return "animation-vendor";
          }

          // UI libraries (smaller, frequently used)
          if (
            normalizedId.includes("/node_modules/@mantine/") ||
            normalizedId.includes("/node_modules/sonner/")
          ) {
            return "ui-vendor";
          }

          // Icons - frequently used
          if (normalizedId.includes("/node_modules/lucide-react/")) {
            return "icons-vendor";
          }

          // Zod validation
          if (normalizedId.includes("/node_modules/zod/")) {
            return "validation-vendor";
          }

          // Date/time utilities
          if (
            normalizedId.includes("/node_modules/date-fns/") ||
            normalizedId.includes("/node_modules/dayjs/")
          ) {
            return "date-vendor";
          }

          // Catch-all vendor chunk for remaining dependencies.
          // Split into a few deterministic buckets to avoid a single multi-MB vendor chunk.
          const parts = normalizedId.split("/node_modules/");
          const after = parts[1] ?? "";
          const segs = after.split("/").filter(Boolean);
          const pkg = segs[0]?.startsWith("@") ? `${segs[0]}/${segs[1] ?? ""}` : (segs[0] ?? "");
          const key = pkg.replace(/^@/, "").toLowerCase();
          const first = key[0] ?? "z";
          const bucket =
            first <= "f" ? "a-f" :
            first <= "l" ? "g-l" :
            first <= "r" ? "m-r" : "s-z";
          return `vendor-${bucket}`;
        },
      },
    },
  },
}));
