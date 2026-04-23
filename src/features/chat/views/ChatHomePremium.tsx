/**
 * ChatHomePremium — Full-featured premium chat interface
 *
 * Perplexity-style layout with all production features:
 * - Streaming search with live progress
 * - File upload & drag-drop
 * - Lens/persona selector
 * - Session history sidebar
 * - Source cards with inline citations
 * - Classification chips
 * - Share, save, thread actions
 * - Voice input (transcribe)
 * - Glassmorphism with theme tokens
 * - ULTRA-LONG CHAT: Virtualization, progressive disclosure, in-conversation search
 */

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock3,
  FileText,
  Link2,
  MessageSquareText,
  Mic,
  Paperclip,
  Plus,
  Search,
  Sparkles,
  Globe,
  ExternalLink,
  Bookmark,
  Share2,
  MoreHorizontal,
  X,
  Send,
  Loader2,
  History,
  Settings,
  User,
  ChevronLeft,
  ChevronLast,
  MessagesSquare,
  Hash,
  GripHorizontal,
  CornerDownRight,
  MoreVertical,
} from "lucide-react";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { LENSES, type LensId, type ResultPacket } from "@/features/controlPlane/components/searchTypes";
import { getAnonymousProductSessionId } from "@/features/product/lib/productIdentity";
import {
  loadProductDraft,
  saveLastChatPath,
  saveProductDraft,
  shouldPersistDraftQueryInUrl,
} from "@/features/product/lib/productSession";
import { useProductBootstrap } from "@/features/product/lib/useProductBootstrap";
import { useStreamingSearch, type ToolStage } from "@/hooks/useStreamingSearch";
import { useConvexApi } from "@/lib/convexApi";
import { buildOperatorContextHint, buildOperatorContextLabel } from "@/features/product/lib/operatorContext";
import { ProductIntakeComposer, type ProductComposerMode } from "@/features/product/components/ProductIntakeComposer";
import { ProductFileAssetPicker, type ProductFileAsset } from "@/features/product/components/ProductFileAssetPicker";
import { SaveToNotebookButton } from "@/features/agents/components/SaveToNotebookButton";
import { buildEntityPath } from "@/features/entities/lib/entityExport";
import { SessionArtifactsPanel } from "@/features/chat/components/SessionArtifactsPanel";
import { ClassificationChip } from "@/features/chat/components/ClassificationChip";
import { ChatShareSheet } from "@/features/chat/components/ChatShareSheet";
import { classifyPrompt, type PromptClassification } from "@/features/chat/lib/classifyPrompt";
import { buildChatSessionPath, buildChatShareUrl } from "@/features/chat/lib/threadRouting";
import { ThreadActionsSheet } from "@/features/chat/components/ThreadActionsSheet";
import { LowConfidenceCard, type LowConfidenceCardPayload } from "@/features/chat/components/LowConfidenceCard";
import {
  useConversationEngine,
  type ProductConversationActionItem,
  type ProductConversationCompiledTruthSection,
  type ProductConversationInterrupt,
  type ProductConversationProviderBudgetSummary,
  type ProductConversationRunEvent,
} from "@/features/chat/hooks/useConversationEngine";
import { uploadProductDraftFiles } from "@/features/product/lib/uploadDraftFiles";
import {
  deriveReportArtifactMode,
  extractEntitySubjectFromQuery,
  getReportArtifactLabel,
  type ReportArtifactMode,
} from "../../../../shared/reportArtifacts";
import { deriveCanonicalReportSections } from "../../../../shared/reportSections";
import { VirtualizedMessageList, useMessageVirtualization } from "@/features/agents/components/FastAgentPanel/VirtualizedMessageList";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ReportSection = {
  id: string;
  title: string;
  body: string;
  status: "pending" | "building" | "complete";
  sourceRefIds?: string[];
};

type ReportSectionWithSkeleton = ReportSection & { skeleton?: boolean };

type SourceCard = {
  id: string;
  title: string;
  domain: string;
  url?: string;
  confidence: number;
  snippet?: string;
};

/* ------------------------------------------------------------------ */
/*  Ultra-Long Chat Types                                              */
/* ------------------------------------------------------------------ */

type MessageRole = "user" | "assistant" | "system";

type ConversationMessage = {
  id: string;
  role: MessageRole;
  content: string;
  query?: string; // For assistant messages, store the user query that triggered it
  timestamp: number;
  packet?: ResultPacket | null;
  sections?: ReportSectionWithSkeleton[];
  sources?: SourceCard[];
  stages?: ToolStage[];
  isStreaming?: boolean;
  classification?: PromptClassification | null;
  parentId?: string | null; // For threading/branches
  branchDepth?: number;
};

type MessageBranch = {
  id: string;
  name: string;
  messageIds: string[];
  parentBranchId?: string | null;
};

