/**
 * RoleOverlayView -- Phase 8: one shared substrate, many role-specific interpretations.
 *
 * All five roles (Founder, Investor, Banker, Developer, Designer) read from the
 * same DEMO_COMPANY / DEMO_INITIATIVES / DEMO_AGENTS / DEMO_INTERVENTIONS fixtures.
 * No data is duplicated per role -- each role config simply interprets the substrate
 * through its own lens: different metrics, concerns, actions, and memo.
 */

import { memo, useState, useCallback, useMemo } from "react";
import {
  Building2,
  TrendingUp,
  Landmark,
  Code2,
  Palette,
  Copy,
  Download,
  Check,
  ChevronUp,
  ChevronDown,
  Minus,
  ArrowUpRight,
  AlertTriangle,
  Info,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEMO_COMPANY,
  DEMO_INITIATIVES,
  DEMO_AGENTS,
  DEMO_INTERVENTIONS,
  DEMO_DAILY_MEMO,
} from "./founderFixtures";

/* ================================================================== */
/*  Types                                                              */
/* ================================================================== */

type TrendDirection = "up" | "down" | "neutral";
type Severity = "high" | "medium" | "low";
type Priority = "high" | "medium" | "low";

interface RoleMetric {
  label: string;
  value: string;
  trend: TrendDirection;
}

interface RoleConcern {
  title: string;
  severity: Severity;
  detail: string;
}

interface RoleAction {
  action: string;
  priority: Priority;
}

interface RoleConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  metrics: RoleMetric[];
  concerns: RoleConcern[];
  interpretation: string;
  actions: RoleAction[];
  memo: string;
}

/* ================================================================== */
/*  Substrate --> Role interpretation                                   */
/* ================================================================== */

