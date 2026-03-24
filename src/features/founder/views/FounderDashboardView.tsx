/**
 * FounderDashboardView — Coherent founder clarity pipeline centered on the
 * Artifact Packet.
 *
 * Layout (top to bottom):
 *   1. HeaderBar — company name, mode switch, streak badge
 *   2. FounderClarityOverview — 3-column dense card (Company Truth | What Changed | Next 3 Moves)
 *   3. Contradiction banner — full-width amber/rose card
 *   4. ArtifactPacketPanel — packet generation and display
 *   5. RankedInterventionsPanel — ranked intervention cards
 *   6. AgentActivityPanel — agent status cards
 *   7. NearbyEntitiesPanel — color-coded entity chips
 *   8. TimelineMemoStrip — condensed daily briefing + timeline
 *
 * All interactions persist to localStorage. Convex wiring comes later.
 */

import { memo, useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Bot,
  Building2,
  Check,
  Clock,
  Eye,
  Flame,
  Globe,
  Lightbulb,
  Plus,
  Radio,
  RotateCcw,
  Share2,
  Sparkles,
  Target,
  User,
  Volume2,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRevealOnMount } from "@/hooks/useRevealOnMount";
import { useMotionConfig } from "@/lib/motion";
import { ArtifactPacketPanel } from "../components/ArtifactPacketPanel";
import {
  buildFounderArtifactPacket,
  formatArtifactPacketTimestamp,
  getArtifactPacketTypeLabel,
  loadActiveFounderArtifactPacket,
  loadFounderArtifactPackets,
  saveFounderArtifactPacket,
  setActiveFounderArtifactPacket,
  artifactPacketToMarkdown,
  artifactPacketToHtml,
} from "../lib/artifactPacket";
import { useFastAgent } from "@/features/agents/context/FastAgentContext";
import type {
  ArtifactPacketType,
  FounderArtifactPacket,
  FounderPacketSourceInput,
} from "../types/artifactPacket";
import {
  type ShareableMemoData,
  saveMemoToStorage,
  generateMemoId,
  copyMemoUrl,
} from "./ShareableMemoView";
import {
  DEMO_COMPANY,
  DEMO_CHANGES,
  DEMO_INTERVENTIONS,
  DEMO_INITIATIVES,
  DEMO_AGENTS,
  DEMO_NEARBY_ENTITIES,
  DEMO_DAILY_MEMO,
  DEMO_EXTERNAL_SIGNALS,
  type NearbyEntity,
  type SignalCategory,
  type ChangeEntry,
  type ChangeType,
  type InitiativeStatus,
  type RiskLevel,
  type AgentType,
  type AgentStatus,
  type Intervention,
} from "./founderFixtures";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const GLASS_CARD = "rounded-xl border border-white/[0.20] bg-white/[0.12] p-4";
const GLASS_CARD_INTERACTIVE = "rounded-xl border border-white/[0.20] bg-white/[0.12] p-4 transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.07] cursor-pointer";
const SECTION_HEADER = "text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60";

const LS_KEY_INTERVENTIONS = "nodebench-interventions";
const LS_KEY_STREAK = "nodebench-streak";
const LS_KEY_USER_ACTIONS = "nodebench-user-actions";
const LS_KEY_VISIT_COUNT = "nodebench-visit-count";
const LS_KEY_AGENT_STATUS = "nodebench-agent-status";
const LS_KEY_CONTEXT_INTAKE = "nodebench-context-intake";
const LS_KEY_INTAKE_COMPARABLES = "nodebench-intake-comparables";

type FounderMode = "weekly_reset" | "pre_delegation" | "important_change";
const FOUNDER_MODE_LABELS: Record<FounderMode, string> = { weekly_reset: "Weekly Reset", pre_delegation: "Pre-Delegation", important_change: "Change Review" };

/* ---- Types ---- */
type InterventionState = "pending" | "accepted" | "deferred" | "rejected";
interface InterventionRecord { id: string; state: InterventionState; updatedAt: number; }
interface StreakData { count: number; lastVisitDate: string; }
interface UserAction { id: string; description: string; timestamp: number; actionType: "accepted" | "deferred" | "rejected"; }
interface FounderToast { id: string; message: string; color: "emerald" | "amber" | "rose"; createdAt: number; }

/* ---- localStorage helpers ---- */
function loadInterventionRecords(): Record<string, InterventionRecord> { try { const r = localStorage.getItem(LS_KEY_INTERVENTIONS); return r ? JSON.parse(r) : {}; } catch { return {}; } }
function saveInterventionRecords(records: Record<string, InterventionRecord>) { localStorage.setItem(LS_KEY_INTERVENTIONS, JSON.stringify(records)); }
function loadStreak(): StreakData { try { const r = localStorage.getItem(LS_KEY_STREAK); return r ? JSON.parse(r) : { count: 0, lastVisitDate: "" }; } catch { return { count: 0, lastVisitDate: "" }; } }
function saveStreak(data: StreakData) { localStorage.setItem(LS_KEY_STREAK, JSON.stringify(data)); }
function loadUserActions(): UserAction[] { try { const r = localStorage.getItem(LS_KEY_USER_ACTIONS); return r ? JSON.parse(r) : []; } catch { return []; } }
function saveUserActions(actions: UserAction[]) { localStorage.setItem(LS_KEY_USER_ACTIONS, JSON.stringify(actions)); }
function loadVisitCount(): number { try { return parseInt(localStorage.getItem(LS_KEY_VISIT_COUNT) ?? "0", 10); } catch { return 0; } }
function incrementVisitCount(): number { const c = loadVisitCount() + 1; localStorage.setItem(LS_KEY_VISIT_COUNT, String(c)); return c; }
function loadAgentStatuses(): Record<string, AgentStatus> { try { const r = localStorage.getItem(LS_KEY_AGENT_STATUS); return r ? JSON.parse(r) : {}; } catch { return {}; } }
function todayStr(): string { return new Date().toISOString().split("T")[0]; }

/* ---- Helpers ---- */
function staggerDelay(index: number): number { return index * 0.06; }

type FounderChangeFeedEntry = ChangeEntry & { isUser?: boolean; source?: string };

function loadIntakeEntries(): Array<{ id: string; type: string; content: string; addedAt: string }> {
  try { const r = localStorage.getItem(LS_KEY_CONTEXT_INTAKE); return r ? JSON.parse(r) : []; } catch { return []; }
}

function loadIntakeComparables(): Array<{ id: string; name: string; relationship: string }> {
  try { const r = localStorage.getItem(LS_KEY_INTAKE_COMPARABLES); return r ? JSON.parse(r) : []; } catch { return []; }
}

