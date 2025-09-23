import { createRoot } from "react-dom/client";
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
    } catch {}
  });
  window.addEventListener('error', (e) => {
    try {
      const msg = String(e?.message ?? '');
      if (isExtMsgError(msg)) {
        console.warn('[Dev] Suppressed extension messaging error (window.error):', msg);
        e.preventDefault();
      }
    } catch {}
  }, true);
}

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

createRoot(document.getElementById("root")!).render(
  <ConvexAuthProvider client={convex}>
    <App />
  </ConvexAuthProvider>,
);
