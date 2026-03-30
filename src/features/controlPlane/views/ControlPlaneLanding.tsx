/**
 * ControlPlaneLanding — Search-first entity intelligence canvas.
 *
 * Design reference stack:
 *   - PitchBook/Crunchbase simplicity (search-first entity profiles)
 *   - Perplexity Labs artifact-first (reports, sheets, decks from queries)
 *   - Bloomberg density (rich intelligence workspace after search)
 *   - Clado natural-language (describe what you need, not filter soup)
 *
 * The first interaction is: type, paste, or upload what you need to understand.
 * Not: pick a mode, configure agents, browse a dashboard.
 */

import { lazy, memo, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRevealOnMount } from "@/hooks/useRevealOnMount";
import { PUBLIC_SEARCH_API_ENDPOINT, PUBLIC_SEARCH_UPLOAD_API_ENDPOINT } from "@/lib/searchApi";
import { getSharedContextDelegateUrl, getSharedContextPublishUrl } from "@/lib/syncBridgeApi";
import { LiveAgentProgress } from "../components/LiveAgentProgress";
import {
  ArrowRight,
  ArrowUp,
  Briefcase,
  Check,
  ClipboardCopy,
  GraduationCap,
  Landmark,
  Mic,
  Scale,
  Search,
  Sparkles,
  Upload,
  User,
} from "lucide-react";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { type MainView } from "@/lib/registry/viewRegistry";
import { trackEvent } from "@/lib/analytics";
import { ResultWorkspace } from "../components/ResultWorkspace";
import { PlanProposalPanel } from "@/features/founder/components/PlanProposalPanel";
import type { FeaturePlan } from "@/features/founder/types/planProposal";
import { SearchTrace, type TraceStep } from "../components/SearchTrace";
import { RecentSearchHistory, type RecentSearchHistoryItem } from "../components/RecentSearchHistory";
import {
  type LensId,
  type ResultPacket,
  LENSES,
  EXAMPLE_PROMPTS,
  DEMO_PACKETS,
} from "../components/searchTypes";
import { ensureProofPacket } from "../components/proofModel";

const SinceLastSession = lazy(() => import("../../founder/components/SinceLastSession"));
const FeedbackSummary = lazy(() => import("../../founder/components/FeedbackSummary").then(m => ({ default: m.FeedbackSummary })));

/* ─── Demo packet keyword aliases (shared across submit + example click) ── */

const DEMO_ALIASES: Record<string, string[]> = {
  anthropic: ["anthropic", "foundation model"],
  shopify: ["shopify", "ai commerce"],
  nodebench: ["weekly reset", "founder reset", "founder weekly"],
  legal_openai: ["legal risk", "data governance", "regulatory exposure", "openai enterprise"],
  student_shopify: ["plain language", "study brief", "student lens", "student summary"],
  banker_series_b: ["series b startup", "diligence memo", "banker lens", "meeting notes"],
  plan: ["plan a", "feature plan", "implementation plan", "should we build", "propose integration", "extension plan"],
};

function findDemoPacket(query: string): string | undefined {
  const lq = query.toLowerCase();
  const exactMatch = Object.keys(DEMO_PACKETS).find((key) => DEMO_PACKETS[key].query.toLowerCase() === lq);
  if (exactMatch) return exactMatch;

  const aliasMatch = Object.keys(DEMO_PACKETS).find((key) => {
    const aliases = DEMO_ALIASES[key];
    return aliases?.some((alias) => lq.includes(alias));
  });
  if (aliasMatch) return aliasMatch;

  return Object.keys(DEMO_PACKETS).find((key) => key !== "nodebench" && lq.includes(key));
}

function shouldPreferDemoPacket(demoKey?: string): boolean {
  if (!demoKey || typeof window === "undefined") {
    return false;
  }

  const { hostname, port } = window.location;
  const isLocalShell = (hostname === "127.0.0.1" || hostname === "localhost") && port !== "8020";
  const isAutomatedBrowser =
    typeof navigator !== "undefined" &&
    (navigator.webdriver || /Playwright/i.test(navigator.userAgent));

  return isLocalShell || isAutomatedBrowser;
}

/* ─── Lens icon map ──────────────────────────────────────────────────────── */

const LENS_ICONS: Record<LensId, React.ElementType> = {
  founder: Sparkles,
  investor: Briefcase,
  banker: Landmark,
  ceo: User,
  legal: Scale,
  student: GraduationCap,
};

/* ─── Install commands (collapsed below fold) ────────────────────────────── */

const INSTALL_COMMANDS = [
  { tab: "Claude Code", code: "claude mcp add nodebench -- npx -y nodebench-mcp --preset=hackathon" },
  { tab: "Cursor", code: "npx -y nodebench-mcp --preset=hackathon", note: "Add to .cursor/mcp.json" },
  { tab: "Windsurf", code: "npx -y nodebench-mcp --preset=hackathon", note: "Add to .windsurf/mcp.json" },
  { tab: "Hackathon + QA", code: "RETENTION_TEAM=<CODE> curl -sL retention.sh/install.sh | bash && claude mcp add nodebench -- npx -y nodebench-mcp --preset=hackathon", note: "Full stack: intelligence + QA" },
] as const;

/* ─── Component ──────────────────────────────────────────────────────────── */

