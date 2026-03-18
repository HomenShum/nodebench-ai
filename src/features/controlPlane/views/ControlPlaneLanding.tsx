/**
 * ControlPlaneLanding — Agent Trust Control Plane landing + demo surface.
 *
 * Top: Report-aligned product framing and CTA row.
 * Below: In-product demo/dashboard for receipts, passport, investigation, and integrations.
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  ArrowUp,
  BadgeCheck,
  Bot,
  CheckCircle2,
  ChevronDown,
  Circle,
  FileText,
  Fingerprint,
  KeyRound,
  Newspaper,
  ScrollText,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import {
  type BuyerChecklistId,
  type BuyerChecklistState,
  type BuyerPreferredPath,
  loadBuyerChecklistState,
  loadBuyerPreferredPath,
  orderByBuyerPreference,
  saveBuyerChecklistState,
  saveBuyerPreferredPath,
} from "../lib/onboardingState";
import { VIEW_PATH_MAP, type MainView } from "@/lib/viewRegistry";
import { useContextualToolSuggestions } from "@/hooks/useContextualToolSuggestions";
import { isUIFlagEnabled } from "../../../../convex/lib/featureFlags";

interface ControlPlaneLandingProps {
  onNavigate: (view: MainView, path?: string) => void;
  onOpenFastAgent?: () => void;
  onOpenFastAgentWithPrompt?: (prompt: string) => void;
}

const RECEIPTS_PATH = VIEW_PATH_MAP.receipts ?? "/receipts";
const DELEGATION_PATH = VIEW_PATH_MAP.delegation ?? "/delegation";
const INVESTIGATION_PATH = VIEW_PATH_MAP.investigation ?? "/investigation";
const DOCUMENTS_PATH = VIEW_PATH_MAP.documents ?? "/workspace";
const AGENTS_PATH = VIEW_PATH_MAP.agents ?? "/agents";
const BENCHMARKS_PATH = VIEW_PATH_MAP.benchmarks ?? "/internal/benchmarks";
const MCP_LEDGER_PATH = VIEW_PATH_MAP["mcp-ledger"] ?? "/internal/mcp-ledger";
const API_REFERENCE_PATH = "/v1/specs";
const MCP_INTEGRATION_PATH = "/api/mcp";
const ORACLE_PATH = VIEW_PATH_MAP.oracle ?? "/oracle";
const PRODUCT_DIRECTION_PATH = VIEW_PATH_MAP["product-direction"] ?? "/product-direction";
const EXECUTION_TRACE_PATH = VIEW_PATH_MAP["execution-trace"] ?? "/execution-trace";
const WORLD_MONITOR_PATH = VIEW_PATH_MAP["world-monitor"] ?? "/research/world-monitor";
const WATCHLISTS_PATH = VIEW_PATH_MAP.watchlists ?? "/research/watchlists";
const RESEARCH_BRIEFING_PATH = "/research/briefing";

/* ── ChatGPT-style suggestion chips ─────────────────────────────── */
const SUGGESTION_CHIPS = [
  {
    icon: ScrollText,
    label: "Review agent receipts",
    target: "receipts" as MainView,
    path: RECEIPTS_PATH,
    preferred: "receipts" as BuyerPreferredPath,
  },
  {
    icon: Search,
    label: "Investigate a run",
    target: "investigation" as MainView,
    path: INVESTIGATION_PATH,
    preferred: "investigation" as BuyerPreferredPath,
  },
  {
    icon: Zap,
    label: "Inspect MCP activity",
    target: "mcp-ledger" as MainView,
    path: MCP_LEDGER_PATH,
    preferred: "mcp-ledger" as BuyerPreferredPath,
  },
  {
    icon: KeyRound,
    label: "Review passport",
    target: "delegation" as MainView,
    path: DELEGATION_PATH,
    preferred: "delegation" as BuyerPreferredPath,
  },
] as const;

/** Maps dynamic suggestion IDs → icons for the chip row */
const CHIP_ICON_MAP: Record<string, typeof ScrollText> = {
  "review-receipts": ScrollText,
  "investigate-run": Search,
  "review-passport": KeyRound,
  "launch-agent": Bot,
  "open-workspace": FileText,
  "check-benchmarks": Sparkles,
  "product-direction": Shield,
  "world-monitor": Activity,
  "execution-trace": Fingerprint,
  "mcp-ledger": Zap,
  "research-overview": Search,
};

