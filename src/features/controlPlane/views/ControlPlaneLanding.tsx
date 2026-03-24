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

import { lazy, memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRevealOnMount } from "@/hooks/useRevealOnMount";
import {
  ArrowRight,
  ArrowUp,
  Briefcase,
  Check,
  ClipboardCopy,
  FileText,
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
import { SearchTrace, type TraceStep } from "../components/SearchTrace";
import {
  type LensId,
  type ResultPacket,
  LENSES,
  EXAMPLE_PROMPTS,
  DEMO_PACKETS,
} from "../components/searchTypes";

const SinceLastSession = lazy(() => import("../../founder/components/SinceLastSession"));
const FeedbackSummary = lazy(() => import("../../founder/components/FeedbackSummary").then(m => ({ default: m.FeedbackSummary })));

/* ─── Demo packet keyword aliases (shared across submit + example click) ── */

const DEMO_ALIASES: Record<string, string[]> = {
  anthropic: ["anthropic", "foundation model"],
  shopify: ["shopify", "ai commerce"],
  nodebench: ["weekly reset", "founder reset", "founder weekly"],
};

function findDemoPacket(query: string): string | undefined {
  const lq = query.toLowerCase();
  return Object.keys(DEMO_PACKETS).find((key) => {
    // Exact query match (highest priority)
    if (DEMO_PACKETS[key].query.toLowerCase() === lq) return true;
    // Alias match (specific phrases only — avoids false positives from generic mentions)
    const aliases = DEMO_ALIASES[key];
    if (aliases?.some((alias) => lq.includes(alias))) return true;
    // Key-name match only for unambiguous entity names (not "nodebench" which appears in too many queries)
    if (key !== "nodebench" && lq.includes(key)) return true;
    return false;
  });
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
  { tab: "Claude Code", code: "claude mcp add nodebench -- npx -y nodebench-mcp" },
  { tab: "Cursor", code: "npx -y nodebench-mcp", note: "Add to .cursor/mcp.json" },
  { tab: "Windsurf", code: "npx -y nodebench-mcp", note: "Add to .windsurf/mcp.json" },
] as const;

/* ─── Component ──────────────────────────────────────────────────────────── */

interface ControlPlaneLandingProps {
  onNavigate: (view: MainView, path?: string) => void;
  onOpenFastAgent?: () => void;
  onOpenFastAgentWithPrompt?: (prompt: string) => void;
}

export const ControlPlaneLanding = memo(function ControlPlaneLanding({
  onNavigate,
  onOpenFastAgent,
  onOpenFastAgentWithPrompt,
}: ControlPlaneLandingProps) {
  const [input, setInput] = useState("");
  const [activeLens, setActiveLens] = useState<LensId>("founder");
  const [activeResult, setActiveResult] = useState<ResultPacket | null>(null);
  const [activeTrace, setActiveTrace] = useState<{ trace: TraceStep[]; latencyMs: number; classification: string; judge?: any } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const { ref: revealRef, isVisible, instant } = useRevealOnMount();
  const pendingVoiceSubmitRef = useRef(false);
  const [copiedInstall, setCopiedInstall] = useState(false);
  const [activeInstallTab, setActiveInstallTab] = useState(0);

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

  const showResult = useCallback((packet: ResultPacket) => {
    setActiveResult(packet);
    setIsSearching(false);
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;

    trackEvent("search_submit", { query: trimmed.slice(0, 80), lens: activeLens });
    setIsSearching(true);

    // 1. Try live API (server calls MCP tools → returns structured packet)
    fetch("/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: trimmed, lens: activeLens }),
      signal: AbortSignal.timeout(15_000),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => {
        if (!data?.success || !data.result) throw new Error("No result");
        // Capture execution trace for trajectory visualization
        if (data.trace) {
          setActiveTrace({
            trace: data.trace,
            latencyMs: data.latencyMs ?? 0,
            classification: data.classification ?? "unknown",
            judge: data.judge,
          });
        }
        const r = data.result;
        // Full packet from founder_local_weekly_reset / founder_local_synthesize
        if (r.canonicalEntity && r.memo) {
          const packet: ResultPacket = {
            query: trimmed,
            entityName: r.canonicalEntity?.name ?? data.entity ?? "NodeBench",
            answer: r.canonicalEntity?.canonicalMission ?? "",
            confidence: r.canonicalEntity?.identityConfidence ?? 70,
            sourceCount: (r.whatChanged?.length ?? 0) + (r.signals?.length ?? 0),
            variables: (r.signals ?? []).slice(0, 5).map((s: any, i: number) => ({
              rank: i + 1, name: s.name ?? String(s), direction: s.direction ?? "neutral", impact: s.impact ?? "medium",
            })),
            keyMetrics: [
              { label: "Confidence", value: `${r.canonicalEntity?.identityConfidence ?? 0}%` },
              { label: "Changes", value: String(r.whatChanged?.length ?? 0) },
              { label: "Contradictions", value: String(r.contradictions?.length ?? 0) },
              { label: "Actions", value: String(r.nextActions?.length ?? 0) },
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
            interventions: r.nextActions?.slice(0, 4).map((a: any) => ({
              action: a.action ?? String(a),
              impact: a.impact ?? "medium",
            })),
            nextQuestions: r.nextQuestions ?? r.nextActions?.map((a: any) => a.action) ?? [],
          };
          showResult(packet);
          trackEvent("search_live_result", { entity: packet.entityName, type: data.classification });
          return;
        }
        throw new Error("Unstructured result");
      })
      .catch(() => {
        // 2. Fallback: demo packet
        const demoKey = findDemoPacket(trimmed);
        if (demoKey) {
          setTimeout(() => showResult(DEMO_PACKETS[demoKey]), 300);
          return;
        }
        // 3. Final fallback: build an inline acknowledgment packet
        //    NEVER gate on auth — guests must always get value.
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
        showResult(fallbackPacket);
        trackEvent("search_fallback", { query: trimmed.slice(0, 40), lens: activeLens });
      });
  }, [input, activeLens, onOpenFastAgent, onOpenFastAgentWithPrompt, showResult]);

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
        setTimeout(() => showResult(DEMO_PACKETS[demoKey]), 600);
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
        const resp = await fetch("/search/upload", {
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
    showResult(packet);
    trackEvent("upload_complete", { fileCount: fileArray.length });
  }, [showResult]);

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
            Understand any{" "}
            <span className="text-[#d97757]">company, market, or question</span>
          </h1>
          <p
            style={stagger("0.06s")}
            className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-content-secondary"
          >
            Type a question, paste meeting notes, or search a company.
            Get a tailored, decision-ready intelligence workspace.
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
              className="w-full resize-none bg-transparent px-5 py-4 pr-36 text-[15px] text-content placeholder:text-content-muted/60 focus:outline-none"
              aria-label="Search NodeBench"
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
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-9 w-9 items-center justify-center rounded-full text-content-muted transition-colors hover:text-[#d97757] hover:bg-[#d97757]/10"
                aria-label="Upload files"
                title="Upload files (PDF, DOCX, CSV, JSON, TXT)"
              >
                <Upload className="h-4 w-4" />
              </button>
              {voice.isSupported && (
                <button
                  type="button"
                  onClick={() => voice.toggle()}
                  className="relative flex h-9 w-9 items-center justify-center rounded-full text-content-muted transition-colors hover:text-content"
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
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d97757] text-white shadow-sm transition-all hover:bg-[#c96a4d] disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Search"
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
                    : "text-content-muted border border-transparent hover:text-content-secondary hover:bg-white/[0.04]"
                }`}
                title={lens.description}
                aria-pressed={isActive}
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
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {EXAMPLE_PROMPTS.map((example, i) => {
                const LensIcon = LENS_ICONS[example.lens];
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleExampleClick(example.text, example.lens)}
                    className="group flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-left transition-all duration-200 hover:border-[#d97757]/15 hover:bg-[#d97757]/[0.02]"
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
                    <ArrowRight className="h-4 w-4 shrink-0 text-content-muted/40 group-hover:text-[#d97757]/60 transition-colors mt-0.5" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Since last session ──────────────────────────────────────────── */}
        {!activeResult && (
          <>
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
          <div className="mt-8 flex flex-col items-center gap-3 py-12">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#d97757]" />
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#d97757] [animation-delay:0.15s]" />
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#d97757] [animation-delay:0.3s]" />
            </div>
            <p className="text-sm text-content-muted">Analyzing across {350} tools and sources...</p>
          </div>
        )}

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            RESULT WORKSPACE — Appears inline after search
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {activeResult && !isSearching && (
          <div ref={resultRef} className="mt-8">
            <ResultWorkspace
              packet={activeResult}
              lens={activeLens}
              onFollowUp={handleFollowUp}
              onExport={(type) => {
                trackEvent("export_packet", { type, entity: activeResult.entityName });
                // TODO: Connect to artifact generation engine
              }}
              onMonitor={() => {
                trackEvent("add_watchlist", { entity: activeResult.entityName });
                // TODO: Connect to watchlist system
              }}
            />

            {/* Execution trace — shows how the answer was produced */}
            {activeTrace && (
              <div className="mt-3">
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

        {/* ── Trust signals (compact) ──────────────────────────────────────── */}
        <div style={stagger("0.28s")} className="mt-16 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] text-content-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Operational
          </span>
          <span>350 MCP tools</span>
          <span>63 backend domains</span>
          <span>Sub-200ms dispatch</span>
          <span>1,510+ tests</span>
        </div>

        {/* ── How it works ─────────────────────────────────────────────────── */}
        <div style={stagger("0.32s")} className="mt-12">
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted text-center">
            How it works
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { step: "1", title: "Search or upload", description: "Type a company name, paste meeting notes, drop a PDF, or ask a strategic question." },
              { step: "2", title: "Get your intelligence packet", description: "NodeBench extracts entities, surfaces signals, detects risks, and shapes a tailored result for your role." },
              { step: "3", title: "Export and monitor", description: "One-click memo, sheet, or deck. Add to watchlist to track changes over time." },
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

        {/* ── Integrate cards ──────────────────────────────────────────────── */}
        <div style={stagger("0.4s")} className="mt-8">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="text-sm font-medium text-content">Claude Code</div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-content-muted">
                One command. 350 tools instantly.
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="text-sm font-medium text-content">Cursor / Windsurf</div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-content-muted">
                Add to your MCP config. Works immediately.
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="text-sm font-medium text-content">REST API</div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-content-muted">
                Decision packets, variables, and scenario endpoints.
              </p>
              <button
                type="button"
                onClick={() => onNavigate("api-docs" as MainView, "/api-docs")}
                className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-[#d97757] hover:underline"
              >
                API docs <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Proof section ────────────────────────────────────────────────── */}
        <div style={stagger("0.44s")} className="mt-12">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted mb-4 text-center">
            Why trust this
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="text-xs font-medium text-content-secondary mb-1">Built by</div>
              <div className="text-sm font-semibold text-content">Homen Shum</div>
              <div className="mt-1 text-xs text-content-muted leading-relaxed">
                Platform Architect at Meta (Tests Assured) — shipped a zero-to-pilot AI testing platform in 100 days.
                Previously JPMorgan Chase — enterprise GenAI, quantitative risk modeling across $800M+ in deals.
                Cornell + Stanford ML. Built production agent systems at scale.
              </div>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="text-xs font-medium text-content-secondary mb-1">Open infrastructure</div>
              <div className="text-sm font-semibold text-content">Full source available</div>
              <div className="mt-1 text-xs text-content-muted leading-relaxed">
                350 MCP tools, 63 backend domains, 1,510+ tests.
                Inspect the code — we have nothing to hide.
              </div>
              <button
                type="button"
                onClick={() => onNavigate("developers" as MainView, "/developers")}
                className="mt-2 inline-flex items-center gap-1 text-xs text-[#d97757] hover:text-[#e08a6c] transition-colors"
              >
                View architecture <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </button>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="text-xs font-medium text-content-secondary mb-1">System status</div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                <span className="text-sm font-semibold text-content">Operational</span>
              </div>
              <div className="mt-1 text-xs text-content-muted">
                Avg latency: 142ms &middot; Last deploy: today &middot; 0 incidents
              </div>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="text-xs font-medium text-content-secondary mb-1">Try before you trust</div>
              <div className="text-sm font-semibold text-content">No signup required</div>
              <div className="mt-2 rounded-lg bg-white/[0.04] px-3 py-2">
                <code className="text-xs text-content-muted font-mono">npx nodebench-mcp demo</code>
              </div>
              <div className="mt-1 text-xs text-content-muted">
                Run locally in 3 seconds. See 350 tools. No API keys needed.
              </div>
            </div>
          </div>
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
