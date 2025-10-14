import { useEffect, useMemo, useRef, useState, useContext } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import AgentPopover from "./AgentPopover";
import { researchScaffold, toTimelineData } from "./scaffoldData";
import { AgentWindowContext } from "./AgentWindowContext";
import { ProductionMockSeeder } from "./ProductionMockSeeder";
import { ExecutionBar } from "./ExecutionBar";

// Helper to format mm:ss
function fmtMMSS(totalSec: number) {
  const m = Math.floor(totalSec / 60);
  const s = Math.max(0, Math.floor(totalSec % 60)).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// Truncate helper for header readout
function trunc(s: string | undefined, n: number) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

enum DataSource {
  Auto = "auto",
  Convex = "convex",
  Scaffold = "scaffold",
}

enum WindowMode {
  Fixed = "fixed",      // fixed 10m
  Fit = "fit",          // fit all tasks
  CenterNow = "center", // center window around now
}

import UnifiedEditor from "@/components/UnifiedEditor";

const normalizeId = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (!str || str === "undefined" || str === "null") return "";
  return str;
};

const deriveTaskId = (task: any): string => {
  return normalizeId(task?.id ?? task?._id ?? task?.taskId ?? task?.name);
};

const extractElapsedMs = (task: any): number => {
  const candidates = [
    (task as any)?.elapsedMs,
    (task as any)?.metrics?.elapsedMs,
    (task as any)?.meta?.elapsedMs,
    (task as any)?.latencyMs,
    (task as any)?.stats?.elapsedMs,
  ];
  for (const candidate of candidates) {
    const ms = Number(candidate);
    if (Number.isFinite(ms) && ms > 0) return ms;
  }
  return 0;
};

