import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";
import { visualizer } from "rollup-plugin-visualizer";
import { imagetools } from "vite-imagetools";
import { VitePWA } from "vite-plugin-pwa";
import Critters from "critters";
/// <reference types="vitest" />

// Critical CSS plugin using Critters
function criticalCSSPlugin(): Plugin {
  return {
    name: 'vite-plugin-critical-css',
    apply: 'build',
    enforce: 'post',
    async closeBundle() {
      try {
        const distDir = path.resolve(__dirname, "dist");
        const indexPath = path.join(distDir, "index.html");
        if (!fs.existsSync(indexPath)) return;

        const html = await fs.promises.readFile(indexPath, "utf8");
        const critters = new Critters({
          path: distDir,
          publicPath: "/",
          preload: "swap",
          noscriptFallback: true,
          inlineFonts: true,
          preloadFonts: true,
          compress: true,
          pruneSource: false,
        });

        const result = await critters.process(html);
        await fs.promises.writeFile(indexPath, result, "utf8");
      } catch (error) {
        console.warn("[Critical CSS] Failed to process:", error);
      }
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Root cause: terser minification can OOM on 2-core / 8GB builders (Vercel + local).
  // Default to esbuild minify for reliability; opt into terser via NODEBENCH_MINIFY=terser.
  //
  // Example:
  //   NODEBENCH_MINIFY=terser npm run build
  //   NODEBENCH_MINIFY=esbuild npm run build
  //
  // "esbuild" is the Vite default and is far more memory efficient.
  // Terser is retained for optional maximum compression.
  const minify = (process.env.NODEBENCH_MINIFY ?? "esbuild") === "terser" ? "terser" : "esbuild";
  const useTerser = minify === "terser";
  const enableCriticalCss = mode === "production" && process.env.NODEBENCH_CRITICAL_CSS === "1";

  return ({
    plugins: [
    react(),
    // Service Worker + PWA for aggressive caching
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
       manifest: {
         name: 'NodeBench AI',
         short_name: 'NodeBench',
         description: 'AI-powered research and analytics platform',
         theme_color: '#09090B',
         background_color: '#09090B',
         icons: [
           {
             src: '/favicon.svg',
             sizes: '192x192',
            type: 'image/svg+xml',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // Cache Google Fonts
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Cache JS/CSS with stale-while-revalidate
          {
            urlPattern: /\.(?:js|css)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-resources',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          // Cache images
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
      },
    }),
    // Image optimization - converts PNG/JPG to WebP with quality 80
    imagetools({
      defaultDirectives: (url) => {
        // Only optimize images in public/assets
        if (url.searchParams.has('url') && url.searchParams.get('url')?.includes('/assets/')) {
          return new URLSearchParams({
            format: 'webp',
            quality: '80',
          });
        }
        return new URLSearchParams();
      },
    }),
     // Critical CSS inlining can significantly increase build time on constrained builders.
     // Keep it opt-in (NODEBENCH_CRITICAL_CSS=1) and rely on `index.html` baseline styles to prevent FOUC.
     enableCriticalCss ? criticalCSSPlugin() : null,
    // Bundle analyzer - run with: ANALYZE=true npm run build
    process.env.ANALYZE === 'true' ? visualizer({
      filename: './dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    }) : null,
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
    // Prevent duplicate React instances (common cause of "Invalid hook call" in Vite/monorepo setups).
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "rehype-raw", "rehype-sanitize", "rehype-parse", "hast-util-raw"],
    // Exclude heavy libraries that are lazy-loaded to speed up dev server start
    exclude: ["@pdfme/generator"],
  },
  // esbuild options for transforms (and for minification when NODEBENCH_MINIFY=esbuild)
  esbuild: {
    // eslint-disable-next-line no-undef
    // Keep `console.error`/`console.warn` in production so ErrorBoundaries and
    // client error reporting can surface actionable diagnostics.
    drop: mode === "production" ? ["debugger"] : undefined,
    pure: mode === "production" ? ["console.log", "console.info", "console.debug"] : undefined,
    // Remove legal comments for smaller transforms
    legalComments: 'none',
    // Tree shake during transforms
    treeShaking: true,
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
    minify,
    target: "es2020",
    cssMinify: true,
    // Modern browsers don't need module preload polyfill
    modulePreload: { polyfill: false },
    terserOptions: useTerser ? {
      compress: {
        // Keep `console.error`/`console.warn` for diagnostics; strip noisy logs only.
        drop_console: false,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'], // Remove specific console methods
        passes: 2, // Multiple compression passes for better results
      },
      mangle: {
        safari10: true, // Safari 10 compatibility
      },
      format: {
        comments: false, // Remove all comments
      },
    } : undefined,
    rollupOptions: {
      // Tree shaking - be careful with external deps that have side effects
      treeshake: {
        moduleSideEffects: true, // Don't assume side-effect-free (fixes lucide-react init)
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false,
      },
      output: {
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
        // Route-based code splitting for optimal loading
        manualChunks(id) {
          // Vendor chunks - only split large/important libraries
          if (id.includes('/node_modules/')) {
            // React core (keep small and cacheable)
            if (id.match(/\/node_modules\/(react\/|react-dom\/|scheduler\/)/)) {
              return 'react-vendor';
            }
            if (id.includes('/node_modules/react-router-dom/')) {
              return 'router-vendor';
            }
            // Convex (API client)
            if (id.includes('/node_modules/convex/')) {
              return 'convex-vendor';
            }
            // Let Vite handle lucide-react and recharts naturally (no manual chunking)
            // to avoid initialization order issues
            // Editor ecosystem (heavy, should be separate)
            if (id.includes('/node_modules/@tiptap/') || id.includes('/node_modules/@blocknote/')) {
              return 'editor-vendor';
            }
            // Spreadsheet engine (very heavy)
            if (id.includes('/node_modules/xlsx')) {
              return 'spreadsheet-vendor';
            }
            // Date utilities (commonly used, stable)
            if (id.includes('/node_modules/date-fns/')) {
              return 'date-vendor';
            }
            // Animation library (Framer Motion - heavy)
            if (id.includes('/node_modules/framer-motion/')) {
              return 'motion-vendor';
            }
            // Markdown/syntax highlighting (heavy)
            if (id.includes('/node_modules/prismjs/') || id.includes('/node_modules/highlight.js/')) {
              return 'syntax-vendor';
            }
            // Zod (validation, commonly used)
            if (id.includes('/node_modules/zod/')) {
              return 'zod-vendor';
            }
            // Let everything else be handled by Vite's default splitting
            // This avoids creating one massive vendor chunk
          }

          // Route-based splitting for application features
          if (id.includes('/features/analytics/')) {
            return 'route-analytics';
          }
          if (id.includes('/features/documents/')) {
            return 'route-documents';
          }
          if (id.includes('/features/agents/')) {
            return 'route-agents';
          }
          // Research feature: Split into core hub vs lazy-loaded sections
          // This allows React.lazy() components to become separate chunks
          if (id.includes('/features/research/views/ResearchHub')) {
            return 'route-research-hub';
          }
          if (id.includes('/features/research/views/CinematicHome')) {
            return 'route-research-home';
          }
          if (id.includes('/features/research/sections/')) {
            return 'route-research-sections';
          }
          if (id.includes('/features/research/components/')) {
            // Let components chunk naturally via lazy loading
            return undefined;
          }
          if (id.includes('/features/spreadsheets/')) {
            return 'route-spreadsheets';
          }
          if (id.includes('/features/calendar/')) {
            return 'route-calendar';
          }

          // Heavy editors from src
          if (id.includes('/components/Editor/') || id.includes('UnifiedEditor')) {
            return 'editor';
          }

          // Default: shared application code
          return undefined;
        },
      },
    },
    // Enable source maps for production debugging (can disable for smaller bundles)
    sourcemap: false, // Disable source maps to reduce bundle size
  },
  });
});
