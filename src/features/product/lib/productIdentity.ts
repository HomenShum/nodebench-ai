const PRODUCT_ANON_SESSION_KEY = "nodebench:product-anon-session";

function canUseStorage() {
  return typeof window !== "undefined" && !!window.sessionStorage;
}

function createAnonymousSessionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `anon-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

export function getAnonymousProductSessionId() {
  if (!canUseStorage()) return "anon-server";

  try {
    const existing = window.sessionStorage.getItem(PRODUCT_ANON_SESSION_KEY);
    if (existing) return existing;
    const next = createAnonymousSessionId();
    window.sessionStorage.setItem(PRODUCT_ANON_SESSION_KEY, next);
    return next;
  } catch {
    return "anon-fallback";
  }
}