function buildFounderChangeFeed(userActions: UserAction[]): FounderChangeFeedEntry[] {
  const userEntries: FounderChangeFeedEntry[] = userActions.map((ua) => ({ id: ua.id, timestamp: new Date(ua.timestamp).toISOString(), relativeTime: relativeTime(ua.timestamp), type: "decision", description: ua.description, isUser: true, source: "user" }));
  // Include intake entries as change feed items
  const intakeEntries: FounderChangeFeedEntry[] = loadIntakeEntries().slice(0, 5).map((entry) => ({
    id: entry.id, timestamp: entry.addedAt, relativeTime: relativeTimeFromISO(entry.addedAt),
    type: "signal" as ChangeType, description: entry.content.slice(0, 200), isUser: true, source: entry.type,
  }));
  return [...userEntries, ...intakeEntries, ...DEMO_CHANGES];
}

function buildPacketInterventions(states: Record<string, InterventionRecord>): Intervention[] {
  return DEMO_INTERVENTIONS.filter((iv) => states[iv.id]?.state !== "rejected").sort((a, b) => b.priorityScore - a.priorityScore);
}

function buildFounderPacketSource(args: { identityConfidence: number; interventionStates: Record<string, InterventionRecord>; userActions: UserAction[]; agentStatusOverrides: Record<string, AgentStatus> }): FounderPacketSourceInput {
  return {
    company: { name: DEMO_COMPANY.name, canonicalMission: DEMO_COMPANY.canonicalMission, wedge: DEMO_COMPANY.wedge, companyState: DEMO_COMPANY.companyState, foundingMode: DEMO_COMPANY.foundingMode, identityConfidence: args.identityConfidence },
    changes: buildFounderChangeFeed(args.userActions),
    interventions: buildPacketInterventions(args.interventionStates).map((iv) => ({ id: iv.id, title: iv.title, linkedInitiative: iv.linkedInitiative, linkedInitiativeId: iv.linkedInitiativeId, priorityScore: iv.priorityScore, confidence: iv.confidence })),
    initiatives: DEMO_INITIATIVES.map((init) => ({ id: init.id, title: init.title, status: init.status, risk: init.risk, priorityScore: init.priorityScore, objective: init.objective })),
    agents: DEMO_AGENTS.map((agent) => ({ id: agent.id, name: agent.name, status: args.agentStatusOverrides[agent.id] ?? agent.status, currentGoal: agent.currentGoal })),
    dailyMemo: DEMO_DAILY_MEMO,
    nearbyEntities: [
      ...loadIntakeComparables().map((c) => ({ id: c.id, name: c.name, relationship: c.relationship, whyItMatters: `Added via context intake as ${c.relationship}` })),
      ...DEMO_NEARBY_ENTITIES,
    ].slice(0, 7),
  };
}

function relativeTime(ts: number): string { const d = Date.now() - ts; const s = Math.floor(d / 1000); if (s < 60) return `${s}s ago`; const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`; const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`; return `${Math.floor(h / 24)}d ago`; }
function relativeTimeFromISO(iso: string): string { const ts = new Date(iso).getTime(); if (isNaN(ts)) return "recently"; return relativeTime(ts); }

/* ---- Sound ---- */
const LS_KEY_SOUND = "nodebench-sound-enabled";
function isSoundEnabled(): boolean { return localStorage.getItem(LS_KEY_SOUND) === "true"; }
function playSound(type: "click" | "success" | "error") { if (!isSoundEnabled()) return; try { const ctx = new AudioContext(); const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.connect(gain); gain.connect(ctx.destination); gain.gain.value = 0.08; osc.frequency.value = ({ click: 800, success: 1200, error: 400 })[type]; osc.type = type === "success" ? "sine" : "triangle"; osc.start(); osc.stop(ctx.currentTime + 0.08); } catch { /* */ } }

/* ---- Confetti ---- */
function triggerConfetti() {
  const colors = ["#d97757", "#10b981", "#f59e0b", "#3b82f6", "#8b5cf6"];
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99999;overflow:hidden;";
  document.body.appendChild(container);
  for (let i = 0; i < 50; i++) { const p = document.createElement("div"); const c = colors[Math.floor(Math.random() * colors.length)]; const x = Math.random() * 100; const dl = Math.random() * 0.5; p.style.cssText = `position:absolute;left:${x}%;top:-10px;width:8px;height:8px;background:${c};border-radius:2px;animation:confettiFall 1.5s ${dl}s ease-in forwards;`; container.appendChild(p); }
  if (!document.querySelector("#confetti-style")) { const s = document.createElement("style"); s.id = "confetti-style"; s.textContent = "@keyframes confettiFall{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(100vh) rotate(720deg);opacity:0}}"; document.head.appendChild(s); }
  setTimeout(() => container.remove(), 2500);
}

/* ---- Color maps ---- */
const AGENT_STATUS_DOT: Record<AgentStatus, string> = { healthy: "bg-emerald-500", blocked: "bg-rose-500", waiting: "bg-amber-500", drifting: "bg-violet-500", ambiguous: "bg-white/30" };
const AGENT_TYPE_COLORS: Record<AgentType, string> = { claude_code: "bg-sky-500/10 text-sky-400", openclaw: "bg-violet-500/10 text-violet-400", background: "bg-white/[0.06] text-white/60" };
const CHANGE_TYPE_ICONS: Record<ChangeType | "user", typeof Radio> = { signal: Radio, agent: Bot, initiative: Target, decision: Lightbulb, user: User };
const CHANGE_TYPE_COLORS: Record<ChangeType | "user", string> = { signal: "text-sky-400", agent: "text-violet-400", initiative: "text-emerald-400", decision: "text-amber-400", user: "text-[#d97757]" };

/* ---- Toast system ---- */
const TOAST_ACCENT: Record<FounderToast["color"], string> = { emerald: "border-l-emerald-500", amber: "border-l-amber-500", rose: "border-l-rose-500" };