type CollapsibleSection = {
  id: string;
  isExpanded: boolean;
};

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const DEFAULT_LENS: LensId = "founder";
const STARTER_PROMPTS = [
  "What does this company actually do, and why does it matter now?",
  "Turn this job post into a role-fit report with risks and gaps.",
  "Summarize this company from my notes, screenshots, and saved context.",
  "Stripe prep brief for tomorrow's call.",
] as const;

/* Progressive disclosure thresholds */
const VIRTUALIZATION_THRESHOLD = 30; // Messages before virtualization kicks in
const SOURCES_COLLAPSE_THRESHOLD = 6; // Sources before "Show more" appears
const MAX_VISIBLE_SOURCES_DEFAULT = 4;
const MESSAGE_PREVIEW_LENGTH = 300; // Characters before "Read more"

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function isLensId(value: string | null | undefined): value is LensId {
  return Boolean(value && LENSES.some((option) => option.id === value));
}

function resolvePreferredLens(args: {
  lensParam?: string | null;
  draftQuery?: string | null;
  draftLens?: string | null;
  preferredLens?: string | null;
}): LensId {
  if (isLensId(args.lensParam)) return args.lensParam;
  if (args.draftQuery?.trim() && isLensId(args.draftLens)) return args.draftLens;
  if (isLensId(args.preferredLens)) return args.preferredLens;
  if (isLensId(args.draftLens)) return args.draftLens;
  return DEFAULT_LENS;
}

function stageVisibility(stages: ToolStage[]): number {
  const doneTools = new Set(stages.filter((s) => s.status === "done").map((s) => s.tool?.toLowerCase()));
  if (doneTools.has("package")) return 4;
  if (doneTools.has("analyze")) return 4;
  if (doneTools.has("search")) return 2;
  if (doneTools.has("classify")) return 1;
  const doneCount = stages.filter((s) => s.status === "done").length;
  if (doneCount >= 3) return 4;
  if (doneCount >= 2) return 2;
  if (doneCount >= 1) return 1;
  return 0;
}

function deriveReportSections(
  packet: ResultPacket | null,
  isStreaming: boolean,
  stages: ToolStage[] = [],
  liveAnswerPreview: string | null = null,
  mode: ReportArtifactMode = "report",
): ReportSectionWithSkeleton[] {
  const sectionTitles =
    mode === "prep_brief"
      ? {
          whatItIs: "What to walk in knowing",
          whyItMatters: "Why they'll care",
          whatIsMissing: "Likely questions or objections",
          whatToDoNext: "Talk track and next move",
        }
      : {
          whatItIs: "What it is",
          whyItMatters: "Why it matters",
          whatIsMissing: "What is missing",
          whatToDoNext: "What to do next",
        };

  if (packet) {
    return deriveCanonicalReportSections(packet, { mode }).map((section) => ({
      id: section.id,
      title: section.title,
      body: section.body || (section.id === "what-it-is" ? packet.answer || "" : ""),
      status: "complete" as const,
      sourceRefIds: section.sourceRefIds,
    }));
  }

  if (!isStreaming) {
    return [
      { id: "what-it-is", title: sectionTitles.whatItIs, body: "Ask a question to start the report.", status: "pending" },
      { id: "why-it-matters", title: sectionTitles.whyItMatters, body: "The report will explain why this matters once the run starts.", status: "pending" },
      { id: "what-is-missing", title: sectionTitles.whatIsMissing, body: "Missing evidence and open questions will appear here.", status: "pending" },
      { id: "what-to-do-next", title: sectionTitles.whatToDoNext, body: "A concrete next move will appear here.", status: "pending" },
    ];
  }

  const visible = stageVisibility(stages);
  const templates = [
    { id: "what-it-is", title: sectionTitles.whatItIs, buildingBody: "The agent is classifying the request and gathering first sources." },
    { id: "why-it-matters", title: sectionTitles.whyItMatters, buildingBody: "This section fills in after the agent has enough signal." },
    { id: "what-is-missing", title: sectionTitles.whatIsMissing, buildingBody: "Gaps and uncertainties appear once the source sweep finishes." },
    { id: "what-to-do-next", title: sectionTitles.whatToDoNext, buildingBody: "The recommended next move is being assembled from the evidence." },
  ];

  return templates.map((t, i) => {
    if (i < visible) {
      return {
        id: t.id,
        title: t.title,
        body: i === 0 && liveAnswerPreview ? liveAnswerPreview : t.buildingBody,
        status: "building" as const,
      };
    }
    return { id: t.id, title: t.title, body: "", status: "pending" as const, skeleton: true };
  });
}

