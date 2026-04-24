/**
 * MobileChatSurface — port of
 * docs/design/nodebench-ai-design-system/ui_kits/nodebench-mobile/MobileChat.jsx
 *
 * Answer-first mobile chat: query echo, run bar, headline + TLDR with
 * citations, "So What" callout, entity card strip, top sources, follow-up
 * chips, bottom composer dock.
 *
 * Mount above the desktop ChatHome via `md:hidden` wrapper (`hidden md:*`
 * on the desktop shell). Mobile viewport users see this; desktop keeps
 * the existing rich composer.
 *
 * Fixture matches design-kit data.jsx DISCO scenario — replace with the
 * live chat stream once the mobile viewport is wired to the streaming
 * search backend.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Share2, Sparkles, Send, Plus, ChevronRight, CheckCircle2 } from "lucide-react";

const CHAT_FIXTURE = {
  threadTitle: "What's the state of Disco's ch…",
  sourceCount: 14,
  entityCount: 3,
  confidence: 84,
  query:
    "What's the current state of Disco's churn, and what should I expect next quarter?",
  title: "Churn is bending down, but renewals in Q2 are the tell.",
  tldr:
    "Net revenue retention climbed from 108% to 114% over four quarters — driven by platform-tier upsell and the Relay head-to-head wins. Gross churn is still elevated at law-firm mid-market. Q2 is the load-bearing quarter: 38% of ARR renews, and the Am Law 200 cohort historically decides in April–May.",
  callout: {
    label: "So what",
    body:
      "If Am Law 200 renewals hold ≥92%, NRR clears 118% and the platform narrative is validated for the public comps. Miss it and the bear case (niche eDiscovery tool) reasserts.",
  },
  cards: [
    {
      id: "disco",
      name: "Disco Corp.",
      initials: "DC",
      sub: "Diligence · Public",
      metrics: [
        ["NRR", "114%", "up"],
        ["GRR", "88%", "down"],
      ],
      avatar: "linear-gradient(135deg, #1A365D, #0F4C81)",
    },
    {
      id: "relay",
      name: "Relay Legal",
      initials: "RL",
      sub: "Competitor",
      metrics: [
        ["NRR", "119%", "up"],
        ["GRR", "92%", "up"],
      ],
      avatar: "linear-gradient(135deg, #6B3BA3, #8B5CC1)",
    },
    {
      id: "lexn",
      name: "LexNode",
      initials: "LX",
      sub: "Competitor",
      metrics: [
        ["NRR", "101%", "down"],
        ["GRR", "79%", "down"],
      ],
      avatar: "linear-gradient(135deg, #C77826, #E09149)",
    },
  ],
  sources: [
    { id: "s1", title: "Q4 FY24 earnings call, Disco Corp.", meta: ["SEC · 10-K", "fresh 9d"], strength: "strong" as const },
    { id: "s2", title: "Gartner MQ for eDiscovery 2025", meta: ["Gartner", "fresh 22d"], strength: "strong" as const },
    { id: "s3", title: "Am Law 200 renewal tracker (internal)", meta: ["Workspace", "updated 1d"], strength: "medium" as const },
    { id: "s4", title: "Relay Legal Series D memo", meta: ["PitchBook", "fresh 3d"], strength: "medium" as const },
  ],
  followUps: [
    "Drill into Q2 renewal risk by segment",
    "Compare to Relay's NRR trajectory",
    "What could break the platform narrative?",
    "Pull the Am Law 200 cohort list",
  ],
};

export function MobileChatSurface() {
  const navigate = useNavigate();
  const [activeCardId, setActiveCardId] = useState("disco");
  const [followUpValue, setFollowUpValue] = useState("");

  const sendFollowUp = (text?: string) => {
    const q = (text ?? followUpValue).trim();
    if (!q) return;
    navigate(`/?prompt=${encodeURIComponent(q)}`);
  };

  return (
    <div
      data-testid="mobile-chat-surface"
      className="md:hidden flex min-h-[calc(100vh-56px)] flex-col bg-[var(--bg-app,#fafafa)] dark:bg-[#0b0b0e]"
    >
      {/* Top bar */}
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-gray-200 bg-white/90 px-3 py-2 backdrop-blur dark:border-white/[0.08] dark:bg-[#0b0b0e]/90">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.05]"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold">{CHAT_FIXTURE.threadTitle}</div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400">
            {CHAT_FIXTURE.sourceCount} sources · updated 42m
          </div>
        </div>
        <button
          type="button"
          aria-label="Share"
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.05]"
        >
          <Share2 size={15} />
        </button>
      </header>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-[calc(68px+env(safe-area-inset-bottom,0px))] pt-4 text-gray-900 dark:text-gray-100">
        {/* Query echo */}
        <div className="flex items-start gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#334155] text-[10px] font-semibold text-white">
            HS
          </span>
          <p className="text-[13px] text-gray-700 dark:text-gray-300">{CHAT_FIXTURE.query}</p>
        </div>

        {/* Run bar */}
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-[3px] text-[10px] font-medium text-emerald-600 dark:text-emerald-300">
            <CheckCircle2 size={10} />
            verified
          </span>
          <span className="rounded-full border border-gray-200 bg-white px-2 py-[3px] font-mono text-[10px] text-gray-600 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-gray-300">
            {CHAT_FIXTURE.sourceCount} sources
          </span>
          <span className="rounded-full border border-gray-200 bg-white px-2 py-[3px] font-mono text-[10px] text-gray-600 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-gray-300">
            {CHAT_FIXTURE.entityCount} entities
          </span>
          <span className="rounded-full border border-[#d97757]/30 bg-[#d97757]/10 px-2 py-[3px] font-mono text-[10px] text-[#d97757]">
            conf. {CHAT_FIXTURE.confidence}%
          </span>
        </div>

        {/* Headline answer */}
        <div>
          <h1 className="text-[18px] font-semibold leading-tight tracking-[-0.015em]">
            {CHAT_FIXTURE.title}
          </h1>
          <p className="mt-2 text-[13px] leading-6 text-gray-700 dark:text-gray-300">
            {CHAT_FIXTURE.tldr}
            <Cite n={1} /> <Cite n={2} />
          </p>
        </div>

        {/* So What callout */}
        <div className="rounded-[12px] border border-[#d97757]/30 bg-[#d97757]/[0.06] px-3 py-3">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#d97757]">
            <Sparkles size={11} />
            {CHAT_FIXTURE.callout.label}
          </div>
          <p className="mt-1.5 text-[12px] leading-6 text-gray-700 dark:text-gray-300">
            {CHAT_FIXTURE.callout.body} <Cite n={3} />
          </p>
        </div>

        {/* Entity strip */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">
              Entities
            </span>
            <button
              type="button"
              onClick={() => navigate("/reports/disco/graph?tab=cards")}
              className="text-[12px] font-medium text-[#d97757] transition hover:underline"
            >
              Open cards →
            </button>
          </div>
          <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1">
            {CHAT_FIXTURE.cards.map((card) => {
              const isActive = activeCardId === card.id;
              return (
                <button
                  type="button"
                  key={card.id}
                  onClick={() => setActiveCardId(card.id)}
                  className={`shrink-0 snap-start w-[220px] rounded-[12px] border p-3 text-left transition ${
                    isActive
                      ? "border-[#d97757]/40 bg-[#d97757]/[0.04]"
                      : "border-gray-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.02]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold text-white"
                      style={{ background: card.avatar }}
                    >
                      {card.initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-semibold">{card.name}</div>
                      <div className="truncate text-[10px] text-gray-500 dark:text-gray-400">
                        {card.sub}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-1.5">
                    {card.metrics.map(([label, val, trend], i) => (
                      <div key={i}>
                        <div className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                          {label}
                        </div>
                        <div
                          className={`text-[13px] font-semibold tabular-nums ${
                            trend === "up"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : trend === "down"
                              ? "text-red-600 dark:text-red-400"
                              : ""
                          }`}
                        >
                          {val}
                        </div>
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sources */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">
              Top sources
            </span>
            <button
              type="button"
              onClick={() => navigate("/reports/disco/graph?tab=sources")}
              className="text-[12px] font-medium text-[#d97757] transition hover:underline"
            >
              All {CHAT_FIXTURE.sources.length}
            </button>
          </div>
          <div className="flex flex-col">
            {CHAT_FIXTURE.sources.map((s, i) => {
              const strong = s.strength === "strong";
              return (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => navigate("/reports/disco/graph?tab=sources")}
                  className="flex items-start gap-2.5 border-b border-gray-100 py-2.5 text-left last:border-0 dark:border-white/[0.05]"
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] font-mono text-[10px] font-bold ${
                      strong
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[12px] font-medium">{s.title}</span>
                    <span className="mt-0.5 flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
                      {s.meta.map((m, j) => (
                        <span key={j} className="truncate">
                          {j > 0 && <span className="mx-1 text-gray-300 dark:text-gray-600">·</span>}
                          {m}
                        </span>
                      ))}
                    </span>
                  </span>
                  <ChevronRight size={13} className="mt-1 shrink-0 text-gray-300 dark:text-gray-600" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Follow-ups */}
        <div>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">
            Follow-up
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CHAT_FIXTURE.followUps.map((q, i) => (
              <button
                type="button"
                key={i}
                onClick={() => sendFollowUp(q)}
                className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] text-gray-700 transition active:scale-[0.98] dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-gray-200"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Composer dock (sits above MobileTabBar via fixed + env safe-area) */}
      <div
        className="fixed inset-x-0 z-[5] flex items-center gap-2 border-t border-gray-200 bg-white/95 px-3 py-2 backdrop-blur dark:border-white/[0.08] dark:bg-[#0b0b0e]/95"
        style={{
          bottom: "calc(56px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <Plus size={15} className="text-gray-400" aria-hidden />
        <input
          value={followUpValue}
          onChange={(e) => setFollowUpValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              sendFollowUp();
            }
          }}
          placeholder="Ask a follow-up…"
          className="flex-1 border-0 bg-transparent text-[13px] outline-none placeholder:text-gray-400"
          aria-label="Ask a follow-up"
        />
        <button
          type="button"
          onClick={() => sendFollowUp()}
          aria-label="Send"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d97757] text-white shadow-sm transition active:scale-[0.96]"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}

function Cite({ n }: { n: number }) {
  return (
    <sup className="mx-0.5 align-super text-[9px] font-semibold text-[#d97757]">
      [{n}]
    </sup>
  );
}

export default MobileChatSurface;