export function AgentTimeline({ timelineId, documentId }: { timelineId: Id<"agentTimelines">; documentId?: Id<"documents"> }) {
  const leftRef = useRef<HTMLDivElement | null>(null);
  const rightRef = useRef<HTMLDivElement | null>(null);
  const [currentSec, setCurrentSec] = useState(0);
  const [chartWidth, setChartWidth] = useState<number>(0);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [preview, setPreview] = useState<{ active: boolean; sec: number; leftPct: string }>({ active: false, sec: 0, leftPct: '0%' });

  const [prompt, setPrompt] = useState("");

  const [toast, setToast] = useState<string>("");

  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [lastRun, setLastRun] = useState<{ input: string; output: string } | null>(null);

  const [restoreTick, setRestoreTick] = useState<number>(0);
  const editorExporterRef = useRef<null | (() => Promise<{ plain: string }>)>(null);

  // Final Output expand/collapse (persisted per timeline)
  const [expandedFinal, setExpandedFinal] = useState<boolean>(() => {
    try {
      const key = `agents.finalOutput.expanded.${String(timelineId)}`;
      const v = window.localStorage.getItem(key);
      return v === null ? true : v === '1';
    } catch { return true; }
  });
  const persistExpandedFinal = (v: boolean) => {
    setExpandedFinal(v);
    try { window.localStorage.setItem(`agents.finalOutput.expanded.${String(timelineId)}`, v ? '1' : '0'); } catch {}
  };

  // Run history toggle (global persisted)
  const [showHistory, setShowHistory] = useState<boolean>(() => {
    try { return window.localStorage.getItem('agents.runHistory.expanded') === '1'; } catch { return false; }
  });
  const persistShowHistory = (v: boolean) => {
    setShowHistory(v);
    try { window.localStorage.setItem('agents.runHistory.expanded', v ? '1' : '0'); } catch {}
  };

  const runs = useQuery(api.agentTimelines.listRuns as any, timelineId ? { timelineId } : ("skip" as any)) as Array<{ _id: string; input: string; output: string; createdAt: number; retryCount?: number; modelUsed?: string; meta?: any; }> | undefined;

  const [openRunIds, setOpenRunIds] = useState<Record<string, boolean>>({});
  const toggleRunOpen = (id: string) => setOpenRunIds((m) => ({ ...m, [id]: !m[id] }));

  const truncateOutput = (s: string, maxLines = 12, maxChars = 1200) => {
    if (!s) return s;
    let out = s.length > maxChars ? s.slice(0, maxChars) + '…' : s;
    const lines = out.split(/\r?\n/);
    if (lines.length > maxLines) out = lines.slice(0, maxLines).join('\n') + '\n…';
    return out;
  };

  const [dataSource, setDataSource] = useState<DataSource>(() => {
    try {
      if (typeof window === "undefined") return DataSource.Auto;
      const persisted = window.localStorage.getItem("agents.dataSource") as DataSource | null;
      if (persisted === DataSource.Convex || persisted === DataSource.Scaffold || persisted === DataSource.Auto) return persisted;
      if ((window.location.hash || "").includes("scaffold=1")) return DataSource.Scaffold;
      return DataSource.Auto;
    } catch {
      return DataSource.Auto;
    }
  });

  const [windowMode, setWindowMode] = useState<WindowMode>(() => {
    try {
      if (typeof window === "undefined") return WindowMode.Fit;
      const persisted = window.localStorage.getItem("agents.windowMode") as WindowMode | null;
      if (persisted === WindowMode.Fixed || persisted === WindowMode.Fit || persisted === WindowMode.CenterNow) return persisted;
      return WindowMode.Fit;
    } catch {
      return WindowMode.Fit;
    }
  });

  // Planner model (provider) selection: default to Grok (OpenRouter)
  const [planner, setPlanner] = useState<string>(() => {
    try {
      if (typeof window === "undefined") return "grok";
      const persisted = window.localStorage.getItem("agents.planner");
      if (persisted === "grok" || persisted === "openai") return persisted;
      return "grok";
    } catch {
      return "grok";
    }
  });

  const [showMockSeeder, setShowMockSeeder] = useState(false);

const windowCtx = useContext(AgentWindowContext);
const wm: WindowMode = (windowCtx?.windowMode as any) ?? windowMode;

  const data = useQuery(api.agentTimelines.getByTimelineId, timelineId ? { timelineId } : ("skip" as any)) as
    | ({ baseStartMs: number; tasks: any[]; links: any[] })
    | null
    | undefined;

  // Fallback static scaffold when no Convex data yet
  const applyPlan = useMutation(api.agentTimelines.applyPlan);
  const startFromPrompt = useAction(api.agents.promptPlan.startFromPrompt);
  const seedFromWeb = useAction((api as any).agents.timelineMock.generateFromWebSearchOnTimeline);
  const runOnTimeline = useAction(api.agents.orchestrate.runOnTimeline);
  const setLatestRun = useMutation(api.agentTimelines.setLatestRun);


  const exportSnapshot = useAction((api as any).agentTimelines.exportSnapshot);


  const scaffold = useMemo(() => toTimelineData(researchScaffold), []);




  // Scroll sync between hierarchy and chart panels
  useEffect(() => {
    const l = leftRef.current;
    const r = rightRef.current;
    if (!l || !r) return;
    let lock = false;
    const onL = () => { if (lock) return; lock = true; r.scrollTop = l.scrollTop; lock = false; };
    const onR = () => { if (lock) return; lock = true; l.scrollTop = r.scrollTop; lock = false; };
    l.addEventListener("scroll", onL);
    r.addEventListener("scroll", onR);
    return () => { l.removeEventListener("scroll", onL); r.removeEventListener("scroll", onR); };
  }, []);

  // Observe chart width to adapt time tick density for smaller surfaces
  useEffect(() => {
    const el = rightRef.current;
    if (!el) return;
    const update = () => setChartWidth(el.clientWidth || 0);
    update();
    let ro: ResizeObserver | null = null;
    try {
      // @ts-ignore - ResizeObserver is in modern browsers
      if (typeof ResizeObserver !== "undefined") {
        // @ts-ignore
        ro = new ResizeObserver(() => update());
        ro.observe(el);
        return () => { ro && ro.disconnect(); };
      }
    } catch {}
    const onResize = () => update();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);


  // Choose data source safely. Auto prefers Convex if present; Convex uses live if available; Scaffold forces demo.
  const liveAvailable = (data?.tasks?.length ?? 0) > 0;
  // Fallback to scaffold whenever live data is unavailable so the timeline is always visible
  const usingScaffold = (dataSource === DataSource.Scaffold) || !liveAvailable;
  const tasks = usingScaffold ? (scaffold.tasks as any[]) : ((data?.tasks as any[]) ?? []);
  const links = usingScaffold ? (scaffold.links as any[]) : ((data?.links as any[]) ?? []);

  const latestInput = usingScaffold ? undefined : (data as any)?.latestRunInput;
  const latestOutput = usingScaffold ? undefined : (data as any)?.latestRunOutput;
  const finalInput = (latestInput ?? lastRun?.input) || "";
  const finalOutput = (latestOutput ?? lastRun?.output) || "";

  const childrenByParent = useMemo(() => {
    const map = new Map<string, any[]>();
    const byId = new Map<string, any>();
    for (const task of tasks as any[]) {
      const id = deriveTaskId(task);
      if (!id) continue;
      byId.set(id, task);
    }
    for (const task of tasks as any[]) {
      const parentId = normalizeId((task as any)?.parentId);
      if (!parentId) continue;
      const existing = map.get(parentId);
      if (existing) existing.push(task);
      else map.set(parentId, [task]);
    }
    for (const link of links as any[]) {
      const source = normalizeId((link as any)?.sourceTaskId ?? (link as any)?.sourceId ?? (link as any)?.source);
      const target = normalizeId((link as any)?.targetTaskId ?? (link as any)?.targetId ?? (link as any)?.target);
      if (!source || !target) continue;
      const child = byId.get(target);
      if (!child) continue;
      const existing = map.get(source);
      if (existing) {
        if (!existing.includes(child)) existing.push(child);
      } else {
        map.set(source, [child]);
      }
    }
    return map;
  }, [tasks, links]);

  // Determine window positioning and size
  const { windowStartMs, windowMs, windowSec, timeUnits } = useMemo(() => {
    const actualStarts: number[] = [];
    const actualEnds: number[] = [];
    const runningStarts: number[] = [];
    const runningEnds: number[] = [];
    const fallbackStarts: number[] = [];
    const fallbackEnds: number[] = [];

    const nowOffset = Math.max(0, currentSec * 1000);

    for (const task of tasks as any[]) {
      const rawStart = Number((task as any)?.startOffsetMs ?? 0);
      const start = Math.max(0, Number.isFinite(rawStart) ? rawStart : 0);
      const duration = Math.max(0, Number((task as any)?.durationMs ?? 0));
      const elapsed = extractElapsedMs(task);
      const status = String((task as any)?.status ?? '').toLowerCase();

      if (elapsed > 0) {
        actualStarts.push(start);
        actualEnds.push(start + elapsed);
        continue;
      }

      if (status === 'running') {
        runningStarts.push(start);
        runningEnds.push(Math.max(nowOffset, start + duration, start + elapsed));
        continue;
      }

      fallbackStarts.push(start);
      fallbackEnds.push(start + (duration || 1000));
    }

    let minStart = 0;
    let maxEnd = 0;

    if (actualEnds.length) {
      minStart = actualStarts.length ? Math.min(...actualStarts) : 0;
      const candidates = actualEnds.concat(runningEnds);
      maxEnd = candidates.length ? Math.max(...candidates) : Math.max(...actualEnds);
    } else if (runningEnds.length) {
      minStart = runningStarts.length ? Math.min(...runningStarts) : 0;
      maxEnd = Math.max(...runningEnds);
    } else if (fallbackEnds.length) {
      minStart = fallbackStarts.length ? Math.min(...fallbackStarts) : 0;
      maxEnd = Math.max(...fallbackEnds);
    } else {
      minStart = 0;
      maxEnd = 60000;
    }

    if (!Number.isFinite(minStart)) minStart = 0;
    if (!Number.isFinite(maxEnd) || maxEnd <= minStart) {
      maxEnd = minStart + 1000;
    }

    const span = Math.max(1, maxEnd - minStart);
    let start = Math.max(0, minStart);
    let total = span;

    if (wm === WindowMode.Fit) {
      const pad = Math.max(1000, Math.round(span * 0.1));
      const anyRunning = tasks.some((t: any) => String((t?.status ?? '')).toLowerCase() === 'running');
      let fitStart = Math.max(0, minStart - pad);
      let fitEnd = maxEnd + pad;
      if (anyRunning) {
        fitStart = Math.max(0, Math.min(fitStart, Math.max(0, nowOffset - pad)));
        fitEnd = Math.max(fitEnd, nowOffset + pad);
      }
      start = fitStart;
      total = Math.max(1, fitEnd - fitStart);
    } else if (wm === WindowMode.CenterNow) {
      total = Math.max(span, 60000);
      start = Math.max(0, Math.round(nowOffset - total / 2));
    } else {
      const pad = Math.max(1000, Math.round(span * 0.1));
      total = Math.max(span + pad, 60000);
      start = Math.max(0, Math.min(minStart, nowOffset > maxEnd ? nowOffset - total / 2 : minStart));
    }

    const sec = Math.max(1, Math.ceil(total / 1000));
    const minColPx = 40;
    const maxCols = chartWidth > 0 ? Math.max(6, Math.floor(chartWidth / minColPx)) : Math.floor(sec / 30) + 1;
    const candidates = [15, 30, 60, 120, 300, 600];
    let step = candidates[candidates.length - 1];
    for (const c of candidates) {
      const needed = Math.floor(sec / c) + 1;
      if (needed <= maxCols) { step = c; break; }
    }
    const units = Array.from({ length: Math.floor(sec / step) + 1 }, (_, i) => i * step);
    return { windowStartMs: start, windowMs: total, windowSec: sec, timeUnits: units };
  }, [tasks, wm, chartWidth, currentSec]);

	  const unitStepSec = useMemo(() => (timeUnits.length > 1 ? timeUnits[1] - timeUnits[0] : windowSec), [timeUnits, windowSec]);


  // Compute simple topological levels from links for parallel group visualization
  const levelMap = useMemo(() => {
    const ids = new Set<string>(tasks.map((t: any) => String(t._id)));
    const indeg = new Map<string, number>();
    const adj = new Map<string, string[]>();
    ids.forEach((id) => { indeg.set(id, 0); adj.set(id, []); });
    for (const l of links as Array<{ sourceTaskId: string; targetTaskId: string }>) {
      const s = String((l as any).sourceTaskId), t = String((l as any).targetTaskId);
      if (!ids.has(s) || !ids.has(t)) continue;
      adj.get(s)!.push(t);
      indeg.set(t, (indeg.get(t) || 0) + 1);
    }
    const q: string[] = [];
    for (const [id, d] of indeg.entries()) if (d === 0) q.push(id);
    const level = new Map<string, number>();
    q.forEach((id) => level.set(id, 0));
    while (q.length) {
      const u = q.shift()!;
      const lu = level.get(u) || 0;
      for (const v of adj.get(u) || []) {
        indeg.set(v, (indeg.get(v) || 0) - 1);
        if ((indeg.get(v) || 0) === 0) {
          level.set(v, lu + 1);
          q.push(v);
        }
      }
    }
    return level;
  }, [tasks, links]);
  type Task = { _id: string; name: string; status?: string; durationMs?: number; startOffsetMs?: number; agentType?: string; parentId?: string; icon?: string; color?: string; };
  const orchestrators: Task[] = tasks.filter((t: Task) => (t.agentType ?? "").toLowerCase() === "orchestrator");
  const mains: Task[] = tasks.filter((t: Task) => (t.agentType ?? "").toLowerCase() === "main");

  const mainIds = new Set(mains.map((m)=> String(m._id)));

  const taskIdOf = (t: Task) => deriveTaskId(t);
  const effectiveStartMs = (t: Task): number => {
    const selfStart = Math.max(0, Number(t.startOffsetMs || 0));
    const id = taskIdOf(t);
    const kids = id ? childrenOf(id) : [];
    if (!kids.length) return selfStart;
    const kidStarts = kids.map((k) => effectiveStartMs(k));
    return Math.min(selfStart, ...kidStarts);
  };
  const effectiveEndMs = (t: Task): number => {
    const start = Math.max(0, Number(t.startOffsetMs || 0));
    const planned = Math.max(0, Number(t.durationMs || 0));
    const elapsed = extractElapsedMs(t);
    const status = String(t.status || '').toLowerCase();
    const nowOffset = Math.max(0, currentSec * 1000);
    const id = taskIdOf(t);
    const kids = id ? childrenOf(id) : [];
    const kidEnds = kids.length ? kids.map((k) => effectiveEndMs(k)) : [];
    const childMax = kidEnds.length ? Math.max(...kidEnds) : null;

    const candidates: number[] = [];

    if (elapsed > 0) {
      candidates.push(start + elapsed);
    }

    if (status === 'running') {
      const runningTarget = Math.max(nowOffset, start + (elapsed > 0 ? elapsed : 0), start + planned);
      candidates.push(runningTarget);
    }

    if (childMax !== null) {
      candidates.push(childMax);
    }

    if (!candidates.length) {
      if (planned > 0) candidates.push(start + planned);
      else candidates.push(start + 1000);
    }

    return Math.max(start, ...candidates);
  };


  const childrenOf = (parentId: string): Task[] => {
    const list = childrenByParent.get(parentId);
    return Array.isArray(list) ? (list as Task[]) : [];
  };


  const getProgress = (t: Task) => {
    const start = Math.max(0, Number(t.startOffsetMs || 0));
    const elapsed = extractElapsedMs(t);
    const planned = Math.max(0, Number(t.durationMs || 0));
    const status = String(t.status || '').toLowerCase();
    const nowOffset = Math.max(0, currentSec * 1000);
    const effectiveDuration = Math.max(1, elapsed > 0 ? elapsed : planned || 1);

    if (status === 'complete' || status === 'error') return 1;
    if (status === 'running') {
      return Math.max(0, Math.min(1, (nowOffset - start) / effectiveDuration));
    }
    if (elapsed > 0 && planned > 0) {
      return Math.max(0, Math.min(1, elapsed / effectiveDuration));
    }
    return Math.max(0, Math.min(1, ((t as any).progress ?? 0)));
  };


  // Colors by type (fallbacks)
  const colorOf = (t: Task) => t.color || ((t.agentType || "").toLowerCase() === "orchestrator" ? "#6366F1" : (t.agentType || "").toLowerCase() === "main" ? "#16A34A" : "#EF4444");

  const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null);
  const [popoverTask, setPopoverTask] = useState<any | null>(null);
  const [pinnedTaskId, setPinnedTaskId] = useState<string | null>(null);
  // Collapsible main agent groups
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggleCollapsed = (id: string) => setCollapsed((m) => ({ ...m, [id]: !m[id] }));
  const hoverTimerRef = useRef<number | null>(null);

  const leftPct = (t: Task) => {
    const l = ((Math.max(0, effectiveStartMs(t)) - windowStartMs) / Math.max(1, windowMs)) * 100;
    return `${Math.max(0, Math.min(100, l))}%`;
  };
  const widthPct = (t: Task) => {
    const startEff = effectiveStartMs(t);
    const endEff = effectiveEndMs(t);
    const clampedStart = Math.max(startEff, windowStartMs);
    const clampedEnd = Math.max(clampedStart, Math.min(endEff, windowStartMs + windowMs));
    const w = ((clampedEnd - clampedStart) / Math.max(1, windowMs)) * 100;
    return `${Math.max(0.5, Math.min(100, w))}%`;
  };

  // Stop the live "now" ticker when all tasks complete
  useEffect(() => {
    const base = data?.baseStartMs ?? Date.now();
    const computeNowSec = () => Math.max(0, (Date.now() - base) / 1000);

    const arr: any[] = (tasks as any[]) || [];
    const done = arr.length > 0 && arr.every((t) => String((t as any).status || '').toLowerCase() === 'complete');
    if (done) {
      try {
        const ends = arr.map((t) => effectiveEndMs(t as any));
        const endMs = ends.length ? Math.max(...ends) : 0;
        setCurrentSec(Math.max(0, Math.ceil(endMs / 1000)));
        return;
      } catch {
        // If computing end fails, fallback to ticking
      }
    }

    const tick = () => setCurrentSec(computeNowSec());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [data?.baseStartMs, tasks]);

  const runningCount = tasks.filter((t: Task) => (t.status ?? "").toLowerCase() === "running").length;

  const isAllComplete = Array.isArray(tasks) && tasks.length > 0 && tasks.every((t: any) => String(t.status || '').toLowerCase() === 'complete');
  let displayNowMs = currentSec * 1000;
  if (isAllComplete) {
    try {
      const ends = (tasks as any[]).map((t) => effectiveEndMs(t as any));
      if (ends.length) displayNowMs = Math.max(...ends);
    } catch {}
  }
  const nowLeftPct = `${Math.max(0, Math.min(100, (((displayNowMs) - windowStartMs) / Math.max(1, windowMs)) * 100))}%`;

  return (
    <section className="timeline-shell">
      {toast ? (
        <div data-testid="agents-fallback-toast" style={{ position: 'fixed', top: 12, right: 12, zIndex: 1000 }} className="rounded-md shadow px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-primary)]">
          {toast}
        </div>
      ) : null}
      {/* Controls: Prompt input + Send, plus Data Source / Time Window / Seed */}
      <div className="mt-2 flex flex-col gap-2 p-2 border border-[var(--border-color)] rounded-lg shadow-sm bg-[var(--bg-primary)] timeline-controls text-sm">
        {/* Top row: Settings button, advanced controls, and status badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <button className="btn" title="Settings" onClick={() => setShowAdvanced((v) => !v)}>
            ⚙︎
          </button>

        {showAdvanced && (<>

        <label className="btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>Data Source:
          <select
            value={dataSource}
            onChange={(e) => {
              const v = e.target.value as DataSource;
              setDataSource(v);
              try { window.localStorage.setItem("agents.dataSource", v); } catch {}
            }}
          >
            <option value={DataSource.Auto}>Auto</option>
            <option value={DataSource.Convex}>Convex</option>
            <option value={DataSource.Scaffold}>Scaffold</option>
          </select>
        </label>
        <label className="btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>Time Window:
          <select
            value={wm}
            onChange={(e) => {
              const v = e.target.value as WindowMode;
              if (windowCtx) windowCtx.setWindowMode(v as any);
              setWindowMode(v);
              try { window.localStorage.setItem("agents.windowMode", v); } catch {}
            }}
          >
            <option value={WindowMode.Fixed}>Fixed 10m</option>
            <option value={WindowMode.Fit}>Fit tasks</option>
            <option value={WindowMode.CenterNow}>Center now</option>
          </select>
        </label>
        <label className="btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>Model:
          <select
            value={planner}
            onChange={(e) => {
              const v = e.target.value;
              setPlanner(v);
              try { window.localStorage.setItem("agents.planner", v); } catch {}
            }}
          >
            <option value="grok">GLM (OpenRouter)</option>
            <option value="openai">OpenAI</option>
          </select>
        </label>
        <button
          className="btn"
          title="Seed live Convex timeline with the demo scaffold"
          onClick={async () => {
            try {
              const planTasks = (scaffold.tasks as any[]).map((t) => ({
                id: String(t._id),
                parentId: t.parentId ? String(t.parentId) : null,
                name: String(t.name || t._id),
                startOffsetMs: Number(t.startOffsetMs || 0),
                durationMs: Number(t.durationMs || 0),
                agentType: t.agentType as any,
                status: (t.status as any) ?? "pending",
                icon: t.icon,
                color: t.color,
              }));
              const planLinks = (scaffold.links as any[]).map((l) => ({
                sourceId: String(l.sourceTaskId),
                targetId: String(l.targetTaskId),
                type: l.type || "e2e",
              }));
              await applyPlan({ timelineId, baseStartMs: Date.now(), tasks: planTasks as any, links: planLinks as any });
              setDataSource(DataSource.Convex);
              try { window.localStorage.setItem("agents.dataSource", DataSource.Convex); } catch {}
              console.log("Seeded live timeline from scaffold.");
            } catch (e) {
              console.error("Seed failed:", e);
            }
          }}
        >Seed from Scaffold</button>
        <button
          className="btn btn-primary"
          title="Seed production-ready mock scenarios"
          onClick={() => setShowMockSeeder(!showMockSeeder)}
        >
          🎬 Production Mocks
        </button>
        <button
          className="btn"
          style={{ backgroundColor: '#10b981', color: 'white' }}
          title="Run Medical X-Ray Workflow (Image Search + Classification)"
          onClick={async () => {
            try {
              const xrayWorkflow = await import('../../../agents/app/demo_scenarios/medical_xray_workflow.json');
              await startFromPrompt({
                timelineId,
                prompt: "Find and classify medical X-ray images",
                provider: planner as any,
                overrideGraph: xrayWorkflow.graph as any,
              });
              setDataSource(DataSource.Convex);
              try { window.localStorage.setItem("agents.dataSource", DataSource.Convex); } catch {}
              console.log("Started Medical X-Ray Workflow");
            } catch (e) {
              console.error("X-Ray Workflow failed:", e);
            }
          }}
        >
          🩺 X-Ray Workflow
        </button>
        <button
          className="btn"
          title="Seed live Convex timeline from Web (Grok + Linkup)"
          onClick={async () => {
            try {
              const q = (prompt && prompt.trim()) || "Company research overview";
              await seedFromWeb({ timelineId, query: q, intent: "research" });
              setDataSource(DataSource.Convex);
              try { window.localStorage.setItem("agents.dataSource", DataSource.Convex); } catch {}
            } catch (e) {
              console.error("Seed from Web failed:", e);
            }
          }}
        >Seed From Web</button>

        <button
          className="btn"
          title="Run orchestrator on this timeline (live)"
          onClick={async () => {
            try {
              const goal = (prompt && prompt.trim()) || "Orchestrate timeline run";
              const rsp = await runOnTimeline({
                timelineId,
                taskSpec: { goal, type: "ad-hoc", topic: goal } as any,
              } as any);
	              setLastRun({ input: goal, output: String((rsp as any)?.result ?? "") });

              setDataSource(DataSource.Convex);
              try { window.localStorage.setItem("agents.dataSource", DataSource.Convex); } catch {}
              const rc = (rsp as any)?.retryCount as number | undefined;
              if (rc && rc > 0) {
                setToast(`Model rate-limited; retried ${rc} time${rc === 1 ? '' : 's'}. Switched to fallback model.`);
                window.setTimeout(() => setToast(""), 6000);
              }
            } catch (e) {
              console.error("Run orchestrator failed:", e);
            }
          }}
        >Run Orchestrator</button>

        <button
          className="btn"
          title="Download timeline JSON (full snapshot)"
          onClick={async () => {
            try {
              const payload = await exportSnapshot({ timelineId });
              const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `timeline_${String(timelineId)}.json`;
              document.body.appendChild(a);
              a.click();
              setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
            } catch (e) {
              console.error("Download JSON failed:", e);
            }
          }}
        >Download JSON</button>
        </>)}

          <div className="status-badge flex-grow" role="status" aria-live="polite">
            {`${usingScaffold ? 'Source: Scaffold' : 'Source: Convex'} • ${wm === WindowMode.Fixed ? 'Fixed 10m' : wm === WindowMode.Fit ? 'Fit tasks' : 'Center now'} • ${runningCount} running${latestOutput ? ' • Last: ' + trunc(latestOutput, 80) : ''}`}
          </div>
        </div>

        {/* Bottom row: Textarea and Send button */}
        <div className="flex items-start gap-2">
          <textarea
            placeholder="Ask AI to plan your week, find documents, etc... (Shift+Enter for newline, Enter to send)"
            rows={3}
            className="flex-grow bg-transparent outline-none text-sm px-2 py-1 text-[var(--text-primary)] placeholder-[var(--text-secondary)] resize-y min-h-[60px] border border-[var(--border-color)] rounded-md"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!prompt.trim()) return;
                try {
                  await startFromPrompt({ timelineId, prompt: prompt.trim(), provider: planner as any });
                  setDataSource(DataSource.Convex);
                  try { window.localStorage.setItem("agents.dataSource", DataSource.Convex); } catch {}
                  setPrompt("");
                } catch (err) {
                  console.error('Prompt plan failed', err);
                }
              }
            }}
          />
          <button
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center bg-[#007AFF] hover:bg-[#0056b3] text-white rounded-md"
            title="Send"
            onClick={async () => {
              if (!prompt.trim()) return;
              try {
                await startFromPrompt({ timelineId, prompt: prompt.trim(), provider: planner as any });
                setDataSource(DataSource.Convex);
                try { window.localStorage.setItem("agents.dataSource", DataSource.Convex); } catch {}
                setPrompt("");
              } catch (err) {
                console.error('Prompt plan failed', err);
              }
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-send w-5 h-5" aria-hidden="true"><path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"></path><path d="m21.854 2.147-10.94 10.939"></path></svg>
          </button>
        </div>
      </div>

      {/* Production Mock Seeder Panel */}
      {showMockSeeder && (
        <div style={{ marginTop: '1rem' }}>
          <ProductionMockSeeder
            documentId={data?.documentId as Id<"documents"> | undefined}
            onSeeded={(newTimelineId) => {
              setShowMockSeeder(false);
              console.log("Seeded timeline:", newTimelineId);
            }}
          />
        </div>
      )}



      <div className="mt-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)]" id="timeline-section">
        <div className="px-2 pt-2 flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <span>Timeline</span>
        </div>
        <div className="p-2">
          <div className="timeline-container">
        {/* Left: Agent Hierarchy */}
        <aside className="agent-hierarchy" ref={leftRef} role="complementary" aria-label="Agent Hierarchy">
          <div className="hierarchy-header">
            <div className="hierarchy-title">{usingScaffold ? "Agent Scaffold" : ((data as any)?.name || "Agents")}</div>
            <button className="btn" style={{ padding: "6px 10px", fontSize: 12 }} title="Add a new main agent" onClick={() => console.log("+ Add Agent")}>+ Add Agent</button>
          </div>
          <div>
            {/* Orchestrator */}
            {orchestrators.slice(0,1).map((o) => (
              <div className="agent-group" key={`o-${o._id}`}>
                <div className="main-agent">
                  <div className="agent-icon" style={{ background: "var(--accent-2)", borderColor: "#C7D2FE" }}>{o.icon || "🧠"}</div>
                  <div className="agent-name" title={String(o.name || "Orchestrator")} aria-label={String(o.name || "Orchestrator")}>
                    {o.name || "Orchestrator"}
                  </div>
                  <div className={`agent-status status-${(o.status ?? "pending").toLowerCase()}`}></div>
                </div>
              </div>
            ))}
            {/* Main agents and their sub-agents */}
            {mains.map((m) => (
              <div className="agent-group" key={`m-${m._id}`}>
                <div className="main-agent" onClick={() => toggleCollapsed(String(m._id))} aria-expanded={!collapsed[String(m._id)]} title="Click to expand/collapse">
                  <div className="agent-icon" style={{ background: "#F0FDF4", borderColor: "#BBF7D0" }}>{m.icon || "👤"}</div>
                  <div className="agent-name" title={String(m.name)} aria-label={String(m.name)}>{m.name}</div>
                  <div className="agent-meta">{"⚡ Parallel"}</div>
                  <div className={`agent-status status-${(m.status ?? "pending").toLowerCase()}`} title={`Status: ${String(m.status ?? 'pending')}`}></div>
                </div>
                {!collapsed[String(m._id)] && childrenOf(m._id)
                  .filter((s) => !mainIds.has(String(s._id)))
                  .map((s) => (
                  <div className="sub-agent" key={`s-${s._id}`}>
                    <div className="agent-icon">{s.icon || "🔗"}</div>
                    <div className="agent-name" title={String(s.name)} aria-hidden>{s.name}</div>
                    <div className={`agent-status status-${(s.status ?? "pending").toLowerCase()}`} title={`Status: ${String(s.status ?? 'pending')}`}></div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </aside>

        {/* Right: Timeline Chart */}
        <section className="timeline-chart" ref={rightRef} role="region" aria-label="Execution Timeline">
          <div className="timeline-header" ref={headerRef}
            onMouseMove={(e) => {
              const el = headerRef.current; if (!el) return;
              const rect = el.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const ratio = Math.max(0, Math.min(1, x / Math.max(1, rect.width)));
              const sec = Math.round(ratio * windowSec);
              setPreview({ active: true, sec, leftPct: `${ratio * 100}%` });
            }}
            onMouseLeave={() => setPreview((p) => ({ ...p, active: false }))}
          >
            <div className="time-scale">Execution Timeline (Minutes : Seconds)</div>
            <div className="time-units">
              {timeUnits.map((sec, i) => (
                <div key={`sec-${sec}-${i}`} className={`time-unit ${Math.abs(sec - (currentSec - (windowStartMs/1000))) < (unitStepSec / 2) ? 'now' : ''}`}>{fmtMMSS(sec)}</div>
              ))}
            </div>
            {preview.active && (
              <div className="scrub-tooltip" aria-label="scrub-tooltip" style={{ left: preview.leftPct }}>{fmtMMSS(preview.sec)}</div>
            )}
          </div>

          <div className="current-time-line" style={{ left: nowLeftPct }} />

          {/* Single timeline grid overlay for all rows */}
          <div className="timeline-grid-overlay" aria-hidden="true">
            {timeUnits.map((t) => (<div key={`g-ov-${t}`} className="grid-column" />))}
          </div>

          <div className="timeline-rows">
            {/* Orchestrator row */}
            {orchestrators.slice(0,1).map((o) => (
              <div className="timeline-row main-row" data-agent-id={String(o._id)} key={`row-o-${o._id}`}>
                <ExecutionBar
                  task={o}
                  leftPct={leftPct(o)}
                  widthPct={widthPct(o)}
                  color={colorOf(o)}
                  progress={getProgress(o)}
                  onMouseEnter={(e) => { if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current); const target = e.currentTarget as HTMLElement; hoverTimerRef.current = window.setTimeout(() => { setPopoverAnchor(target); setPopoverTask(o); }, 120); }}
                  onMouseLeave={() => { if (pinnedTaskId && pinnedTaskId === String(o._id)) return; if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current); setPopoverAnchor(null); setPopoverTask(null); }}
                  onClick={() => setPinnedTaskId((p) => (p === String(o._id) ? null : String(o._id)))}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPinnedTaskId((p) => (p === String(o._id) ? null : String(o._id))); setPopoverTask(o); } if (e.key === 'Escape') { setPinnedTaskId(null); setPopoverTask(null); } }}
                />
              </div>
            ))}

            {/* Main and sub rows */}
            {mains.map((m) => (
              <div key={`rows-${m._id}`}>
                <div className="timeline-row main-row" data-agent-id={String(m._id)}>
                  <ExecutionBar
                    task={m}
                    leftPct={leftPct(m)}
                    widthPct={widthPct(m)}
                    color={colorOf(m)}
                    progress={getProgress(m)}
                    onMouseEnter={(e) => { if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current); const target = e.currentTarget as HTMLElement; hoverTimerRef.current = window.setTimeout(() => { setPopoverAnchor(target); setPopoverTask(m); }, 120); }}
                    onMouseLeave={() => { if (pinnedTaskId && pinnedTaskId === String(m._id)) return; if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current); setPopoverAnchor(null); setPopoverTask(null); }}
                    onClick={() => setPinnedTaskId((p) => (p === String(m._id) ? null : String(m._id)))}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPinnedTaskId((p) => (p === String(m._id) ? null : String(m._id))); setPopoverTask(m); } if (e.key === 'Escape') { setPinnedTaskId(null); setPopoverTask(null); } }}
                  />
                  {/* Phase boundary markers (per-task) */}
                  {Array.isArray((m as any).phaseBoundariesMs) && (m as any).phaseBoundariesMs.map((ms: number, i: number) => (
                    <div key={`ph-${String(m._id)}-${i}`} className="phase-separator-marker" aria-label={`phase-sep-${ms}ms`} />
                  ))}
                </div>
                {!collapsed[String(m._id)] && childrenOf(m._id).map((s) => (
                  <div className="timeline-row sub-row" data-agent-id={String(s._id)} key={`row-s-${s._id}`}>
                    <ExecutionBar
                      task={s}
                      leftPct={leftPct(s)}
                      widthPct={widthPct(s)}
                      color={colorOf(s)}
                      progress={getProgress(s)}
                      onMouseEnter={(e) => { if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current); const target = e.currentTarget as HTMLElement; hoverTimerRef.current = window.setTimeout(() => { setPopoverAnchor(target); setPopoverTask(s); }, 120); }}
                      onMouseLeave={() => { if (pinnedTaskId && pinnedTaskId === String(s._id)) return; if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current); setPopoverAnchor(null); setPopoverTask(null); }}
                      onClick={() => setPinnedTaskId((p) => (p === String(s._id) ? null : String(s._id)))}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPinnedTaskId((p) => (p === String(s._id) ? null : String(s._id))); setPopoverTask(s); } if (e.key === 'Escape') { setPinnedTaskId(null); setPopoverTask(null); } }}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>

          <AgentPopover isOpen={!!popoverTask} anchorEl={popoverAnchor} agent={popoverTask} onClose={() => { setPopoverAnchor(null); setPopoverTask(null); }} />
        </section>
          </div>
        </div>
      </div>

      {finalOutput ? (
        <div className="mt-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)]">
          <div className="px-2 pt-2 flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span>Final Output</span>
            <div className="flex items-center gap-2">
              <button
                className="btn"
                title="Copy output"
                onClick={() => { void navigator.clipboard.writeText(finalOutput).then(() => { setToast("Copied"); window.setTimeout(() => setToast(""), 1500); }).catch(() => {}); }}
              >Copy</button>
              <button
                className="btn"
                title="Restore from Final Output"
                onClick={() => setRestoreTick((t) => t + 1)}
              >Restore</button>
              <button
                className="btn"
                title="Save current editor content as Final Output"
                onClick={() => { void (async () => {
                  try {
                    const fn = editorExporterRef.current;
                    if (!fn) { setToast("Editor not ready"); window.setTimeout(() => setToast(""), 1500); return; }
                    const { plain } = await fn();
                    const output = String(plain || '').trim();
                    if (!output) { setToast("Nothing to save"); window.setTimeout(() => setToast(""), 1500); return; }
                    await setLatestRun({ timelineId, input: finalInput || "", output });
                    setToast("Saved as Final Output");
                    window.setTimeout(() => setToast(""), 1500);
                  } catch (e) { console.error(e); setToast("Save failed"); window.setTimeout(() => setToast(""), 2000); }
                })(); }}
              >Save as Final Output</button>
              <button
                className="btn"
                title={expandedFinal ? "Collapse" : "Expand"}
                onClick={() => persistExpandedFinal(!expandedFinal)}
              >{expandedFinal ? "Collapse" : "Expand"}</button>
            </div>
          </div>
          <div className="px-2 pb-2">
            {documentId ? (
              <UnifiedEditor documentId={documentId as any} mode="quickNote" editable={true} autoCreateIfEmpty={true} seedMarkdown={undefined} restoreSignal={restoreTick} restoreMarkdown={finalOutput} registerExporter={(fn) => { editorExporterRef.current = fn; }} />
            ) : (
              <>
                {finalInput ? (
                  <pre className="px-2 py-1 whitespace-pre-wrap break-words text-xs text-[var(--text-primary)]"><strong>Input:</strong> {expandedFinal ? finalInput : truncateOutput(finalInput, 6, 400)}</pre>
                ) : null}
                <pre className="px-2 pb-2 whitespace-pre-wrap break-words text-sm text-[var(--text-primary)]">{expandedFinal ? finalOutput : truncateOutput(finalOutput)}</pre>
              </>
            )}
          </div>

          <div className="mt-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)]">
            <div className="px-2 pt-2 flex items-center justify-between text-xs text-[var(--text-secondary)]">
              <span>Run History{Array.isArray(runs) ? ` (${runs.length})` : ''}</span>
              <button className="btn" onClick={() => persistShowHistory(!showHistory)}>{showHistory ? 'Hide' : 'Show'}</button>
            </div>
            {showHistory && (
              <ul className="px-2 pb-2 space-y-1">
                {(runs ?? []).map((r) => (
                  <li key={String(r._id)} className="border border-[var(--border-color)] rounded p-1">
                    <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                      <span>{new Date(Number(r.createdAt)).toLocaleString()}{typeof r.retryCount === 'number' && r.retryCount > 0 ? ` • retries: ${r.retryCount}` : ''}{r.modelUsed ? ` • ${r.modelUsed}` : ''}{(r as any).meta && (typeof (r as any).meta?.totalInputTokens === 'number' || typeof (r as any).meta?.totalOutputTokens === 'number') ? ` • tok ${(r as any).meta?.totalInputTokens ?? 0}/${(r as any).meta?.totalOutputTokens ?? 0}` : ''}{(r as any).meta && typeof (r as any).meta?.elapsedMs === 'number' ? ` • ${Math.round(((r as any).meta.elapsedMs || 0) / 1000)}s` : ''}</span>
                      <div className="flex items-center gap-2">
                        <button className="btn" title="Copy" onClick={() => { void navigator.clipboard.writeText(String(r.output || '')).then(() => { setToast('Copied'); window.setTimeout(() => setToast(''), 1500); }).catch(() => {}); }}>Copy</button>
                        <button className="btn" onClick={() => toggleRunOpen(String(r._id))}>{openRunIds[String(r._id)] ? 'Hide' : 'View'}</button>
                      </div>
                    </div>
                    <div className="text-xs text-[var(--text-primary)] mt-1">
                      {openRunIds[String(r._id)] ? (
                        <pre className="whitespace-pre-wrap break-words">{String(r.output || '')}</pre>
                      ) : (
                        <pre className="whitespace-pre-wrap break-words">{truncateOutput(String(r.output || ''), 6, 400)}</pre>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

    </section>
  );
}