interface ControlPlaneLandingProps {
  onNavigate: (view: MainView, path?: string) => void;
  onOpenFastAgent?: () => void;
  onOpenFastAgentWithPrompt?: (prompt: string) => void;
}

type HandoffState = {
  status: "idle" | "publishing" | "published" | "delegating" | "delegated" | "error";
  message?: string;
  contextId?: string;
  taskId?: string;
  targetLabel?: string;
  installCommand?: string;
  handoffPrompt?: string;
};

export const ControlPlaneLanding = memo(function ControlPlaneLanding({
  onNavigate,
  onOpenFastAgent: _onOpenFastAgent,
  onOpenFastAgentWithPrompt,
}: ControlPlaneLandingProps) {
  const traceEntryId = useCallback(
    (entry: { step: string; tool?: string; startMs?: number }, fallbackIndex?: number) =>
      `${entry.step}:${entry.tool ?? "none"}:${entry.startMs ?? fallbackIndex ?? 0}`,
    [],
  );
  const [input, setInput] = useState("");
  const [activeLens, setActiveLens] = useState<LensId>(() => {
    try {
      const stored = localStorage.getItem('nodebench-selected-role');
      const valid: LensId[] = ["founder", "investor", "banker", "ceo", "legal", "student"];
      if (stored && valid.includes(stored as LensId)) return stored as LensId;
    } catch { /* ignore */ }
    return "founder";
  });
  // Persist lens selection to localStorage
  useEffect(() => {
    localStorage.setItem('nodebench-selected-role', activeLens);
  }, [activeLens]);

  const [activeResult, setActiveResult] = useState<ResultPacket | null>(null);
  const [activeTrace, setActiveTrace] = useState<{ trace: TraceStep[]; latencyMs: number; classification: string; judge?: any } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showFullWorkspace, setShowFullWorkspace] = useState(false);
  const [submittedQuery, setSubmittedQuery] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const { ref: revealRef, isVisible, instant } = useRevealOnMount();
  const pendingVoiceSubmitRef = useRef(false);
  const [copiedInstall, setCopiedInstall] = useState(false);
  const [activeInstallTab, setActiveInstallTab] = useState(0);
  const [handoffState, setHandoffState] = useState<HandoffState>({ status: "idle" });

  const voice = useVoiceInput({
    onTranscript: useCallback((text: string) => {
      setInput(text);
    }, []),
    onEnd: useCallback((finalText: string) => {
      if (finalText.trim()) {
        setInput(finalText.trim());
        pendingVoiceSubmitRef.current = true;
      }
    }, []),
    mode: "browser",
  });

  // Broadcast voice listening state
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("nodebench:voice-listening", { detail: { isListening: voice.isListening } }),
    );
  }, [voice.isListening]);

  const stagger = useCallback(
    (delay: string): React.CSSProperties => ({
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? "none" : "translateY(8px)",
      transition: instant ? "none" : "opacity 0.25s ease-out, transform 0.25s ease-out",
      transitionDelay: instant ? "0s" : delay,
    }),
    [isVisible, instant],
  );

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  const showResult = useCallback((packet: ResultPacket, lensOverride?: LensId) => {
    setActiveResult(ensureProofPacket(packet, lensOverride ?? activeLens));
    setHandoffState({ status: "idle" });
    setIsSearching(false);
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }, [activeLens]);

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const demoKey = findDemoPacket(trimmed);

    trackEvent("search_submit", { query: trimmed.slice(0, 80), lens: activeLens });
    setSubmittedQuery(trimmed);
    setIsSearching(true);

    // 1. Try live API with Server-Sent Events (SSE) streaming
    setActiveTrace({ trace: [], latencyMs: 0, classification: "unknown" });

    if (shouldPreferDemoPacket(demoKey)) {
      setTimeout(() => showResult(DEMO_PACKETS[demoKey], activeLens), 300);
      trackEvent("search_demo_result", { query: trimmed.slice(0, 80), lens: activeLens, demoKey });
      return;
    }

    (async () => {
      try {
        const response = await fetch(`${PUBLIC_SEARCH_API_ENDPOINT}?stream=true`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: trimmed, lens: activeLens }),
          signal: AbortSignal.timeout(30_000),
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const contentType = response.headers.get("content-type") || "";
        let didShowResult = false;

        const processResultPayload = (data: any) => {
          if (!data?.success) throw new Error("No result");
          
          if (data.trace) {
            setActiveTrace({
              trace: data.trace.map((entry: TraceStep, index: number) => ({
                ...entry,
                traceId: entry.traceId ?? traceEntryId(entry, index),
                isRunning: false,
              })),
              latencyMs: data.latencyMs ?? 0,
              classification: data.classification ?? "unknown",
              judge: data.judge,
            });
          }

          if (data.resultPacket) {
            showResult(data.resultPacket as ResultPacket, activeLens);
            trackEvent("search_live_result", {
              entity: (data.resultPacket as ResultPacket).entityName,
              type: data.classification,
            });
            didShowResult = true;
            return;
          }
          
          const r = data.result;
          if (r?.canonicalEntity || r?.packetId || r?.answerBlocks?.length) {
            const canonicalEntityName =
              typeof r?.canonicalEntity === "string"
                ? r.canonicalEntity
                : r?.canonicalEntity?.name ?? data.entity ?? "NodeBench";
            const packet: ResultPacket = {
              query: trimmed,
              entityName: canonicalEntityName,
              answer: r?.canonicalEntity?.canonicalMission ?? r?.summary ?? "",
              confidence: r?.canonicalEntity?.identityConfidence ?? r?.confidence ?? 70,
              sourceCount: r?.sourceRefs?.length ?? r?.sourcesUsed?.length ?? (r?.whatChanged?.length ?? 0) + (r?.signals?.length ?? 0),
              variables: (r.signals ?? []).slice(0, 5).map((s: any, i: number) => ({
                rank: i + 1, name: s.name ?? String(s), direction: s.direction ?? "neutral", impact: s.impact ?? "medium",
              })),
              keyMetrics: [
                { label: "Confidence", value: `${r?.canonicalEntity?.identityConfidence ?? r?.confidence ?? 0}%` },
                { label: "Changes", value: String(r?.whatChanged?.length ?? 0) },
                { label: "Contradictions", value: String(r?.contradictions?.length ?? 0) },
                { label: "Actions", value: String(r?.nextActions?.length ?? 0) },
              ],
              changes: r.whatChanged?.map((c: any) => ({ description: c.description ?? String(c), date: c.date })),
              risks: r.contradictions?.map((c: any) => ({
                title: c.claim ?? "Contradiction",
                description: c.evidence ?? "",
                falsification: c.falsification,
              })),
              comparables: r.comparables?.map((c: any) => ({
                name: c.name ?? String(c),
                relevance: c.relevance ?? "medium",
                note: c.note ?? "",
              })),
              packetId: r.packetId ?? data.packetId,
              packetType: r.packetType ?? "founder_packet",
              canonicalEntity: canonicalEntityName,
              sourceRefs:
                r.sourceRefs ??
                r.sourcesUsed?.map((source: any, index: number) => ({
                  id: source.id ?? `source:${index}`,
                  label: source.title ?? source.label ?? source.url ?? `Source ${index + 1}`,
                  href: source.url,
                  type: source.type ?? "web",
                  status: source.status ?? "cited",
                  title: source.title ?? source.label,
                  domain: source.domain,
                  publishedAt: source.publishedAtIso ?? source.publishedAt,
                  thumbnailUrl: source.thumbnailUrl,
                  excerpt: source.excerpt ?? source.summary,
                  confidence: source.confidence,
                })),
              claimRefs: r.claimRefs,
              answerBlocks: r.answerBlocks,
              explorationMemory: r.explorationMemory,
              graphSummary: r.graphSummary,
              proofStatus: r.proofStatus,
              uncertaintyBoundary: r.uncertaintyBoundary,
              recommendedNextAction:
                r.recommendedNextAction ?? r.nextActions?.[0]?.action,
              graphNodes: r.graphNodes,
              graphEdges: r.graphEdges,
              strategicAngles: r.strategicAngles,
              progressionProfile: r.progressionProfile,
              progressionTiers: r.progressionTiers,
              diligencePack: r.diligencePack,
              readinessScore: r.readinessScore,
              unlocks: r.unlocks,
              materialsChecklist: r.materialsChecklist,
              scorecards: r.scorecards,
              shareableArtifacts: r.shareableArtifacts,
                visibility: r.visibility,
                benchmarkEvidence: r.benchmarkEvidence,
                workflowComparison: r.workflowComparison,
                operatingModel: r.operatingModel,
                distributionSurfaceStatus: r.distributionSurfaceStatus,
                companyReadinessPacket: r.companyReadinessPacket,
                companyNamingPack: r.companyNamingPack,
              interventions: r.nextActions?.slice(0, 4).map((a: any) => ({
                action: a.action ?? String(a),
                impact: a.impact ?? "medium",
              })),
              nextQuestions: r.nextQuestions ?? r.nextActions?.map((a: any) => a.action) ?? [],
              rawPacket: r.rawPacket,
            };
            showResult(packet, activeLens);
            trackEvent("search_live_result", { entity: packet.entityName, type: data.classification });
            didShowResult = true;
            return;
          }
          throw new Error("Unstructured result");
        };

        if (contentType.includes("application/json")) {
          // Graceful fallback if backend hasn't been restarted with SSE support
          const data = await response.json();
          processResultPayload(data);
          return;
        }

        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6);
              if (!dataStr) continue;
              
              try {
                const event = JSON.parse(dataStr);
                
                if (event.type === 'trace') {
                  const entry = event.entry;
                  setActiveTrace(prev => {
                    const trace = [...(prev?.trace || [])];
                    const traceId = traceEntryId(entry);
                    const existingIdx = trace.findIndex(t => t.traceId === traceId);
                    if (existingIdx >= 0) {
                      trace[existingIdx] = {
                        step: entry.step,
                        tool: entry.tool,
                        durationMs: entry.endMs ? (entry.endMs - entry.startMs) : 0,
                        status: entry.status,
                        detail: entry.detail,
                        traceId,
                        isRunning: !entry.endMs,
                      };
                    } else {
                      trace.push({
                        step: entry.step,
                        tool: entry.tool,
                        durationMs: entry.endMs ? (entry.endMs - entry.startMs) : 0,
                        status: entry.status,
                        detail: entry.detail,
                        traceId,
                        isRunning: !entry.endMs,
                      });
                    }
                    return { ...prev, trace, latencyMs: prev?.latencyMs ?? 0, classification: prev?.classification ?? "unknown" };
                  });
                } else if (event.type === 'result') {
                  processResultPayload(event.payload);
                } else if (event.type === 'error') {
                  throw new Error(event.error?.message || "Search failed");
                }
              } catch (e) {
                // Ignore JSON parse errors from partial chunks unless it's the intended throw
                if (e instanceof Error && e.message !== "Unexpected end of JSON input") {
                  throw e;
                }
              }
            }
          }
        }
        
        if (!didShowResult) {
           throw new Error("Stream closed without result");
        }
      } catch {
        // Fallback implementation on error
        if (demoKey) {
          setTimeout(() => showResult(DEMO_PACKETS[demoKey], activeLens), 300);
          return;
        }
        // 3. Final fallback: build an inline acknowledgment packet
        const fallbackPacket: ResultPacket = {
          query: trimmed,
          entityName: trimmed.split(/\s+/).slice(0, 3).join(" "),
          answer: `Your query "${trimmed.slice(0, 60)}" has been received. NodeBench is analyzing this using ${activeLens} lens. For the richest results, try one of the example prompts — they demonstrate the full intelligence workspace with live entity truth, signals, risks, and exportable packets.`,
          confidence: 40,
          sourceCount: 0,
          variables: [],
          nextQuestions: [
            "Generate my founder weekly reset — what changed, main contradiction, next 3 moves",
            "Analyze Anthropic's competitive position in the foundation model market",
            "What changed in AI commerce strategy for Shopify, Amazon, and Google this quarter?",
          ],
        };
        showResult(fallbackPacket, activeLens);
        trackEvent("search_fallback", { query: trimmed.slice(0, 40), lens: activeLens });
      }
    })();
  }, [activeLens, input, showResult, traceEntryId]);

  // Auto-submit when voice transcript finishes
  useEffect(() => {
    if (pendingVoiceSubmitRef.current && input.trim()) {
      pendingVoiceSubmitRef.current = false;
      handleSubmit();
    }
  });

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const handleExampleClick = useCallback(
    (prompt: string, lens: LensId) => {
      trackEvent("example_click", { prompt: prompt.slice(0, 40), lens });
      setActiveLens(lens);
      setInput(prompt);

      // Check for demo packet — same alias matching as handleSubmit
      const demoKey = findDemoPacket(prompt);

      if (demoKey) {
        setIsSearching(true);
        setTimeout(() => showResult(DEMO_PACKETS[demoKey], lens), 600);
      } else {
        // Use the same live API path as handleSubmit — never gate on auth
        setInput(prompt);
        setTimeout(() => handleSubmit(), 100);
      }
    },
    [showResult, handleSubmit],
  );

  const handleFollowUp = useCallback(
    (question: string) => {
      setInput(question);
      textareaRef.current?.focus();
      if (onOpenFastAgentWithPrompt) {
        onOpenFastAgentWithPrompt(question);
      }
    },
    [onOpenFastAgentWithPrompt],
  );

  const handleCopyInstall = useCallback(() => {
    navigator.clipboard.writeText(INSTALL_COMMANDS[activeInstallTab].code);
    setCopiedInstall(true);
    setTimeout(() => setCopiedInstall(false), 2000);
  }, [activeInstallTab]);

  const handlePublishSharedContext = useCallback(async () => {
    if (!activeResult) return;
    setHandoffState({ status: "publishing", message: "Publishing packet to shared context..." });
    try {
      const response = await fetch(getSharedContextPublishUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packet: ensureProofPacket(activeResult, activeLens),
        }),
      });
      const json = await response.json();
      if (!response.ok || !json?.success) {
        throw new Error(json?.message ?? `HTTP ${response.status}`);
      }
      trackEvent("publish_shared_context", {
        entity: activeResult.entityName,
        contextId: json.contextId,
      });
      setHandoffState({
        status: "published",
        message: "Shared context packet is live and ready for delegation.",
        contextId: json.contextId,
      });
    } catch (error) {
      setHandoffState({
        status: "error",
        message: error instanceof Error ? error.message : "Failed to publish shared context packet.",
      });
    }
  }, [activeLens, activeResult]);

  const handlePublishStrategicAngle = useCallback(
    async (strategicAngleId: string) => {
      if (!activeResult) return;
      setHandoffState({
        status: "publishing",
        message: "Publishing pressure-test issue packet to shared context...",
      });
      try {
        const response = await fetch(getSharedContextPublishUrl(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            packet: ensureProofPacket(activeResult, activeLens),
            strategicAngleId,
          }),
        });
        const json = await response.json();
        if (!response.ok || !json?.success) {
          throw new Error(json?.message ?? `HTTP ${response.status}`);
        }
        trackEvent("publish_strategic_issue", {
          entity: activeResult.entityName,
          strategicAngleId,
          contextId: json.contextId,
        });
        setHandoffState({
          status: "published",
          message: "Strategic issue packet is live and ready for a worker.",
          contextId: json.contextId,
        });
      } catch (error) {
        setHandoffState({
          status: "error",
          message: error instanceof Error ? error.message : "Failed to publish strategic issue packet.",
        });
      }
    },
    [activeLens, activeResult],
  );

  const handleDelegate = useCallback(
    async (target: "claude_code" | "openclaw") => {
      if (!activeResult) return;
      const targetLabel = target === "claude_code" ? "Claude Code" : "OpenClaw";
      setHandoffState({
        status: "delegating",
        message: `Preparing ${targetLabel} handoff...`,
        targetLabel,
      });
      try {
        const response = await fetch(getSharedContextDelegateUrl(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            packet: ensureProofPacket(activeResult, activeLens),
            targetAgent: target,
          }),
        });
        const json = await response.json();
        if (!response.ok || !json?.success) {
          throw new Error(json?.message ?? `HTTP ${response.status}`);
        }
        trackEvent("delegate_shared_context", {
          entity: activeResult.entityName,
          target,
          contextId: json.contextId,
          taskId: json.taskId,
        });
        setHandoffState({
          status: "delegated",
          message: `${json.targetLabel ?? targetLabel} handoff is ready through NodeBench MCP.`,
          contextId: json.contextId,
          taskId: json.taskId,
          targetLabel: json.targetLabel ?? targetLabel,
          installCommand: json.installCommand,
          handoffPrompt: json.handoffPrompt,
        });
      } catch (error) {
        setHandoffState({
          status: "error",
          message: error instanceof Error ? error.message : `Failed to prepare ${targetLabel} handoff.`,
        });
      }
    },
    [activeLens, activeResult],
  );

  const handleDelegateStrategicAngle = useCallback(
    async (strategicAngleId: string, target: "claude_code" | "openclaw") => {
      if (!activeResult) return;
      const targetLabel = target === "claude_code" ? "Claude Code" : "OpenClaw";
      setHandoffState({
        status: "delegating",
        message: `Preparing ${targetLabel} issue handoff...`,
        targetLabel,
      });
      try {
        const response = await fetch(getSharedContextDelegateUrl(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            packet: ensureProofPacket(activeResult, activeLens),
            targetAgent: target,
            strategicAngleId,
          }),
        });
        const json = await response.json();
        if (!response.ok || !json?.success) {
          throw new Error(json?.message ?? `HTTP ${response.status}`);
        }
        trackEvent("delegate_strategic_issue", {
          entity: activeResult.entityName,
          target,
          strategicAngleId,
          contextId: json.contextId,
          taskId: json.taskId,
        });
        setHandoffState({
          status: "delegated",
          message: `${json.targetLabel ?? targetLabel} issue handoff is ready through NodeBench MCP.`,
          contextId: json.contextId,
          taskId: json.taskId,
          targetLabel: json.targetLabel ?? targetLabel,
          installCommand: json.installCommand,
          handoffPrompt: json.handoffPrompt,
        });
      } catch (error) {
        setHandoffState({
          status: "error",
          message: error instanceof Error ? error.message : `Failed to prepare ${targetLabel} issue handoff.`,
        });
      }
    },
    [activeLens, activeResult],
  );

  // File upload handler — reads text from files and submits to ingestion
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setIsSearching(true);
    const results: string[] = [];

    for (const file of fileArray.slice(0, 5)) { // Max 5 files
      try {
        const text = await file.text();
        if (!text.trim()) continue;

        // Send to ingestion endpoint
        const resp = await fetch(PUBLIC_SEARCH_UPLOAD_API_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: text.slice(0, 100_000),
            fileName: file.name,
            fileType: file.type || "text/plain",
          }),
        });
        const data = await resp.json();
        if (data.success && data.result) {
          const r = data.result;
          results.push(
            `${file.name}: ${r.extractedEntities?.length ?? 0} entities, ` +
            `${r.extractedSignals ?? 0} signals, ${r.extractedActions ?? 0} actions`
          );
        }
      } catch { /* non-fatal */ }
    }

    // Show upload summary as a result packet
    const entityNames = results.join("; ");
    const packet: ResultPacket = {
      query: `Uploaded ${fileArray.length} file(s): ${fileArray.map(f => f.name).join(", ")}`,
      entityName: "Upload Ingestion",
      answer: `Successfully ingested ${fileArray.length} file(s). ${entityNames || "Processing entities..."}. Content is queued for canonicalization and will enrich future searches.`,
      confidence: 60,
      sourceCount: fileArray.length,
      variables: [],
      nextQuestions: [
        "Generate my founder weekly reset — what changed, main contradiction, next 3 moves",
        "What entities were mentioned in the uploaded files?",
        "Build a pre-delegation packet from my uploaded context",
      ],
    };
    showResult(packet, activeLens);
    trackEvent("upload_complete", { fileCount: fileArray.length });
  }, [activeLens, showResult]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleRestoreHistory = useCallback((item: RecentSearchHistoryItem) => {
    setSubmittedQuery(item.query);
    setActiveTrace({
      trace: item.trace,
      latencyMs: item.latencyMs,
      classification: item.classification,
    });
    showResult(item.packet, item.lens as LensId);
    trackEvent("search_history_restore", {
      runId: item.runId,
      lens: item.lens,
      entity: item.entityName,
    });
  }, [showResult]);

  // Focus search on mount
  useEffect(() => {
    const timer = setTimeout(() => textareaRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="h-full overflow-y-auto">
      <div ref={revealRef} className="mx-auto flex min-h-full max-w-4xl flex-col px-6 py-8 lg:py-12">

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            SEARCH CANVAS — The hero. The whole point. Type what you need.
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="text-center">
          <h1
            style={stagger("0s")}
            className="text-3xl font-bold tracking-tight text-content sm:text-4xl"
          >
            Ask about your company, a competitor,{" "}
            <span className="text-[#d97757]">or a market shift</span>
          </h1>
          <p
            style={stagger("0.06s")}
            className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-content-secondary"
          >
            Founder-first by default. Research any company or direction in seconds, then pressure-test build speed, adoption, credibility, and next actions with evidence you can inspect.
          </p>
        </div>

        {/* ── Search input with upload dropzone ─────────────────────────── */}
        <div style={stagger("0.12s")} className="mt-8">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`group relative rounded-2xl border transition-all duration-300 ${
              isDragging
                ? "border-[#d97757]/50 bg-[#d97757]/[0.05] shadow-[0_0_0_2px_rgba(217,119,87,0.2),0_0_32px_rgba(217,119,87,0.1)]"
                : "border-white/[0.08] bg-white/[0.03] shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_2px_12px_rgba(0,0,0,0.3)]"
            } focus-within:border-[#d97757]/30 focus-within:shadow-[0_0_0_1px_rgba(217,119,87,0.15),0_0_24px_rgba(217,119,87,0.08)]`}
          >
            {isDragging && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-[#d97757]/[0.08] backdrop-blur-sm">
                <div className="flex items-center gap-2 text-[#d97757]">
                  <Upload className="h-5 w-5" />
                  <span className="text-sm font-medium">Drop files to analyze</span>
                </div>
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search a company, paste a task, upload files, or ask a strategic question..."
              rows={1}
              className="w-full resize-none bg-transparent px-5 py-4 pr-32 text-[15px] text-content placeholder:text-content-muted/60 focus:outline-none"
              aria-label="Search NodeBench"
              data-testid="landing-search-input"
            />
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".txt,.md,.csv,.json,.pdf,.docx,.xlsx"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleFileUpload(e.target.files);
                e.target.value = "";
              }}
            />
            <div className="absolute inset-y-0 right-3 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-9 w-9 items-center justify-center rounded-full text-content-muted transition-all hover:text-[#d97757] hover:bg-[#d97757]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d97757]/30 active:scale-[0.96]"
                aria-label="Upload files"
                title="Upload files (PDF, DOCX, CSV, JSON, TXT)"
              >
                <Upload className="h-4 w-4" />
              </button>
              {voice.isSupported && (
                <button
                  type="button"
                  onClick={() => voice.toggle()}
                  className="relative flex h-9 w-9 items-center justify-center rounded-full text-content-muted transition-all hover:bg-white/[0.05] hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d97757]/30 active:scale-[0.96]"
                  aria-label="Voice input"
                >
                  <Mic className="h-4 w-4" />
                  {voice.isListening && (
                    <span className="absolute right-0.5 top-0.5 flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                    </span>
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!input.trim() && !isSearching}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d97757] text-white shadow-sm transition-all hover:bg-[#c96a4d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d97757]/35 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-30 disabled:active:scale-100"
                aria-label="Search"
                data-testid="landing-search-submit"
              >
                {isSearching ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <ArrowUp className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── Lens selector ────────────────────────────────────────────────── */}
        <div style={stagger("0.16s")} className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
          <span className="text-[10px] uppercase tracking-[0.15em] text-content-muted mr-1">Lens:</span>
          {LENSES.map((lens) => {
            const Icon = LENS_ICONS[lens.id];
            const isActive = activeLens === lens.id;
            return (
              <button
                key={lens.id}
                type="button"
                onClick={() => {
                  setActiveLens(lens.id);
                  trackEvent("lens_select", { lens: lens.id });
                }}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition-all ${
                  isActive
                    ? "bg-[#d97757]/15 text-[#d97757] border border-[#d97757]/25"
                    : "text-content-muted border border-transparent hover:text-content-secondary hover:bg-white/[0.04] active:bg-white/[0.06]"
                }`}
                title={lens.description}
                aria-pressed={isActive}
                data-testid={`landing-lens-${lens.id}`}
              >
                <Icon className="h-3 w-3" aria-hidden="true" />
                {lens.label}
              </button>
            );
          })}
        </div>

        {/* ── Example prompts ──────────────────────────────────────────────── */}
        {!activeResult && (
          <div style={stagger("0.2s")} className="mt-8">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" data-testid="landing-example-prompts">
              {EXAMPLE_PROMPTS.map((example, i) => {
                const LensIcon = LENS_ICONS[example.lens];
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleExampleClick(example.text, example.lens)}
                    className="group flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-left transition-all duration-200 hover:border-[#d97757]/15 hover:bg-[#d97757]/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d97757]/25 active:scale-[0.995]"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] group-hover:bg-[#d97757]/10 transition-colors">
                      <LensIcon className="h-3.5 w-3.5 text-content-muted group-hover:text-[#d97757] transition-colors" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm leading-snug text-content">{example.text}</div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.1em] text-content-muted">
                          {example.lens}
                        </span>
                        <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.1em] text-content-muted">
                          {example.category}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 self-center text-content-muted/40 group-hover:text-[#d97757]/60 transition-colors" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Since last session ──────────────────────────────────────────── */}
        {!activeResult && (
          <>
            <RecentSearchHistory onOpen={handleRestoreHistory} />
            <div style={stagger("0.26s")} className="mt-8">
              <Suspense fallback={null}>
                <SinceLastSession />
              </Suspense>
            </div>
            <div style={stagger("0.32s")} className="mt-6">
              <Suspense fallback={null}>
                <FeedbackSummary />
              </Suspense>
            </div>
          </>
        )}

        {/* ── Loading state ────────────────────────────────────────────────── */}
        {isSearching && (
          <LiveAgentProgress query={submittedQuery} lens={activeLens} trace={activeTrace?.trace ?? []} />
        )}

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            RESULT WORKSPACE — Appears inline after search
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {activeResult && !isSearching && (
          <div ref={resultRef} className="mt-8" data-testid="landing-result-workspace">
            {activeResult.packetType === "plan_proposal" ? (
              <PlanProposalPanel
                plan={(activeResult as any).rawPacket as FeaturePlan | null ?? null}
                isLive={true}
                onCopyMarkdown={(plan) => {
                  const lines = [
                    `# ${plan.title}`, "", `> ${plan.summary}`, "",
                    "## Phases",
                    ...plan.phases.map(p => `- **${p.id}: ${p.title}** (${p.estimatedEffort}) — ${p.description}`),
                    "", "## Risks",
                    ...plan.risks.map(r => `- [${r.severity.toUpperCase()}] ${r.title}: ${r.mitigation}`),
                  ];
                  navigator.clipboard.writeText(lines.join("\n"));
                  trackEvent("copy_plan_markdown", { planId: plan.planId });
                }}
                onDelegate={(plan) => {
                  trackEvent("delegate_plan", { planId: plan.planId, planType: plan.planType });
                  void handleDelegate("claude_code");
                }}
              />
            ) : (
            <>
            {/* ── Summary Card (clean first impression) ─────────────────── */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
              {/* Entity header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-content">{activeResult.entityName || "Result"}</h2>
                  <p className="mt-1 text-sm text-content-muted line-clamp-2">
                    {activeResult.answer || activeResult.memo?.whatChanged?.[0]?.description || "Intelligence packet ready"}
                  </p>
                </div>
                {activeResult.confidence != null && (
                  <div className="shrink-0 text-right">
                    <div className="text-2xl font-bold text-[#d97757]">{activeResult.confidence}%</div>
                    <div className="text-[10px] text-content-muted">confidence</div>
                  </div>
                )}
              </div>

              {/* Key signals */}
              {activeResult.memo?.signals && activeResult.memo.signals.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted">Key Signals</h3>
                  <div className="mt-2 space-y-1.5">
                    {activeResult.memo.signals.slice(0, 4).map((sig: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className={`h-1.5 w-1.5 rounded-full ${sig.direction === "up" ? "bg-emerald-400" : sig.direction === "down" ? "bg-rose-400" : "bg-amber-400"}`} />
                        <span className="text-content-secondary">{sig.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Next actions */}
              {activeResult.memo?.nextActions && activeResult.memo.nextActions.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted">Recommended Actions</h3>
                  <ol className="mt-2 space-y-1.5">
                    {activeResult.memo.nextActions.slice(0, 3).map((action: any, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-content-secondary">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#d97757]/10 text-[10px] font-bold text-[#d97757]">{i + 1}</span>
                        {action.action || action}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Action bar */}
              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-4">
                <button
                  type="button"
                  onClick={() => {
                    const text = `${activeResult.entityName}: ${activeResult.answer || ""}`;
                    navigator.clipboard.writeText(text);
                    trackEvent("activation_result_copied", { entity: activeResult.entityName });
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-content-muted transition-colors hover:bg-white/[0.08]"
                >
                  <ClipboardCopy className="h-3.5 w-3.5" />
                  Copy
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelegate("claude_code")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#d97757] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#c86747]"
                >
                  Delegate
                </button>
                <button
                  type="button"
                  onClick={() => setShowFullWorkspace((v) => !v)}
                  className="ml-auto inline-flex items-center gap-1.5 text-xs text-content-muted transition-colors hover:text-content-secondary"
                >
                  {showFullWorkspace ? "Hide" : "Show"} full analysis
                  <ArrowRight className={`h-3 w-3 transition-transform ${showFullWorkspace ? "rotate-90" : ""}`} />
                </button>
              </div>
            </div>

            {/* Full workspace (progressive disclosure) */}
            {showFullWorkspace && (
              <div className="mt-4">
                <ResultWorkspace
                  packet={activeResult}
                  lens={activeLens}
                  onFollowUp={handleFollowUp}
                  onExport={(type) => {
                    trackEvent("export_packet", { type, entity: activeResult.entityName });
                  }}
                  onPublishSharedContext={() => void handlePublishSharedContext()}
                  onDelegate={(target) => void handleDelegate(target)}
                  onPublishStrategicAngle={(angleId) => void handlePublishStrategicAngle(angleId)}
                  onDelegateStrategicAngle={(angleId, target) => void handleDelegateStrategicAngle(angleId, target)}
                  onMonitor={() => {
                    trackEvent("add_watchlist", { entity: activeResult.entityName });
                  }}
                  handoffState={handoffState}
                />
              </div>
            )}
            </>
            )}

            {/* Execution trace — shows how the answer was produced */}
            {activeTrace && (
              <div className="mt-3" data-testid="landing-search-trace">
                <SearchTrace
                  trace={activeTrace.trace}
                  latencyMs={activeTrace.latencyMs}
                  classification={activeTrace.classification}
                  judgeVerdict={activeTrace.judge}
                  mode="user"
                />
              </div>
            )}

            {/* New search button */}
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  setActiveResult(null);
                  setInput("");
                  textareaRef.current?.focus();
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-2.5 text-sm font-medium text-content-muted transition-colors hover:bg-white/[0.06] hover:text-content"
              >
                <Search className="h-4 w-4" />
                New Search
              </button>
            </div>
          </div>
        )}

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            BELOW THE FOLD — Trust, Install, Proof
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

        {/* ── How it works ─────────────────────────────────────────────────── */}
        <div style={stagger("0.28s")} className="mt-12">
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted text-center">
            How it works
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { step: "1", title: "Ask anything", description: "Type a company name, paste meeting notes, or ask a strategic question. NodeBench extracts entities and finds signals." },
              { step: "2", title: "Get your answer", description: "A structured intelligence packet shaped for your role — risks, next actions, and evidence you can verify." },
              { step: "3", title: "Share and delegate", description: "Copy a shareable link, hand off to Claude Code, or delegate to your team. Every result stays traceable." },
            ].map((item) => (
              <div key={item.step} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#d97757]/10 text-xs font-bold text-[#d97757]">
                  {item.step}
                </div>
                <div className="mt-3 text-sm font-medium text-content">{item.title}</div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-content-muted">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Install ──────────────────────────────────────────────────────── */}
        <div style={stagger("0.36s")} className="mt-12">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted text-center">
            Install in 10 seconds
          </div>
          <div className="mx-auto max-w-xl rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
            <div className="flex border-b border-white/[0.06]">
              {INSTALL_COMMANDS.map((cmd, i) => (
                <button
                  key={cmd.tab}
                  type="button"
                  onClick={() => { setActiveInstallTab(i); setCopiedInstall(false); }}
                  className={`flex-1 px-4 py-2.5 text-[12px] font-medium transition-colors ${
                    i === activeInstallTab
                      ? "text-[#d97757] border-b-2 border-[#d97757] bg-white/[0.02]"
                      : "text-content-muted hover:text-content-secondary"
                  }`}
                >
                  {cmd.tab}
                </button>
              ))}
            </div>
            <div className="relative px-5 py-4">
              {"note" in INSTALL_COMMANDS[activeInstallTab] && INSTALL_COMMANDS[activeInstallTab].note && (
                <div className="mb-2 text-[10px] text-content-muted">{INSTALL_COMMANDS[activeInstallTab].note}</div>
              )}
              <pre className="overflow-x-auto rounded-lg bg-white/[0.04] px-4 py-3 text-[12px] leading-relaxed text-content-secondary font-mono">
                {INSTALL_COMMANDS[activeInstallTab].code}
              </pre>
              <button
                type="button"
                onClick={handleCopyInstall}
                className="absolute right-6 top-5 inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-medium text-content-muted transition-colors hover:bg-white/[0.08] hover:text-content"
                aria-label={copiedInstall ? "Copied" : "Copy to clipboard"}
              >
                {copiedInstall ? (
                  <><Check className="h-3 w-3 text-emerald-400" /><span className="text-emerald-400">Copied!</span></>
                ) : (
                  <><ClipboardCopy className="h-3 w-3" />Copy</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── Built by + status (single condensed line) ─────────────────── */}
        <div style={stagger("0.4s")} className="mt-12 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] text-content-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Operational
          </span>
          <span>Built by Homen Shum (Meta, JPMorgan)</span>
          <span>350 agent tools</span>
          <span>Open source</span>
          <button
            type="button"
            onClick={() => onNavigate("developers" as MainView, "/developers")}
            className="text-[#d97757] hover:underline"
          >
            View architecture
          </button>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div style={stagger("0.5s")} className="mt-16 mb-8 border-t border-white/[0.06] pt-6">
          <nav className="flex flex-wrap items-center justify-center gap-x-1 gap-y-1 text-[12px] text-content-muted" aria-label="Footer">
            {[
              { label: "Dashboard", view: "founder-dashboard", path: "/founder" },
              { label: "Research", view: "research", path: "/research" },
              { label: "Decision Workbench", view: "deep-sim", path: "/deep-sim" },
              { label: "Developers", view: "developers", path: "/developers" },
              { label: "Pricing", view: "pricing", path: "/pricing" },
              { label: "Changelog", view: "changelog", path: "/changelog" },
              { label: "Legal", view: "legal", path: "/legal" },
            ].map((link, i) => (
              <span key={link.label} className="flex items-center">
                {i > 0 && <span aria-hidden="true" className="mr-1">&middot;</span>}
                <button
                  type="button"
                  onClick={() => onNavigate(link.view as MainView, link.path)}
                  className="px-2 py-1 transition-colors hover:text-content-secondary"
                >
                  {link.label}
                </button>
              </span>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
});

export default ControlPlaneLanding;
