import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";
import { imagetools } from "vite-imagetools";
import { VitePWA } from "vite-plugin-pwa";
import Critters from "critters";
/// <reference types="vitest" />

// Critical CSS plugin using Critters
function criticalCSSPlugin(): Plugin {
  const critters = new Critters({
    path: 'dist',
    publicPath: '/',
    preload: 'swap',
    noscriptFallback: true,
    inlineFonts: true,
    preloadFonts: true,
    compress: true,
    pruneSource: false,
  });

  return {
    name: 'vite-plugin-critical-css',
    apply: 'build',
    enforce: 'post',
    async transformIndexHtml(html) {
      try {
        const result = await critters.process(html);
        return result;
      } catch (error) {
        console.warn('[Critical CSS] Failed to process:', error);
        return html;
      }
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
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
        theme_color: '#ffffff',
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
    // Critical CSS inlining for faster FCP
    mode === 'production' ? criticalCSSPlugin() : null,
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
    minify: "terser", // Switch to terser for better compression (~20-30% better than esbuild)
    target: "es2020",
    cssMinify: true,
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
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
    },
    rollupOptions: {
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
            // Charts (lazy loaded, should be separate)
            if (id.includes('/node_modules/recharts/')) {
              return 'charts';
            }
            // Editor ecosystem (heavy, should be separate)
            if (id.includes('/node_modules/@tiptap/') || id.includes('/node_modules/@blocknote/')) {
              return 'editor-vendor';
            }
            // Spreadsheet engine (very heavy)
            if (id.includes('/node_modules/xlsx')) {
              return 'spreadsheet-vendor';
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
          if (id.includes('/features/research/')) {
            return 'route-research';
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
}));