const QUICK_NAV = [
  {
    icon: ScrollText,
    label: "Receipts",
    description: "Review what agents did today",
    target: "receipts" as MainView,
    path: RECEIPTS_PATH,
  },
  {
    icon: KeyRound,
    label: "Passport",
    description: "Scope tools, approvals, and revocation",
    target: "delegation" as MainView,
    path: DELEGATION_PATH,
  },
  {
    icon: Search,
    label: "Investigation",
    description: "Trace action to evidence to review",
    target: "investigation" as MainView,
    path: INVESTIGATION_PATH,
  },
  {
    icon: Zap,
    label: "MCP Ledger",
    description: "Inspect tool activity behind integrations",
    target: "mcp-ledger" as MainView,
    path: MCP_LEDGER_PATH,
  },
] as const;

const STARTER_PROMPTS = [
  {
    title: "Show denied actions today",
    prompt:
      "Show me the agent actions that were denied or approval-gated today, and explain why.",
  },
  {
    title: "Trace the FTX demo",
    prompt:
      "Open the FTX investigation and separate observed facts, hypotheses, and later-confirmation evidence.",
  },
  {
    title: "Review passport scope",
    prompt:
      "Explain what this agent is allowed to do, what requires approval, and what would be blocked.",
  },
] as const;

const TRUST_REVIEW_DIMENSIONS = [
  "Passport scope and approval gates",
  "Action receipts with policy decisions",
  "Evidence capture methods and content hashes",
  "Trace boundaries and replay context",
  "Observed facts, hypotheses, and reviewed limitations",
] as const;