function formatRelativeTime(timestamp: number | null | undefined) {
  if (typeof timestamp !== "number" || !Number.isFinite(timestamp) || timestamp <= 0) return "Just now";
  const deltaMs = Math.max(0, Date.now() - timestamp);
  const minutes = Math.max(1, Math.round(deltaMs / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  return `${months}mo ago`;
}

function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/* Highlight search matches in text */
function highlightSearchText(text: string, searchQuery: string): React.ReactNode {
  if (!searchQuery.trim()) return text;
  const parts = text.split(new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === searchQuery.toLowerCase() ? (
      <mark key={i} className="bg-primary/20 text-primary font-semibold rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function GlassCard({ children, className, hover = false }: { children: React.ReactNode; className?: string; hover?: boolean }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl",
        "bg-card/80 backdrop-blur-xl",
        "border border-border/50",
        hover && "transition-all duration-300 hover:bg-card hover:border-border hover:shadow-lg hover:shadow-black/5",
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
      <div className="relative">{children}</div>
    </div>
  );
}

function SourceBadge({ source, index }: { source: SourceCard; index: number }) {
  const domain = source.domain?.replace(/^www\./, "") ?? "source";
  const letter = domain.charAt(0).toUpperCase();

  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group inline-flex items-center gap-2 px-3 py-1.5 rounded-full",
        "bg-muted/50 hover:bg-muted",
        "border border-border/50 hover:border-border",
        "transition-all duration-200"
      )}
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
        {index + 1}
      </span>
      <span className="flex h-4 w-4 items-center justify-center rounded bg-muted text-[8px] font-bold text-muted-foreground">
        {letter}
      </span>
      <span className="text-sm text-foreground truncate max-w-[120px]">{domain}</span>
      <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </a>
  );
}

function ProgressSpinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block rounded-full border-[1.5px] border-dashed border-primary/80 border-t-transparent motion-safe:animate-spin",
        className,
      )}
    />
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-4">
      <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
      <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
      <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
      <span className="ml-2 text-sm text-muted-foreground">Researching...</span>
    </div>
  );
}

