import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useConvex } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { AgentTimeline } from "@/components/agentDashboard/AgentTimeline";
import { AgentTasks } from "@/components/agentDashboard/AgentTasks";
import { AgentChats } from "@/components/agentDashboard/AgentChats";
import "@/styles/agentDashboard.css";
import { AgentWindowProvider } from "./AgentWindowContext";
import { PageHeroHeader } from "@/components/shared/PageHeroHeader";
import { PresetChip } from "@/components/shared/PresetChip";

export type AgentDashboardTab = "timeline" | "tasks" | "chat";

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
  const [isRunningTest, setIsRunningTest] = useState(false);

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
    window.addEventListener('agents:taskAction', onAction as EventListener);
    return () => {
      window.removeEventListener('agents:taskAction', onAction as EventListener);
    };
  }, [updateTask]);

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

  const handleRunVisualLLMTest = async () => {
    if (isRunningTest) return;

    try {
      setIsRunningTest(true);

      // Create a new timeline for the test
      const docId = await createDoc({
        title: "Visual LLM Validation Test",
        parentId: undefined,
        content: [] as any
      });
      const tlId = await createTimeline({
        documentId: docId as Id<"documents">,
        name: "Visual LLM Test"
      });

      // Switch to the new timeline and timeline tab
      setSelectedId(tlId as Id<"agentTimelines">);
      setTab("timeline");

      // Run the visual LLM validation workflow
      // Note: This calls an internal action, so we need to use the convex client
      await convex.action(api.agents.orchestrate.run, {
        documentId: docId as Id<"documents">,
        name: "Visual LLM Validation Test",
        taskSpec: {
          goal: "Visual LLM validation workflow: search for test images, validate and filter them, analyze with GPT-5-mini and Gemini 2.5 Flash using real vision APIs, compare results, and recommend best model",
          type: "orchestrate",
          topic: "Visual LLM Model Validation for VR Avatar Quality Assessment (GPT-5-mini vs Gemini 2.5 Flash)",
          graph: {
            nodes: [
              {
                id: "image_search",
                kind: "search",
                label: "Search VR Avatar Test Images",
                prompt: "VR avatars virtual reality characters full body 3D models hands feet eyes clothing",
              },
              {
                id: "image_validation",
                kind: "custom",
                label: "Validate Image URLs",
                prompt: "{{channel:image_search.last}}",
              },
              {
                id: "image_filtering",
                kind: "custom",
                label: "Filter Valid Images",
                prompt: "{{channel:image_validation.last}}",
              },
              {
                id: "vision_analysis",
                kind: "custom",
                label: "Parallel Vision Analysis (GPT-5-mini + Gemini 2.5 Flash)",
                prompt: "{{channel:image_filtering.last}}",
              },
              {
                id: "statistical_analysis",
                kind: "custom",
                label: "Statistical Analysis & Aggregation",
                prompt: "{{channel:vision_analysis.last}}",
              },
              {
                id: "visualization",
                kind: "custom",
                label: "Generate Plotly Visualizations",
                prompt: "{{channel:statistical_analysis.last}}",
              },
              {
                id: "model_comparison",
                kind: "structured",
                label: "Model Performance Comparison",
                prompt: "Based on statistical analysis {{channel:statistical_analysis.last}} and visualizations {{channel:visualization.last}}, compare GPT-5-mini vs Gemini 2.5 Flash.",
              },
              {
                id: "prompt_optimization",
                kind: "answer",
                label: "Enhanced Prompt Generation",
                prompt: "Based on model comparison {{channel:model_comparison.last}}, generate enhanced prompts to improve GPT-5-mini and Gemini 2.5 Flash performance.",
              },
              {
                id: "eval_quality",
                kind: "eval",
                label: "Quality Check & Follow-up",
                prompt: "Evaluate the completeness of the analysis. Check if all steps completed successfully.",
              },
            ],
            edges: [
              { from: "image_search", to: "image_validation" },
              { from: "image_validation", to: "image_filtering" },
              { from: "image_filtering", to: "vision_analysis" },
              { from: "vision_analysis", to: "statistical_analysis" },
              { from: "statistical_analysis", to: "visualization" },
              { from: "visualization", to: "model_comparison" },
              { from: "model_comparison", to: "prompt_optimization" },
              { from: "prompt_optimization", to: "eval_quality" },
            ],
          },
        },
      });

      // Success notification
      alert("Visual LLM validation test started! Check the Timeline tab for progress.");
    } catch (err) {
      console.error("Failed to run Visual LLM test:", err);
      alert((err as any)?.message ?? "Failed to run Visual LLM test. Make sure API keys are configured.");
    } finally {
      setIsRunningTest(false);
    }
  };

  return (
    <div className="agent-dashboard h-full w-full flex flex-col">
      {/* Page Hero Header with Presets */}
      <PageHeroHeader
        icon={"🤖"}
        title={"Agents Hub"}
        date={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        presets={
          <>
            <span className="text-xs text-gray-500 mr-2">
              Presets:
            </span>

            <PresetChip>Research Mode</PresetChip>

            <PresetChip>Code Review</PresetChip>

            <PresetChip>Data Analysis</PresetChip>
          </>
        }
      />

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
            <button
              className={`px-3 py-1 text-xs rounded-md border font-medium transition-colors ${
                isRunningTest
                  ? "bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed"
                  : "bg-gradient-to-r from-purple-500 to-indigo-500 text-white border-transparent hover:from-purple-600 hover:to-indigo-600 shadow-sm"
              }`}
              onClick={handleRunVisualLLMTest}
              disabled={isRunningTest}
              title="Run Visual LLM validation test with GPT-5-mini and Gemini 2.5 Flash"
            >
              {isRunningTest ? (
                <>
                  <span className="inline-block animate-spin mr-1">⏳</span>
                  Running Test...
                </>
              ) : (
                <>
                  🧪 Run Visual LLM Test
                </>
              )}
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
          <button
            className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${tab === "chat" ? "bg-white text-[var(--text-primary)] border-[var(--border-color)] shadow-sm" : "text-[var(--text-secondary)] border-transparent hover:bg-white/50"}`}
            onClick={() => setTab("chat")}
          >
            Chat
          </button>
        </div>
      </div>

      {/* Body */}
      <AgentWindowProvider>
        <div className="flex-1 min-h-0">
          {selectedTimelineId ? (
            <>
              {/* Timeline Tab - Keep mounted, hide with CSS to prevent editor reappending */}
              <div style={{ display: tab === "timeline" ? "block" : "none" }} className="h-full">
                <AgentTimeline
                  timelineId={selectedTimelineId}
                  documentId={sorted.find(t => t.timelineId === selectedTimelineId)?.documentId as Id<'documents'> | undefined}
                />
              </div>

              {/* Chat Tab - Keep mounted, hide with CSS */}
              <div style={{ display: tab === "chat" ? "block" : "none" }} className="h-full">
                <AgentChats />
              </div>

              {/* Tasks Tab - Keep mounted, hide with CSS */}
              <div style={{ display: tab === "tasks" ? "block" : "none" }} className="h-full">
                <AgentTasks
                  timelineId={selectedTimelineId}
                  onViewTimeline={() => setTab("timeline")}
                />
              </div>
            </>
          ) : (
            tab === "chat" ? (
              <AgentChats />
            ) : (
              <div className="p-6 text-sm text-[var(--text-secondary)]">No timelines yet. Create one to get started.</div>
            )
          )}
        </div>
      </AgentWindowProvider>


    </div>
  );
}

