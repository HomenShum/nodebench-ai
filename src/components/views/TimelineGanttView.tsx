import React, { useEffect, useMemo, useRef, useState } from "react";
// Type guards so TS doesn't error before the package is installed
// Remove these ambient declarations after installing the dependency if you prefer
declare module "wx-react-gantt" {
  export const Gantt: any;
  export const WillowDark: React.FC<{ children: React.ReactNode }>;
}
declare module "wx-react-gantt/dist/gantt.css";

import { Gantt, WillowDark } from "wx-react-gantt";
import "wx-react-gantt/dist/gantt.css";

// ---------- Types you can adapt to your actual agentSystem ----------
export type AgentType = "orchestrator" | "main" | "leaf";

export type AgentNode = {
  id: string;
  name: string;
  agentType?: AgentType; // orchestrator | main | leaf
  startTime?: number; // seconds from baseTime
  duration?: number; // seconds
  progress?: number; // 0..100
  status?: "pending" | "running" | "complete" | "paused";
  outputSizeBytes?: number; // for popover
  dependencies?: string[]; // ids this depends on
  children?: AgentNode[]; // sub-agents
};

export type AgentSystem = {
  orchestrator: AgentNode & { children: AgentNode[] };
  // optional explicit link edges (source -> target)
  links?: Array<{ id?: string; source: string; target: string; type?: "e2e" | "s2s" | "s2e" | "e2s" }>;
};

// Types expected by the Gantt lib (loose to avoid pinning to external types)
export type GanttTask = {
  id: string | number;
  text: string;
  start: Date;
  end: Date;
  duration?: number;
  progress?: number; // use 0..1 for most gantt libs
  type: "summary" | "task";
  parent?: string | number;
};

export type GanttLink = {
  id: string | number;
  source: string | number;
  target: string | number;
  type: "e2e" | "s2s" | "s2e" | "e2s";
};

