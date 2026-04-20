/**
 * useScrubTime — subscribe to the shared timeline cursor in the URL
 * hash (`?t=<ms>`). Returns `null` when the reader is viewing "now".
 *
 * Used by `NotebookTimeline` (writer) and `EntityNotebookLive`
 * decoration filter (reader) so the two stay in sync without prop-
 * drilling through Suspense boundaries. The URL hash is also the
 * serialization format for shareable deep links.
 *
 * Why not Convex / a context? Because the cursor is a pure client
 * preference (not persisted, not shared across users) and the URL
 * hash is the native web way to represent a single-page position
 * anchor. Bonus: back/forward nav gets scrub history for free.
 */

import { useEffect, useState } from "react";

const URL_HASH_KEY = "t";

function readFromHash(): number | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  const params = new URLSearchParams(hash);
  const raw = params.get(URL_HASH_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function useScrubTime(): number | null {
  const [value, setValue] = useState<number | null>(() => readFromHash());
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onHash = () => setValue(readFromHash());
    window.addEventListener("hashchange", onHash);
    // Also poll briefly for programmatic replaceState changes (same
    // tab, no hashchange event). Cheap: 500ms interval, compares
    // scalar value only, stops when the document unloads.
    const pollId = window.setInterval(() => {
      const next = readFromHash();
      setValue((prev) => (prev === next ? prev : next));
    }, 500);
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.clearInterval(pollId);
    };
  }, []);
  return value;
}