function FounderToasts({ toasts, onDismiss }: { toasts: FounderToast[]; onDismiss: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col-reverse gap-2">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <motion.div key={t.id} layout initial={{ opacity: 0, x: 80, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 80, scale: 0.95 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} className={cn("relative flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.07] backdrop-blur-md px-4 py-3 min-w-[280px] max-w-[380px] border-l-2", TOAST_ACCENT[t.color])}>
            <span className="text-sm text-white/70">{t.message}</span>
            <button onClick={() => onDismiss(t.id)} className="ml-auto shrink-0 text-white/70 hover:text-white/60 transition-colors"><X className="h-3.5 w-3.5" /></button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ---- StaggerCard ---- */
function StaggerCard({ children, className }: { index: number; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}

/* ==================================================================
   1. HeaderBar
   ================================================================== */

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function HeaderBar({ streak, founderMode, onModeChange }: { streak: number; founderMode: FounderMode; onModeChange: (mode: FounderMode) => void }) {
  const navigate = useNavigate();
  const modes: FounderMode[] = ["weekly_reset", "pre_delegation", "important_change"];
  const intakeCount = loadIntakeEntries().length;
  const greetingText = getGreeting();
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] text-white/60">{greetingText}, welcome back</p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-white/90 sm:text-xl">{DEMO_COMPANY.name}</h1>
          {streak > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#d97757]/20 bg-[#d97757]/10 px-2.5 py-0.5 text-xs font-semibold text-[#d97757] tabular-nums"><Flame className="h-3 w-3" />{streak}</span>
          )}
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-white/[0.20] bg-white/[0.12] p-0.5">
          {modes.map((mode) => (
            <button key={mode} type="button" onClick={() => onModeChange(mode)} className={cn("rounded-md px-3 py-1.5 text-[11px] font-medium transition-all duration-150", founderMode === mode ? "bg-[#d97757]/15 text-[#d97757] shadow-sm" : "text-white/60 hover:text-white/60")}>{FOUNDER_MODE_LABELS[mode]}</button>
          ))}
        </div>
      </div>
      {/* Quick nav: Intake + History */}
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => navigate("/founder/intake")} className="flex items-center gap-1.5 rounded-md bg-white/[0.06] px-2.5 py-1 text-[10px] font-medium text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white/60">
          <Plus className="h-3 w-3" />Add Context{intakeCount > 0 ? ` (${intakeCount})` : ""}
        </button>
        <button type="button" onClick={() => navigate("/founder/history")} className="flex items-center gap-1.5 rounded-md bg-white/[0.06] px-2.5 py-1 text-[10px] font-medium text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white/60">
          <Clock className="h-3 w-3" />History
        </button>
      </div>
    </div>
  );
}

/* ==================================================================
   2. FounderClarityOverview
   ================================================================== */

