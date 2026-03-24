/**
 * ShareableMemoView — Standalone, public-facing Decision Memo page.
 *
 * Route: /memo/:id
 * No auth required. No sidebar, no nav, no cockpit chrome.
 * Renders a beautiful, print-ready Decision Memo — the viral artifact.
 *
 * Data source: localStorage key "nodebench-memos" (JSON map of id -> MemoData).
 * Pre-seeded: /memo/demo always works with built-in demo data.
 */

import { useEffect, useMemo } from "react";
import { useLocation, Link } from "react-router-dom";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ShareableMemoVariable {
  rank: number;
  name: string;
  direction: "up" | "down" | "neutral";
  impact: "high" | "medium" | "low";
}

export interface ShareableMemoScenario {
  label: string;
  probability: number;
  outcome: string;
}

export interface ShareableMemoAction {
  action: string;
  impact: "high" | "medium" | "low";
}

export interface ShareableMemoData {
  id: string;
  company: string;
  date: string;
  question: string;
  answer: string;
  confidence: number;
  sourceCount: number;
  variables: ShareableMemoVariable[];
  scenarios: ShareableMemoScenario[];
  actions: ShareableMemoAction[];
}

/* ------------------------------------------------------------------ */
/*  Demo data — pre-seeded so /memo/demo always works                  */
/* ------------------------------------------------------------------ */

export const DEMO_MEMO: ShareableMemoData = {
  id: "demo",
  company: "Acme AI",
  date: new Date().toISOString().slice(0, 10),
  question: "Should we raise Series A now or wait until Q3?",
  answer:
    "Raise now. Your distribution quality is high enough to command terms, but the window narrows as 3 funded competitors enter your segment in Q2. Waiting risks a crowded round.",
  confidence: 78,
  sourceCount: 14,
  variables: [
    { rank: 1, name: "Distribution quality", direction: "up", impact: "high" },
    { rank: 2, name: "Competitive entry timing", direction: "down", impact: "high" },
    { rank: 3, name: "Revenue retention trend", direction: "up", impact: "medium" },
    { rank: 4, name: "Founder-market signal", direction: "up", impact: "medium" },
    { rank: 5, name: "Macro funding climate", direction: "neutral", impact: "low" },
  ],
  scenarios: [
    { label: "Base", probability: 55, outcome: "Close $8M at $40M pre by mid-Q2" },
    { label: "Bull", probability: 25, outcome: "Oversubscribed $12M at $55M pre — strong signal" },
    { label: "Bear", probability: 20, outcome: "Delayed to Q3 — competitors dilute narrative" },
  ],
  actions: [
    { action: "Lock 2 lead investors before Q2 competitor announcements", impact: "high" },
    { action: "Ship retention dashboard to prove net revenue expansion", impact: "medium" },
    { action: "Run pilot with enterprise design partner for Series A narrative", impact: "medium" },
  ],
};

/* ------------------------------------------------------------------ */
/*  localStorage helpers                                               */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "nodebench-memos";

export function saveMemoToStorage(memo: ShareableMemoData): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const store: Record<string, ShareableMemoData> = raw ? JSON.parse(raw) : {};
    store[memo.id] = memo;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // best-effort
  }
}

export function getMemoFromStorage(id: string): ShareableMemoData | null {
  if (id === "demo") return DEMO_MEMO;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const store: Record<string, ShareableMemoData> = JSON.parse(raw);
    return store[id] ?? null;
  } catch {
    return null;
  }
}

export function generateMemoId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

export function copyMemoUrl(id: string): void {
  const url = `${window.location.origin}/memo/${id}`;
  navigator.clipboard.writeText(url).catch(() => {
    // fallback: prompt-based copy
    window.prompt("Copy this link:", url);
  });
}

/* ------------------------------------------------------------------ */
/*  OG Meta Tags                                                       */
/* ------------------------------------------------------------------ */