/* ── Enterprise dashboard data ──────────────────────────────────── */
const ROLE_PATHS = [
  {
    id: "reviewer",
    icon: ScrollText,
    label: "Review agent actions",
    description: "See what agents did and whether it was allowed",
    target: "receipts",
    path: RECEIPTS_PATH,
    preferredPath: "receipts" as BuyerPreferredPath,
    accent: "border-indigo-500/30 hover:border-indigo-400/50 hover:bg-indigo-500/5",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    recommended: true,
  },
  {
    id: "approver",
    icon: ShieldCheck,
    label: "Review passport & approvals",
    description: "See scoped tools, denied actions, and approval-gated steps",
    target: "delegation",
    path: DELEGATION_PATH,
    preferredPath: "delegation" as BuyerPreferredPath,
    accent: "border-emerald-500/30 hover:border-emerald-400/50 hover:bg-emerald-500/5",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    id: "investigator",
    icon: Search,
    label: "Investigate a run",
    description: "Trace from action to evidence to approval",
    target: "investigation",
    path: INVESTIGATION_PATH,
    preferredPath: "investigation" as BuyerPreferredPath,
    accent: "border-amber-500/30 hover:border-amber-400/50 hover:bg-amber-500/5",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  {
    id: "operator",
    icon: Zap,
    label: "Inspect tool activity",
    description: "Review internal traces, blocked steps, and request history",
    target: "mcp-ledger",
    path: MCP_LEDGER_PATH,
    preferredPath: "mcp-ledger" as BuyerPreferredPath,
    accent: "border-violet-500/30 hover:border-violet-400/50 hover:bg-violet-500/5",
    iconColor: "text-violet-600 dark:text-violet-400",
  },
] as const;

interface ChecklistItem {
  id: BuyerChecklistId;
  label: string;
  target: MainView;
  path: string;
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  { id: "receipt", label: "Open an action receipt", target: "receipts", path: RECEIPTS_PATH },
  { id: "delegation", label: "Open the passport", target: "delegation", path: DELEGATION_PATH },
  { id: "investigation", label: "Inspect an investigation", target: "investigation", path: INVESTIGATION_PATH },
  { id: "tool-activity", label: "Inspect tool activity", target: "mcp-ledger", path: MCP_LEDGER_PATH },
];

const CORE_SURFACES = [
  {
    id: "receipts",
    icon: ScrollText,
    title: "Action Receipts",
    subtitle: "Tamper-evident records of what an agent saw, did, and was allowed to do.",
    path: RECEIPTS_PATH,
    accent: "from-indigo-500/20 to-indigo-500/5",
    iconColor: "text-indigo-600 dark:text-indigo-300",
    borderColor: "border-indigo-500/25 hover:border-indigo-400/50",
  },
  {
    id: "delegation",
    icon: KeyRound,
    title: "Passport",
    subtitle: "Scope tools, approvals, and authority before an agent acts.",
    path: DELEGATION_PATH,
    accent: "from-emerald-500/20 to-emerald-500/5",
    iconColor: "text-emerald-600 dark:text-emerald-300",
    borderColor: "border-emerald-500/25 hover:border-emerald-400/50",
  },
  {
    id: "investigation",
    icon: Search,
    title: "Investigation",
    subtitle: "See what the agent did, why it did it, and what evidence supports the result.",
    path: INVESTIGATION_PATH,
    accent: "from-amber-500/20 to-amber-500/5",
    iconColor: "text-amber-600 dark:text-amber-300",
    borderColor: "border-amber-500/25 hover:border-amber-400/50",
  },
] as const;

const SECONDARY_SURFACES = [
  {
    id: "research",
    icon: Shield,
    title: "Research Hub",
    subtitle: "Signals, briefings, and evidence-backed context.",
    path: RESEARCH_BRIEFING_PATH,
  },
  {
    id: "product-direction",
    icon: Search,
    title: "Product Direction",
    subtitle: "Public-evidence memo for what a company should build next.",
    path: PRODUCT_DIRECTION_PATH,
  },
  {
    id: "execution-trace",
    icon: FileText,
    title: "Execution Trace",
    subtitle: "Search, edit, verify, and export workflows as auditable receipts.",
    path: EXECUTION_TRACE_PATH,
  },
  {
    id: "world-monitor",
    icon: Activity,
    title: "World Monitor",
    subtitle: "Open-source geopolitical, regulatory, and market events clustered for impact review.",
    path: WORLD_MONITOR_PATH,
  },
  {
    id: "watchlists",
    icon: ShieldCheck,
    title: "Watchlists",
    subtitle: "Persistent monitors for entities, sectors, regions, and strategic themes.",
    path: WATCHLISTS_PATH,
  },
  {
    id: "documents",
    icon: FileText,
    title: "Workspace",
    subtitle: "Documents, spreadsheets, and work in progress.",
    path: DOCUMENTS_PATH,
  },
  {
    id: "agents",
    icon: Bot,
    title: "Agent Workflows",
    subtitle: "Launch work, monitor active threads, and clear operator blockers.",
    path: AGENTS_PATH,
  },
  {
    id: "oracle",
    icon: Bot,
    title: "The Oracle",
    subtitle: "Builder-facing control tower for long-running loops.",
    path: ORACLE_PATH,
  },
] as const;

const POWER_USER_PATHS = [
  {
    id: "developer",
    icon: Sparkles,
    eyebrow: "For developers",
    label: "Debug evals and replay proof",
    description: "Open benchmark receipts, compare runs, and see where latency or judge quality breaks down.",
    target: "benchmarks",
    path: BENCHMARKS_PATH,
    accent: "border-cyan-500/25 bg-cyan-500/[0.04] hover:border-cyan-400/45 hover:bg-cyan-500/[0.07]",
    iconColor: "text-cyan-600 dark:text-cyan-300",
  },
  {
    id: "platform-operator",
    icon: Activity,
    eyebrow: "For agent operators",
    label: "Inspect tool activity",
    description: "Review internal tool traces, blocked steps, and request history behind the primary product surfaces.",
    target: "mcp-ledger",
    path: MCP_LEDGER_PATH,
    accent: "border-fuchsia-500/25 bg-fuchsia-500/[0.04] hover:border-fuchsia-400/45 hover:bg-fuchsia-500/[0.07]",
    iconColor: "text-fuchsia-600 dark:text-fuchsia-300",
  },
] as const;

const USE_CASES = [
  {
    id: "banking-assistant",
    icon: ShieldCheck,
    title: "Banking assistant",
    description: "Review sensitive actions, approval gates, and reversible operations before they leave the sandbox.",
    target: "receipts" as MainView,
    path: RECEIPTS_PATH,
    preferredPath: "receipts" as BuyerPreferredPath,
  },
  {
    id: "student-agent",
    icon: FileText,
    title: "Student agent",
    description: "Bound research and writing tools so study workflows stay scoped, reviewable, and easy to explain.",
    target: "delegation" as MainView,
    path: DELEGATION_PATH,
    preferredPath: "delegation" as BuyerPreferredPath,
  },
  {
    id: "work-agent",
    icon: Bot,
    title: "BYO agent at work",
    description: "Register external agents, inspect tool activity, and keep receipts for policy review.",
    target: "mcp-ledger" as MainView,
    path: MCP_LEDGER_PATH,
  },
  {
    id: "research-agent",
    icon: Search,
    title: "Research agent (FTX demo)",
    description: "Separate observed facts from hypotheses and later-confirmation evidence before escalating a claim.",
    target: "investigation" as MainView,
    path: INVESTIGATION_PATH,
    preferredPath: "investigation" as BuyerPreferredPath,
  },
] as const;

export const ControlPlaneLanding = memo(function ControlPlaneLanding({
  onNavigate,
  onOpenFastAgent,
  onOpenFastAgentWithPrompt,
}: ControlPlaneLandingProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const controlPlaneDemoEnabled = isUIFlagEnabled("CONTROL_PLANE_DEMO");

  // Enterprise dashboard state
  const [checklistState, setChecklistState] = useState<BuyerChecklistState>({});
  const [dismissed, setDismissed] = useState(false);
  const [preferredPath, setPreferredPath] = useState<BuyerPreferredPath | null>(null);

  useEffect(() => {
    const storedChecklist = loadBuyerChecklistState();
    if (storedChecklist === "dismissed") {
      setDismissed(true);
    } else {
      setChecklistState(storedChecklist);
    }
    setPreferredPath(loadBuyerPreferredPath());
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  const orderedRolePaths = useMemo(
    () => orderByBuyerPreference(ROLE_PATHS, preferredPath),
    [preferredPath],
  );

  const dynamicSuggestions = useContextualToolSuggestions("control-plane", preferredPath, 4);

  const orderedChips = useMemo(() => {
    // Use dynamic suggestions when available, fall back to static chips
    if (dynamicSuggestions.length > 0) {
      return dynamicSuggestions.map((s) => ({
        icon: CHIP_ICON_MAP[s.id] ?? Sparkles,
        label: s.label,
        target: s.target as MainView,
        path: s.path ?? VIEW_PATH_MAP[s.target] ?? `/${s.target}`,
        preferred: (s.id === "review-receipts" ? "receipts"
          : s.id === "investigate-run" ? "investigation"
          : s.id === "mcp-ledger" ? "mcp-ledger"
          : s.id === "review-passport" ? "delegation"
          : undefined) as BuyerPreferredPath | undefined,
      }));
    }
    if (!preferredPath) return SUGGESTION_CHIPS;
    const idx = SUGGESTION_CHIPS.findIndex((c) => c.preferred === preferredPath);
    if (idx <= 0) return SUGGESTION_CHIPS;
    const copy = [...SUGGESTION_CHIPS];
    const [moved] = copy.splice(idx, 1);
    copy.unshift(moved);
    return copy;
  }, [preferredPath, dynamicSuggestions]);

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) {
      onOpenFastAgent?.();
      return;
    }
    // Open the agent panel with the prompt — this auto-sends the message
    if (onOpenFastAgentWithPrompt) {
      onOpenFastAgentWithPrompt(trimmed);
    } else {
      onOpenFastAgent?.();
    }
    setInput("");
  }, [input, onOpenFastAgent, onOpenFastAgentWithPrompt]);

  const handleStarterPrompt = useCallback(
    (prompt: string) => {
      if (onOpenFastAgentWithPrompt) {
        onOpenFastAgentWithPrompt(prompt);
      } else {
        setInput(prompt);
        onOpenFastAgent?.();
      }
    },
    [onOpenFastAgent, onOpenFastAgentWithPrompt],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const handleChipClick = useCallback(
    (target: MainView, path: string, preferred?: BuyerPreferredPath) => {
      if (preferred) {
        saveBuyerPreferredPath(preferred);
        setPreferredPath(preferred);
      }
      onNavigate(target, path);
    },
    [onNavigate],
  );

  const handleNavigateWithPreference = useCallback(
    (target: MainView, path?: string, nextPreferredPath?: BuyerPreferredPath) => {
      if (nextPreferredPath) {
        saveBuyerPreferredPath(nextPreferredPath);
        setPreferredPath(nextPreferredPath);
      }
      onNavigate(target, path);
    },
    [onNavigate],
  );

  const handleDismissChecklist = useCallback(() => {
    setDismissed(true);
    saveBuyerChecklistState("dismissed");
  }, []);

  const handleRestoreChecklist = useCallback(() => {
    setDismissed(false);
    saveBuyerChecklistState(checklistState);
  }, [checklistState]);

  const scrollToDashboard = useCallback(() => {
    dashboardRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const completedCount = CHECKLIST_ITEMS.filter((item) => checklistState[item.id]).length;
  const showChecklist = !dismissed && completedCount < CHECKLIST_ITEMS.length;

  return (
    <div className="h-full overflow-y-auto scroll-smooth">
      {/* ════════════════════════════════════════════════════════════
       *  SECTION 1: ChatGPT-style Hero (viewport height)
       * ════════════════════════════════════════════════════════════ */}
      <div className="flex min-h-full flex-col items-center justify-center px-4 sm:px-6">
        <div className="flex w-full max-w-2xl flex-col items-center">
          {/* Logo mark */}
          <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg shadow-indigo-500/20">
            <Fingerprint className="h-5 w-5 text-white" aria-hidden="true" />
          </div>

          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-indigo-600 dark:text-indigo-300/80">
            Agent Trust Control Plane
          </p>
          <h1 className="mb-3 text-center text-3xl font-semibold tracking-tight text-content sm:text-5xl">
            The Trust Layer for Agents.
          </h1>
          <p className="mb-4 max-w-2xl text-center text-sm leading-relaxed text-content-secondary sm:text-base">
            Every permission gets a scope. Every action gets a receipt. Every decision gets evidence.
          </p>

          <div className="mb-6 w-full rounded-2xl border border-edge bg-surface/40 px-4 py-3 text-left">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-content-muted">
              Provenance, not proof.
            </div>
            <p className="mt-2 text-sm leading-relaxed text-content-secondary">
              Integrity of captured artifacts ≠ truth claims; hypotheses are scored and reviewed.
            </p>
          </div>

          <div className="mb-8 flex w-full flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => handleNavigateWithPreference("receipts", RECEIPTS_PATH, "receipts")}
              className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-700 transition hover:border-indigo-300/50 hover:bg-indigo-500/15 dark:text-indigo-100"
            >
              Run the Live Demo
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <a
              href={API_REFERENCE_PATH}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-edge bg-surface/50 px-4 py-2 text-sm font-medium text-content transition hover:bg-surface-hover"
            >
              Read the API
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <a
              href={MCP_INTEGRATION_PATH}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-edge bg-surface/50 px-4 py-2 text-sm font-medium text-content transition hover:bg-surface-hover"
            >
              Integrate via MCP / SDK
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>

          {controlPlaneDemoEnabled ? (
            <>
              {/* Input bar */}
              <div className="group relative w-full rounded-2xl border border-edge bg-surface-secondary shadow-sm transition-all duration-200 focus-within:border-indigo-500/40 focus-within:shadow-md focus-within:shadow-indigo-500/5 hover:border-edge">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder='Try: "Show me the agent actions that were denied or approval-gated today, and explain why."'
                  rows={1}
                  className="w-full resize-none bg-transparent px-4 py-3.5 pr-12 text-sm text-content placeholder:text-content-muted/60 focus:outline-none sm:text-base"
                  aria-label="Message NodeBench"
                />
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!input.trim() && !onOpenFastAgent}
                  className="absolute bottom-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm transition-all hover:bg-indigo-500 disabled:opacity-30 disabled:hover:bg-indigo-600"
                  aria-label="Send message"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              </div>

              {/* Prompt starters */}
              <div className="mt-4 grid w-full gap-3 sm:grid-cols-3">
                {STARTER_PROMPTS.map((item) => (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => handleStarterPrompt(item.prompt)}
                    className="group rounded-2xl border border-edge bg-surface/60 px-4 py-3 text-left transition-all hover:border-indigo-500/25 hover:bg-surface-secondary"
                  >
                    <div className="text-sm font-medium text-content">{item.title}</div>
                    <div className="mt-1 text-xs leading-relaxed text-content-muted">{item.prompt}</div>
                  </button>
                ))}
              </div>

              <div className="mt-4 w-full rounded-2xl border border-edge bg-surface/40 px-4 py-3 text-left">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-content-muted">
                  Trust surfaces in the live demo
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {TRUST_REVIEW_DIMENSIONS.map((item) => (
                    <div key={item} className="flex items-start gap-2 text-sm text-content-secondary">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400" aria-hidden="true" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onNavigate("investigation", INVESTIGATION_PATH)}
                    className="inline-flex items-center gap-2 rounded-full border border-edge bg-surface px-3 py-1.5 text-xs font-medium text-content-secondary transition hover:border-primary/30 hover:text-content"
                  >
                    Open Investigation
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate("receipts", RECEIPTS_PATH)}
                    className="inline-flex items-center gap-2 rounded-full border border-edge bg-surface px-3 py-1.5 text-xs font-medium text-content-secondary transition hover:border-primary/30 hover:text-content"
                  >
                    Open Receipts
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* Suggestion chips */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {orderedChips.map((chip) => {
                  const Icon = chip.icon;
                  return (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => handleChipClick(chip.target, chip.path, chip.preferred)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-edge bg-surface px-3 py-1.5 text-xs font-medium text-content-secondary transition-all hover:border-indigo-500/30 hover:bg-indigo-500/5 hover:text-content sm:text-sm"
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      {chip.label}
                    </button>
                  );
                })}
              </div>

              {/* Quick-nav cards */}
              <div className="mt-10 grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
                {QUICK_NAV.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => onNavigate(item.target, item.path)}
                      className="group flex flex-col items-start gap-2 rounded-xl border border-edge bg-surface/50 px-4 py-3.5 text-left transition-all hover:border-indigo-500/25 hover:bg-surface-secondary"
                    >
                      <Icon className="h-4 w-4 text-content-muted transition-colors group-hover:text-indigo-600 dark:group-hover:text-indigo-400" aria-hidden="true" />
                      <div>
                        <span className="block text-sm font-medium text-content">{item.label}</span>
                        <span className="mt-0.5 block text-[11px] leading-snug text-content-muted">
                          {item.description}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}
        </div>

        {/* Scroll hint */}
        <button
          type="button"
          onClick={scrollToDashboard}
          className="mt-8 flex flex-col items-center gap-1 text-content-muted/40 transition-colors hover:text-content-muted animate-bounce"
          aria-label="Scroll to control plane dashboard"
        >
          <span className="text-[10px] uppercase tracking-widest">Explore more</span>
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════
       *  SECTION 2: Enterprise Dashboard (below the fold)
       * ════════════════════════════════════════════════════════════ */}
      <div ref={dashboardRef} className="mx-auto max-w-6xl px-6 pb-16 pt-12">
        <div className="w-full rounded-[28px] border border-edge bg-surface-secondary dark:bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.12),transparent_38%),rgba(5,5,5,0.92)] px-6 py-8 sm:px-8 sm:py-10">
          {/* Header */}
          <div className="mb-8 space-y-4 text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-edge bg-surface-secondary px-3 py-1.5 text-xs text-content-muted">
              <Fingerprint className="h-3.5 w-3.5" aria-hidden="true" />
              NodeBench Control Plane
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-indigo-600 dark:text-indigo-300/80">
              The trust layer for agents
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-content sm:text-4xl">
              Agent Trust Control Plane Demo
            </h2>
            <p className="mx-auto max-w-2xl text-base leading-relaxed text-content-secondary">
              Every permission gets a scope. Every action gets a receipt. Every decision gets evidence.
            </p>
            <p className="mx-auto max-w-xl text-sm leading-relaxed text-content-muted">
              Agents are getting tools faster than trust controls. Start with action receipts, then move into
              passport &amp; delegation and investigation when a run matters enough to review, approve, or block.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleNavigateWithPreference("receipts", RECEIPTS_PATH, "receipts")}
                className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-700 dark:text-indigo-100 transition hover:border-indigo-300/50 hover:bg-indigo-500/15"
              >
                Open Receipts
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => handleNavigateWithPreference("delegation", DELEGATION_PATH, "delegation")}
                className="inline-flex items-center gap-2 rounded-full border border-edge bg-surface/50 px-4 py-2 text-sm font-medium text-content transition hover:bg-surface-hover"
              >
                Open Passport
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => handleNavigateWithPreference("investigation", INVESTIGATION_PATH, "investigation")}
                className="inline-flex items-center gap-2 rounded-full border border-edge bg-surface/50 px-4 py-2 text-sm font-medium text-content transition hover:bg-surface-hover"
              >
                Open Investigation
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Role paths */}
          <div className="mb-8">
            <p className="mb-3 text-center text-xs font-medium uppercase tracking-[0.18em] text-content-muted">
              Choose your path
            </p>
            <div
              className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4"
              role="group"
              aria-label="Choose your starting path"
            >
              {orderedRolePaths.map((path) => {
                const Icon = path.icon;
                return (
                  <button
                    key={path.id}
                    type="button"
                    onClick={() => handleNavigateWithPreference(path.target, path.path, path.preferredPath)}
                    className={`group flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-150 ${path.accent}`}
                  >
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${path.iconColor}`} aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 text-sm font-medium text-content">
                        <span>{path.label}</span>
                        {"recommended" in path && path.recommended ? (
                          <span className="rounded-full border border-indigo-400/20 bg-indigo-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-200">
                            Start here
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-content-muted">
                        {path.description}
                      </span>
                    </span>
                    <ArrowRight
                      className="ml-auto mt-0.5 h-3.5 w-3.5 shrink-0 text-content-muted transition-colors group-hover:text-content-secondary"
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Checklist */}
          {showChecklist ? (
            <div className="mb-8 rounded-xl border border-edge bg-surface-secondary px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-content-secondary">Getting started</span>
                  <span className="rounded-full bg-surface-hover px-2 py-0.5 text-[10px] font-medium text-content-muted">
                    {completedCount}/{CHECKLIST_ITEMS.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleDismissChecklist}
                  className="rounded p-1 text-content-muted transition hover:bg-surface-hover hover:text-content-muted"
                  aria-label="Dismiss checklist"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
                {CHECKLIST_ITEMS.map((item) => {
                  const done = !!checklistState[item.id];
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavigateWithPreference(item.target, item.path)}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition ${
                        done ? "text-content-muted line-through" : "text-content-secondary hover:bg-surface-hover"
                      }`}
                    >
                      {done ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden="true" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 shrink-0 text-content-muted" aria-hidden="true" />
                      )}
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mb-8 text-center">
              <button
                type="button"
                onClick={handleRestoreChecklist}
                className="text-xs text-content-muted transition hover:text-content-secondary"
              >
                Getting started
              </button>
            </div>
          )}

          {/* Core surfaces */}
          <nav
            className="grid w-full grid-cols-1 gap-4 lg:grid-cols-3"
            aria-label="Core product surfaces"
          >
            {CORE_SURFACES.map((surface) => {
              const Icon = surface.icon;
              const preferred = surface.id as BuyerPreferredPath;
              return (
                <button
                  type="button"
                  key={surface.id}
                  onClick={() => handleNavigateWithPreference(surface.id, surface.path, preferred)}
                  aria-label={`Navigate to ${surface.title}: ${surface.subtitle}`}
                  className={`group relative flex flex-col items-start gap-3 rounded-xl border bg-gradient-to-br p-5 text-left transition-all duration-200 ${surface.accent} ${surface.borderColor}`}
                >
                  <div className="flex w-full items-center justify-between">
                    <Icon className={`h-5 w-5 ${surface.iconColor}`} aria-hidden="true" />
                    <ArrowRight
                      className="h-4 w-4 text-content-muted transition-colors group-hover:text-content-secondary"
                      aria-hidden="true"
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-content">{surface.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-content-muted">{surface.subtitle}</p>
                  </div>
                </button>
              );
            })}
          </nav>

          {/* Explanation cards */}
          <div className="mt-8 grid grid-cols-1 gap-3 text-left sm:grid-cols-2 xl:grid-cols-4">
            {[
              [
                "Problem",
                "Agents are getting tools faster than trust controls. Excessive agency and fragile postmortems make failures hard to review.",
              ],
              [
                "Solution",
                "NodeBench packages Passport, Intent Ledger, Action Receipts, and a Delegation Graph into legible control-plane surfaces.",
              ],
              [
                "Security",
                "Least privilege, approval gates, denied actions, and reversible workflows reduce blast radius before external actions fire.",
              ],
              [
                "Evidence",
                "Content hashes, trace IDs, and deterministic review give provenance for captured artifacts without pretending they are proof.",
              ],
            ].map(([title, body]) => (
              <div key={title} className="rounded-xl border border-edge bg-surface-secondary px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted">
                  {title}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-content-secondary">{body}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-edge bg-surface/40 px-5 py-5 text-left">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted">
              Integration
            </div>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-3xl text-sm leading-relaxed text-content-secondary">
                Use the REST API for Passports, Intent Ledgers, and Receipts, then connect external agents through the
                MCP surface when you want the same trust primitives outside the demo app.
              </p>
              <div className="flex flex-wrap gap-2">
                <a
                  href={API_REFERENCE_PATH}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-edge bg-surface px-3 py-1.5 text-xs font-medium text-content-secondary transition hover:border-primary/30 hover:text-content"
                >
                  API Reference
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
                <a
                  href={MCP_INTEGRATION_PATH}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-edge bg-surface px-3 py-1.5 text-xs font-medium text-content-secondary transition hover:border-primary/30 hover:text-content"
                >
                  MCP Surface
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>

          {/* Power user paths */}
          <div
            className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2"
            role="navigation"
            aria-label="Developer and agent operator starting points"
          >
            {POWER_USER_PATHS.map((path) => {
              const Icon = path.icon;
              return (
                <button
                  key={path.id}
                  type="button"
                  onClick={() => handleNavigateWithPreference(path.target, path.path)}
                  aria-label={`Navigate to ${path.label}`}
                  className={`rounded-2xl border px-5 py-4 text-left transition ${path.accent}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted">
                        {path.eyebrow}
                      </div>
                      <div className="text-sm font-medium text-content">{path.label}</div>
                    </div>
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${path.iconColor}`} aria-hidden="true" />
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-content-muted">{path.description}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-8">
            <p className="mb-3 text-center text-xs font-medium uppercase tracking-[0.18em] text-content-muted">
              Use cases
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {USE_CASES.map((useCase) => {
                const Icon = useCase.icon;
                return (
                  <button
                    key={useCase.id}
                    type="button"
                    onClick={() =>
                      handleNavigateWithPreference(useCase.target, useCase.path, useCase.preferredPath)
                    }
                    className="rounded-2xl border border-edge bg-surface/50 px-5 py-4 text-left transition hover:border-indigo-500/25 hover:bg-surface-secondary"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm font-medium text-content">{useCase.title}</div>
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-content-secondary" aria-hidden="true" />
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-content-muted">{useCase.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Secondary surfaces */}
          <div className="mt-8 text-center text-xs font-medium uppercase tracking-[0.18em] text-content-muted">
            Adjacent workflows
          </div>
          <div
            className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2"
            role="navigation"
            aria-label="Secondary navigation"
          >
            {SECONDARY_SURFACES.map((surface) => {
              const Icon = surface.icon;
              return (
                <button
                  key={surface.id}
                  type="button"
                  onClick={() =>
                    handleNavigateWithPreference(
                      surface.id,
                      surface.path,
                      undefined,
                    )
                  }
                  aria-label={`Navigate to ${surface.title}`}
                  className="flex items-start gap-3 rounded-xl border border-edge bg-surface/50 px-4 py-3 text-left transition hover:bg-surface-hover hover:border-edge"
                >
                  <Icon className="mt-0.5 h-4 w-4 text-content-secondary" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-content">{surface.title}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-content-muted">
                      {surface.subtitle}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Footer badge */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 rounded-xl border border-edge bg-surface/50 px-4 py-3 text-xs text-content-muted">
            <BadgeCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-300" aria-hidden="true" />
            <span>
              Cold start path: scope an agent in Passport, review Receipts, escalate to Investigation when a run matters, and keep product direction grounded in captured evidence.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

export default ControlPlaneLanding;