function FounderClarityOverview({ identityConfidence, userActions, packet }: { identityConfidence: number; userActions: UserAction[]; packet: FounderArtifactPacket | null }) {
  const navigate = useNavigate();
  const c = DEMO_COMPANY;
  const pct = Math.round(identityConfidence * 100);
  const barColor = pct < 40 ? "bg-rose-500" : pct < 70 ? "bg-amber-500" : "bg-emerald-500";
  const barTextColor = pct < 40 ? "text-rose-400" : pct < 70 ? "text-amber-400" : "text-emerald-400";
  const stateLabel: Record<typeof c.companyState, string> = { idea: "Idea", forming: "Forming", operating: "Operating", pivoting: "Pivoting" };
  const changeFeed = useMemo(() => buildFounderChangeFeed(userActions), [userActions]);
  // Merge user actions into combined changes — source === "user" entries show the founder's own past actions
  const combinedChanges = useMemo(() => {
    const userEntries = userActions.map(ua => ({ ...ua, isUser: true, source: "user" as const, type: "user_action" as const }));
    return [...userEntries, ...changeFeed].sort((a, b) => b.timestamp - a.timestamp);
  }, [changeFeed, userActions]);
  const topChanges = combinedChanges.slice(0, 3);
  const nextActions = useMemo(() => {
    if (packet && packet.nextActions.length > 0) return packet.nextActions.slice(0, 3);
    return DEMO_INTERVENTIONS.slice(0, 3).map((iv, i) => ({ id: iv.id, label: iv.title, whyNow: iv.linkedInitiative, priority: (i === 0 ? "high" : "medium") as "high" | "medium" | "low", linkedInitiativeId: iv.linkedInitiativeId }));
  }, [packet]);
  const priorityLabels: Record<string, string> = { high: "NOW", medium: "This week", low: "Next week" };

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {/* Column 1: Company Truth */}
      <div className={GLASS_CARD}>
        <h2 className={SECTION_HEADER}>What Company</h2>
        <h3 className="mt-2 text-base font-bold text-white/90">{c.name}</h3>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-white/60">{stateLabel[c.companyState]}</span>
          <span className={cn("text-xs font-semibold tabular-nums", barTextColor)}>{pct}%</span>
        </div>
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div className={cn("h-full rounded-full transition-all duration-500", barColor)} style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-white/60">{c.canonicalMission}</p>
        <div className="mt-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-[#d97757]/20 bg-[#d97757]/10 px-2 py-0.5 text-[10px] font-medium text-[#d97757]"><Zap className="h-2.5 w-2.5" />{c.wedge}</span>
        </div>
        {pct < 70 && (
          <button onClick={() => navigate("/founder/setup")} className="mt-3 inline-flex items-center gap-1 rounded-lg border border-[#d97757]/30 bg-[#d97757]/10 px-2.5 py-1 text-[10px] font-medium text-[#d97757] transition-colors hover:bg-[#d97757]/20"><Sparkles className="h-2.5 w-2.5" />Clarify Identity</button>
        )}
      </div>

      {/* Column 2: What Changed */}
      <div className={GLASS_CARD}>
        <h2 className={SECTION_HEADER}>What Changed</h2>
        {topChanges.length === 0 ? (<p className="mt-2 text-xs text-white/60">No changes since last review.</p>) : (
          <ul className="mt-2 space-y-2">
            {topChanges.map((ch) => { const isUser = "isUser" in ch && ch.isUser; const iconType = isUser ? "user" : ch.type; const Icon = CHANGE_TYPE_ICONS[iconType]; return (
              <li key={ch.id} className="flex items-start gap-2">
                <div className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-white/[0.07]", CHANGE_TYPE_COLORS[iconType])}><Icon className="h-3 w-3" /></div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-xs leading-relaxed text-white/65">{ch.description}</p>
                  <span className="text-[10px] text-white/60">{isUser ? relativeTime(new Date(ch.timestamp).getTime()) : relativeTimeFromISO(ch.timestamp)}</span>
                </div>
              </li>); })}
          </ul>
        )}
      </div>

      {/* Column 3: Next 3 Moves */}
      <div className={GLASS_CARD}>
        <h2 className={SECTION_HEADER}>Next 3 Moves</h2>
        <ol className="mt-2 space-y-2">
          {nextActions.map((action, i) => (
            <li key={action.id} className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#d97757]/10 text-[10px] font-bold text-[#d97757]">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium leading-snug text-white/75">{action.label}</p>
                <span className="text-[10px] text-white/60">{priorityLabels[action.priority] ?? action.priority}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/* ==================================================================
   3. Contradiction Banner
   ================================================================== */

function ContradictionBanner({ packet }: { packet: FounderArtifactPacket | null }) {
  const contradiction = packet?.contradictions[0];
  const affectedCount = useMemo(() => packet ? DEMO_INITIATIVES.filter((i) => i.risk === "high" || i.status === "blocked").length : 0, [packet]);
  const title = contradiction?.title ?? "Focus debt remains the main risk";
  const detail = contradiction?.detail ?? "Multiple active initiatives create execution spread. Generate a packet to surface the sharpest contradiction.";
  const severity = contradiction?.severity ?? "medium";
  const styles = { high: "border-rose-500/20 bg-rose-500/5", medium: "border-amber-500/20 bg-amber-500/5", low: "border-emerald-500/20 bg-emerald-500/5" };
  const iconStyles = { high: "text-rose-400", medium: "text-amber-400", low: "text-emerald-400" };

  return (
    <div className={cn("flex items-start gap-3 rounded-xl border p-4", styles[severity])}>
      <AlertTriangle className={cn("mt-0.5 h-4 w-4 shrink-0", iconStyles[severity])} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">Biggest Contradiction</span>
          {affectedCount > 0 && <span className="rounded-full bg-white/[0.07] px-2 py-0.5 text-[10px] text-white/60">{affectedCount} initiative{affectedCount !== 1 ? "s" : ""} affected</span>}
        </div>
        <p className="mt-1 text-sm font-medium text-white/75">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-white/60">{detail}</p>
      </div>
    </div>
  );
}

/* ==================================================================
   InterventionShareButton
   ================================================================== */

function InterventionShareButton({ intervention }: { intervention: Intervention }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timerRef.current), []);
  const handleShare = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const id = generateMemoId();
    const memoData: ShareableMemoData = {
      id, company: DEMO_COMPANY.name, date: new Date().toISOString().slice(0, 10),
      question: `Should we prioritize: ${intervention.title}?`,
      answer: `This action ranks #${intervention.rank} with a priority score of ${intervention.priorityScore}/100 and ${Math.round(intervention.confidence * 100)}% confidence. It is linked to the "${intervention.linkedInitiative}" initiative.`,
      confidence: Math.round(intervention.confidence * 100), sourceCount: 6,
      variables: [
        { rank: 1, name: "Priority score", direction: "up" as const, impact: "high" as const },
        { rank: 2, name: "Initiative alignment", direction: "up" as const, impact: "medium" as const },
        { rank: 3, name: "Confidence level", direction: intervention.confidence > 0.7 ? ("up" as const) : ("neutral" as const), impact: "medium" as const },
      ],
      scenarios: [
        { label: "Base", probability: 60, outcome: "Complete action within standard timeline" },
        { label: "Bull", probability: 25, outcome: `Action accelerates ${intervention.linkedInitiative} ahead of schedule` },
        { label: "Bear", probability: 15, outcome: "Delays or dependencies block execution" },
      ],
      actions: [{ action: intervention.title, impact: "high" as const }],
    };
    saveMemoToStorage(memoData); copyMemoUrl(id); setCopied(true);
    clearTimeout(timerRef.current); timerRef.current = setTimeout(() => setCopied(false), 2000);
  }, [intervention]);

  return (
    <button onClick={handleShare} className={cn("flex h-7 w-7 items-center justify-center rounded-lg transition-colors", copied ? "bg-emerald-500/10 text-emerald-400" : "bg-white/[0.07] text-white/60 hover:bg-white/[0.08] hover:text-white/60")} title={copied ? "Link copied!" : "Share as memo"}>
      {copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
    </button>
  );
}

/* ==================================================================
   5. RankedInterventionsPanel
   ================================================================== */

function RankedInterventionsPanel({ interventionStates, onAction }: { interventionStates: Record<string, InterventionRecord>; onAction: (intervention: Intervention, action: "accepted" | "deferred" | "rejected") => void }) {
  const acceptedToday = Object.values(interventionStates).filter((r) => r.state === "accepted").length;
  const reRanked = [...DEMO_INTERVENTIONS].filter((iv) => { const rec = interventionStates[iv.id]; return !rec || rec.state !== "rejected"; }).sort((a, b) => {
    const sa = interventionStates[a.id]?.state ?? "pending"; const sb = interventionStates[b.id]?.state ?? "pending";
    if (sa === "pending" && sb !== "pending") return -1; if (sa !== "pending" && sb === "pending") return 1;
    if (sa === "deferred" && sb === "accepted") return -1; if (sa === "accepted" && sb === "deferred") return 1;
    return b.priorityScore - a.priorityScore;
  });

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <h2 className={SECTION_HEADER}>Recommended Actions</h2>
        {acceptedToday > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 tabular-nums"><Check className="h-2.5 w-2.5" />{acceptedToday} done today</span>}
      </div>
      <div className="flex flex-col gap-2">
        <AnimatePresence mode="popLayout">
          {reRanked.map((iv) => { const state = interventionStates[iv.id]?.state ?? "pending"; return (
            <motion.div key={iv.id} layout draggable={state === "pending"} onDragStart={(e) => { (e as unknown as DragEvent).dataTransfer?.setData?.("text/plain", iv.id); }} onDragEnd={() => {}} initial={{ opacity: 1 }} exit={{ opacity: 0, x: -40, height: 0, marginBottom: 0 }} transition={{ duration: 0.25 }} className={cn(GLASS_CARD_INTERACTIVE, state === "accepted" && "border-emerald-500/20", state === "deferred" && "border-amber-500/20 opacity-60", state === "pending" && "cursor-grab active:cursor-grabbing")}>
              <div className="flex items-start gap-3">
                <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums", state === "accepted" ? "bg-emerald-500/15 text-emerald-400" : state === "deferred" ? "bg-amber-500/15 text-amber-400" : "bg-[#d97757]/15 text-[#d97757]")}>
                  {state === "accepted" ? <Check className="h-3.5 w-3.5" /> : state === "deferred" ? <Clock className="h-3.5 w-3.5" /> : iv.rank}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm font-medium leading-snug", state === "accepted" ? "text-emerald-300/80 line-through decoration-emerald-500/30" : state === "deferred" ? "text-white/60" : "text-white/80")}>{iv.title}</p>
                  <p className="mt-1 text-xs text-white/60">{iv.linkedInitiative}</p>
                  <div className="mt-2.5 flex items-center gap-4">
                    <div className="flex items-center gap-2"><span className="text-[10px] font-medium text-white/60">Priority</span><div className="h-1 w-16 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-[#d97757]/60" style={{ width: `${iv.priorityScore}%` }} /></div><span className="text-[10px] tabular-nums text-white/60">{iv.priorityScore}</span></div>
                    <span className="text-[10px] tabular-nums text-white/60">{Math.round(iv.confidence * 100)}% conf</span>
                  </div>
                </div>
                {state === "pending" ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); onAction(iv, "accepted"); }} className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 transition-colors hover:bg-emerald-500/20" title="Accept"><Check className="h-3.5 w-3.5" /></button>
                    <button onClick={(e) => { e.stopPropagation(); onAction(iv, "deferred"); }} className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 transition-colors hover:bg-amber-500/20" title="Defer"><Clock className="h-3.5 w-3.5" /></button>
                    <button onClick={(e) => { e.stopPropagation(); onAction(iv, "rejected"); }} className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400 transition-colors hover:bg-rose-500/20" title="Reject"><X className="h-3.5 w-3.5" /></button>
                    <InterventionShareButton intervention={iv} />
                  </div>
                ) : (
                  <div className="flex shrink-0 items-center gap-1"><span className="text-[10px] text-white/70 capitalize">{state}</span><InterventionShareButton intervention={iv} /></div>
                )}
              </div>
            </motion.div>); })}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ==================================================================
   6. AgentActivityPanel
   ================================================================== */