/** Derive all role configs from the shared substrate. No per-role persistence. */
function buildRoleConfigs(): RoleConfig[] {
  const activeCount = DEMO_INITIATIVES.filter((i) => i.status === "active").length;
  const blockedCount = DEMO_INITIATIVES.filter((i) => i.status === "blocked").length;
  const healthyAgents = DEMO_AGENTS.filter((a) => a.status === "healthy").length;
  const totalAgents = DEMO_AGENTS.length;
  const highRiskInit = DEMO_INITIATIVES.filter((i) => i.risk === "high");
  const topIntervention = DEMO_INTERVENTIONS[0];

  return [
    /* ── Founder ─────────────────────────────────────────────── */
    {
      id: "founder",
      label: "Founder",
      icon: Building2,
      color: "#d97757",
      metrics: [
        { label: "Identity Confidence", value: `${Math.round(DEMO_COMPANY.identityConfidence * 100)}%`, trend: "up" as TrendDirection },
        { label: "Active Initiatives", value: String(activeCount), trend: "neutral" as TrendDirection },
        { label: "Blocked Initiatives", value: String(blockedCount), trend: blockedCount > 0 ? "down" as TrendDirection : "neutral" as TrendDirection },
        { label: "Top Priority Score", value: String(topIntervention?.priorityScore ?? 0), trend: "up" as TrendDirection },
      ],
      concerns: [
        { title: "SOC 2 blocking TradeFlow partnership", severity: "high" as Severity, detail: "No audit partner selected. Solo-founder SOC 2 takes 4-6 months with automation tooling." },
        { title: "3 failing integration tests in pricing engine", severity: "high" as Severity, detail: "Pilot launch is blocked until these pass. Estimated 2-4 hours focused work." },
        { title: "Series A delayed 4 weeks", severity: "medium" as Severity, detail: "Q2 raise instead of Q1. Need stronger pilot data from TradeFlow before outreach." },
      ],
      interpretation: `${DEMO_COMPANY.name} is in "${DEMO_COMPANY.companyState}" mode with ${activeCount} active initiatives. The wedge ("${DEMO_COMPANY.wedge}") has ${Math.round(DEMO_COMPANY.identityConfidence * 100)}% identity confidence. The pricing engine MVP is the critical path -- 3 failing tests block the TradeFlow pilot, which in turn blocks Series A data. SOC 2 compliance is the second-order blocker that needs a decision this week.`,
      actions: [
        { action: "Fix 3 integration test failures in pricing engine", priority: "high" as Priority },
        { action: "Choose SOC 2 audit partner (Vanta vs Drata vs fractional CISO)", priority: "high" as Priority },
        { action: "Draft 1-page SOC 2 timeline for TradeFlow CTO", priority: "high" as Priority },
        { action: "Update pricing model with EU CBAM draft parameters", priority: "medium" as Priority },
        { action: "Prepare 2-page investor memo with updated pilot metrics", priority: "low" as Priority },
      ],
      memo: `${DEMO_COMPANY.name}'s pricing engine is 90% complete but blocked by 3 failing integration tests, which directly delays the TradeFlow pilot launch. The EU CBAM draft leak introduces parameter uncertainty that should be modeled before the pilot goes live. SOC 2 compliance has escalated from nice-to-have to hard requirement -- a decision on audit approach (automated vs manual) is needed this week. Series A outreach is paused pending pilot data, shifting the raise window to Q2. Identity confidence at ${Math.round(DEMO_COMPANY.identityConfidence * 100)}% suggests the wedge is solidifying but not yet locked.`,
    },

    /* ── Investor ────────────────────────────────────────────── */
    {
      id: "investor",
      label: "Investor",
      icon: TrendingUp,
      color: "#4ade80",
      metrics: [
        { label: "Wedge Clarity", value: `${Math.round(DEMO_COMPANY.identityConfidence * 100)}%`, trend: "up" as TrendDirection },
        { label: "Runway Signal", value: "Pre-revenue", trend: "neutral" as TrendDirection },
        { label: "Agent Leverage", value: `${totalAgents} agents`, trend: "up" as TrendDirection },
        { label: "Competitive Moat", value: "Forming", trend: "up" as TrendDirection },
      ],
      concerns: [
        { title: "Identity confidence below 70%", severity: "high" as Severity, detail: `At ${Math.round(DEMO_COMPANY.identityConfidence * 100)}%, the wedge is still forming. Investors want to see 75%+ before committing.` },
        { title: "No revenue yet", severity: "high" as Severity, detail: "Pre-revenue with a strong pilot pipeline but no closed contracts. TradeFlow is the nearest proof point." },
        { title: "Solo founder risk", severity: "medium" as Severity, detail: "Single founder with 4 agents. Agent leverage is high but human redundancy is zero." },
      ],
      interpretation: `${DEMO_COMPANY.name} shows strong technical velocity with ${totalAgents} autonomous agents operating across ${activeCount} initiatives. However, identity confidence at ${Math.round(DEMO_COMPANY.identityConfidence * 100)}% suggests the wedge ("${DEMO_COMPANY.wedge}") is still forming. The TradeFlow design partnership is the key near-term proof point. SOC 2 compliance is the main transaction blocker. Series A timing has slipped to Q2, which could be positive if pilot data is strong.`,
      actions: [
        { action: "Evaluate TradeFlow partnership as proof of product-market pull", priority: "high" as Priority },
        { action: "Assess competitive positioning against NativeCarbon ($22M Series A)", priority: "high" as Priority },
        { action: "Model unit economics at 10x current agent throughput", priority: "medium" as Priority },
        { action: "Review founder's SOC 2 decision for execution speed signal", priority: "medium" as Priority },
      ],
      memo: `${DEMO_COMPANY.name} shows strong technical velocity but identity confidence at ${Math.round(DEMO_COMPANY.identityConfidence * 100)}% suggests the wedge is still forming. The company is pre-revenue with a promising TradeFlow design partnership as the nearest proof point. ${totalAgents} autonomous agents demonstrate strong agent leverage, but solo-founder risk is notable. The recent NativeCarbon $22M raise validates the market but adds competitive pressure. Key diligence question: can the TradeFlow pilot close before Q2, and does the SOC 2 timeline support it?`,
    },

    /* ── Banker ──────────────────────────────────────────────── */
    {
      id: "banker",
      label: "Banker",
      icon: Landmark,
      color: "#60a5fa",
      metrics: [
        { label: "Revenue Status", value: "Pre-revenue", trend: "neutral" as TrendDirection },
        { label: "Target Raise", value: "$6-8M", trend: "neutral" as TrendDirection },
        { label: "Valuation Range", value: "$30-40M pre", trend: "up" as TrendDirection },
        { label: "SOC 2 Status", value: "Not started", trend: "down" as TrendDirection },
      ],
      concerns: [
        { title: "No compliance certification", severity: "high" as Severity, detail: "SOC 2 Type I not started. Institutional counterparties (TradeFlow) require it for API integration." },
        { title: "Series A timeline slipped", severity: "medium" as Severity, detail: "4-week delay pushes raise to Q2. May need to adjust target investor list for timing." },
        { title: "Single design partner dependency", severity: "medium" as Severity, detail: "All revenue assumptions rest on TradeFlow pilot success. No backup pipeline visible." },
      ],
      interpretation: `${DEMO_COMPANY.name} is pre-revenue targeting a $6-8M Series A at $30-40M pre-money valuation. The company has a strong pilot pipeline with TradeFlow Capital as the primary design partner. SOC 2 compliance is the main transaction blocker -- institutional counterparties require it for API integration. The 4-week delay in Series A outreach shifts the raise to Q2. ICE carbon futures volume (+34% QoQ) supports the TAM thesis.`,
      actions: [
        { action: "Accelerate SOC 2 certification to unblock institutional deals", priority: "high" as Priority },
        { action: "Build backup pipeline beyond TradeFlow (2-3 additional pilots)", priority: "high" as Priority },
        { action: "Prepare data room with updated pilot metrics for Q2 raise", priority: "medium" as Priority },
        { action: "Model revenue scenarios at 1/3/5 institutional clients", priority: "medium" as Priority },
      ],
      memo: `${DEMO_COMPANY.name} is pre-revenue with a strong pilot pipeline centered on TradeFlow Capital. The target raise ($6-8M at $30-40M pre) is reasonable for climate-tech with institutional traction, but SOC 2 compliance is the main transaction blocker. The 4-week Series A delay means Q2 timing, which aligns with carbon market seasonality but narrows the window. ICE carbon futures volume is up 34% QoQ, confirming institutional demand. Key risk: single design partner dependency with no visible backup pipeline.`,
    },

    /* ── Developer ───────────────────────────────────────────── */
    {
      id: "developer",
      label: "Developer",
      icon: Code2,
      color: "#c084fc",
      metrics: [
        { label: "Agent Health", value: `${healthyAgents}/${totalAgents} healthy`, trend: healthyAgents === totalAgents ? "up" as TrendDirection : "down" as TrendDirection },
        { label: "Blocked Agents", value: String(DEMO_AGENTS.filter((a) => a.status === "blocked").length), trend: "down" as TrendDirection },
        { label: "Integration Tests", value: "3 failing", trend: "down" as TrendDirection },
        { label: "API Readiness", value: "Blocked on auth", trend: "down" as TrendDirection },
      ],
      concerns: [
        { title: "3 failing integration tests", severity: "high" as Severity, detail: "Intermittent timeout in credit_spread_calculator. Likely a race condition in async pricing pipeline." },
        { title: "TradeFlow integrator agent blocked", severity: "high" as Severity, detail: "Waiting for SOC 2 scope decision before proceeding with API auth layer implementation." },
        { title: "Rate limit on competitive scanner", severity: "low" as Severity, detail: "Crunchbase rate limit reset pending. Agent queued for re-scan." },
      ],
      interpretation: `The system has ${totalAgents} agents with ${healthyAgents} healthy. The pricing engine agent is actively debugging a flaky integration test (intermittent timeout in credit_spread_calculator). The TradeFlow integrator is blocked on SOC 2 scope decision -- no code work can proceed on the API auth layer until that decision is made. The market scanner and competitive watcher are operating normally, though the competitive watcher is rate-limited on Crunchbase.`,
      actions: [
        { action: "Debug intermittent timeout in credit_spread_calculator test", priority: "high" as Priority },
        { action: "Unblock TradeFlow integrator with SOC 2 scope decision", priority: "high" as Priority },
        { action: "Add retry logic for Crunchbase rate limits in competitive watcher", priority: "low" as Priority },
        { action: "Set up monitoring alerts for agent heartbeat gaps > 30min", priority: "medium" as Priority },
      ],
      memo: `System health: ${healthyAgents}/${totalAgents} agents healthy. Critical path is the pricing engine -- 3 integration tests are failing due to an intermittent timeout in credit_spread_calculator, likely a race condition. The TradeFlow integrator agent is architecturally blocked: SOC 2 scope must be decided before the API auth layer can be designed. The competitive watcher is in a normal rate-limit backoff cycle. Recommended: fix the flaky test first (highest blast radius), then escalate the SOC 2 decision to unblock the integrator.`,
    },

    /* ── Designer ────────────────────────────────────────────── */
    {
      id: "designer",
      label: "Designer",
      icon: Palette,
      color: "#f472b6",
      metrics: [
        { label: "Surfaces Active", value: "5/5", trend: "up" as TrendDirection },
        { label: "Glass Card Consistency", value: "High", trend: "up" as TrendDirection },
        { label: "Mobile Responsive", value: "Partial", trend: "neutral" as TrendDirection },
        { label: "A11y Score", value: "B+", trend: "up" as TrendDirection },
      ],
      concerns: [
        { title: "Agent panel cramped on mobile", severity: "medium" as Severity, detail: "The Ask NodeBench panel overlays too aggressively on < 768px viewports. Needs mobile-first redesign." },
        { title: "No shareable artifact format", severity: "high" as Severity, detail: "Decision memos and investigation results have no one-click share mechanism. This blocks viral distribution." },
        { title: "Inconsistent loading states", severity: "medium" as Severity, detail: "Some surfaces use skeleton loaders, others show spinners, and some flash blank. Need unified loading DNA." },
      ],
      interpretation: `The 5-surface cockpit maintains strong visual consistency with glass card DNA (border-white/[0.06], bg-white/[0.02]) and terracotta accent (#d97757). Accessibility is solid (B+ score) with focus rings and ARIA labels on interactive elements. The main gaps are mobile responsiveness (agent panel needs mobile-first treatment) and shareability (no mechanism to share memos or investigations externally). Loading state inconsistency across surfaces hurts perceived polish.`,
      actions: [
        { action: "Design mobile-first agent panel for < 768px viewports", priority: "high" as Priority },
        { action: "Create shareable artifact format for decision memos", priority: "high" as Priority },
        { action: "Unify loading states across all 5 surfaces (skeleton DNA)", priority: "medium" as Priority },
        { action: "Add print stylesheet for decision memo export", priority: "low" as Priority },
      ],
      memo: `The product's visual identity is cohesive -- glass card DNA, Manrope + JetBrains Mono typography, and terracotta accent create a distinctive aesthetic. Accessibility scores B+ with room for improvement in color contrast on muted section headers. The critical UX gap is shareability: users cannot easily share decision memos or investigation results externally, which blocks word-of-mouth distribution. Mobile experience needs attention -- the agent panel is the most-used surface but is the least optimized for small viewports. Loading state inconsistency (skeletons vs spinners vs blank) erodes perceived quality.`,
    },
  ];
}

