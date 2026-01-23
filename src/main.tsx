import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import "./index.css";
import App from "./App";

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

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <ConvexAuthProvider client={convex}>
      <App />
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
