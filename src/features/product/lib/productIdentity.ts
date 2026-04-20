const PRODUCT_ANON_SESSION_KEY = "nodebench:product-anon-session";

function canUseStorage() {
  return typeof window !== "undefined" && !!window.localStorage && !!window.sessionStorage;
}

function createAnonymousSessionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `anon-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

function readStoredAnonymousSessionId() {
  if (!canUseStorage()) return null;
  const persisted = window.localStorage.getItem(PRODUCT_ANON_SESSION_KEY);
  if (persisted) return persisted;
  const tabScoped = window.sessionStorage.getItem(PRODUCT_ANON_SESSION_KEY);
  if (tabScoped) return tabScoped;
  return null;
}

function persistAnonymousSessionId(sessionId: string) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(PRODUCT_ANON_SESSION_KEY, sessionId);
  window.sessionStorage.setItem(PRODUCT_ANON_SESSION_KEY, sessionId);
}

export function getAnonymousProductSessionId() {
  if (!canUseStorage()) return "anon-server";

  try {
    const existing = readStoredAnonymousSessionId();
    if (existing) {
      persistAnonymousSessionId(existing);
      return existing;
    }
    const next = createAnonymousSessionId();
    persistAnonymousSessionId(next);
    return next;
  } catch {
    return "anon-fallback";
  }
}
