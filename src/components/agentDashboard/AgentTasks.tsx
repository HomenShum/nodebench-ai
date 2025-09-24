import { useEffect, useMemo, useState, useContext } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { AgentWindowContext } from "./AgentWindowContext";
import AgentTree, { TaskNode as AgentTaskNode } from "./AgentTree";


// Keep existing cards, add grouped and tree layouts, and sync mini timelines with full timeline

enum TasksLayout {
  Grid = "grid",
  Grouped = "grouped",
  Tree = "tree",
  Table = "table",
}

type TaskDoc = {
  _id: string;
  parentId?: string | null;
  name: string;
  status?: string;
  description?: string;
  startOffsetMs?: number;
  durationMs?: number;
  agentType?: "orchestrator" | "main" | "leaf" | string;
};

type LinkDoc = { sourceTaskId: string; targetTaskId: string };

export function AgentTasks({ timelineId, onOpenFullView, onViewTimeline }: { timelineId: Id<"agentTimelines">; onOpenFullView?: (task: any) => void; onViewTimeline?: (task: any) => void; }) {
  const data = useQuery(api.agentTimelines.getByTimelineId, timelineId ? { timelineId } : ("skip" as any)) as { baseStartMs?: number; tasks?: TaskDoc[]; links?: LinkDoc[] } | undefined;
  const tasks: TaskDoc[] = (data?.tasks as any[]) || [];
  const links: LinkDoc[] = (data?.links as any[]) || [];
  const baseStartMs = data?.baseStartMs ?? Date.now();

  const addTask = useMutation(api.agentTimelines.addTask);
  const updateTask = useMutation(api.agentTimelines.updateTaskMetrics);


  // Prompt planning parity with Timeline view (safe in tests without ConvexProvider)
  let startFromPrompt: any;
  try {
    startFromPrompt = useAction(api.agents.promptPlan.startFromPrompt);
  } catch {
    startFromPrompt = (async () => {}) as any;
  }
  const [prompt, setPrompt] = useState("");
  const planner = useMemo<string>(() => {
    try {
      if (typeof window === "undefined") return "grok";
      const persisted = window.localStorage.getItem("agents.planner");
      return persisted === "grok" || persisted === "openai" ? persisted : "grok";
    } catch {
      return "grok";
    }
  }, []);

  // Layout selection persisted (local + Convex user pref)
  const agentsPrefs = useQuery(api.agentsPrefs.getAgentsPrefs, {});
  const setAgentsPrefs = useMutation(api.agentsPrefs.setAgentsPrefs);
  const [layout, setLayout] = useState<TasksLayout>(() => {
    try {
      const v = localStorage.getItem("agents.tasksLayout") as TasksLayout | null;
      return v === TasksLayout.Grouped || v === TasksLayout.Tree ? v : TasksLayout.Grid;
    } catch { return TasksLayout.Grid; }
  });
  useEffect(() => {
    const v = (agentsPrefs as any)?.agentTasksLayout as TasksLayout | undefined;
    if (v && (v === TasksLayout.Grid || v === TasksLayout.Grouped || v === TasksLayout.Tree)) {
      setLayout(v);
      try { localStorage.setItem("agents.tasksLayout", v); } catch {}
    }
  }, [agentsPrefs]);
  const persistLayout = (v: TasksLayout) => {
    try { localStorage.setItem("agents.tasksLayout", v); } catch {}
    setLayout(v);
    setAgentsPrefs({ prefs: { agentTasksLayout: v as unknown as string } } as any).catch(()=>{});
  };

  // Window mode sync via cross-component context
  enum WindowMode { Fixed = "fixed", Fit = "fit", CenterNow = "center" }
  const windowCtx = useContext(AgentWindowContext);
  const windowMode: WindowMode = (windowCtx?.windowMode as any) ?? (() => {
    try {
      const v = localStorage.getItem("agents.windowMode") as WindowMode | null;
      return v === WindowMode.Fit || v === WindowMode.CenterNow ? v : WindowMode.Fixed;
    } catch { return WindowMode.Fixed; }
  })();

  // Build a normalized 3-level tree for AgentTree
  const treeRootId = useMemo(() => {
    const ids = new Set<string>(tasks.map((t) => String((t as any)._id)));
    const indeg = new Map<string, number>();
    ids.forEach((id) => indeg.set(id, 0));
    links.forEach((l) => {
      const tid = String(l.targetTaskId);
      indeg.set(tid, (indeg.get(tid) || 0) + 1);
    });
    const orchestrator = tasks.find((t) => t.agentType === "orchestrator");
    if (orchestrator) return String((orchestrator as any)._id);
    const root = tasks.find((t) => (indeg.get(String((t as any)._id)) || 0) === 0);
    return root ? String((root as any)._id) : (tasks[0] ? String((tasks[0] as any)._id) : "");
  }, [tasks, links]);

  const agentTreeNodes = useMemo<AgentTaskNode[]>(() => {
    const byId = new Map<string, TaskDoc>();
    tasks.forEach((t) => byId.set(String((t as any)._id), t));
    const children = new Map<string, string[]>();
    links.forEach((l) => {
      const s = String(l.sourceTaskId), t = String(l.targetTaskId);
      if (!children.has(s)) children.set(s, []);
      children.get(s)!.push(t);
    });
    const nodes: AgentTaskNode[] = [];
    if (!treeRootId) return nodes;
    const q: Array<{ id: string; parent: string | null; level: number }> = [
      { id: treeRootId, parent: null, level: 0 },
    ];
    const seen = new Set<string>();
    while (q.length) {
      const { id, parent, level } = q.shift()!;
      if (seen.has(id)) continue;
      seen.add(id);
      const t = byId.get(id);
      if (!t) continue;
      const agentType = (level === 0 ? "orchestrator" : level === 1 ? "main" : "leaf") as AgentTaskNode["agentType"];
      nodes.push({
        id,
        parentId: parent,
        name: t.name || `Task ${id}`,
        agentType,
        startOffsetMs: Number(t.startOffsetMs || 0),
        durationMs: Number(t.durationMs || 0),
        status: (t.status as any) || "pending",
      });
      const kids = children.get(id) || [];
      for (const cid of kids) {
        const nextLevel = Math.min(level + 1, 2);
        q.push({ id: String(cid), parent: id, level: nextLevel });
      }
    }

    // Fallback: if no explicit main children of root found via links, attach all tasks typed as "main" under root.
    const hasMainUnderRoot = nodes.some((n) => n.parentId === treeRootId && n.agentType === "main");
    if (!hasMainUnderRoot) {
      const existing = new Set(nodes.map((n) => n.id));
      for (const t of tasks) {
        const ty = String((t.agentType || (t as any).type || "")).toLowerCase();
        if (ty === "main") {
          const id = String((t as any)._id);
          if (!existing.has(id)) {
            nodes.push({
              id,
              parentId: treeRootId,
              name: t.name || `Task ${id}`,
              agentType: "main",
              startOffsetMs: Number(t.startOffsetMs || 0),
              durationMs: Number(t.durationMs || 0),
              status: (t.status as any) || "pending",
            });
            existing.add(id);
          }
        }
      }
    }

    // Fallback: attach leaves by parentId under their main if missing
    {
      const existing = new Set(nodes.map((n) => n.id));
      const mains = new Set(nodes.filter((n)=> n.agentType === "main").map((n)=> n.id));
      for (const t of tasks) {
        const ty = String((t.agentType || (t as any).type || "")).toLowerCase();
        if (ty === "leaf") {
          const id = String((t as any)._id);
          if (existing.has(id)) continue;
          const pid = t.parentId ? String(t.parentId) : null;
          if (pid && mains.has(pid)) {
            nodes.push({
              id,
              parentId: pid,
              name: t.name || `Task ${id}`,
              agentType: "leaf",
              startOffsetMs: Number(t.startOffsetMs || 0),
              durationMs: Number(t.durationMs || 0),
              status: (t.status as any) || "pending",
            });
            existing.add(id);
          }
        }
      }
    }

    return nodes;
  }, [tasks, links, treeRootId]);

  const { windowStartMs, windowMs } = useMemo(() => {
    const offsets = tasks.map((t) => Math.max(0, Number(t.startOffsetMs || 0)));
    const durations = tasks.map((t) => Math.max(0, Number(t.durationMs || 0)));
    const minStart = offsets.length ? Math.min(...offsets) : 0;
    const maxEnd = offsets.length ? Math.max(...offsets.map((o, i) => o + (durations[i] || 0))) : 600000;
    let start = 0; let total = 600000;
    if (windowMode === WindowMode.Fit) {
      const span = Math.max(1, maxEnd - minStart); const pad = Math.round(span * 0.1);
      start = Math.max(0, minStart - pad); total = Math.max(1, span + pad * 2);
    } else if (windowMode === WindowMode.CenterNow) {
      const nowOffset = Math.max(0, Date.now() - baseStartMs); total = 600000; start = Math.max(0, Math.round(nowOffset - total / 2));
    } else { start = 0; total = 600000; }
    return { windowStartMs: start, windowMs: total };
  }, [tasks, windowMode, baseStartMs]);

  const pct = (t: TaskDoc) => {
    const left = Math.max(0, (Number(t.startOffsetMs || 0) - windowStartMs) / Math.max(1, windowMs));
    const width = Math.max(0, Number(t.durationMs || 0) / Math.max(1, windowMs));
    return { left: `${Math.max(0, Math.min(100, left * 100))}%`, width: `${Math.max(0, Math.min(100, width * 100))}%` };
  };

  // Build simple hierarchy from links
  const children = useMemo(() => {
    const m = new Map<string, string[]>();
    links.forEach((l) => {
      const s = String(l.sourceTaskId), t = String(l.targetTaskId);
      if (!m.has(s)) m.set(s, []); m.get(s)!.push(t);
    });
    return m;
  }, [links]);
  const parents = useMemo(() => {
    const m = new Map<string, string>();
    links.forEach((l) => { m.set(String(l.targetTaskId), String(l.sourceTaskId)); });
    return m;
  }, [links]);

  const items = useMemo(() => tasks.map((t) => ({
    id: String((t as any)._id || t._id),
    title: t.name,
    status: (t.status as string) || "pending",
    output: (t.description as string) || "",
    raw: t,
  })), [tasks]);

  const handleNewTask = async () => {
    const name = window.prompt("Task name?")?.trim();
    if (!name) return;
    const durStr = window.prompt("Duration (seconds)?", "60") || "60";
    const durationMs = Math.max(1000, Number(durStr) * 1000);
    const lastEnd = items.reduce((m, t) => Math.max(m, Number(t.raw.startOffsetMs||0) + Number(t.raw.durationMs||0)), 0);
    try { await addTask({ timelineId, name, durationMs, startOffsetMs: lastEnd }); } catch (err) { alert((err as any)?.message ?? "Failed to add task"); }
  };

  const accept = (t: any) => updateTask({ taskId: (t.raw as any)._id, status: "complete", progress: 1 }).catch(console.error);
  const reject = (t: any) => updateTask({ taskId: (t.raw as any)._id, status: "paused" }).catch(console.error);

  // Mini timeline generation: three lanes based on agentType; highlight current card agent responsibility
  const renderMiniTimeline = (highlightId: string, highlightType?: string) => {
    const laneY = (ty: string) => ty === "orchestrator" ? 8 : ty === "main" ? 32 : 56;
    const palette = (ty: string) => ty === "orchestrator" ? { bg: "#6366F120", border: "#6366F155" } : ty === "main" ? { bg: "#16A34A25", border: "#16A34A55" } : { bg: "#F59E0B25", border: "#F59E0B55" };
    const tickCount = 10;
    const nowPct = Math.max(0, Math.min(100, (((Date.now() - baseStartMs) - windowStartMs) / Math.max(1, windowMs)) * 100));
    return (
      <div className="mini-timeline" aria-hidden>
        {/* ticks */}
        {Array.from({ length: tickCount + 1 }).map((_, i) => (
          <div key={`tick-${i}`} className="tick" style={{ left: `${(i / tickCount) * 100}%` }} />
        ))}
        {/* now line */}
        <div className="now-line" style={{ left: `${nowPct}%` }} />
        {tasks.map((tk) => {
          const ty = String((tk.agentType || (tk as any).type || "leaf")).toLowerCase();
          const pos = pct(tk);
          const isHighlight = String((tk as any)._id) === highlightId || (highlightType === "main" && isDescendant(highlightId, String((tk as any)._id)));
          const style: any = { left: pos.left, width: pos.width, background: palette(ty).bg, borderColor: palette(ty).border, opacity: isHighlight ? 1 : 0.45 };
          return (
            <div className="mini-agent-row" key={`mini-${(tk as any)._id}-${ty}`} style={{ top: laneY(ty) }}>
              <div className={`mini-execution-bar${isHighlight ? " highlight" : ""}`} style={style} />
            </div>
          );
        })}
      </div>
    );
  };

  const isDescendant = (ancestorId: string, nodeId: string) => {
    // Check if nodeId is in descendant subtree of ancestorId
    const stack = [...(children.get(ancestorId) || [])];
    const visited = new Set<string>();
    while (stack.length) {
      const n = stack.pop()!; if (visited.has(n)) continue; visited.add(n);
      if (n === nodeId) return true;
      const ch = children.get(n) || []; for (const c of ch) stack.push(c);
    }
    return false;
  };

  // Grouped layout data: orchestrator, mains, subs under mains
  const orchestrators = useMemo(() => tasks.filter((t) => String((t.agentType || (t as any).type || "")).toLowerCase() === "orchestrator"), [tasks]);
  const mains = useMemo(() => tasks.filter((t) => String((t.agentType || (t as any).type || "")).toLowerCase() === "main"), [tasks]);
  const leaves = useMemo(() => tasks.filter((t) => String((t.agentType || (t as any).type || "")).toLowerCase() !== "orchestrator" && String((t.agentType || (t as any).type || "")).toLowerCase() !== "main"), [tasks]);

  const groupSubs = (mainId: string) => {
    // collect descendants that are leaves
    const desc: string[] = [];
    const st = [...(children.get(mainId) || [])];
    const seen = new Set<string>();
    while (st.length) {
      const n = st.pop()!; if (seen.has(n)) continue; seen.add(n);
      const tk = tasks.find((t)=> String((t as any)._id) === n);
      if (tk && String((tk.agentType || (tk as any).type || "")).toLowerCase() === "leaf") desc.push(n);
      (children.get(n) || []).forEach((c)=> st.push(c));
    }
    return leaves.filter((l)=> desc.includes(String((l as any)._id)));
  };

  // UI rendering
  const renderCard = (t: any) => {
    const elapsedOrDurMs = Number((t.raw as any)?.elapsedMs ?? (t.raw as any)?.durationMs ?? 0);
    const seconds = Math.max(0, Math.round(elapsedOrDurMs / 1000));
    const idStr = String((t.raw as any)._id);
    const childCount = (children.get(idStr)?.length || 0);
    const progressVal = (typeof (t.raw as any)?.progress === 'number'
      ? Number((t.raw as any).progress)
      : ((t.raw as any)?.elapsedMs && (t.raw as any)?.durationMs
          ? Math.min(1, Number((t.raw as any).elapsedMs) / Math.max(1, Number((t.raw as any).durationMs)))
          : 0));
    const status = String(t.status || 'pending');
    const aria = `${t.title}. Status ${status}. Press Enter for full view, Space for scaffold or to open timeline.`;
    let clickTimer: any = null;
    const highlightType = String((t.raw.agentType || (t.raw as any).type || "")).toLowerCase();
    return (
      <div
        key={t.id}
        className="task-card relative overflow-hidden"
        role="button"
        tabIndex={0}
        aria-label={aria}
        onClick={(e) => { e.stopPropagation(); if (clickTimer) return; clickTimer = setTimeout(() => { try { window.location.hash = `#task-${encodeURIComponent(String((t.raw as any)._id))}`; } catch {} onViewTimeline?.(t.raw); clickTimer = null; }, 220); }}
        onDoubleClick={(e) => { e.stopPropagation(); if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; } onOpenFullView?.(t.raw); }}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onOpenFullView?.(t.raw); } if (e.key === ' ') { e.preventDefault(); onViewTimeline?.(t.raw); } }}
      >


        {/* Header */}
        <div className="task-header">
          <div className="task-title">
            <span className="task-icon">👤</span>
            <span className="truncate">{t.title}</span>
            <span className="agent-type-badge" title="Agent type">{String((t.raw.agentType || (t.raw as any).type || "auto")).toString()}</span>
          </div>
          <div className="task-meta">
            <div className="task-status"><div className={`status-dot ${status}`}></div><span className="capitalize">{status}</span></div>
            <span className="muted">~{seconds}s</span>
          </div>
        </div>

        {(() => {
          // Micro-gantt sparkline: concurrency density (predicted vs actual) for this card's subtree
          const binCount = 24;
          const pred: number[] = Array.from({ length: binCount }, () => 0);
          const act: number[] = Array.from({ length: binCount }, () => 0);
          const winStart = windowStartMs;
          const winMs = windowMs || 1;
          const addTaskToBins = (tk: any) => {
            const start = Number((tk as any).startOffsetMs || 0);
            const dur = Number((tk as any).durationMs || 0);
            const elapsed = Number((tk as any).elapsedMs ?? (typeof (tk as any).progress === 'number' ? (tk as any).progress * dur : 0));
            const end = start + dur;
            const endAct = start + Math.max(0, Math.min(dur, elapsed));
            const toBin = (ms: number) => Math.max(0, Math.min(binCount - 1, Math.floor(((ms - winStart) / winMs) * binCount)));
            const a = toBin(start);
            const b = toBin(end);
            const bAct = toBin(endAct);
            for (let i = a; i <= b; i++) pred[i] += 1;
            for (let i = a; i <= bAct; i++) act[i] += 1;
          };
          // Collect subtree tasks (self + descendants)
          const id = String((t.raw as any)._id);
          const collect = (root: string) => {
            const out: any[] = [];
            const q: string[] = [root];
            const seen = new Set<string>();
            while (q.length) {
              const cur = q.shift()!;
              if (seen.has(cur)) continue;
              seen.add(cur);
              const doc = tasks.find((x)=> String((x as any)._id) === cur);
              if (doc) out.push(doc);
              const kids = children.get(cur) || [];
              for (const k of kids) q.push(k);
            }
            return out;
          };
          const subtree = collect(id);
          subtree.forEach(addTaskToBins);
          const maxPred = Math.max(1, ...pred);
          return (
            <div className="sparkline my-1">
              <div className="relative h-7 w-full">
                {/* predicted layer */}
                <div className="absolute inset-0 flex items-end gap-[1px]">
                  {pred.map((v, i) => (
                    <div key={`p-${i}`} className="flex-1 bg-indigo-200/40" style={{ height: `${Math.round((v / maxPred) * 100)}%` }} />
                  ))}
                </div>
                {/* actual layer */}
                <div className="absolute inset-0 flex items-end gap-[1px] mix-blend-multiply">
                  {act.map((v, i) => (
                    <div key={`a-${i}`} className="flex-1 bg-indigo-600/50" style={{ height: `${Math.round((v / maxPred) * 100)}%` }} />
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {renderMiniTimeline(String((t.raw as any)._id), highlightType)}

        {/* Output preview */}
        <div className="task-output">
          <div className="task-output-label">Final Output</div>
          <pre>{(t.output as string) || "No output yet."}</pre>
        </div>


        {/* Per-agent lane legend */}
        <div className="mini-legend">
          <span><span className="dot orch" /> Orchestrator</span>
          <span><span className="dot main" /> Main</span>
          <span><span className="dot leaf" /> Leaf</span>
        </div>

        {/* Actions */}

        {/* Accessible action labels for tests and screen readers */}
        <div className="sr-only">Open Full View</div>
        <div className="sr-only">Open Timeline</div>

        <div className="sr-only">View Scaffold</div>

        <div className="task-actions">
          <div className="task-metrics">
            <div>⏱ <span className="metric-value">{seconds}s</span></div>
            <div>🤖 <span className="metric-value">{childCount}</span></div>
            <div>📊 <span className="metric-value">{Math.round(progressVal * 100)}%</span></div>
          </div>
          <div className="muted">View timeline • Full view</div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full overflow-auto bg-[var(--bg-secondary)]">
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Agent Tasks</h2>
            <p className="text-xs text-[var(--text-secondary)]">Cards + Hierarchy-aware layouts</p>
          </div>
          <div className="flex items-center gap-2">
            <select className="px-2 py-1 text-xs border rounded" value={layout} onChange={(e)=> persistLayout(e.target.value as TasksLayout)}>
              <option value={TasksLayout.Grid}>Grid</option>
              <option value={TasksLayout.Grouped}>Grouped</option>
              <option value={TasksLayout.Tree}>Tree</option>
              <option value={TasksLayout.Table}>Table</option>
            </select>
          </div>
        </div>

        {/* Centered prompt bar (parity with Timeline) */}
        <div className="mb-4 flex justify-center">
          <div className="timeline-controls flex items-center gap-2 p-1 border border-[var(--border-color)] rounded-lg shadow-sm bg-[var(--bg-primary)] text-sm w-full max-w-[720px]">
            <textarea
              placeholder="Ask AI to plan your week, find documents, etc... (Shift+Enter for newline, Enter to send)"
              rows={3}
              className="flex-grow bg-transparent outline-none text-sm px-2 py-1 text-[var(--text-primary)] placeholder-[var(--text-secondary)] resize-y min-h-[60px]"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!prompt.trim()) return;
                  try {
                    await startFromPrompt({ timelineId, prompt: prompt.trim(), provider: planner as any });
                    setPrompt("");
                    onViewTimeline?.(null);
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
                  setPrompt("");
                  onViewTimeline?.(null);
                } catch (err) {
                  console.error('Prompt plan failed', err);
                }
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-send w-5 h-5" aria-hidden="true"><path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"></path><path d="m21.854 2.147-10.94 10.939"></path></svg>
            </button>
          </div>
        </div>


        {layout === TasksLayout.Grid && (
          <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((t) => renderCard(t))}
            <button onClick={handleNewTask} className="min-h-[220px] border-2 border-dashed border-indigo-200 rounded-xl grid place-items-center bg-indigo-50/40 hover:bg-indigo-50 text-indigo-600">
              <div className="text-center">
                <div className="w-12 h-12 rounded-xl border border-indigo-200 grid place-items-center bg-white mx-auto mb-2 text-lg">+</div>
                <div className="text-sm font-semibold">New Task</div>
                <div className="text-xs text-indigo-500">Start a new agent job</div>
              </div>
            </button>
          </div>
        )}

        {layout === TasksLayout.Grouped && (
          <div>
            {/* Orchestrator full-width */}
            {orchestrators.map((o) => {
              const it = items.find((i)=> i.id === String((o as any)._id));
              return (
                <div key={`orc-${(o as any)._id}`} className="orchestrator-section mb-8">
                  {it && renderCard(it)}
                </div>
              );
            })}

            {/* Main agents grouped with their leaves */}
            {mains.map((m) => {
              const mid = String((m as any)._id);
              const header = (
                <div className="group-header flex items-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-[var(--border-color)]"></div>
                  <span className="text-sm font-semibold text-[var(--text-secondary)]">{m.name}</span>
                  <div className="h-px flex-1 bg-[var(--border-color)]"></div>
                </div>
              );
              const mainItem = items.find((i)=> i.id === mid);
              const subs = groupSubs(mid).map((s)=> items.find((i)=> i.id === String((s as any)._id))).filter(Boolean) as any[];
              return (
                <div key={`grp-${mid}`} className="agent-group mb-8">
                  {header}
                  {mainItem && <div className="main-agent-card mb-3">{renderCard(mainItem)}</div>}
                  <div className="sub-agents-grid pl-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {subs.map((it)=> <div key={`sub-${it.id}`}>{renderCard(it)}</div>)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {layout === TasksLayout.Table && (
          <div className="overflow-auto border border-[var(--border-color)] rounded-md">
            <table className="min-w-full text-xs">
              <thead className="bg-[var(--bg-primary)] text-[var(--text-secondary)]">
                <tr>
                  <th className="text-left px-3 py-2 border-b">Agent</th>
                  <th className="text-left px-3 py-2 border-b">Start</th>
                  <th className="text-left px-3 py-2 border-b">Duration</th>
                  <th className="text-left px-3 py-2 border-b">ETA</th>
                  <th className="text-left px-3 py-2 border-b">State</th>
                  <th className="text-left px-3 py-2 border-b">Progress</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const raw: any = it.raw;
                  const left = Math.max(0, (Number(raw.startOffsetMs || 0) - windowStartMs) / Math.max(1, windowMs));
                  const width = Math.max(0, Number(raw.durationMs || 0) / Math.max(1, windowMs));
                  const dur = Number(raw.durationMs || 0);
                  const elapsed = Number(raw.elapsedMs ?? (typeof raw.progress === 'number' ? raw.progress * dur : 0));
                  const etaSec = Math.max(0, Math.ceil((dur - elapsed)/1000));
                  const progressPct = Math.round((typeof raw.progress === 'number' ? raw.progress : (dur>0? elapsed/dur : 0)) * 100);
                  return (
                    <tr key={`row-${it.id}`} className="odd:bg-white even:bg-[var(--bg-secondary)]">
                      <td className="px-3 py-2 border-b">
                        <button className="underline hover:no-underline" onClick={() => onOpenFullView?.(raw)}>{it.title}</button>
                      </td>
                      <td className="px-3 py-2 border-b">{Math.round((Number(raw.startOffsetMs||0))/1000)}s</td>
                      <td className="px-3 py-2 border-b">{Math.round(dur/1000)}s</td>
                      <td className="px-3 py-2 border-b">{etaSec}s</td>
                      <td className="px-3 py-2 border-b capitalize">{String(it.status)}</td>
                      <td className="px-3 py-2 border-b">
                        <div className="relative h-3 w-40 border border-[var(--border-color)] rounded bg-[var(--bg-primary)] overflow-hidden">
                          <div className="absolute inset-y-0 left-0 bg-[var(--accent-primary)]/30" style={{ width: `${Math.min(100, Math.max(0, width*100))}%`, transform: `translateX(${Math.min(100, Math.max(0, left*100))}%)` }} />
                          <div className="absolute inset-y-0 left-0 bg-[var(--accent-primary)]/70" style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}


        {layout === TasksLayout.Tree && (
          <AgentTree
            nodes={agentTreeNodes}
            rootId={treeRootId}
            className="tree-controller"
            renderMini={(n) => renderMiniTimeline(n.id, n.agentType)}
          />
        )}
      </div>
    </div>
  );
}

function TreeView({ tasks, links, renderCard, expandAll, expandSignal, onRootToggle }: { tasks: TaskDoc[]; links: LinkDoc[]; renderCard: (t: any)=> JSX.Element; expandAll?: "expand" | "collapse" | null; expandSignal?: number; onRootToggle?: (mode: "expand" | "collapse") => void; }) {
  const children = useMemo(() => {
    const m = new Map<string, string[]>();
    links.forEach((l) => { const s = String(l.sourceTaskId), t = String(l.targetTaskId); if (!m.has(s)) m.set(s, []); m.get(s)!.push(t); });
    return m;
  }, [links]);
  const indeg = useMemo(() => {
    const d = new Map<string, number>();
    tasks.forEach((t)=> d.set(String((t as any)._id), 0));
    links.forEach((l)=> d.set(String(l.targetTaskId), (d.get(String(l.targetTaskId))||0)+1));
    return d;
  }, [tasks, links]);
  const roots = useMemo(()=> tasks.filter((t)=> (indeg.get(String((t as any)._id))||0)===0), [tasks, indeg]);

  return (
    <div className="tree-view">
      {roots.map((r)=> <TreeNode key={`root-${(r as any)._id}`} id={String((r as any)._id)} tasks={tasks} childrenMap={children} renderCard={renderCard} level={0} expandAll={expandAll} expandSignal={expandSignal} onRootToggle={onRootToggle} />)}
    </div>
  );
}

function TreeNode({ id, tasks, childrenMap, renderCard, level, expandAll, expandSignal, onRootToggle }: { id: string; tasks: TaskDoc[]; childrenMap: Map<string, string[]>; renderCard: (t: any)=> JSX.Element; level: number; expandAll?: "expand" | "collapse" | null; expandSignal?: number; onRootToggle?: (mode: "expand" | "collapse") => void; }) {
  const [open, setOpen] = useState(level < 1);
  useEffect(() => {
    if (expandAll === "expand") setOpen(true);
    if (expandAll === "collapse") setOpen(false);
  }, [expandAll, expandSignal]);
  const t = tasks.find((x)=> String((x as any)._id) === id);
  if (!t) return null;
  const item = { id, title: t.name, status: t.status || "pending", output: t.description || "", raw: t };
  const kids = childrenMap.get(id) || [];
  return (
    <div className={`tree-node ${level===0? 'root' : level===1? 'main' : 'leaf'}`} style={{ marginLeft: level > 0 ? level * 8 : 0 }}>
      <div className="node-header flex items-center gap-2">
        {kids.length>0 && (
          <button className="expand-btn text-xs px-2 py-0.5 border rounded" onClick={()=> { const next = !open; setOpen(next); if (level === 0 && typeof onRootToggle === 'function') onRootToggle(next ? "expand" : "collapse"); }}>{open? '▼' : '▶'}</button>
        )}
        <div className="task-card-inline flex-1">{renderCard(item)}</div>
      </div>
      {open && kids.length>0 && (
        <div className="tree-children pl-6 border-l border-[var(--border-color)] ml-3 mt-2 flex flex-col gap-3">
          {kids.map((cid)=> <TreeNode key={`node-${cid}`} id={cid} tasks={tasks} childrenMap={childrenMap} renderCard={renderCard} level={level+1} expandAll={expandAll} expandSignal={expandSignal} />)}
        </div>
      )}
    </div>
  );
}