/* ================================================================== */
/*  Sub-components                                                     */
/* ================================================================== */

const TREND_ICON: Record<TrendDirection, LucideIcon> = {
  up: ChevronUp,
  down: ChevronDown,
  neutral: Minus,
};

const TREND_COLOR: Record<TrendDirection, string> = {
  up: "text-emerald-400",
  down: "text-rose-400",
  neutral: "text-white/60",
};

const SEVERITY_DOT: Record<Severity, string> = {
  high: "bg-rose-400",
  medium: "bg-amber-400",
  low: "bg-white/30",
};

const PRIORITY_BADGE: Record<Priority, { bg: string; text: string }> = {
  high: { bg: "bg-rose-500/20", text: "text-rose-300" },
  medium: { bg: "bg-amber-500/20", text: "text-amber-300" },
  low: { bg: "bg-white/[0.06]", text: "text-white/60" },
};

function MetricCard({ metric }: { metric: RoleMetric }) {
  const TIcon = TREND_ICON[metric.trend];
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/[0.20] bg-white/[0.12] px-4 py-3">
      <div>
        <div className="text-[11px] uppercase tracking-[0.2em] text-white/60">{metric.label}</div>
        <div className="mt-1 text-lg font-semibold text-white">{metric.value}</div>
      </div>
      <TIcon className={cn("h-4 w-4", TREND_COLOR[metric.trend])} />
    </div>
  );
}

