/**
 * NotebookTimeline — bottom scrubber that treats the entity's agent
 * activity as a 1-D timeline the reader can replay.
 *
 * Pulled from the multi-agent-notebook-demo.html prototype's bottom
 * play/pause/progress bar, but wired to real runtime data:
 *   - `agentActions` rows (inline accepts / dismisses / asks)
 *   - `diligenceProjections` rows (agent-authored overlays)
 *   - `extendedThinkingCheckpoints` rows (reasoning checkpoints)
 *
 * Each event becomes a tick; scrubbing sets a shared `?t=<ms>`
 * URL-hash cursor that other components (decoration filter, flow
 * rail) can read to filter to "state at time t".
 *
 * Design rules the prototype taught us:
 *   - Calm by default (h-2 line, no chrome) — expands on hover
 *   - Play/Pause drives a real time cursor, not a frame index
 *   - "Now" pin snaps back to live-updating state
 *   - Scrub position is shareable (URL hash)
 *
 * Intentionally minimal: no keyboard shortcuts yet (follow-up),
 * no jump-to-event, no density heatmap. Those are easy extensions
 * once the primitive is live.
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { Pause, Play, Clock3 } from "lucide-react";
import { useConvexApi } from "@/lib/convexApi";
import { cn } from "@/lib/utils";

export interface NotebookTimelineProps {
  entitySlug: string;
  /** When provided, called with the current scrub time (ms) so
   *  parent filters (decorations, flow rail) can react. If omitted,
   *  the component still reads/writes the URL hash on its own. */
  onScrubChange?: (timeMs: number | null) => void;
  /** Hide the control entirely when there's zero agent activity. */
  hideWhenEmpty?: boolean;
  className?: string;
}

interface TimelineEvent {
  t: number;
  kind: "action" | "projection" | "checkpoint";
  label: string;
  color: string;
}

const URL_HASH_KEY = "t";

