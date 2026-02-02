import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { api } from "../convex/_generated/api";
import "./index.css";
import App from "./App";
import { ToastProvider } from "./components/ui";

// Dev-only: Suppress noisy Chrome extension messaging errors that are unrelated to the app
if (import.meta.env?.DEV) {
  const isExtMsgError = (msg?: string) => !!msg && (
    msg.includes('A listener indicated an asynchronous response') ||
    msg.includes('message channel closed before a response') ||
    msg.includes('Unchecked runtime.lastError')
  );
  window.addEventListener('unhandledrejection', (e) => {
    try {
      const reason: any = e.reason;
      const msg = String(reason?.message ?? reason ?? '');
      if (isExtMsgError(msg)) {
        console.warn('[Dev] Suppressed extension messaging error (unhandledrejection):', msg);
        e.preventDefault();
      }
    } catch {
      // Error checking failed
    }
  });
  window.addEventListener('error', (e) => {
    try {
      const msg = String(e?.message ?? '');
      if (isExtMsgError(msg)) {
        console.warn('[Dev] Suppressed extension messaging error (window.error):', msg);
        e.preventDefault();
      }
    } catch {
      // Error checking failed
    }
  }, true);
}

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

// Prod: capture global errors into a deduped bug-card workflow (Ralph loop substrate).
if (import.meta.env.PROD) {
  const lastSentBySig = new Map<string, number>();
  const send = (args: { message: string; stack?: string; route?: string; section?: string; url?: string; userAgent?: string }) => {
    try {
      const raw = JSON.stringify({
        m: String(args.message || "").slice(0, 300),
        s: String(args.stack || "").split("\n").slice(0, 6).join("\n"),
        r: String(args.route || "").slice(0, 200),
        c: String(args.section || "").slice(0, 80),
      });
      let hash = 2166136261;
      for (let i = 0; i < raw.length; i++) {
        hash ^= raw.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
      }
      const signature = `bug_${(hash >>> 0).toString(16).padStart(8, "0")}`;

      const now = Date.now();
      const last = lastSentBySig.get(signature) ?? 0;
      if (now - last < 30_000) return;
      lastSentBySig.set(signature, now);

      convex.mutation(api.domains.operations.bugLoop.reportClientError, {
        message: args.message,
        stack: args.stack,
        route: args.route,
        section: args.section,
        url: args.url,
        userAgent: args.userAgent,
      }).catch(() => {
        // best-effort
      });
    } catch {
      // best-effort
    }
  };

  window.addEventListener("error", (e) => {
    try {
      const err: any = (e as any).error;
      send({
        message: String(err?.message ?? (e as any).message ?? "window.error"),
        stack: err?.stack ? String(err.stack) : undefined,
        route: window.location?.pathname,
        section: undefined,
        url: window.location?.href,
        userAgent: navigator.userAgent,
      });
    } catch {
      // best-effort
    }
  });

  window.addEventListener("unhandledrejection", (e) => {
    try {
      const reason: any = (e as any).reason;
      send({
        message: String(reason?.message ?? reason ?? "unhandledrejection"),
        stack: reason?.stack ? String(reason.stack) : undefined,
        route: window.location?.pathname,
        section: undefined,
        url: window.location?.href,
        userAgent: navigator.userAgent,
      });
    } catch {
      // best-effort
    }
  });
}

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <ConvexAuthProvider client={convex}>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ConvexAuthProvider>
  </BrowserRouter>,
);

// Register service worker for caching and offline support
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({
      immediate: true,
      onNeedRefresh() {
        console.log('[PWA] New content available, will update on next visit');
      },
      onOfflineReady() {
        console.log('[PWA] App ready to work offline');
      },
      onRegistered(registration) {
        console.log('[PWA] Service Worker registered');
        // Check for updates every hour
        setInterval(() => {
          registration?.update();
        }, 60 * 60 * 1000);
      },
      onRegisterError(error) {
        console.error('[PWA] Service Worker registration failed:', error);
      },
    });
  });
}
