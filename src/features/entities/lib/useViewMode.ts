/**
 * useViewMode — subscribe to the `?view=read` URL param that toggles
 * the notebook between edit and read modes.
 *
 * Pattern: one React state, one `data-view-mode` attribute on the
 * page shell, CSS does the chrome-stripping. No component-tree fork.
 * The share-token path (`/share/<token>`) forces `read` regardless
 * of the URL param, because public visitors must never see edit UI.
 *
 * Invariants:
 *   - Param name is `view`; valid values are `edit` (default) | `read`.
 *   - Hook is SSR-safe (returns "edit" server-side).
 *   - No server round-trip on toggle — the URL param change is pure
 *     client state; components re-render via the location subscription.
 */

import { useCallback, useEffect, useState } from "react";

export type ViewMode = "edit" | "read";

const URL_PARAM_KEY = "view";

function readFromLocation(): ViewMode {
  if (typeof window === "undefined") return "edit";
  const params = new URLSearchParams(window.location.search);
  const raw = params.get(URL_PARAM_KEY);
  return raw === "read" ? "read" : "edit";
}

/**
 * `useViewMode` — returns the current view mode plus a setter that
 * updates the URL param without a navigation. The URL is the source
 * of truth so deep links + back/forward history work for free.
 */
export function useViewMode(): {
  viewMode: ViewMode;
  setViewMode: (next: ViewMode) => void;
  isReadMode: boolean;
} {
  const [viewMode, setMode] = useState<ViewMode>(() => readFromLocation());

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Listen for popstate (back/forward) so the mode tracks history.
    const onPop = () => setMode(readFromLocation());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const setViewMode = useCallback((next: ViewMode) => {
    setMode(next);
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (next === "read") {
      params.set(URL_PARAM_KEY, "read");
    } else {
      params.delete(URL_PARAM_KEY);
    }
    const nextSearch = params.toString();
    const nextUrl =
      window.location.pathname +
      (nextSearch ? `?${nextSearch}` : "") +
      window.location.hash;
    window.history.pushState(null, "", nextUrl);
  }, []);

  return { viewMode, setViewMode, isReadMode: viewMode === "read" };
}
