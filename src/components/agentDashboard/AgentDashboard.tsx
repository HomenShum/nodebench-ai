import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useConvex } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { AgentTimeline } from "@/components/agentDashboard/AgentTimeline";
import { AgentTasks } from "@/components/agentDashboard/AgentTasks";
import "@/styles/agentDashboard.css";
import { AgentWindowProvider } from "./AgentWindowContext";

export type AgentDashboardTab = "timeline" | "tasks";

export function AgentDashboard() {
  const [tab, setTab] = useState<AgentDashboardTab>("tasks");
  const timelines = useQuery(api.agentTimelines.listForUser, {}) as Array<{
    timelineId: Id<"agentTimelines">; documentId: Id<"documents">; title: string; updatedAt: number;
  }> | undefined;
  const sorted = useMemo(() => (timelines ?? []).slice().sort((a, b) => b.updatedAt - a.updatedAt), [timelines]);
  const [selectedId, setSelectedId] = useState<Id<"agentTimelines"> | null>(null);
  const selectedTimelineId = selectedId ?? (sorted[0]?.timelineId ?? null);

  // Deep-link: allow hash #calendar/agents?timeline=<id> and custom event 'agents:openTimeline'
  useEffect(() => {
    function trySelectFromHash() {
      try {
        const h = window.location.hash || "";
        if (!h.startsWith("#calendar/agents")) return;
        const qIndex = h.indexOf("?");
        if (qIndex === -1) return;
        const search = new URLSearchParams(h.slice(qIndex + 1));
        const tl = search.get("timeline");
        if (tl) {
          setSelectedId(tl as unknown as Id<"agentTimelines">);
          setTab("timeline");
        }
      } catch {}
    }
    const onHash = () => trySelectFromHash();
    window.addEventListener("hashchange", onHash);
    trySelectFromHash();

    const onOpen = (e: Event) => {
      const ev = e as CustomEvent<{ timelineId?: string }>;
      const tl = ev.detail?.timelineId;
      if (tl) {
        setSelectedId(tl as unknown as Id<"agentTimelines">);
        setTab("timeline");
        try {
          const base = "#calendar/agents";
          const hash = `${base}?timeline=${encodeURIComponent(tl)}`;
          if (window.location.hash !== hash) window.location.hash = hash;
        } catch {}
      }
    };
    window.addEventListener("agents:openTimeline", onOpen as EventListener);
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("agents:openTimeline", onOpen as EventListener);
    };
  }, [setSelectedId, setTab]);



  const convex = useConvex();
  const createDoc = useMutation(api.documents.create);
  const createTimeline = useMutation(api.agentTimelines.createForDocument);
  const updateTask = useMutation(api.agentTimelines.updateTaskMetrics);

  // Global actions from popovers/buttons (depends on updateTask)
  useEffect(() => {
    const onAction = async (e: Event) => {
      const ev = e as CustomEvent<{ action: string; task: any }>;
      const { action, task } = ev.detail || ({} as any);
      if (!task || !task._id) return;
      try {
        if (action === 'pause') await updateTask({ taskId: task._id, status: 'paused' } as any);
        if (action === 'resume') await updateTask({ taskId: task._id, status: 'running', startedAtMs: Date.now() } as any);
        if (action === 'rerun') await updateTask({ taskId: task._id, status: 'running', progress: 0, startedAtMs: Date.now(), elapsedMs: 0 } as any);
      } catch (err) {
        console.error('Task action failed', err);
      }
    };
    const onOpenFullView = (e: Event) => {
      const ev = e as CustomEvent<{ task: any }>;
      const t = ev.detail?.task;
      if (t) setFullViewTask(t);
    };
    window.addEventListener('agents:taskAction', onAction as EventListener);
    window.addEventListener('agents:openFullView', onOpenFullView as EventListener);
    return () => {
      window.removeEventListener('agents:taskAction', onAction as EventListener);
      window.removeEventListener('agents:openFullView', onOpenFullView as EventListener);
    };
  }, [updateTask]);


  const [fullViewTask, setFullViewTask] = useState<any | null>(null);

  const handleCreateTimeline = async () => {
    try {
      const docId = await createDoc({ title: "Agents Hub Timeline", parentId: undefined, content: [] as any });
      const tlId = await createTimeline({ documentId: docId as Id<"documents">, name: "Agents Hub" });
      setSelectedId(tlId as Id<"agentTimelines">);
      // Hash deep-link for agents view remains
      try { window.location.hash = "#calendar/agents"; } catch {}
    } catch (err) {
      console.error(err);
      alert((err as any)?.message ?? "Failed to create timeline");
    }
  };

  return (
    <div className="agent-dashboard h-full w-full flex flex-col">
      {/* Header */}
      <div className="bg-[var(--bg-primary)] border-b border-[var(--border-color)] px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent-primary)] to-indigo-500 text-white flex items-center justify-center shadow">
            <span className="text-sm font-semibold">A</span>
          </div>
          <div>
            <div className="text-sm font-semibold text-[var(--text-primary)]">Multi-Agent Research</div>
            <div className="text-xs text-[var(--text-secondary)]">Timeline & Tasks</div>
          </div>
          {/* Timeline selector */}
          <div className="ml-3 inline-flex items-center gap-2">
            <select
              className="text-xs px-2 py-1 rounded-md border border-[var(--border-color)] bg-white"
              value={selectedTimelineId ?? ""}
              onChange={(e) => setSelectedId(e.target.value as unknown as Id<"agentTimelines">)}
            >
              {sorted.map((t) => (
                <option key={String(t.timelineId)} value={String(t.timelineId)}>{t.title}</option>
              ))}
            </select>
            <button
              className="px-2 py-1 text-xs rounded-md border bg-[var(--bg-primary)] border-[var(--border-color)] hover:bg-[var(--bg-hover)]"
              onClick={handleCreateTimeline}
            >
              New Timeline
            </button>
          </div>
        </div>
        <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
          <button
            className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${tab === "tasks" ? "bg-white text-[var(--text-primary)] border-[var(--border-color)] shadow-sm" : "text-[var(--text-secondary)] border-transparent hover:bg-white/50"}`}
            onClick={() => setTab("tasks")}
          >
            Tasks
          </button>
          <button
            className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${tab === "timeline" ? "bg-white text-[var(--text-primary)] border-[var(--border-color)] shadow-sm" : "text-[var(--text-secondary)] border-transparent hover:bg-white/50"}`}
            onClick={() => setTab("timeline")}
          >
            Timeline
          </button>
        </div>
      </div>

      {/* Body */}
      <AgentWindowProvider>
        <div className="flex-1 min-h-0">
          {selectedTimelineId ? (
            tab === "timeline" ? (
              <AgentTimeline timelineId={selectedTimelineId} documentId={sorted.find(t => t.timelineId === selectedTimelineId)?.documentId as Id<'documents'> | undefined} />
            ) : (
              <AgentTasks
                timelineId={selectedTimelineId}
                onOpenFullView={setFullViewTask}
                onViewTimeline={() => setTab("timeline")}
              />
            )
          ) : (
            <div className="p-6 text-sm text-[var(--text-secondary)]">No timelines yet. Create one to get started.</div>
          )}
        </div>
      </AgentWindowProvider>

      {/* Bottom Full View panel */}
      {fullViewTask && (
        <div className="fixed left-0 right-0 bottom-0 bg-white border-t border-[var(--border-color)] shadow-[0_-12px_40px_rgba(15,23,42,0.15)] z-20">
          <div className="max-w-6xl mx-auto">
            <div className="px-4 py-3 border-b border-[var(--border-color)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">\ud83d\udcca</span>
                <div className="text-sm font-semibold">{fullViewTask.name || fullViewTask.title || "Task"}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="text-xs px-2 py-1 rounded-md border border-[var(--border-color)] hover:bg-[var(--bg-hover)]"
                  onClick={async () => {
                    const assigneeId = window.prompt("Assign to user id:")?.trim();
                    if (!assigneeId) return;
                    try { await updateTask({ taskId: fullViewTask._id, assigneeId }); } catch (e) { console.error(e); }
                  }}
                >Assign</button>
                <button
                  className="text-xs px-2 py-1 rounded-md border border-[var(--border-color)] hover:bg-[var(--bg-hover)]"
                  onClick={async () => {
                    try { await updateTask({ taskId: fullViewTask._id, status: "running", progress: 0, startedAtMs: Date.now() }); } catch (e) { console.error(e); }
                  }}
                >Re-run</button>
                <button
                  className="text-xs px-2 py-1 rounded-md border border-[var(--border-color)] hover:bg-[var(--bg-hover)]"
                  onClick={() => {
                    const text = String((fullViewTask.description as string) || (fullViewTask.output as string) || "");
                    const blob = new Blob([text], { type: "application/json;charset=utf-8" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${(fullViewTask.name || fullViewTask.title || "task").toString().replace(/\s+/g, "_")}.json`;
                    document.body.appendChild(a);
                    a.click();
                    setTimeout(() => {
                      URL.revokeObjectURL(url);
                      a.remove();
                    }, 0);
                  }}
                >Download</button>
                <button className="text-xs px-2 py-1 rounded-md border border-[var(--border-color)]" onClick={() => setFullViewTask(null)}>Close</button>
              </div>
            </div>
            <div className="px-4 py-4 grid gap-4" style={{ gridTemplateColumns: "1fr 420px" }}>
              <div className="min-h-[220px] overflow-auto border border-[var(--border-color)] rounded-md bg-[var(--bg-secondary)] p-3 text-xs whitespace-pre-wrap">
                {(fullViewTask.description as string) || (fullViewTask.output as string) || "No output yet."}
              </div>
              <aside className="border-l border-[var(--border-color)] pl-4">
                <div className="text-[10px] uppercase tracking-wide text-[var(--text-secondary)] mb-2">Final Output</div>
                <div className="border border-[var(--border-color)] rounded-md bg-[var(--bg-secondary)] p-3 text-xs whitespace-pre-wrap overflow-auto max-h-[240px]">
                  {(fullViewTask.description as string) || (fullViewTask.output as string) || "{}"}
                </div>
              </aside>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