function clamp01(n: number | undefined): number {
  if (typeof n !== "number" || !Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function secsToDate(base: Date, secs?: number): Date {
  const baseMs = base.getTime();
  const add = typeof secs === "number" && Number.isFinite(secs) ? secs * 1000 : 0;
  return new Date(baseMs + add);
}

function deriveStatusAndProgress(node: AgentNode, now: Date, base: Date): { status: AgentNode["status"]; progress01: number } {
  const startMs = secsToDate(base, node.startTime ?? 0).getTime();
  const endMs = secsToDate(base, (node.startTime ?? 0) + (node.duration ?? 0)).getTime();
  const t = now.getTime();
  if (!node.duration || endMs <= startMs) {
    return { status: node.status ?? "pending", progress01: clamp01((node.progress ?? 0) / 100) };
  }
  if (t < startMs) return { status: "pending", progress01: 0 };
  if (t >= endMs) return { status: "complete", progress01: 1 };
  const p = (t - startMs) / (endMs - startMs);
  return { status: "running", progress01: clamp01(p) };
}

function computeEndFromChildren(base: Date, node: AgentNode): Date | undefined {
  if (!node.children || node.children.length === 0) return undefined;
  const ends = node.children
    .map((c) => secsToDate(base, (c.startTime ?? 0) + (c.duration ?? 0)).getTime())
    .filter((n) => Number.isFinite(n));
  if (!ends.length) return undefined;
  return new Date(Math.max(...ends));
}

function flattenToTasks(base: Date, sys: AgentSystem, now: Date): { tasks: GanttTask[]; minStart: Date; maxEnd: Date } {
  const tasks: GanttTask[] = [];
  let minStartMs = Infinity;
  let maxEndMs = -Infinity;

  const pushTask = (t: GanttTask) => {
    tasks.push(t);
    const s = t.start.getTime();
    const e = t.end.getTime();
    if (s < minStartMs) minStartMs = s;
    if (e > maxEndMs) maxEndMs = e;
  };

  const orch = sys.orchestrator;
  const orchStart = secsToDate(base, orch.startTime ?? 0);
  const orchEnd = orch.duration
    ? secsToDate(base, (orch.startTime ?? 0) + orch.duration)
    : computeEndFromChildren(base, orch) ?? secsToDate(base, (orch.startTime ?? 0) + 60);
  const dOrch = deriveStatusAndProgress(orch, now, base);
  {
    const t: GanttTask = {
      id: orch.id,
      text: orch.name || "Orchestrator",
      start: orchStart,
      end: orchEnd,
      progress: dOrch.progress01,
      type: "summary",
    };
    (t as any).meta = { agentType: "orchestrator", status: dOrch.status || "pending", outputSizeBytes: orch.outputSizeBytes ?? 0 };
    pushTask(t);
  }

  for (const main of orch.children || []) {
    const mainStart = secsToDate(base, main.startTime ?? 0);
    const mainEnd = main.duration
      ? secsToDate(base, (main.startTime ?? 0) + main.duration)
      : computeEndFromChildren(base, main) ?? secsToDate(base, (main.startTime ?? 0) + 60);
    const dMain = deriveStatusAndProgress(main, now, base);
    {
      const t: GanttTask = {
        id: main.id,
        text: main.name,
        start: mainStart,
        end: mainEnd,
        progress: dMain.progress01,
        type: "summary",
        parent: orch.id,
      };
      (t as any).meta = { agentType: "main", status: dMain.status || "pending", outputSizeBytes: main.outputSizeBytes ?? 0 };
      pushTask(t);
    }

    for (const sub of main.children || []) {
      const subStart = secsToDate(base, sub.startTime ?? 0);
      const subEnd = sub.duration
        ? secsToDate(base, (sub.startTime ?? 0) + sub.duration)
        : secsToDate(base, (sub.startTime ?? 0) + 30);
      const dSub = deriveStatusAndProgress(sub, now, base);
      {
        const t: GanttTask = {
          id: sub.id,
          text: sub.name,
          start: subStart,
          end: subEnd,
          progress: dSub.progress01,
          type: "task",
          parent: main.id,
        };
        (t as any).meta = { agentType: "leaf", status: dSub.status || "pending", outputSizeBytes: sub.outputSizeBytes ?? 0 };
        pushTask(t);
      }
    }
  }

  // If no valid times, fall back to a 1-minute window from base
  if (!Number.isFinite(minStartMs) || !Number.isFinite(maxEndMs) || minStartMs >= maxEndMs) {
    minStartMs = base.getTime();
    maxEndMs = base.getTime() + 60_000;
  }

  return { tasks, minStart: new Date(minStartMs), maxEnd: new Date(maxEndMs) };
}

function buildLinks(sys: AgentSystem): GanttLink[] {
  const links: GanttLink[] = [];
  // explicit links
  for (const l of sys.links || []) {
    links.push({
      id: l.id ?? `${l.source}->${l.target}`,
      source: l.source,
      target: l.target,
      type: (l.type as any) || "e2e",
    });
  }
  // implicit: dependencies on nodes
  const walk = (node: AgentNode) => {
    for (const dep of node.dependencies || []) {
      links.push({ id: `${dep}->${node.id}`, source: dep, target: node.id, type: "e2e" });
    }
    for (const c of node.children || []) walk(c);
  };
  walk(sys.orchestrator);
  return links;
}


export type AddTaskPayload = {
  parentId: string | null;
  name: string;
  startTimeSec: number;
  durationSec: number;
  dependencies: string[];
};

export default function TimelineGanttView({
  baseTime,
  agentSystem,
  onOpenMasterPrompt,
  onOpenAgentDetails,
  onStart,
  onPause,
  onCreateTask,
}: {
  baseTime: Date;
  agentSystem: AgentSystem;
  onOpenMasterPrompt: () => void;
  onOpenAgentDetails: (id: string) => void;
  onStart: () => void;
  onPause: () => void;
  onCreateTask: (payload: AddTaskPayload) => void;
}) {
  const [now, setNow] = useState<Date>(new Date());
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const [hover, setHover] = useState<{ x: number; y: number; task?: GanttTask } | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [draftAt, setDraftAt] = useState<Date | null>(null);
  const [draftParent, setDraftParent] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const { tasks, links, scales, range } = useMemo(() => {
    const { tasks, minStart, maxEnd } = flattenToTasks(baseTime, agentSystem, now);
    const links = buildLinks(agentSystem);
    const scales = [
      { unit: "minute", step: 5, format: "HH:mm" },
      { unit: "second", step: 30, format: "ss" },
    ];
    return { tasks, links, scales, range: { minStart, maxEnd } };

  }, [agentSystem, baseTime, now]);

  // Attach delegated listeners to pick up bar hover/clicks for popovers & details
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const pickTaskId = (el: Element | null): string | undefined => {
      let cur: Element | null = el;
      while (cur && cur !== root) {


        const id = (cur as HTMLElement).dataset?.taskId || (cur.getAttribute && cur.getAttribute("data-task-id")) || undefined;
        if (id) return id;
        // try common classnames the library might use
        if (cur.className && typeof cur.className === "string") {
          if (cur.className.includes("gantt_task_line") || cur.className.includes("wx-gantt")) {
            // try parent for id
            const maybeId = (cur as HTMLElement).dataset?.id || undefined;
            if (maybeId) return maybeId;
          }
        }
        cur = cur.parentElement;
      }
      return undefined;
    };

    const onMove = (e: MouseEvent) => {
      const el = e.target as Element | null;
      const id = pickTaskId(el);
      const task = tasks.find((t) => String(t.id) === String(id));
      if (task) {
        setHover({ x: e.clientX, y: e.clientY, task });
      } else {
        setHover(null);
      }
    };
    const onLeave = () => setHover(null);
    const onClick = (e: MouseEvent) => {
      const el = e.target as Element | null;
      const id = pickTaskId(el);
      if (id) onOpenAgentDetails(String(id));
    };

    root.addEventListener("mousemove", onMove);
    root.addEventListener("mouseleave", onLeave);
    root.addEventListener("click", onClick);
    return () => {
      root.removeEventListener("mousemove", onMove);
      root.removeEventListener("mouseleave", onLeave);
      root.removeEventListener("click", onClick);
    };
  }, [tasks, onOpenAgentDetails]);

  // Double-click to open Add Task dialog, prefilling time (and attempting parent)
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const onDblClick = (e: MouseEvent) => {

      const rect = root.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const pct = rect.width ? x / rect.width : 0;
      const startMs = range.minStart.getTime() + pct * (range.maxEnd.getTime() - range.minStart.getTime());
      setDraftAt(new Date(startMs));
      // Try to infer hovered task id
      const pickTaskId = (el: Element | null): string | undefined => {
        let cur: Element | null = el;
        while (cur && cur !== root) {
          const id = (cur as HTMLElement).dataset?.taskId || (cur as HTMLElement).dataset?.id || undefined;
          if (id) return id;
          cur = cur.parentElement;
        }
        return undefined;
      };
      const hoveredId = pickTaskId(e.target as Element | null);
      setDraftParent(hoveredId ?? null);
      setShowAdd(true);
    };
    root.addEventListener("dblclick", onDblClick);
    return () => root.removeEventListener("dblclick", onDblClick);
  }, [range.minStart, range.maxEnd]);


  const nearestTickPct = useMemo(() => {
    const start = range.minStart.getTime();
    const end = range.maxEnd.getTime();
    const stepMs = 30_000; // align with 30s scale
    if (end <= start) return 0;
    const slots = Math.round((now.getTime() - start) / stepMs);
    const tick = start + slots * stepMs;
    const clamped = Math.max(start, Math.min(end, tick));
    return Math.max(0, Math.min(1, (clamped - start) / (end - start)));
  }, [now, range.minStart, range.maxEnd]);

  const hierarchy = useMemo(() => {
    type Item = { id: string; name: string; depth: number; status: string; hasChildren: boolean };
    const items: Array<Item> = [];
    const walk = (n: AgentNode, depth: number) => {
      const d = deriveStatusAndProgress(n, now, baseTime);
      const hasChildren = !!(n.children && n.children.length);
      items.push({ id: n.id, name: n.name, depth, status: d.status || "pending", hasChildren });
      if (!collapsed.has(n.id)) {
        for (const c of n.children || []) walk(c, depth + 1);
      }
    };
    walk(agentSystem.orchestrator, 0);
    return items;
  }, [agentSystem, now, baseTime, collapsed]);


  // Compute current-time vertical line position as % of timeline range
  const timePct = useMemo(() => {
    const start = range.minStart.getTime();
    const end = range.maxEnd.getTime();
    const cur = now.getTime();
    if (end <= start) return 0;
    return Math.max(0, Math.min(1, (cur - start) / (end - start)));
  }, [now, range.minStart, range.maxEnd]);

  const runningCount = useMemo(() => {
    const tNow = now.getTime();

    return tasks.filter((t) => t.start.getTime() <= tNow && tNow < t.end.getTime()).length;
  }, [tasks, now]);


  const statusBadge = (s?: string) => {
    const map: Record<string, string> = {
      pending: "bg-slate-600 text-white",
      running: "bg-blue-600 text-white",
      complete: "bg-emerald-600 text-white",
      paused: "bg-amber-600 text-white",
    };
    return map[s || "pending"] || map.pending;
  };

  const statusDot = (s?: string) => {
    const map: Record<string, string> = {
      pending: "bg-slate-400",
      running: "bg-blue-500",
      complete: "bg-emerald-500",
      paused: "bg-amber-500",
    };
    return map[s || "pending"] || map.pending;
  };


  const formatBytes = (n?: number) => {
    if (!n || n <= 0) return "—";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let v = n;
    let i = 0;
    while (v >= 1024 && i < units.length - 1) {
      v /= 1024;
      i++;
    }
    return `${v.toFixed(v >= 100 ? 0 : v >= 10 ? 1 : 2)} ${units[i]}`;
  };


  const elapsedStr = (t: GanttTask) => {
    const ms = Math.max(0, now.getTime() - t.start.getTime());
    const sec = Math.floor(ms / 1000) % 60;
    const min = Math.floor(ms / 60000) % 60;
    const hr = Math.floor(ms / 3600000);
    return `${hr > 0 ? hr + "h " : ""}${min}m ${sec}s`;
  };


  type AddTaskDialogProps = {
    open: boolean;
    baseTime: Date;
    at?: Date | null;
    parents: Array<{ id: string; text: string; isSummary: boolean }>;
    defaultParentId?: string | null;
    onClose: () => void;
    onCreate: (payload: {
      parentId: string | null;
      name: string;
      startTimeSec: number;
      durationSec: number;
      dependencies: string[];
    }) => void;
  };

  const AddTaskDialog: React.FC<AddTaskDialogProps> = ({ open, baseTime, at, parents, defaultParentId, onClose, onCreate }) => {
    const [name, setName] = useState("New Task");
    const [parentId, setParentId] = useState<string | null>(defaultParentId ?? null);
    const [startOffset, setStartOffset] = useState<string>("0:00");
    const [duration, setDuration] = useState<string>("1:00");
    const [deps, setDeps] = useState<string>("");

    useEffect(() => {
      if (!open) return;
      setParentId(defaultParentId ?? null);
      const ms = (at?.getTime() ?? baseTime.getTime()) - baseTime.getTime();
      const totalSec = Math.max(0, Math.floor(ms / 1000));
      const m = Math.floor(totalSec / 60);
      const s = (totalSec % 60).toString().padStart(2, "0");
      setStartOffset(`${m}:${s}`);
    }, [open, at, baseTime, defaultParentId]);

    const parseOffset = (text: string) => {
      if (/^\d+:\d{2}$/.test(text)) {
        const [m, s] = text.split(":").map(Number);
        return (m * 60 + s) * 1000;
      }
      const n = Number(text);
      return Number.isFinite(n) ? n * 1000 : 0;
    };

    if (!open) return null;
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-4 w-[520px]">
          <div className="text-lg font-medium mb-3">Add Task</div>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <div className="text-xs text-[var(--text-secondary)] mb-1">Task name</div>
              <input className="w-full px-2 py-1.5 rounded border border-[var(--border-color)] bg-transparent" value={name} onChange={e=>setName(e.target.value)} />
            </label>
            <label className="text-sm">
              <div className="text-xs text-[var(--text-secondary)] mb-1">Assign to (parent)</div>
              <select className="w-full px-2 py-1.5 rounded border border-[var(--border-color)] bg-transparent" value={parentId ?? ""} onChange={e=>setParentId(e.target.value || null)}>


                <option value="">(Top-level)</option>
                {parents.filter(p=>p.isSummary).map(p=> (<option key={p.id} value={p.id}>{p.text}</option>))}
              </select>
            </label>
            <label className="text-sm">
              <div className="text-xs text-[var(--text-secondary)] mb-1">Start offset (m:ss or sec)</div>
              <input className="w-full px-2 py-1.5 rounded border border-[var(--border-color)] bg-transparent" value={startOffset} onChange={e=>setStartOffset(e.target.value)} />
            </label>
            <label className="text-sm">
              <div className="text-xs text-[var(--text-secondary)] mb-1">Duration (m:ss or sec)</div>
              <input className="w-full px-2 py-1.5 rounded border border-[var(--border-color)] bg-transparent" value={duration} onChange={e=>setDuration(e.target.value)} />
            </label>
            <label className="text-sm col-span-2">
              <div className="text-xs text-[var(--text-secondary)] mb-1">Dependencies (comma-separated task IDs)</div>
              <input className="w-full px-2 py-1.5 rounded border border-[var(--border-color)] bg-transparent" value={deps} onChange={e=>setDeps(e.target.value)} />
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button className="px-3 py-1.5 rounded border border-[var(--border-color)]" onClick={onClose}>Cancel</button>
            <button className="px-3 py-1.5 rounded bg-[var(--accent-primary)] text-white" onClick={() => {
              onCreate({
                parentId,
                name,
                startTimeSec: Math.floor(parseOffset(startOffset)/1000),
                durationSec: Math.max(1, Math.floor(parseOffset(duration)/1000)),
                dependencies: deps.split(",").map(s=>s.trim()).filter(Boolean),
              });
            }}>Create</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center gap-2">
        <button className="px-3 py-1.5 rounded-md bg-[var(--accent-primary)] text-white" onClick={onStart}>
          ▶ Start Research
        </button>
        <button className="px-3 py-1.5 rounded-md border border-[var(--border-color)]" onClick={onOpenMasterPrompt}>
          Master Prompt
        </button>
        <button className="px-3 py-1.5 rounded-md border border-[var(--border-color)]">
          Agent Hierarchy
        </button>
        <button className="px-3 py-1.5 rounded-md border border-[var(--border-color)]" onClick={onPause}>
          ⏸ Pause
        </button>
        <button className="ml-auto px-3 py-1.5 rounded-md border border-[var(--border-color)]" onClick={() => { setDraftAt(null); setDraftParent(null); setShowAdd(true); }}>
          ＋ New Task
        </button>
        <div className="ml-2 text-xs px-2 py-1 rounded-md border border-[var(--border-color)]">
          Pipeline Active • {runningCount} running
        </div>
      </div>

      <div className="flex gap-3 flex-1 min-h-[360px]">
        {/* Left hierarchy pane */}
        <div className="w-64 shrink-0 rounded-lg border border-[var(--border-color)] overflow-hidden">
          <div className="px-3 py-2 border-b border-[var(--border-color)] flex items-center justify-between">
            <div className="text-xs font-medium">Agent Hierarchy</div>
            <button className="text-xs px-2 py-1 rounded border border-[var(--border-color)]" onClick={() => { setDraftParent(null); setDraftAt(null); setShowAdd(true); }}>
              ＋ Add Agent
            </button>
          </div>
          <div className="max-h-[480px] overflow-auto py-2">
            {hierarchy.map((item) => (
              <div key={item.id} className="px-2 py-1 group">
                <div className="flex items-center gap-2">
                  <div style={{ paddingLeft: item.depth * 12 }} className="flex items-center gap-2 flex-1">
                    {item.hasChildren ? (
                      <button className="w-4 text-xs" onClick={() => toggleCollapse(item.id)} aria-label="Toggle">
                        {collapsed.has(item.id) ? "▸" : "▾"}
                      </button>
                    ) : (
                      <span className="w-4" />
                    )}
                    <span className={`inline-block h-2 w-2 rounded-full ${statusDot(item.status)}`} />
                    <button className="text-left truncate flex-1" onClick={() => onOpenAgentDetails(item.id)}>
                      {item.name}
                    </button>
                  </div>
                  <button className="opacity-0 group-hover:opacity-100 text-xs px-1 py-0.5 rounded border border-[var(--border-color)]" onClick={() => { setDraftParent(item.id); setDraftAt(null); setShowAdd(true); }}>＋</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline container with header label and nearest tick highlight */}
        <div ref={containerRef} style={{ position: "relative" }} className="flex-1 rounded-lg overflow-hidden border border-[var(--border-color)]">
          <div className="absolute top-0 left-0 right-0 px-3 py-1 text-xs flex items-center justify-between bg-[color:var(--bg-primary)]/60 backdrop-blur-sm border-b border-[var(--border-color)] z-10">
            <span>Execution Timeline (Minutes : Seconds)</span>
            <div className="relative w-full h-2 ml-3">
              <div style={{ position: "absolute", top: 0, bottom: 0, left: `${nearestTickPct * 100}%`, width: 2, background: "rgba(255,255,255,0.25)" }} />
            </div>
          </div>
          <div style={{ paddingTop: 24 }} className="augment-gantt">
            <style>{`
              .augment-gantt .gantt_link_line, .augment-gantt path[class*="link"] {
                stroke: rgba(134, 239, 172, 0.9); /* emerald-300 */
                stroke-width: 2px;
              }
              .augment-gantt .gantt_link_arrow, .augment-gantt marker path {
                fill: rgba(134, 239, 172, 0.9);
              }
            `}</style>
            <WillowDark>
              <Gantt tasks={tasks} links={links} scales={scales} />
            </WillowDark>

            {/* Current time vertical line */}
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: `${timePct * 100}%`,
                width: 0,
                borderLeft: "2px dashed rgba(255,99,132,0.9)",
                pointerEvents: "none",
              }}
            />

            {/* Hover popover */}
            {hover?.task && (
              <div
                style={{ position: "fixed", left: hover.x + 12, top: hover.y + 12, zIndex: 50 }}
                className="px-3 py-2 rounded-md text-sm shadow-lg border border-[var(--border-color)] bg-[var(--bg-primary)]"
              >
                <div className="font-medium mb-1">{hover.task.text}</div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs px-1.5 py-0.5 rounded border border-[var(--border-color)]">{(hover.task as any).meta?.agentType ?? "task"}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${statusBadge(((hover.task as any).meta?.status) ?? "running")}`}>{(((hover.task as any).meta?.status) ?? "running").toString().replace(/^[a-z]/, (c: string) => c.toUpperCase())}</span>
                  <span className="text-xs text-[var(--text-secondary)]">Progress: {Math.round((hover.task.progress ?? 0) * 100)}%</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 text-xs text-[var(--text-secondary)]">
                  <div>Elapsed: {elapsedStr(hover.task)}</div>
                  <div>Output: {formatBytes((hover.task as any).meta?.outputSizeBytes)}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <AddTaskDialog
        open={showAdd}
        baseTime={baseTime}
        at={draftAt}
        parents={tasks.map(t => ({ id: String(t.id), text: t.text, isSummary: false }))}
        defaultParentId={draftParent}
        onClose={() => setShowAdd(false)}
        onCreate={(payload) => {
          setShowAdd(false);

          onCreateTask(payload);
        }}
      />

    </div>
  );
}



// Helper to immutably add a new task node into AgentSystem based on AddTaskPayload
export function addTaskToAgentSystem(agentSystem: AgentSystem, payload: AddTaskPayload): AgentSystem {
  const makeId = (base: string) => `${base.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}`;
  const newNode: AgentNode = {
    id: makeId(payload.name),
    name: payload.name,
    startTime: payload.startTimeSec,
    duration: payload.durationSec,
    progress: 0,
    status: "pending",
    dependencies: payload.dependencies,
    children: [],
  };

  type NodeWithChildren = AgentNode & { children: AgentNode[] };
  const clone = (n: AgentNode): NodeWithChildren => ({
    ...n,
    children: [...(n.children || []).map(clone)],
  });

  const addUnder = (n: NodeWithChildren, parentId: string): NodeWithChildren => {
    if (n.id === parentId) {
      const children = [...n.children, newNode];
      return { ...n, children };
    }
    return { ...n, children: n.children.map((c) => addUnder(c as NodeWithChildren, parentId)) };
  };

  const root = clone(agentSystem.orchestrator);
  const targetParentId = payload.parentId ?? root.id;
  const updatedRoot = addUnder(root, targetParentId);
  return { ...agentSystem, orchestrator: updatedRoot };
}