function readScrubFromHash(): number | null {
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

function writeScrubToHash(timeMs: number | null): void {
  if (typeof window === "undefined") return;
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  const params = new URLSearchParams(hash);
  if (timeMs == null) {
    params.delete(URL_HASH_KEY);
  } else {
    params.set(URL_HASH_KEY, String(timeMs));
  }
  const next = params.toString();
  // Preserve empty hash form when no params remain.
  window.history.replaceState(null, "", next ? `#${next}` : window.location.pathname + window.location.search);
}

function formatRelative(deltaMs: number): string {
  if (deltaMs < 60_000) return `${Math.max(0, Math.round(deltaMs / 1000))}s`;
  if (deltaMs < 3_600_000) return `${Math.floor(deltaMs / 60_000)}m`;
  if (deltaMs < 86_400_000) return `${Math.floor(deltaMs / 3_600_000)}h`;
  return `${Math.floor(deltaMs / 86_400_000)}d`;
}

export const NotebookTimeline = memo(function NotebookTimeline({
  entitySlug,
  onScrubChange,
  hideWhenEmpty = true,
  className,
}: NotebookTimelineProps) {
  const api = useConvexApi();

  // Three parallel reactive queries, each bounded + optional.
  const actions = useQuery(
    api?.domains?.agents?.agentActions?.listForEntity ?? ("skip" as any),
    api?.domains?.agents?.agentActions?.listForEntity
      ? { entitySlug, limit: 50 }
      : "skip",
  ) as Array<{ _id: string; createdAt: number; kind: string; summary: string }> | undefined;

  const projections = useQuery(
    api?.domains?.product?.diligenceProjections?.listForEntity ?? ("skip" as any),
    api?.domains?.product?.diligenceProjections?.listForEntity
      ? { entitySlug }
      : "skip",
  ) as Array<{ _id: string; updatedAt: number; blockType: string }> | undefined;

  const runs = useQuery(
    api?.domains?.product?.extendedThinking?.listRunsForEntity ?? ("skip" as any),
    api?.domains?.product?.extendedThinking?.listRunsForEntity
      ? { entitySlug, limit: 3 }
      : "skip",
  ) as Array<{ _id: string; startedAt: number; lastActivityAt: number; status: string }> | undefined;

  // Flatten into a single event list sorted by time.
  const events = useMemo<TimelineEvent[]>(() => {
    const out: TimelineEvent[] = [];
    for (const a of actions ?? []) {
      out.push({
        t: a.createdAt,
        kind: "action",
        label: a.summary,
        color: "#d97757",
      });
    }
    for (const p of projections ?? []) {
      out.push({
        t: p.updatedAt,
        kind: "projection",
        label: `${p.blockType} overlay`,
        color: "#529cca",
      });
    }
    for (const r of runs ?? []) {
      out.push({
        t: r.startedAt,
        kind: "checkpoint",
        label: `run ${r.status}`,
        color: "#9065b0",
      });
    }
    return out.sort((a, b) => a.t - b.t);
  }, [actions, projections, runs]);

  const firstT = events.length > 0 ? events[0].t : null;
  const lastT = events.length > 0 ? events[events.length - 1].t : null;
  const nowT = Date.now();

  // Timeline spans first event → now (not last event) so the scrubber
  // always has the "now" edge pinned on the right, even if the latest
  // event was hours ago. Prevents the "nothing happened for hours"
  // dead zone from vanishing.
  const spanEnd = nowT;
  const spanStart = firstT ?? nowT - 60_000;
  const spanMs = Math.max(1, spanEnd - spanStart);

  // Live-updating scrub cursor; null == follow now.
  const [scrub, setScrub] = useState<number | null>(() => readScrubFromHash());
  const [isPlaying, setIsPlaying] = useState(true);
  const playbackRef = useRef<number | null>(null);

  // Sync initial cursor from URL hash once queries resolve (events
  // may have landed after the component mounted).
  useEffect(() => {
    onScrubChange?.(scrub);
  }, [scrub, onScrubChange]);

  // Play loop: when playing, step cursor toward spanEnd, landing on
  // each event's timestamp in sequence. When scrub catches up to
  // spanEnd (within 1s), snap to null == "live now".
  useEffect(() => {
    if (!isPlaying || scrub == null) return;
    const step = () => {
      setScrub((prev) => {
        if (prev == null) return null;
        const next = events.find((e) => e.t > prev);
        if (!next) return null;
        return next.t;
      });
      playbackRef.current = window.setTimeout(step, 900);
    };
    playbackRef.current = window.setTimeout(step, 900);
    return () => {
      if (playbackRef.current) {
        window.clearTimeout(playbackRef.current);
        playbackRef.current = null;
      }
    };
  }, [isPlaying, scrub, events]);

  // Persist scrub position to URL hash (shareable deep links).
  useEffect(() => {
    writeScrubToHash(scrub);
  }, [scrub]);

  const handleTrackClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const nextT = spanStart + fraction * spanMs;
      setScrub(nextT);
      setIsPlaying(false);
    },
    [spanStart, spanMs],
  );

  const handlePlayPause = useCallback(() => {
    if (scrub == null) {
      // No active cursor — pressing Play scrubs to the first event
      // and starts stepping forward. Pressing Pause is a no-op.
      if (events.length > 0) {
        setScrub(events[0].t);
        setIsPlaying(true);
      }
      return;
    }
    setIsPlaying((p) => !p);
  }, [scrub, events]);

  const handleNow = useCallback(() => {
    setScrub(null);
    setIsPlaying(true);
  }, []);

  if (hideWhenEmpty && events.length === 0) {
    return null;
  }

  const cursorPercent =
    scrub == null ? 100 : Math.max(0, Math.min(100, ((scrub - spanStart) / spanMs) * 100));

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-[11px] text-content-muted",
        className,
      )}
      role="group"
      aria-label="Notebook timeline"
    >
      <button
        type="button"
        onClick={handlePlayPause}
        className="flex h-6 w-6 items-center justify-center rounded transition hover:bg-white/[0.06] hover:text-content"
        aria-label={isPlaying ? "Pause timeline" : "Play timeline"}
      >
        {isPlaying && scrub != null ? (
          <Pause className="h-3 w-3" />
        ) : (
          <Play className="h-3 w-3" />
        )}
      </button>
      <div
        className="relative h-6 flex-1 cursor-pointer"
        onClick={handleTrackClick}
        role="slider"
        aria-label="Scrub agent activity timeline"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(cursorPercent)}
        tabIndex={0}
      >
        {/* Track */}
        <div className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-white/[0.08]" />
        {/* Event ticks */}
        {events.map((ev) => {
          const pct = ((ev.t - spanStart) / spanMs) * 100;
          return (
            <span
              key={`${ev.kind}-${ev.t}`}
              className="absolute top-1/2 h-[6px] w-[2px] -translate-y-1/2 rounded-full opacity-60"
              style={{ left: `${pct}%`, backgroundColor: ev.color }}
              title={`${ev.label} · ${formatRelative(nowT - ev.t)} ago`}
              aria-hidden="true"
            />
          );
        })}
        {/* Cursor */}
        <span
          className="absolute top-1/2 h-[10px] w-[10px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[color:var(--accent-primary)] bg-[color:var(--accent-primary)]/30 shadow-[0_0_0_2px_rgba(0,0,0,0.2)] transition-[left]"
          style={{ left: `${cursorPercent}%` }}
          aria-hidden="true"
        />
      </div>
      <span className="flex items-center gap-1 tabular-nums text-content-muted">
        <Clock3 className="h-3 w-3" />
        {scrub == null ? "now" : `${formatRelative(nowT - scrub)} ago`}
      </span>
      {scrub != null ? (
        <button
          type="button"
          onClick={handleNow}
          className="rounded px-1.5 py-0.5 text-[10px] font-medium text-content-muted transition hover:bg-white/[0.06] hover:text-content"
          aria-label="Jump to now"
        >
          Now
        </button>
      ) : null}
    </div>
  );
});

NotebookTimeline.displayName = "NotebookTimeline";