/* Progressive disclosure: Collapsible sources panel */
function CollapsibleSources({
  sources,
  searchQuery,
}: {
  sources: SourceCard[];
  searchQuery?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(sources.length <= SOURCES_COLLAPSE_THRESHOLD);
  const [maxVisible, setMaxVisible] = useState(MAX_VISIBLE_SOURCES_DEFAULT);

  const visibleSources = isExpanded ? sources : sources.slice(0, maxVisible);
  const hasMore = sources.length > maxVisible && !isExpanded;

  return (
    <GlassCard className="mt-4 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-card-foreground flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          Sources ({sources.length})
        </h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          {isExpanded ? (
            <><ChevronUp className="h-3 w-3" /> Collapse</>
          ) : (
            <><ChevronDown className="h-3 w-3" /> Expand</>
          )}
        </button>
      </div>

      <div className={cn("grid gap-2 transition-all duration-300", !isExpanded && "max-h-32 overflow-hidden")}>
        {visibleSources.map((source, i) => (
          <a
            key={source.id}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-card-foreground font-medium truncate group-hover:text-primary transition-colors">
                {searchQuery ? highlightSearchText(source.title, searchQuery) : source.title}
              </p>
              <p className="text-xs text-muted-foreground">{source.domain}</p>
            </div>
          </a>
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full mt-3 py-2 text-xs text-muted-foreground hover:text-foreground bg-muted/30 hover:bg-muted/50 rounded-lg transition-colors flex items-center justify-center gap-1"
        >
          <Plus className="h-3 w-3" />
          Show {sources.length - maxVisible} more sources
        </button>
      )}
    </GlassCard>
  );
}

/* Progressive disclosure: Expandable message content */
function ExpandableMessage({
  content,
  searchQuery,
  maxLength = MESSAGE_PREVIEW_LENGTH,
}: {
  content: string;
  searchQuery?: string;
  maxLength?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(content.length <= maxLength);
  const needsExpansion = content.length > maxLength;

  const displayContent = isExpanded ? content : content.slice(0, maxLength) + "...";

  return (
    <div className="prose prose-neutral dark:prose-invert max-w-none">
      <p className="text-muted-foreground leading-relaxed text-base whitespace-pre-wrap">
        {searchQuery ? highlightSearchText(displayContent, searchQuery) : displayContent}
      </p>
      {needsExpansion && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 text-sm text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
        >
          {isExpanded ? (
            <><ChevronUp className="h-4 w-4" /> Show less</>
          ) : (
            <><ChevronDown className="h-4 w-4" /> Read more ({content.length - maxLength} chars)</>
          )}
        </button>
      )}
    </div>
  );
}

/* In-conversation search bar */
function ConversationSearchBar({
  value,
  onChange,
  onClear,
  resultCount,
  currentIndex,
  onNavigate,
}: {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  resultCount: number;
  currentIndex: number;
  onNavigate: (direction: "prev" | "next") => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape" && value) {
        onClear();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [value, onClear]);

  if (!value && resultCount === 0) {
    return (
      <button
        onClick={() => inputRef.current?.focus()}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-sm"
        title="Search in conversation (Ctrl+F)"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden md:inline-flex h-5 items-center gap-1 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground ml-2">
          <span className="text-xs">⌘</span>F
        </kbd>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5">
      <Search className="h-4 w-4 text-muted-foreground" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search in conversation..."
        className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground w-32 sm:w-48"
        autoFocus
      />
      {value && (
        <>
          {resultCount > 0 && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {currentIndex + 1}/{resultCount}
            </span>
          )}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => onNavigate("prev")}
              disabled={resultCount === 0}
              className="p-1 rounded hover:bg-muted disabled:opacity-30 transition-colors"
              aria-label="Previous result"
            >
              <ChevronUp className="h-3 w-3" />
            </button>
            <button
              onClick={() => onNavigate("next")}
              disabled={resultCount === 0}
              className="p-1 rounded hover:bg-muted disabled:opacity-30 transition-colors"
              aria-label="Next result"
            >
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>
          <button
            onClick={onClear}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <X className="h-3 w-3" />
          </button>
        </>
      )}
    </div>
  );
}

/* Smart scroll-to-bottom button */
function ScrollToBottomButton({
  onClick,
  show,
}: {
  onClick: () => void;
  show: boolean;
}) {
  if (!show) return null;
  return (
    <button
      onClick={onClick}
      className="fixed bottom-24 right-8 z-40 p-2 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all duration-200 animate-in fade-in slide-in-from-bottom-2"
      aria-label="Scroll to bottom"
    >
      <ChevronLast className="h-5 w-5" />
    </button>
  );
}

/* Message bubble for conversation threading */
function MessageBubble({
  message,
  searchQuery,
  isHighlighted,
}: {
  message: ConversationMessage;
  searchQuery?: string;
  isHighlighted?: boolean;
}) {
  const isUser = message.role === "user";
  const [showSources, setShowSources] = useState(false);
  const [showStages, setShowStages] = useState(false);

  return (
    <div
      data-message-id={message.id}
      className={cn(
        "group relative transition-all duration-300",
        isHighlighted && "ring-2 ring-primary ring-offset-2 rounded-xl"
      )}
    >
      {/* Branch indicator for threaded conversations */}
      {message.branchDepth && message.branchDepth > 0 && (
        <div className="flex items-center gap-2 mb-2 ml-4">
          <CornerDownRight className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Branch reply</span>
        </div>
      )}

      <GlassCard
        className={cn(
          "overflow-hidden",
          isUser ? "bg-primary/5 border-primary/20" : ""
        )}
      >
        <div className="p-5">
          {/* Message header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center",
                  isUser
                    ? "bg-primary/10 text-primary"
                    : "bg-emerald-500/10 text-emerald-600"
                )}
              >
                {isUser ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {isUser ? "You" : "NodeBench"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatRelativeTime(message.timestamp)}
                </p>
              </div>
            </div>
            {!isUser && message.query && (
              <span className="text-xs text-muted-foreground max-w-[200px] truncate">
                Re: {searchQuery ? highlightSearchText(message.query, searchQuery) : message.query}
              </span>
            )}
          </div>

          {/* User message content */}
          {isUser && (
            <p className="text-foreground text-base leading-relaxed whitespace-pre-wrap">
              {searchQuery ? highlightSearchText(message.content, searchQuery) : message.content}
            </p>
          )}

          {/* Assistant message with progressive disclosure */}
          {!isUser && (
            <div className="space-y-4">
              {/* Expandable content */}
              <ExpandableMessage
                content={message.content}
                searchQuery={searchQuery}
                maxLength={MESSAGE_PREVIEW_LENGTH}
              />

              {/* Streaming indicator */}
              {message.isStreaming && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ProgressSpinner className="h-3 w-3" />
                  <span>Generating response...</span>
                </div>
              )}

              {/* Classification chip */}
              {message.classification && (
                <ClassificationChip
                  classification={message.classification}
                  isLoading={false}
                />
              )}

              {/* Progressive disclosure: Stages toggle */}
              {message.stages && message.stages.length > 0 && (
                <div className="border-t border-border/50 pt-3">
                  <button
                    onClick={() => setShowStages(!showStages)}
                    className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showStages ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {showStages ? "Hide pipeline" : `Pipeline (${message.stages.length} stages)`}
                  </button>
                  {showStages && (
                    <div className="mt-2 space-y-1 text-sm">
                      {message.stages.map((stage) => (
                        <div key={stage.tool} className="flex items-center gap-2">
                          {stage.status === "done" ? (
                            <Check className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <ProgressSpinner className="h-3 w-3" />
                          )}
                          <span className="text-muted-foreground">{stage.tool}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Progressive disclosure: Sources toggle */}
              {message.sources && message.sources.length > 0 && (
                <CollapsibleSources
                  sources={message.sources}
                  searchQuery={searchQuery}
                />
              )}
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                      */
/* ------------------------------------------------------------------ */

interface ChatHomePremiumProps {
  sessionIdParam?: string | null;
  preferredLens?: string | null;
  embedded?: boolean;
  onEntityCreated?: (entityName: string) => void;
  selectedSpreadsheetId?: string | null;
  setSelectedSpreadsheetId?: (id: string | null) => void;
  selectedDocumentId?: string | null;
  onDocumentSelect?: (id: string | null) => void;
  isGridMode?: boolean;
  setIsGridMode?: (v: boolean) => void;
  selectedTaskId?: string | null;
  selectedTaskSource?: "today" | "upcoming" | "week" | "other" | null;
  onSelectTask?: (id: string, source: "today" | "upcoming" | "week" | "other") => void;
  onClearTaskSelection?: () => void;
  onOpenFastAgent?: () => void;
  onOpenFastAgentWithPrompt?: (prompt: string) => void;
  activeSources?: string[];
  setActiveSources?: (sources: string[]) => void;
  setCurrentView?: (view: string) => void;
  setEntityName?: (name: string | null) => void;
}

export function ChatHomePremium(props: ChatHomePremiumProps) {
  const {
    sessionIdParam,
    preferredLens,
    embedded,
    onEntityCreated,
    selectedSpreadsheetId,
    setSelectedSpreadsheetId,
    selectedDocumentId,
    onDocumentSelect,
    isGridMode,
    setIsGridMode,
    selectedTaskId,
    selectedTaskSource,
    onSelectTask,
    onClearTaskSelection,
    onOpenFastAgent,
    onOpenFastAgentWithPrompt,
    activeSources,
    setActiveSources,
    setCurrentView,
    setEntityName,
  } = props;

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const convex = useConvexApi();
  const { identity, org } = useProductBootstrap();

  /* ── Draft state ── */
  const [inputValue, setInputValue] = useState("");
  const [lens, setLens] = useState<LensId>(() =>
    resolvePreferredLens({
      lensParam: searchParams.get("lens"),
      draftQuery: loadProductDraft().query,
      draftLens: loadProductDraft().lens,
      preferredLens,
    }),
  );

  /* ── Streaming ── */
  const {
    startStream,
    isStreaming,
    packet,
    error,
    stages,
    liveAnswerPreview,
    isClassifying,
    classification,
    runtimeBudget,
    sessionId,
    providerSummaries,
    conversation,
  } = useStreamingSearch();

  const isLoading = isStreaming || isClassifying;

  /* ── File upload ── */
  const [pendingFiles, setPendingFiles] = useState<ProductFileAsset[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── UI panels ── */
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [showThreadActions, setShowThreadActions] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  /* ── Session history (stub) ── */
  const [sessions] = useState<Array<{ id: string; query: string; timestamp: number }>>([]);

  /* ── Ultra-long chat: Conversation threading ── */
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  /* ── Ultra-long chat: In-conversation search ── */
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ messageId: string; index: number }[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);

  /* ── Ultra-long chat: Smart scroll ── */
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Ultra-long chat: Virtualization ── */
  const { enabled: shouldVirtualize } = useMessageVirtualization(messages.length, VIRTUALIZATION_THRESHOLD);

  /* ── Handlers ── */
  const handleFilesSelected = useCallback((files: ProductFileAsset[]) => {
    setPendingFiles((prev) => [...prev, ...files]);
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).map((file) => ({
      file,
      name: file.name,
      size: file.size,
      type: file.type,
    }));
    setPendingFiles((prev) => [...prev, ...files]);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!inputValue.trim() && pendingFiles.length === 0) return;

    trackEvent("chat_submit", { lens, hasFiles: pendingFiles.length > 0 });

    // Add user message to conversation history
    const userMessageId = generateMessageId();
    const userMessage: ConversationMessage = {
      id: userMessageId,
      role: "user",
      content: inputValue.trim(),
      timestamp: Date.now(),
      branchDepth: activeBranchId ? 1 : 0,
      parentId: activeBranchId,
    };
    setMessages((prev) => [...prev, userMessage]);

    let fileIds: string[] = [];
    if (pendingFiles.length > 0) {
      try {
        fileIds = await uploadProductDraftFiles(pendingFiles.map((f) => f.file));
        toast.success(`Uploaded ${pendingFiles.length} file${pendingFiles.length > 1 ? "s" : ""}`);
      } catch {
        toast.error("Failed to upload files");
      }
    }

    startStream({
      query: inputValue.trim(),
      lens,
      fileIds,
      preferredModel: undefined,
      sessionId: sessionIdParam || undefined,
      spreadsheetId: selectedSpreadsheetId || undefined,
      documentId: selectedDocumentId || undefined,
      taskId: selectedTaskId || undefined,
    });

    setPendingFiles([]);
    setInputValue("");

    // Reset scroll when sending new message
    setUserScrolledUp(false);
  }, [inputValue, pendingFiles, lens, sessionIdParam, selectedSpreadsheetId, selectedDocumentId, selectedTaskId, startStream, activeBranchId]);

  const handleLensChange = useCallback((newLens: LensId) => {
    setLens(newLens);
    trackEvent("lens_change", { from: lens, to: newLens });
  }, [lens]);

  /* ── Derived data ── */
  const sections = useMemo(
    () => deriveReportSections(packet, isStreaming, stages, liveAnswerPreview, deriveReportArtifactMode(inputValue)),
    [packet, isStreaming, stages, liveAnswerPreview, inputValue],
  );

  const sources: SourceCard[] = useMemo(() => {
    if (!packet?.sourceRefs) return [];
    return packet.sourceRefs.map((ref, i) => ({
      id: String(i),
      title: ref.title || ref.domain || "Source",
      domain: ref.domain || "unknown",
      url: ref.url,
      confidence: ref.confidence ?? 0.8,
      snippet: ref.snippet,
    }));
  }, [packet]);

  /* ── Effects ── */

  /* Add streaming result to conversation history when complete */
  useEffect(() => {
    if (!isStreaming && packet && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.role === "user" && !messages.find(m => m.parentId === lastMessage.id)) {
        const assistantMessage: ConversationMessage = {
          id: generateMessageId(),
          role: "assistant",
          content: packet.answer || liveAnswerPreview || "",
          query: lastMessage.content,
          timestamp: Date.now(),
          packet,
          sections,
          sources,
          classification: classification || undefined,
          parentId: lastMessage.id,
          branchDepth: lastMessage.branchDepth,
          isStreaming: false,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    }
  }, [isStreaming, packet, messages, sections, sources, classification, liveAnswerPreview]);

  /* Update streaming message in real-time */
  useEffect(() => {
    if (isStreaming && messages.length > 0 && liveAnswerPreview) {
      const lastUserMessage = [...messages].reverse().find(m => m.role === "user");
      if (lastUserMessage) {
        setMessages((prev) => {
          const lastAssistantIndex = prev.findIndex(m => m.parentId === lastUserMessage.id);
          if (lastAssistantIndex === -1) {
            // Create streaming assistant message
            return [...prev, {
              id: generateMessageId(),
              role: "assistant",
              content: liveAnswerPreview,
              query: lastUserMessage.content,
              timestamp: Date.now(),
              packet: null,
              sections,
              sources: [],
              stages,
              classification: classification || undefined,
              parentId: lastUserMessage.id,
              branchDepth: lastUserMessage.branchDepth,
              isStreaming: true,
            }];
          } else {
            // Update existing streaming message
            const newMessages = [...prev];
            newMessages[lastAssistantIndex] = {
              ...newMessages[lastAssistantIndex],
              content: liveAnswerPreview,
              sections,
              stages,
              isStreaming: true,
            };
            return newMessages;
          }
        });
      }
    }
  }, [isStreaming, liveAnswerPreview, stages, sections, classification, messages]);

  /* Build search index */
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setCurrentSearchIndex(0);
      return;
    }
    const results: { messageId: string; index: number }[] = [];
    messages.forEach((msg, idx) => {
      if (msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          msg.query?.toLowerCase().includes(searchQuery.toLowerCase())) {
        results.push({ messageId: msg.id, index: idx });
      }
    });
    setSearchResults(results);
    setCurrentSearchIndex(results.length > 0 ? 0 : -1);
  }, [searchQuery, messages]);

  /* Scroll to search result */
  useEffect(() => {
    if (searchResults.length > 0 && currentSearchIndex >= 0) {
      const result = searchResults[currentSearchIndex];
      const element = document.querySelector(`[data-message-id="${result.messageId}"]`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [currentSearchIndex, searchResults]);

  /* Smart scroll: detect user scroll up */
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      const isNearBottom = distanceFromBottom < 100;
      setShowScrollToBottom(!isNearBottom && messages.length > 3);
      setUserScrolledUp(!isNearBottom);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [messages.length]);

  /* Auto-scroll to bottom for new messages (unless user scrolled up) */
  useEffect(() => {
    if (!userScrolledUp && scrollContainerRef.current && messages.length > 0) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages.length, userScrolledUp]);

  useEffect(() => {
    if (sessionId) {
      saveLastChatPath(sessionId);
      const url = buildChatSessionPath(sessionId);
      if (shouldPersistDraftQueryInUrl()) {
        window.history.replaceState(null, "", url);
      }
    }
  }, [sessionId]);

  useEffect(() => {
    if (error) {
      toast.error(error.message || "Search failed");
    }
  }, [error]);

  /* ── Render ── */
  return (
    <div
      className="relative flex h-full flex-col bg-background"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/10 backdrop-blur-sm border-2 border-dashed border-primary rounded-lg m-4">
          <div className="text-center">
            <Paperclip className="h-12 w-12 text-primary mx-auto mb-2" />
            <p className="text-lg font-medium text-foreground">Drop files here</p>
            <p className="text-sm text-muted-foreground">PDF, images, documents</p>
          </div>
        </div>
      )}

      {/* Main scrollable area with virtualization */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-4 py-8">
          {/* Header with search bar */}
          <header className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">NodeBench</h1>
                <p className="text-sm text-muted-foreground">
                  {messages.length > 0 ? `${messages.length} messages` : "Deep research, surfaced"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* In-conversation search */}
              <ConversationSearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                onClear={() => setSearchQuery("")}
                resultCount={searchResults.length}
                currentIndex={currentSearchIndex}
                onNavigate={(dir) => {
                  if (dir === "prev") {
                    setCurrentSearchIndex((i) => Math.max(0, i - 1));
                  } else {
                    setCurrentSearchIndex((i) => Math.min(searchResults.length - 1, i + 1));
                  }
                }}
              />
              <button
                onClick={() => setShowHistory(true)}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                aria-label="Session history"
              >
                <History className="h-5 w-5 text-muted-foreground" />
              </button>
              <button
                onClick={() => setShowShareSheet(true)}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                aria-label="Share"
              >
                <Share2 className="h-5 w-5 text-muted-foreground" />
              </button>
              <button
                onClick={() => setShowThreadActions(true)}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                aria-label="More actions"
              >
                <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
          </header>

          {/* Conversation thread with virtualization */}
          {messages.length > 0 ? (
            <div className="space-y-6 mb-8">
              {shouldVirtualize ? (
                <VirtualizedMessageList
                  messages={messages}
                  renderMessage={(msg, idx) => (
                    <MessageBubble
                      message={msg}
                      searchQuery={searchQuery}
                      isHighlighted={searchResults[currentSearchIndex]?.messageId === msg.id}
                    />
                  )}
                  getMessageKey={(msg) => msg.id}
                  bufferSize={3}
                  containerRef={scrollContainerRef as React.RefObject<HTMLElement>}
                  enabled={shouldVirtualize}
                />
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={msg.id}
                    data-message-id={msg.id}
                    className={cn(
                      "transition-all duration-300",
                      searchResults[currentSearchIndex]?.messageId === msg.id && "ring-2 ring-primary ring-offset-2 rounded-xl"
                    )}
                  >
                    <MessageBubble message={msg} searchQuery={searchQuery} />
                  </div>
                ))
              )}
            </div>
          ) : (
            <>
              {/* Classification chip */}
              {classification && (
                <div className="mb-4">
                  <ClassificationChip
                    classification={classification}
                    isLoading={isClassifying}
                  />
                </div>
              )}

              {/* Progress stages */}
              {isStreaming && stages.length > 0 && (
                <GlassCard className="mb-6 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <ProgressSpinner className="h-4 w-4" />
                    <span className="text-sm font-medium text-foreground">Running research pipeline</span>
                  </div>
                  <div className="space-y-2">
                    {stages.map((stage) => (
                      <div key={stage.tool} className="flex items-center gap-2 text-sm">
                        {stage.status === "done" ? (
                          <Check className="h-4 w-4 text-emerald-500" />
                        ) : stage.status === "active" ? (
                          <ProgressSpinner className="h-4 w-4" />
                        ) : (
                          <Clock3 className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className={cn(
                          stage.status === "done" && "text-muted-foreground line-through",
                          stage.status === "active" && "text-foreground font-medium",
                          stage.status === "pending" && "text-muted-foreground"
                        )}>
                          {stage.tool}
                        </span>
                        {stage.detail && (
                          <span className="text-xs text-muted-foreground">{stage.detail}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </GlassCard>
              )}

              {/* Answer sections with progressive disclosure */}
              <div className="space-y-4">
                {sections.map((section) => (
                  <GlassCard key={section.id} hover>
                    <div className="p-6">
                      {section.status === "pending" && section.skeleton ? (
                        <div className="py-4 opacity-40">
                          <div className="h-5 bg-muted rounded w-1/3 mb-3 animate-pulse" />
                          <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
                        </div>
                      ) : section.status === "building" ? (
                        <div className="py-4">
                          <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                            {section.title}
                            <ProgressSpinner className="h-4 w-4" />
                          </h3>
                          <p className="text-muted-foreground">{section.body}</p>
                          <TypingIndicator />
                        </div>
                      ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                          <h3 className="text-xl font-semibold text-foreground mb-3">{section.title}</h3>
                          <ExpandableMessage content={section.body} maxLength={500} />
                          {section.sourceRefIds && section.sourceRefIds.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-4">
                              {section.sourceRefIds.slice(0, 6).map((refId, i) => {
                                const source = sources.find((s) => s.id === refId);
                                if (!source) return null;
                                return <SourceBadge key={refId} source={source} index={i} />;
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </GlassCard>
                ))}
              </div>

              {/* Progressive disclosure: Collapsible sources */}
              {sources.length > 0 && <CollapsibleSources sources={sources} />}
            </>
          )}

          {/* Low confidence warning for current packet */}
          {packet && packet.confidence !== undefined && packet.confidence < 0.5 && (
            <div className="mt-6">
              <LowConfidenceCard
                payload={{
                  confidence: packet.confidence,
                  sourcesCount: packet.sourceRefs?.length ?? 0,
                  primarySource: packet.sourceRefs?.[0]?.domain,
                }}
              />
            </div>
          )}

          {/* Smart scroll to bottom button */}
          <ScrollToBottomButton
            show={showScrollToBottom}
            onClick={() => {
              scrollContainerRef.current?.scrollTo({
                top: scrollContainerRef.current.scrollHeight,
                behavior: "smooth",
              });
              setUserScrolledUp(false);
            }}
          />

          {/* Empty state with starter prompts */}
          {!isLoading && !packet && (
            <div className="mt-12 text-center">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">What do you want to know?</h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Ask about companies, markets, roles, or upload documents for analysis.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => {
                      setInputValue(prompt);
                      handleSubmit();
                    }}
                    className="text-left p-4 rounded-xl bg-muted/50 hover:bg-muted border border-border/50 hover:border-border transition-all duration-200 group"
                  >
                    <p className="text-sm text-foreground group-hover:text-primary transition-colors">{prompt}</p>
                    <ChevronRight className="h-4 w-4 text-muted-foreground mt-2 group-hover:translate-x-1 transition-transform" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating composer */}
      <div className="shrink-0 border-t border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-4xl px-4 py-4">
          {/* Pending file chips */}
          {pendingFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {pendingFiles.map((file, i) => (
                <div
                  key={i}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-sm text-foreground"
                >
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate max-w-[150px]">{file.name}</span>
                  <button
                    onClick={() => handleRemoveFile(i)}
                    className="hover:text-destructive transition-colors"
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Lens selector */}
          <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1">
            {LENSES.map((l) => (
              <button
                key={l.id}
                onClick={() => handleLensChange(l.id as LensId)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 whitespace-nowrap",
                  lens === l.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* Input row */}
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder="Ask anything... (Shift+Enter for new line)"
                className="w-full min-h-[56px] max-h-[200px] resize-y rounded-xl bg-muted px-4 py-3 pr-24 text-foreground placeholder:text-muted-foreground outline-none border border-border/50 focus:border-primary/50 transition-colors"
                disabled={isLoading}
                rows={1}
              />
              <div className="absolute right-2 bottom-2 flex items-center gap-1">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Attach files"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIsTranscribing(true)}
                  disabled={isLoading}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Voice input"
                >
                  <Mic className="h-4 w-4" />
                </button>
              </div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={isLoading || (!inputValue.trim() && pendingFiles.length === 0)}
              className={cn(
                "p-3 rounded-xl transition-all duration-200 shrink-0",
                inputValue.trim() || pendingFiles.length > 0
                  ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
              aria-label="Send"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) {
                const files = Array.from(e.target.files).map((file) => ({
                  file,
                  name: file.name,
                  size: file.size,
                  type: file.type,
                }));
                handleFilesSelected(files);
              }
            }}
          />

          {/* Bottom toolbar */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Settings className="h-3 w-3" />
                {lens}
              </span>
              {runtimeBudget && (
                <span className="flex items-center gap-1">
                  <Clock3 className="h-3 w-3" />
                  {Math.round(runtimeBudget.usedMs / 1000)}s
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {sessionId && (
                <SaveToNotebookButton
                  sessionId={sessionId}
                  variant="ghost"
                  size="sm"
                />
              )}
              {packet && (
                <button
                  onClick={() => setShowShareSheet(true)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <Share2 className="h-3 w-3" />
                  Share
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Side panels */}
      {showShareSheet && sessionId && (
        <ChatShareSheet
          shareUrl={buildChatShareUrl(sessionId)}
          onClose={() => setShowShareSheet(false)}
        />
      )}

      {showThreadActions && sessionId && (
        <ThreadActionsSheet
          sessionId={sessionId}
          onClose={() => setShowThreadActions(false)}
          onRename={(name) => toast.success(`Renamed to ${name}`)}
          onDelete={() => {
            toast.success("Thread deleted");
            navigate("/");
          }}
        />
      )}

      {/* History sidebar */}
      {showHistory && (
        <div className="fixed inset-y-0 right-0 w-80 bg-card border-l border-border shadow-xl z-50 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="font-semibold text-foreground">History</h2>
            <button
              onClick={() => setShowHistory(false)}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No previous sessions</p>
            ) : (
              sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    navigate(buildChatSessionPath(s.id));
                    setShowHistory(false);
                  }}
                  className="w-full text-left p-3 rounded-xl hover:bg-muted transition-colors group"
                >
                  <p className="text-sm text-foreground truncate">{s.query}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatRelativeTime(s.timestamp)}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Transcribing overlay */}
      {isTranscribing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Mic className="h-8 w-8 text-primary" />
            </div>
            <p className="text-lg font-medium text-foreground">Listening...</p>
            <p className="text-sm text-muted-foreground mt-2">Speak clearly</p>
            <button
              onClick={() => setIsTranscribing(false)}
              className="mt-4 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-sm text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatHomePremium;