function MemoMetaTags({ memo }: { memo: ShareableMemoData }) {
  useEffect(() => {
    const setMeta = (property: string, content: string) => {
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("property", property);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
    };

    const title = `Decision Memo: ${memo.question.slice(0, 60)} — NodeBench`;
    document.title = title;
    setMeta("og:title", "Decision Memo — NodeBench");
    setMeta("og:description", "AI-generated decision analysis with ranked variables, scenarios, and evidence");
    setMeta("og:type", "article");
    setMeta("og:url", window.location.href);
    setMeta("og:site_name", "NodeBench");

    return () => {
      document.title = "NodeBench";
    };
  }, [memo]);

  return null;
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

const impactColor = (impact: "high" | "medium" | "low") =>
  impact === "high" ? "text-amber-400" : impact === "medium" ? "text-blue-400" : "text-zinc-500";

const directionArrow = (d: "up" | "down" | "neutral") =>
  d === "up" ? "\u2197" : d === "down" ? "\u2198" : "\u2192";

const confidenceDotColor = (c: number) =>
  c >= 75 ? "bg-emerald-500" : c >= 50 ? "bg-cyan-500" : c >= 25 ? "bg-amber-500" : "bg-rose-500";

function ScenarioBar({ scenario }: { scenario: ShareableMemoScenario }) {
  const barColor =
    scenario.label === "Bull"
      ? "bg-emerald-500/60"
      : scenario.label === "Bear"
        ? "bg-rose-500/60"
        : "bg-cyan-500/60";

  return (
    <div className="shareable-memo-scenario rounded-lg border border-white/[0.20] bg-white/[0.12] p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-white/90">{scenario.label}</span>
        <span className="text-xs tabular-nums text-white/60">{scenario.probability}%</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${scenario.probability}%` }}
        />
      </div>
      <p className="mt-2.5 text-[12px] leading-relaxed text-white/60">{scenario.outcome}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Not Found state                                                    */
/* ------------------------------------------------------------------ */

function MemoNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#151413] px-6 text-center">
      <div className="text-6xl font-bold text-white/70">404</div>
      <h1 className="mt-4 text-xl font-semibold text-white/80">Memo not found</h1>
      <p className="mt-2 max-w-md text-sm text-white/60">
        This Decision Memo may have been removed, or the link is invalid.
        Memos are stored locally in your browser.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#d97757] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#c96a4d]"
      >
        Go to NodeBench
      </Link>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function ShareableMemoView() {
  const location = useLocation();
  // Extract ID from /memo/:id — no React Router <Route> needed
  const id = useMemo(() => {
    const match = location.pathname.match(/^\/memo\/(.+)$/);
    return match?.[1] ?? "";
  }, [location.pathname]);
  const memo = useMemo(() => getMemoFromStorage(id), [id]);

  if (!memo) return <MemoNotFound />;

  return (
    <>
      <MemoMetaTags memo={memo} />

      {/* Print stylesheet */}
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .shareable-memo-root { background: white !important; color: black !important; padding: 0 !important; }
          .shareable-memo-root * { color: black !important; border-color: #e5e7eb !important; }
          .shareable-memo-card { background: #f9fafb !important; border: 1px solid #e5e7eb !important; }
          .shareable-memo-scenario { background: #f9fafb !important; }
          .shareable-memo-accent { color: #d97757 !important; }
          .shareable-memo-footer { border-color: #e5e7eb !important; }
          .shareable-memo-no-print { display: none !important; }
          .shareable-memo-bar-bg { background: #e5e7eb !important; }
          .shareable-memo-bar-fill { opacity: 1 !important; }
        }
      `}</style>

      <div className="shareable-memo-root min-h-screen bg-[#151413] px-4 py-8 sm:px-6 sm:py-12 lg:py-16">
        <div className="mx-auto max-w-2xl">

          {/* ── Header ─────────────────────────────────────────────── */}
          <div className="mb-8 flex items-start justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60" style={{ fontFamily: "Manrope, sans-serif" }}>
                Decision Memo
              </div>
              <h1 className="mt-1 text-lg font-bold text-white/90 sm:text-xl" style={{ fontFamily: "Manrope, sans-serif" }}>
                {memo.company}
              </h1>
              <div className="mt-1 text-[11px] text-white/60 tabular-nums">{memo.date}</div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.06] px-3 py-1.5">
                <span className={`h-2 w-2 rounded-full ${confidenceDotColor(memo.confidence)}`} />
                <span className="text-xs font-semibold tabular-nums text-white/70">{memo.confidence}%</span>
                <span className="text-[10px] text-white/60">confidence</span>
              </div>
            </div>
          </div>

          {/* ── Question ───────────────────────────────────────────── */}
          <div className="shareable-memo-card rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60 mb-3" style={{ fontFamily: "Manrope, sans-serif" }}>
              Question
            </div>
            <p className="text-base font-semibold leading-snug text-white/90 sm:text-lg" style={{ fontFamily: "Manrope, sans-serif" }}>
              {memo.question}
            </p>
          </div>

          {/* ── Recommendation ─────────────────────────────────────── */}
          <div className="shareable-memo-card mt-4 rounded-xl border border-[#d97757]/20 bg-[#d97757]/[0.04] p-5 sm:p-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d97757]/60 mb-3 shareable-memo-accent" style={{ fontFamily: "Manrope, sans-serif" }}>
              Recommendation
            </div>
            <p className="text-sm leading-relaxed text-white/80 sm:text-base" style={{ fontFamily: "Manrope, sans-serif" }}>
              {memo.answer}
            </p>
            <div className="mt-3 flex items-center gap-4 text-[11px] text-white/60">
              <span className="flex items-center gap-1.5">
                <span className={`inline-flex h-2 w-2 rounded-full ${confidenceDotColor(memo.confidence)}`} />
                {memo.confidence}% confidence
              </span>
              <span>{memo.sourceCount} sources analyzed</span>
            </div>
          </div>

          {/* ── Top Variables ──────────────────────────────────────── */}
          <div className="mt-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60 mb-3" style={{ fontFamily: "Manrope, sans-serif" }}>
              Top Variables
            </div>
            <div className="shareable-memo-card rounded-xl border border-white/[0.08] bg-white/[0.02] divide-y divide-white/[0.06]">
              {memo.variables.map((v) => (
                <div key={v.rank} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <span className="w-5 text-right text-[11px] tabular-nums text-white/60">
                    {v.rank}
                  </span>
                  <span className="flex-1 text-white/80" style={{ fontFamily: "Manrope, sans-serif" }}>{v.name}</span>
                  <span className="text-sm">{directionArrow(v.direction)}</span>
                  <span className={`text-[10px] font-semibold uppercase ${impactColor(v.impact)}`}>
                    {v.impact}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Scenarios ─────────────────────────────────────────── */}
          <div className="mt-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60 mb-3" style={{ fontFamily: "Manrope, sans-serif" }}>
              Scenarios
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {memo.scenarios.map((s) => (
                <ScenarioBar key={s.label} scenario={s} />
              ))}
            </div>
          </div>

          {/* ── Best Next Actions ──────────────────────────────────── */}
          <div className="mt-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60 mb-3" style={{ fontFamily: "Manrope, sans-serif" }}>
              Best Next Actions
            </div>
            <div className="shareable-memo-card rounded-xl border border-white/[0.08] bg-white/[0.02] divide-y divide-white/[0.06]">
              {memo.actions.map((item, i) => (
                <div key={i} className="flex items-start gap-3 px-5 py-3.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#d97757]/10 text-[10px] font-bold text-[#d97757] shareable-memo-accent">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm text-white/80" style={{ fontFamily: "Manrope, sans-serif" }}>{item.action}</span>
                  <span className={`shrink-0 text-[10px] font-semibold uppercase ${impactColor(item.impact)}`}>
                    {item.impact}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Branding Footer ────────────────────────────────────── */}
          <div className="shareable-memo-footer mt-10 border-t border-white/[0.06] pt-5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-[#d97757]">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="12" cy="12" r="4" fill="currentColor" />
                </svg>
                <span className="text-xs font-semibold text-white/60" style={{ fontFamily: "Manrope, sans-serif" }}>
                  NodeBench
                </span>
              </div>
              <p className="mt-1 text-[10px] text-white/60">
                Generated by NodeBench — nodebenchai.com
              </p>
            </div>
            <Link
              to="/"
              className="shareable-memo-no-print rounded-lg border border-white/[0.20] bg-white/[0.12] px-3 py-1.5 text-[11px] font-medium text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white/60"
            >
              Try NodeBench
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