function AgentActivityPanel({ agentStatusOverrides }: { agentStatusOverrides: Record<string, AgentStatus> }) {
  const navigate = useNavigate();
  const agents = DEMO_AGENTS.map((a) => ({ ...a, status: agentStatusOverrides[a.id] ?? a.status }));
  if (agents.length === 0) return (<div className={GLASS_CARD}><h2 className={SECTION_HEADER}>Agent Activity</h2><p className="mt-3 text-sm text-white/60">No agents connected.</p></div>);
  return (
    <div>
      <h2 className={cn(SECTION_HEADER, "mb-3")}>Agent Activity <span className="ml-2 text-white/60">({agents.length} agents)</span></h2>
      <div className="flex flex-col gap-2">
        {agents.map((agent) => (
          <div key={agent.id} className={GLASS_CARD_INTERACTIVE}>
            <div className="flex items-start gap-3">
              <div className="mt-1.5 flex shrink-0 flex-col items-center"><div className={cn("h-2.5 w-2.5 rounded-full", AGENT_STATUS_DOT[agent.status])} /></div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><span className="text-sm font-semibold text-white/80 font-[JetBrains_Mono,monospace]">{agent.name}</span><span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", AGENT_TYPE_COLORS[agent.type])}>{agent.type.replace("_", " ")}</span></div>
                <p className="mt-1 line-clamp-1 text-xs text-white/60">{agent.currentGoal}</p>
                <span className="mt-1 text-[10px] text-white/60">{agent.lastHeartbeat}</span>
              </div>
              <button onClick={(e) => { e.stopPropagation(); navigate("/founder/agents"); }} className="mt-1 shrink-0 flex items-center gap-1 rounded-lg bg-white/[0.07] px-2.5 py-1 text-[10px] font-medium text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white/60"><Eye className="h-3 w-3" />Inspect</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ==================================================================
   7. NearbyEntitiesPanel
   ================================================================== */

const RELATIONSHIP_ICON: Record<string, typeof Building2> = { product: Target, initiative: Zap, comparable: Globe, "design partner": User, "market signal": Radio };
const RELATIONSHIP_COLOR: Record<string, string> = { product: "border-[#d97757]/25 bg-[#d97757]/8 text-[#d97757]", initiative: "border-emerald-500/25 bg-emerald-500/8 text-emerald-400", comparable: "border-sky-500/25 bg-sky-500/8 text-sky-400", "design partner": "border-violet-500/25 bg-violet-500/8 text-violet-400", "market signal": "border-amber-500/25 bg-amber-500/8 text-amber-400" };

function NearbyEntitiesPanel() {
  const navigate = useNavigate();
  const intakeComparables = useMemo(() => { try { const r = localStorage.getItem(LS_KEY_INTAKE_COMPARABLES); return r ? JSON.parse(r) as Array<{ id: string; name: string; relationship: string }> : []; } catch { return []; } }, []);
  const merged = useMemo(() => {
    const fromIntake: NearbyEntity[] = intakeComparables.map((c) => ({ id: c.id, name: c.name, relationship: c.relationship, whyItMatters: "Added via context intake" }));
    const seen = new Set(fromIntake.map((e) => e.name.toLowerCase()));
    const fromDemo = DEMO_NEARBY_ENTITIES.filter((e) => !seen.has(e.name.toLowerCase()));
    return [...fromIntake, ...fromDemo].slice(0, 7);
  }, [intakeComparables]);

  return (
    <div className={GLASS_CARD}>
      <div className="flex items-center justify-between">
        <h2 className={SECTION_HEADER}><span className="flex items-center gap-2"><Globe className="h-3.5 w-3.5" />Nearby Entities</span></h2>
        <button type="button" onClick={() => navigate("/founder/intake")} className="inline-flex items-center gap-1 rounded-lg border border-white/[0.20] bg-white/[0.12] px-2 py-1 text-[10px] text-white/60 transition-colors hover:bg-white/[0.07] hover:text-white/60"><Plus className="h-3 w-3" />Add</button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {merged.map((entity) => {
          const Icon = RELATIONSHIP_ICON[entity.relationship] ?? Building2;
          const color = RELATIONSHIP_COLOR[entity.relationship] ?? "border-white/[0.08] bg-white/[0.06] text-white/60";
          return (
            <div key={entity.id} className={cn("group relative inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors", color)} title={entity.whyItMatters}>
              <Icon className="h-3 w-3 shrink-0" />
              <span>{entity.name}</span>
              <span className="ml-0.5 text-[9px] opacity-50">{entity.relationship}</span>
            </div>
          );
        })}
      </div>
      {merged.length === 0 && <p className="mt-3 text-xs text-white/60">No nearby entities yet. Add competitors, partners, or products via Context Intake.</p>}
    </div>
  );
}

/* ==================================================================
   8. ExternalSignalsPanel
   ================================================================== */

const SIGNAL_CAT_COLORS: Record<SignalCategory, string> = {
  regulatory: "bg-amber-500/10 text-amber-400",
  competitive: "bg-rose-500/10 text-rose-400",
  market: "bg-sky-500/10 text-sky-400",
  macro: "bg-violet-500/10 text-violet-400",
  partner: "bg-emerald-500/10 text-emerald-400",
};

function ExternalSignalsPanel() {
  const newCount = DEMO_EXTERNAL_SIGNALS.filter((s) => s.isNew).length;
  return (
    <div className={GLASS_CARD}>
      <div className="flex items-center gap-3">
        <h2 className={SECTION_HEADER}>Important External Signals</h2>
        {newCount > 0 && (
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">{newCount} new</span>
        )}
      </div>
      <div className="mt-3 space-y-2">
        {DEMO_EXTERNAL_SIGNALS.map((sig) => (
          <div key={sig.id} className={cn(GLASS_CARD_INTERACTIVE, "p-3", sig.isNew && "border-emerald-500/20")}>
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase", SIGNAL_CAT_COLORS[sig.category])}>{sig.category}</span>
              <span className="text-xs text-white/60">{sig.source}</span>
              <span className="text-xs text-white/70">{sig.relativeTime}</span>
              {sig.isNew && <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-400">NEW</span>}
              <span className="ml-auto text-[10px] tabular-nums text-white/60">Relevance: {sig.relevanceScore}</span>
            </div>
            <p className="mt-2 text-sm font-medium text-white/80">{sig.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-white/60 line-clamp-2">{sig.summary}</p>
            <div className="mt-2 border-l-2 border-[#d97757]/30 pl-2">
              <p className="text-[11px] text-[#d97757]/80">{sig.howItAffectsYou}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ==================================================================
   9. HistoryPacketReusePanel
   ================================================================== */

function HistoryPacketReusePanel({ packetHistory, activePacketId, onSelectPacket }: { packetHistory: FounderArtifactPacket[]; activePacketId: string | null; onSelectPacket: (id: string) => void }) {
  const navigate = useNavigate();
  const recent = packetHistory.slice(0, 3);
  if (recent.length === 0) return null;
  return (
    <div className={GLASS_CARD}>
      <div className="flex items-center justify-between">
        <h2 className={SECTION_HEADER}>Packet History</h2>
        <button onClick={() => navigate("/founder/history")} className="text-[10px] text-white/60 transition-colors hover:text-white/60">View full history &rarr;</button>
      </div>
      <div className="mt-3 space-y-2">
        {recent.map((pkt) => {
          const isActive = pkt.packetId === activePacketId;
          const pct = Math.round(pkt.canonicalEntity.identityConfidence * 100);
          return (
            <div key={pkt.packetId} className={cn("flex items-center gap-3 rounded-lg border p-3 transition-colors", isActive ? "border-[#d97757]/25 bg-[#d97757]/5" : "border-white/[0.20] bg-white/[0.12] hover:bg-white/[0.07] cursor-pointer")} onClick={() => !isActive && onSelectPacket(pkt.packetId)}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase text-white/60">{getArtifactPacketTypeLabel(pkt.packetType)}</span>
                  <span className="text-[10px] text-white/60">{formatArtifactPacketTimestamp(pkt.provenance.generatedAt)}</span>
                </div>
                <p className="mt-1 text-xs text-white/60">{pkt.canonicalEntity.name} &middot; Confidence: {pct}%</p>
              </div>
              {isActive ? (
                <span className="shrink-0 rounded-full bg-[#d97757]/10 px-2 py-0.5 text-[10px] font-semibold text-[#d97757]">Active</span>
              ) : (
                <button className="shrink-0 rounded-lg bg-white/[0.07] px-2.5 py-1 text-[10px] font-medium text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white/60">Use this</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ==================================================================
   10. TimelineMemoStrip
   ================================================================== */

function exportDataAsJSON() { const data = { company: DEMO_COMPANY, interventions: DEMO_INTERVENTIONS, initiatives: DEMO_INITIATIVES, agents: DEMO_AGENTS, dailyMemo: DEMO_DAILY_MEMO, userActions: loadUserActions(), exportedAt: new Date().toISOString() }; const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `nodebench-export-${todayStr()}.json`; a.click(); URL.revokeObjectURL(url); }

function TimelineMemoStrip() {
  const m = DEMO_DAILY_MEMO;
  const todayFormatted = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const generatedTime = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
  return (
    <div className={GLASS_CARD}>
      <div className="flex items-center justify-between"><h2 className={SECTION_HEADER}>Today's Briefing</h2><span className="text-xs text-white/60">{todayFormatted}</span></div>
      <div className="mt-3 grid gap-4 md:grid-cols-3">
        <div><h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">What matters</h3><ul className="mt-2 space-y-1.5">{m.whatMatters.map((item, i) => (<li key={i} className="flex items-start gap-2"><div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#d97757]/60" /><span className="text-xs leading-relaxed text-white/60">{item}</span></li>))}</ul></div>
        <div><h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">What to do next</h3><ul className="mt-2 space-y-1.5">{m.whatToDoNext.map((item, i) => (<li key={i} className="flex items-start gap-2"><div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500/60" /><span className="text-xs leading-relaxed text-white/60">{item}</span></li>))}</ul></div>
        <div><h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">Unresolved</h3><ul className="mt-2 space-y-1.5">{m.unresolved.map((item, i) => (<li key={i} className="flex items-start gap-2"><div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500/60" /><span className="text-xs leading-relaxed text-white/60">{item}</span></li>))}</ul></div>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-white/[0.04] pt-3">
        <p className="text-[10px] text-white/70">Generated at {generatedTime}</p>
        <button onClick={exportDataAsJSON} className="text-[10px] text-white/70 transition-colors hover:text-white/60">Export JSON</button>
      </div>
    </div>
  );
}

/* ==================================================================
   Main View
   ================================================================== */

function FounderDashboardViewInner() {
  const [founderMode, setFounderMode] = useState<FounderMode>("weekly_reset");
  const [showOnboarding, setShowOnboarding] = useState(() => {
    const hasSeenOnboarding = localStorage.getItem("nodebench-founder-onboarding-done");
    return !hasSeenOnboarding;
  });
  const dismissOnboardingTooltip = useCallback(() => {
    setShowOnboarding(false);
    localStorage.setItem("nodebench-founder-onboarding-done", "true");
  }, []);
  const [soundEnabled, setSoundEnabled] = useState(() => isSoundEnabled());
  const toggleSound = useCallback(() => { const next = !soundEnabled; setSoundEnabled(next); localStorage.setItem(LS_KEY_SOUND, String(next)); if (next) playSound("click"); }, [soundEnabled]);

  const [undoStack, setUndoStack] = useState<Array<{ intervention: Intervention; action: InterventionState }>>([]);
  const [toasts, setToasts] = useState<FounderToast[]>([]);
  const toastTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const addToast = useCallback((message: string, color: FounderToast["color"]) => { const id = Math.random().toString(36).slice(2); setToasts((prev) => [...prev, { id, message, color, createdAt: Date.now() }]); const timer = setTimeout(() => { setToasts((prev) => prev.filter((t) => t.id !== id)); toastTimers.current.delete(id); }, 3000); toastTimers.current.set(id, timer); }, []);
  const dismissToast = useCallback((id: string) => { setToasts((prev) => prev.filter((t) => t.id !== id)); const timer = toastTimers.current.get(id); if (timer) { clearTimeout(timer); toastTimers.current.delete(id); } }, []);
  const handleUndo = useCallback(() => { const last = undoStack[undoStack.length - 1]; if (!last) return; setUndoStack((prev) => prev.slice(0, -1)); setInterventionStates((prev) => { const next = { ...prev }; delete next[last.intervention.id]; saveInterventionRecords(next); return next; }); addToast(`Undone: ${last.intervention.title}`, "amber"); playSound("click"); }, [undoStack, addToast]);

  const [isAddingSignal, setIsAddingSignal] = useState(false);
  const [quickSignalText, setQuickSignalText] = useState("");
  const handleQuickAddSignal = useCallback(() => { if (!quickSignalText.trim()) return; const newAction: UserAction = { id: `ua-sig-${Date.now()}`, description: `Signal noted: ${quickSignalText.trim()}`, timestamp: Date.now(), actionType: "accepted" }; setUserActions((prev) => { const next = [newAction, ...prev].slice(0, 50); saveUserActions(next); return next; }); addToast("Signal added to feed", "emerald"); playSound("success"); setQuickSignalText(""); setIsAddingSignal(false); }, [quickSignalText, addToast]);

  const [interventionStates, setInterventionStates] = useState<Record<string, InterventionRecord>>({});
  useEffect(() => { setInterventionStates(loadInterventionRecords()); }, []);
  const [userActions, setUserActions] = useState<UserAction[]>([]);
  useEffect(() => { setUserActions(loadUserActions()); }, []);
  const [agentStatusOverrides] = useState<Record<string, AgentStatus>>(() => loadAgentStatuses());
  const [identityConfidence, setIdentityConfidence] = useState(DEMO_COMPANY.identityConfidence);

  const [activePacket, setActivePacket] = useState<FounderArtifactPacket | null>(() => loadActiveFounderArtifactPacket());
  const [packetHistory, setPacketHistory] = useState<FounderArtifactPacket[]>(() => loadFounderArtifactPackets());
  const [isGeneratingPacket, setIsGeneratingPacket] = useState(false);

  const handleGeneratePacket = useCallback((packetType: ArtifactPacketType) => {
    setIsGeneratingPacket(true);
    setTimeout(() => { const source = buildFounderPacketSource({ identityConfidence, interventionStates, userActions, agentStatusOverrides }); const packet = buildFounderArtifactPacket({ packetType, source }); const history = saveFounderArtifactPacket(packet); setActivePacket(packet); setPacketHistory(history); setIsGeneratingPacket(false); addToast(`${getArtifactPacketTypeLabel(packetType)} packet generated`, "emerald"); playSound("success"); }, 400);
  }, [identityConfidence, interventionStates, userActions, agentStatusOverrides, addToast]);

  const handleSelectPacket = useCallback((packetId: string) => { const match = setActiveFounderArtifactPacket(packetId); if (match) setActivePacket(match); }, []);
  const handlePacketShared = useCallback(() => { addToast("Packet shared as memo", "emerald"); playSound("success"); }, [addToast]);

  const handleRefreshPacket = useCallback(() => { if (activePacket) handleGeneratePacket(activePacket.packetType); }, [activePacket, handleGeneratePacket]);
  const handleExportMarkdown = useCallback(() => { if (!activePacket) return; const md = artifactPacketToMarkdown(activePacket); const blob = new Blob([md], { type: "text/markdown" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `nodebench-packet-${activePacket.packetId.slice(0, 8)}.md`; a.click(); URL.revokeObjectURL(url); addToast("Exported as Markdown", "emerald"); }, [activePacket, addToast]);
  const handleExportHTML = useCallback(() => { if (!activePacket) return; const html = artifactPacketToHtml(activePacket); const blob = new Blob([html], { type: "text/html" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `nodebench-packet-${activePacket.packetId.slice(0, 8)}.html`; a.click(); URL.revokeObjectURL(url); addToast("Exported as HTML", "emerald"); }, [activePacket, addToast]);
  const handleCopyPacket = useCallback(() => { if (!activePacket) return; const md = artifactPacketToMarkdown(activePacket); navigator.clipboard.writeText(md).then(() => { addToast("Packet copied to clipboard", "emerald"); playSound("click"); }).catch(() => { addToast("Failed to copy", "rose"); }); }, [activePacket, addToast]);

  const { openWithContext } = useFastAgent();
  const handleHandToAgent = useCallback(() => { if (!activePacket) return; const md = artifactPacketToMarkdown(activePacket); openWithContext({ initialMessage: `I'm handing you my latest operating packet. Here's the structured context:\n\n${md}\n\nBased on this packet, what are the highest-leverage actions I should take this week?`, contextTitle: `Founder Packet: ${activePacket.canonicalEntity.name} — ${getArtifactPacketTypeLabel(activePacket.packetType)}`, }); addToast("Packet handed to agent", "emerald"); playSound("success"); }, [activePacket, openWithContext, addToast]);

  const founderModeRef = useRef(founderMode);
  useEffect(() => { if (founderModeRef.current === founderMode) return; founderModeRef.current = founderMode; handleGeneratePacket(founderMode); }, [founderMode, handleGeneratePacket]);

  // Auto-generate initial weekly reset on first load if no packet exists
  const hasAutoGenerated = useRef(false);
  useEffect(() => { if (!activePacket && !hasAutoGenerated.current && !isGeneratingPacket) { hasAutoGenerated.current = true; handleGeneratePacket("weekly_reset"); } }, [activePacket, isGeneratingPacket, handleGeneratePacket]);

  const handleInterventionAction = useCallback((intervention: Intervention, action: "accepted" | "deferred" | "rejected") => {
    const now = Date.now();
    setInterventionStates((prev) => { const next = { ...prev, [intervention.id]: { id: intervention.id, state: action as InterventionState, updatedAt: now } }; saveInterventionRecords(next); return next; });
    const actionLabels = { accepted: "accepted", deferred: "deferred", rejected: "dismissed" } as const;
    setUserActions((prev) => { const next = [{ id: `ua-${now}-${intervention.id}`, description: `You ${actionLabels[action]}: ${intervention.title}`, timestamp: now, actionType: action } as UserAction, ...prev].slice(0, 50); saveUserActions(next); return next; });
    const toastColors: Record<typeof action, FounderToast["color"]> = { accepted: "emerald", deferred: "amber", rejected: "rose" };
    addToast(`${{ accepted: "Accepted", deferred: "Deferred", rejected: "Dismissed" }[action]}: ${intervention.title}`, toastColors[action]);
    if (action === "accepted") { setIdentityConfidence((p) => Math.min(1, p + 0.03)); playSound("success"); } else if (action === "deferred") { setIdentityConfidence((p) => Math.min(1, p + 0.01)); playSound("click"); } else { playSound("error"); }
    setUndoStack((prev) => [...prev.slice(-9), { intervention, action }]);
    const total = Object.values(interventionStates).length + 1;
    if (total % 5 === 0 || total === 1) triggerConfetti();
  }, [addToast, interventionStates]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "a" || e.key === "A") { const p = DEMO_INTERVENTIONS.find((iv) => !interventionStates[iv.id] || interventionStates[iv.id].state === "pending"); if (p) { e.preventDefault(); handleInterventionAction(p, "accepted"); } }
      else if (e.key === "d" || e.key === "D") { const p = DEMO_INTERVENTIONS.find((iv) => !interventionStates[iv.id] || interventionStates[iv.id].state === "pending"); if (p) { e.preventDefault(); handleInterventionAction(p, "deferred"); } }
      else if (e.key === "x" || e.key === "X") { const p = DEMO_INTERVENTIONS.find((iv) => !interventionStates[iv.id] || interventionStates[iv.id].state === "pending"); if (p) { e.preventDefault(); handleInterventionAction(p, "rejected"); } }
      else if (e.key === "z" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleUndo(); }
      else if (e.key === "n" || e.key === "N") { e.preventDefault(); setIsAddingSignal(true); }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [interventionStates, handleInterventionAction, handleUndo]);

  useEffect(() => { incrementVisitCount(); }, []);
  const [streak, setStreak] = useState(0);
  useEffect(() => { const data = loadStreak(); const today = todayStr(); if (data.lastVisitDate === today) { setStreak(data.count); return; } const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1); const nc = data.lastVisitDate === yesterday.toISOString().split("T")[0] ? data.count + 1 : 1; saveStreak({ count: nc, lastVisitDate: today }); setStreak(nc); }, []);
  useEffect(() => () => { toastTimers.current.forEach((t) => clearTimeout(t)); }, []);

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto px-4 pb-24 pt-4">
      {showOnboarding && (
        <div className="relative rounded-xl border border-[#d97757]/30 bg-[#d97757]/10 px-4 py-3">
          <button onClick={dismissOnboardingTooltip} aria-label="Dismiss welcome message" className="absolute right-2 top-2 text-white/60 hover:text-white/60"><X className="h-3.5 w-3.5" /></button>
          <p className="text-sm font-medium text-[#d97757]">Welcome to your Founder Dashboard</p>
          <p className="mt-1 text-xs text-white/60">This is your operating clarity pipeline. Start by reviewing what changed, then accept or defer the recommended actions below. Use the mode switch to generate different Artifact Packets.</p>
        </div>
      )}
      <StaggerCard index={0}><HeaderBar streak={streak} founderMode={founderMode} onModeChange={setFounderMode} /></StaggerCard>
      <StaggerCard index={1}><FounderClarityOverview identityConfidence={identityConfidence} userActions={userActions} packet={activePacket} /></StaggerCard>
      <StaggerCard index={2}><ContradictionBanner packet={activePacket} /></StaggerCard>
      <StaggerCard index={3}><ArtifactPacketPanel packet={activePacket} packetHistory={packetHistory} onGenerate={handleGeneratePacket} onRefresh={handleRefreshPacket} onExportMarkdown={handleExportMarkdown} onExportHTML={handleExportHTML} onCopyPacket={handleCopyPacket} onHandToAgent={handleHandToAgent} /></StaggerCard>
      <StaggerCard index={4}><RankedInterventionsPanel interventionStates={interventionStates} onAction={handleInterventionAction} /></StaggerCard>
      <StaggerCard index={5}><AgentActivityPanel agentStatusOverrides={agentStatusOverrides} /></StaggerCard>
      <StaggerCard index={6}><ExternalSignalsPanel /></StaggerCard>
      <StaggerCard index={7}><HistoryPacketReusePanel packetHistory={packetHistory} activePacketId={activePacket?.packetId ?? null} onSelectPacket={handleSelectPacket} /></StaggerCard>
      <StaggerCard index={8}><NearbyEntitiesPanel /></StaggerCard>
      <StaggerCard index={9}><TimelineMemoStrip /></StaggerCard>

      <AnimatePresence>
        {isAddingSignal && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-20 left-1/2 z-50 w-full max-w-md -translate-x-1/2">
            <div className="mx-4 flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#1a1918] p-3 shadow-2xl backdrop-blur-md">
              <input autoFocus value={quickSignalText} onChange={(e) => setQuickSignalText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleQuickAddSignal(); if (e.key === "Escape") setIsAddingSignal(false); }} placeholder="Add a quick signal or note..." className="flex-1 bg-transparent text-sm text-white/80 placeholder-white/20 outline-none" />
              <button onClick={handleQuickAddSignal} className="shrink-0 rounded-lg bg-[#d97757]/10 px-3 py-1.5 text-xs font-medium text-[#d97757] transition-colors hover:bg-[#d97757]/20">Add</button>
              <button onClick={() => setIsAddingSignal(false)} className="shrink-0 text-white/70 hover:text-white/60"><X className="h-4 w-4" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2">
        <button onClick={toggleSound} className={cn("flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] transition-colors", soundEnabled ? "bg-[#d97757]/10 text-[#d97757]" : "bg-white/[0.02] text-white/70 hover:text-white/60")} title={soundEnabled ? "Sound on" : "Sound off"}><Volume2 className="h-3.5 w-3.5" /></button>
        {undoStack.length > 0 && <button onClick={handleUndo} className="flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.20] bg-white/[0.12] px-2.5 text-xs text-white/60 transition-colors hover:bg-white/[0.07] hover:text-white/60" title="Undo last action (Ctrl+Z)"><RotateCcw className="h-3 w-3" />Undo</button>}
      </div>

      <FounderToasts toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

const FounderDashboardView = memo(FounderDashboardViewInner);
export default FounderDashboardView;