function ConcernRow({ concern }: { concern: RoleConcern }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-white/[0.20] bg-white/[0.12] px-4 py-3">
      <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", SEVERITY_DOT[concern.severity])} />
      <div className="min-w-0">
        <div className="text-sm font-medium text-white">{concern.title}</div>
        <div className="mt-0.5 text-[12px] leading-relaxed text-white/60">{concern.detail}</div>
      </div>
    </div>
  );
}

function ActionRow({ action }: { action: RoleAction }) {
  const badge = PRIORITY_BADGE[action.priority];
  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/[0.20] bg-white/[0.12] px-4 py-3">
      <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase", badge.bg, badge.text)}>
        {action.priority}
      </span>
      <span className="text-sm text-white/80">{action.action}</span>
    </div>
  );
}

/* ================================================================== */
/*  Main View                                                          */
/* ================================================================== */

function RoleOverlayView() {
  const roles = useMemo(() => buildRoleConfigs(), []);
  const [activeRoleId, setActiveRoleId] = useState("founder");
  const [copied, setCopied] = useState(false);

  const activeRole = useMemo(
    () => roles.find((r) => r.id === activeRoleId) ?? roles[0],
    [roles, activeRoleId],
  );

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(activeRole.memo);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may fail in insecure contexts
    }
  }, [activeRole.memo]);

  const handleExport = useCallback(() => {
    const md = [
      `# ${DEMO_COMPANY.name} -- ${activeRole.label} Briefing`,
      "",
      `> Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
      "",
      "## Key Metrics",
      ...activeRole.metrics.map((m) => `- **${m.label}**: ${m.value} (${m.trend})`),
      "",
      "## Top Concerns",
      ...activeRole.concerns.map((c) => `- **[${c.severity.toUpperCase()}]** ${c.title} -- ${c.detail}`),
      "",
      "## Interpretation",
      activeRole.interpretation,
      "",
      "## Recommended Actions",
      ...activeRole.actions.map((a) => `- [${a.priority.toUpperCase()}] ${a.action}`),
      "",
      "## Memo",
      activeRole.memo,
    ].join("\n");

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${DEMO_COMPANY.name.toLowerCase().replace(/\s+/g, "-")}-${activeRole.id}-briefing.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeRole]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Perspective Overlays</h1>
        <p className="mt-1 text-sm text-white/60">Same data, different interpretations</p>
      </div>

      {/* ── Role Tabs ───────────────────────────────────────── */}
      <div className="mb-8 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Role perspectives">
        {roles.map((role) => {
          const Icon = role.icon;
          const isActive = role.id === activeRoleId;
          return (
            <button
              key={role.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${role.id}`}
              onClick={() => setActiveRoleId(role.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-150",
                isActive
                  ? "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]"
                  : "border border-white/[0.20] bg-white/[0.12] text-white/60 hover:bg-white/[0.07] hover:text-white/70",
              )}
              style={isActive ? { backgroundColor: `${role.color}20`, color: role.color, borderColor: `${role.color}30` } : undefined}
            >
              <Icon className="h-4 w-4" />
              <span>{role.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Content Panel ───────────────────────────────────── */}
      <div id={`panel-${activeRole.id}`} role="tabpanel" aria-label={`${activeRole.label} perspective`}>
        {/* Lens header */}
        <div className="mb-6 flex items-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-md"
            style={{ backgroundColor: `${activeRole.color}20` }}
          >
            <activeRole.icon className="h-4 w-4" style={{ color: activeRole.color }} />
          </span>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">
            {DEMO_COMPANY.name} through {activeRole.label} lens
          </h2>
        </div>

        {/* 2x2 grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Key Metrics */}
          <section>
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">Key Metrics</h3>
            <div className="flex flex-col gap-2">
              {activeRole.metrics.map((m) => (
                <MetricCard key={m.label} metric={m} />
              ))}
            </div>
          </section>

          {/* Top Concerns */}
          <section>
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">Top Concerns</h3>
            <div className="flex flex-col gap-2">
              {activeRole.concerns.map((c) => (
                <ConcernRow key={c.title} concern={c} />
              ))}
            </div>
          </section>

          {/* What This Role Sees */}
          <section>
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">What this role sees</h3>
            <div className="rounded-lg border border-white/[0.20] bg-white/[0.12] px-4 py-4">
              <p className="text-sm leading-relaxed text-white/70">{activeRole.interpretation}</p>
            </div>
          </section>

          {/* Recommended Actions */}
          <section>
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">Recommended Actions</h3>
            <div className="flex flex-col gap-2">
              {activeRole.actions.map((a) => (
                <ActionRow key={a.action} action={a} />
              ))}
            </div>
          </section>
        </div>

        {/* ── Role-Specific Memo ────────────────────────────── */}
        <section className="mt-8">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">
            Role-Specific Memo
          </h3>
          <div className="rounded-lg border border-white/[0.20] bg-white/[0.12] px-5 py-4">
            <p className="text-sm leading-relaxed text-white/70">{activeRole.memo}</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded-md border border-white/[0.06] bg-white/[0.07] px-3 py-1.5 text-[12px] font-medium text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white/80"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                type="button"
                onClick={handleExport}
                className="flex items-center gap-1.5 rounded-md border border-white/[0.06] bg-white/[0.07] px-3 py-1.5 text-[12px] font-medium text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white/80"
              >
                <Download className="h-3.5 w-3.5" />
                Export as Briefing
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default memo(RoleOverlayView);
