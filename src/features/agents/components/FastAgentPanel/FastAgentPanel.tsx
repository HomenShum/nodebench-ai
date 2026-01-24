// src/components/FastAgentPanel/FastAgentPanel.tsx
// Main container component for the new ChatGPT-like AI chat sidebar

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConvex, usePaginatedQuery, useQuery, useMutation, useAction, useConvexAuth } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import { X, Plus, Radio, Bot, Loader2, ChevronDown, MessageSquare, Activity, Minimize2, Maximize2, BookOpen, LogIn, Share2, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { useUIMessages } from '@convex-dev/agent/react';

import './FastAgentPanel.animations.css';
import { FastAgentThreadList } from './FastAgentPanel.ThreadList';
import { MessageStream } from './FastAgentPanel.MessageStream';
import { UIMessageStream } from './FastAgentPanel.UIMessageStream';
import { FastAgentInputBar } from './FastAgentPanel.InputBar';
import { FileUpload } from './FastAgentPanel.FileUpload';
import { ExportMenu } from './FastAgentPanel.ExportMenu';
import { Settings as SettingsPanel } from './FastAgentPanel.Settings';
import { AgentHierarchy } from './FastAgentPanel.AgentHierarchy';
import { HumanRequestList } from './HumanRequestCard';
import { FastAgentUIMessageBubble } from './FastAgentPanel.UIMessageBubble';
import { MessageHandlersProvider } from './MessageHandlersContext';
import { VirtualizedMessageList, useMessageVirtualization } from './VirtualizedMessageList';
import { SkillsPanel } from './FastAgentPanel.SkillsPanel';
import { DisclosureTrace, type DisclosureEvent } from './FastAgentPanel.DisclosureTrace';
import { AgentTasksTab } from './FastAgentPanel.AgentTasksTab';
import { ParallelTaskTimeline } from './FastAgentPanel.ParallelTaskTimeline';
import { EditsTab } from './FastAgentPanel.EditsTab';
import { BriefTab } from './FastAgentPanel.BriefTab';
import { TaskManagerView } from '../TaskManager';
// ThreadTabBar removed - functionality consolidated into simplified header
import { SwarmLanesView } from './SwarmLanesView';
import { SwarmQuickActions } from './SwarmQuickActions';
import { useSwarmByThread, useSwarmActions, parseSpawnCommand, isSpawnCommand } from '@/hooks/useSwarm';
import { MemoryStatusHeader, type PlanItem } from './MemoryStatusHeader';
import { ContextBar, type ContextConstraint } from './ContextBar';
import { LiveAgentLanes } from '@/features/agents/views/LiveAgentLanes';
import type { LiveEvent } from './LiveEventCard';
import { RichMediaSection } from './RichMediaSection';
import { DocumentActionGrid, extractDocumentActions, type DocumentAction } from './DocumentActionCard';
import { extractMediaFromText, type ExtractedMedia } from './utils/mediaExtractor';
import type { SpawnedAgent } from './types/agent';
import type { AgentOpenOptions, DossierContext } from '@/features/agents/context/FastAgentContext';
import { buildDossierContextPrefix } from '@/features/agents/context/FastAgentContext';
import { DossierModeIndicator } from '@/features/agents/components/DossierModeIndicator';
import { DEFAULT_MODEL, type ApprovedModel } from '@shared/llm/approvedModels';
import { useAnonymousSession } from '../../hooks/useAnonymousSession';

import type {
  Message,
  Thread,
  ThinkingStep,
  ToolCall,
  Source
} from './types';

interface FastAgentPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDocumentId?: Id<"documents">;
  selectedDocumentIds?: Id<"documents">[];
  initialThreadId?: string | null; // Allow external components to set the active thread
  variant?: 'overlay' | 'sidebar';
  /** Contextual open options from FastAgentContext (prefill/autosend/context docs/urls). */
  openOptions?: AgentOpenOptions | null;
  /** Called after openOptions has been applied (prevents duplicate processing). */
  onOptionsConsumed?: () => void;
}

function DossierFocusSubscription({
  briefId,
  dossierContextRef,
  dossierPrefixRef,
}: {
  briefId: string;
  dossierContextRef: React.MutableRefObject<DossierContext | null>;
  dossierPrefixRef: React.MutableRefObject<string>;
}) {
  const focusState = useQuery(api.domains.dossier.focusState.getFocusState, { briefId });

  useEffect(() => {
    const base = dossierContextRef.current;
    if (!base?.briefId) {
      dossierPrefixRef.current = "";
      return;
    }

    const merged: DossierContext = {
      ...base,
      currentAct: (focusState as any)?.currentAct ?? base.currentAct,
      focusedDataIndex: (focusState as any)?.focusedDataIndex ?? base.focusedDataIndex,
      focusedSeriesId: (focusState as any)?.focusedSeriesId ?? base.focusedSeriesId,
      activeSectionId: (focusState as any)?.activeSectionId ?? base.activeSectionId,
    };

    dossierPrefixRef.current = buildDossierContextPrefix(merged);
  }, [focusState, dossierContextRef, dossierPrefixRef]);

  return null;
}

/**
 * FastAgentPanel - Next-gen AI chat sidebar with ChatGPT-like UX
 *
 * Dual-mode architecture:
 * - Agent Mode: @convex-dev/agent with automatic memory (non-streaming)
 * - Agent Streaming Mode: @convex-dev/agent + real-time streaming output
 *
 * Features:
 * - Thread-based conversations with automatic memory management
 * - Real-time streaming responses (agent streaming mode)
 * - Fast mode toggle
 * - Live thinking/tool visualization
 * - Clean, minimal interface
 */
export function FastAgentPanel({
  isOpen,
  onClose,
  selectedDocumentId: _selectedDocumentId,
  selectedDocumentIds: _selectedDocumentIds,
  initialThreadId,
  variant = 'overlay',
  openOptions = null,
  onOptionsConsumed,
}: FastAgentPanelProps) {
  // ========== AUTH ==========
  const { isAuthenticated } = useConvexAuth();
  const convex = useConvex();
  const navigate = useNavigate();

  // ========== ANONYMOUS SESSION (5 free messages/day for unauthenticated users) ==========
  const anonymousSession = useAnonymousSession();

  // ========== STATE ==========
  // Agent component uses string threadIds, not Id<"chatThreads">
  const [activeThreadId, setActiveThreadId] = useState<string | null>(initialThreadId || null);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [exportingThreadId, setExportingThreadId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Multi-document selection
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<Set<string>>(
    _selectedDocumentIds ? new Set(_selectedDocumentIds.map(id => String(id))) : new Set()
  );
  const [showDocumentSelector, setShowDocumentSelector] = useState(false);

  // Contextual-open handling (FastAgentContext.openWithContext)
  const lastHandledOpenRequestIdRef = useRef<string | null>(null);
  const [pendingAutoSend, setPendingAutoSend] = useState<null | { requestId: string; message: string }>(null);
  // Guard against duplicate auto-sends
  const lastAutoSentRequestIdRef = useRef<string | null>(null);
  // Guard against duplicate manual sends (rapid clicks)
  const lastSentMessageRef = useRef<{ text: string; timestamp: number } | null>(null);

  // Dossier mode: persist dossier context after openOptions is consumed
  const dossierContextRef = useRef<DossierContext | null>(null);
  const dossierPrefixRef = useRef<string>("");
  const [dossierBriefId, setDossierBriefId] = useState<string | null>(null);

  // Chat mode: 'agent' (non-streaming) or 'agent-streaming' (with streaming output)
  // Note: Anonymous users MUST use agent-streaming mode (agent mode requires authentication)
  const [chatMode, setChatMode] = useState<'agent' | 'agent-streaming'>(() => {
    // Load from localStorage
    const saved = localStorage.getItem('fastAgentPanel.chatMode');
    return (saved === 'agent-streaming' || saved === 'agent') ? saved : 'agent-streaming';
  });

  // Force anonymous users to agent-streaming mode (agent mode requires auth)
  useEffect(() => {
    if (!isAuthenticated && chatMode === 'agent') {
      setChatMode('agent-streaming');
    }
  }, [isAuthenticated, chatMode]);

  // Settings
  const [fastMode, setFastMode] = useState(true);
  // Use approved model aliases only (9 approved models) - uses DEFAULT_MODEL from shared/llm/approvedModels.ts
  const [selectedModel, setSelectedModel] = useState<ApprovedModel>(DEFAULT_MODEL);
  const [arbitrageEnabled, setArbitrageEnabled] = useState(false);

  // Thread list collapse state
  const [showSidebar, setShowSidebar] = useState(false);

  // Minimize mode state - persisted to localStorage
  const [isMinimized, setIsMinimized] = useState(() => {
    const saved = localStorage.getItem('fastAgentPanel.isMinimized');
    return saved === 'true';
  });

  // Live Events Panel state
  const [showEventsPanel, setShowEventsPanel] = useState(false);
  // Note: liveEvents useMemo is defined after streamingMessages to avoid reference before initialization

  // Skills Panel state
  const [showSkillsPanel, setShowSkillsPanel] = useState(false);

  // Overflow menu state (for secondary actions)
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const overflowMenuRef = useRef<HTMLDivElement>(null);

  // File attachment state
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  // Context documents from drag-and-drop
  const [contextDocuments, setContextDocuments] = useState<Array<{
    id: string;
    title: string;
    type?: 'document' | 'dossier' | 'note';
    analyzing?: boolean;
  }>>([]);

  // Calendar events context from drag-and-drop
  const [contextCalendarEvents, setContextCalendarEvents] = useState<Array<{
    id: string;
    title: string;
    startTime: number;
    endTime?: number;
    allDay?: boolean;
    location?: string;
    description?: string;
  }>>([]);

  const handleAttachFiles = (files: File[]) => {
    setAttachedFiles(prev => [...prev, ...files]);
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddContextDocument = (doc: { id: string; title: string; type?: 'document' | 'dossier' | 'note'; analyzing?: boolean }) => {
    setContextDocuments(prev => {
      // Update existing or add new
      const existing = prev.find(d => d.id === doc.id);
      if (existing) {
        return prev.map(d => d.id === doc.id ? doc : d);
      }
      return [...prev, doc];
    });
  };

  const handleRemoveContextDocument = (docId: string) => {
    setContextDocuments(prev => prev.filter(d => d.id !== docId));
  };

  const handleAddCalendarEvent = (event: { id: string; title: string; startTime: number; endTime?: number; allDay?: boolean; location?: string; description?: string }) => {
    setContextCalendarEvents(prev => {
      // Avoid duplicates
      const existing = prev.find(e => e.id === event.id);
      if (existing) return prev;
      return [...prev, event];
    });
  };

  const handleRemoveCalendarEvent = (eventId: string) => {
    setContextCalendarEvents(prev => prev.filter(e => e.id !== eventId));
  };

  // Live streaming state
  const [liveThinking, setLiveThinking] = useState<ThinkingStep[]>([]);
  const [liveTokens, setLiveTokens] = useState<string>("");
  const [liveAgents, setLiveAgents] = useState<SpawnedAgent[]>([]);

  const [liveToolCalls, setLiveToolCalls] = useState<ToolCall[]>([]);
  const [liveSources, setLiveSources] = useState<Source[]>([]);

  // Progressive Disclosure state
  const [disclosureEvents, setDisclosureEvents] = useState<DisclosureEvent[]>([]);
  const [showDisclosureTrace, setShowDisclosureTrace] = useState(false);

  // Tab state - Chat, Sources, and Telemetry (Task History)
  const [activeTab, setActiveTab] = useState<'chat' | 'sources' | 'telemetry'>('chat');
  const [isThreadDropdownOpen, setIsThreadDropdownOpen] = useState(false);

  // Swarm hooks - for parallel agent orchestration
  const { swarm, tasks: swarmTasks, isActive: isSwarmActive } = useSwarmByThread(activeThreadId || undefined);
  const { spawnSwarm } = useSwarmActions();

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Track auto-created documents to avoid duplicates (by agentThreadId) and processed message IDs
  const autoDocCreatedThreadIdsRef = useRef<Set<string>>(new Set());

  const humanRequests = useQuery(
    api.domains.agents.humanInTheLoop.getPendingHumanRequests,
    (isAuthenticated && activeThreadId) ? { threadId: activeThreadId } : 'skip'
  );

  // Query for agent planning data (ambient memory - plan progress)
  const agentPlans = useQuery(
    api.domains.agents.agentPlanning.listPlans,
    isAuthenticated ? { limit: 5 } : 'skip'
  );

  // Query for agent memory (context constraints / scratchpad)
  const agentMemory = useQuery(
    api.domains.agents.agentMemory.listMemory,
    isAuthenticated ? { limit: 10 } : 'skip'
  );

  // Transform plans into PlanItem format for MemoryStatusHeader
  const planItems = useMemo((): PlanItem[] => {
    if (!agentPlans || agentPlans.length === 0) return [];

    // Get the most recent plan
    const latestPlan = agentPlans[0];
    if (!latestPlan?.steps) return [];

    return latestPlan.steps.map((step: any, idx: number) => ({
      id: `${latestPlan._id}-${idx}`,
      name: step.name,
      status: step.status === 'completed' ? 'done'
        : step.status === 'in_progress' ? 'active'
          : 'queued',
    }));
  }, [agentPlans]);

  // Transform memory into constraints for ContextBar
  const contextConstraints = useMemo((): ContextConstraint[] => {
    if (!agentMemory) return [];

    // Filter for constraint-type memory entries (e.g., keys like 'constraint:*' or 'context:*')
    return agentMemory
      .filter((m: any) => m.key.startsWith('constraint:') || m.key.startsWith('context:') || m.key === 'scratchpad')
      .map((m: any) => ({
        id: m._id,
        label: m.key.replace(/^(constraint:|context:)/, ''),
        value: m.content.length > 30 ? m.content.slice(0, 30) + '...' : m.content,
        type: m.key.startsWith('constraint:') ? 'rule' as const : 'custom' as const,
      }));
  }, [agentMemory]);

  const processedDocMessageIdsRef = useRef<Set<string>>(new Set());

  // Update active thread when initialThreadId changes (for external navigation)
  useEffect(() => {
    if (initialThreadId && initialThreadId !== activeThreadId) {
      console.log('[FastAgentPanel] Setting active thread from external source:', initialThreadId);
      setActiveThreadId(initialThreadId);
    }
  }, [initialThreadId, activeThreadId]);

  // Apply openOptions once per requestId, and optionally auto-send.
  useEffect(() => {
    if (!isOpen) return;
    const requestId = openOptions?.requestId;
    if (!requestId) return;
    if (lastHandledOpenRequestIdRef.current === requestId) return;
    lastHandledOpenRequestIdRef.current = requestId;

    const contextDocIds = (openOptions?.contextDocumentIds ?? []).map(String).filter(Boolean);
    if (contextDocIds.length > 0) {
      setSelectedDocumentIds((prev) => {
        const next = new Set(prev);
        for (const id of contextDocIds) next.add(id);
        return next;
      });
    }

    const initial = typeof openOptions?.initialMessage === "string" ? openOptions.initialMessage.trim() : "";
    const titleLine = typeof openOptions?.contextTitle === "string" && openOptions.contextTitle.trim()
      ? `Context: ${openOptions.contextTitle.trim()}`
      : "";

    const urlLines = (openOptions?.contextWebUrls ?? [])
      .map((u) => (typeof u === "string" ? u.trim() : ""))
      .filter(Boolean)
      .map((u) => `- ${u}`)
      .join("\n");

    // Build dossier context prefix if in dossier mode
    const dossierPrefix = buildDossierContextPrefix(openOptions?.dossierContext ?? null);

    const extraContext = [
      dossierPrefix, // Include dossier context first for agent awareness
      titleLine,
      urlLines ? `URLs:\n${urlLines}` : "",
    ].filter(Boolean).join("\n\n");

    const message = initial ? (extraContext ? `${initial}\n\n${extraContext}` : initial) : "";

    if (!message) {
      // Only context docs (no prompt) - mark consumed so it doesn't re-run.
      onOptionsConsumed?.();
      return;
    }

    // Start a new chat for contextual requests to avoid cross-thread leakage.
    setActiveThreadId(null);
    setAttachedFiles([]);
    setInput(message);
    setChatMode("agent-streaming");
    setPendingAutoSend({ requestId, message });
  }, [isOpen, openOptions, onOptionsConsumed]);

  // Persist dossier context so it remains available after openOptions is consumed/cleared.
  useEffect(() => {
    if (!isOpen) {
      dossierContextRef.current = null;
      dossierPrefixRef.current = "";
      setDossierBriefId(null);
      return;
    }

    const next = openOptions?.dossierContext ?? null;
    if (!next?.briefId) return;

    dossierContextRef.current = next;
    dossierPrefixRef.current = buildDossierContextPrefix(next);
    setDossierBriefId(next.briefId);
  }, [isOpen, openOptions?.dossierContext]);

  // ========== CONVEX QUERIES & MUTATIONS ==========
  // Agent mode: Using @convex-dev/agent component
  const agentThreadsPagination = usePaginatedQuery(
    api.domains.agents.agentChat.listUserThreads,
    isAuthenticated && chatMode === "agent" ? {} : "skip",
    { initialNumItems: 20 }
  );
  const agentMessagesResult = useQuery(
    api.domains.agents.agentChat.getThreadMessages,
    activeThreadId && chatMode === 'agent' ? {
      threadId: activeThreadId,
      paginationOpts: { numItems: 100, cursor: null }
    } : "skip"
  );
  const agentMessages = agentMessagesResult?.page;

  // Agent-based actions
  const createThreadWithMessage = useAction(api.domains.agents.agentChatActions.createThreadWithMessage);
  const continueThreadAction = useAction(api.domains.agents.agentChatActions.continueThread);
  const deleteAgentThread = useMutation(api.domains.agents.agentChat.deleteThread);

  // Agent Streaming mode: Using agent component's native streaming
  // Note: Anonymous users can also use streaming mode with their sessionId
  const streamingThreadsPagination = usePaginatedQuery(
    api.domains.agents.fastAgentPanelStreaming.listThreads,
    chatMode === "agent-streaming" ? {} : "skip",
    { initialNumItems: 20 }
  );
  const requestStreamCancel = useMutation(api.domains.agents.fastAgentPanelStreaming.requestStreamCancel);

  // Get the agent thread ID for streaming mode
  // Pass anonymousSessionId for anonymous users to validate ownership
  const streamingThread = useQuery(
    api.domains.agents.fastAgentPanelStreaming.getThreadByStreamId,
    activeThreadId && chatMode === 'agent-streaming'
      ? {
        threadId: activeThreadId as Id<"chatThreadsStream">,
        anonymousSessionId: anonymousSession.sessionId ?? undefined,
      }
      : "skip"
  );

  // Use useUIMessages hook for streaming messages with delta support
  // This hook expects the threadId to be the Agent component's threadId (string), not our chatThreadsStream ID
  // Pass anonymousSessionId for anonymous users to validate access
  const { results: streamingMessages, status: _streamingStatus, error: streamError } = useUIMessages(
    api.domains.agents.fastAgentPanelStreaming.getThreadMessagesWithStreaming,
    streamingThread?.agentThreadId && chatMode === 'agent-streaming'
      ? {
        threadId: streamingThread.agentThreadId,
        anonymousSessionId: anonymousSession.sessionId ?? undefined,
      }
      : "skip",
    {
      initialNumItems: 100,
      stream: true,  // CRITICAL: Enable streaming deltas.
    }
  );

  // Handle stream errors
  useEffect(() => {
    if (streamError) {
      console.error('[FastAgentPanel] Stream error:', streamError);
      // Don't show toast for timeout errors - they're handled by SafeImage component
      if (!streamError.message?.includes('Timeout while downloading')) {
        toast.error(`Stream error: ${streamError.message}`);
      }
    }
  }, [streamError]);

  const isGenerating = useMemo(() => {
    if (chatMode !== "agent-streaming") return false;
    if (!streamingMessages || streamingMessages.length === 0) return false;
    return streamingMessages.some(
      (m: any) => m?.role === "assistant" && (m?.status === "streaming" || m?.status === "pending")
    );
  }, [chatMode, streamingMessages]);

  const isBusy = isStreaming || isGenerating;

  const handleStopStreaming = useCallback(async () => {
    if (chatMode !== "agent-streaming") {
      setIsStreaming(false);
      return;
    }
    if (!activeThreadId) {
      setIsStreaming(false);
      return;
    }
    if (!isAuthenticated) {
      toast.info("Sign in to cancel generation.");
      return;
    }

    try {
      await requestStreamCancel({ threadId: activeThreadId as Id<"chatThreadsStream"> });
    } catch (err) {
      console.error("[FastAgentPanel] Failed to cancel stream:", err);
      toast.error("Failed to cancel");
    } finally {
      setIsStreaming(false);
    }
  }, [activeThreadId, chatMode, isAuthenticated, requestStreamCancel]);

  // Live Events - extracted from streaming messages (must be after streamingMessages definition)
  const liveEvents = useMemo<LiveEvent[]>(() => {
    if (chatMode !== "agent-streaming") return [];
    if (!streamingMessages || streamingMessages.length === 0) return [];

    const events: LiveEvent[] = [];
    let eventCounter = 0;

    const toToolName = (part: any): string => {
      if (typeof part?.toolName === "string" && part.toolName.trim()) return part.toolName.trim();
      if (typeof part?.name === "string" && part.name.trim()) return part.name.trim();

      const type = typeof part?.type === "string" ? part.type : "";
      const typed = type.match(/^tool-(?:call|result|error)-(.+)$/);
      if (typed?.[1]) return typed[1];

      const generic = type.match(/^tool-(.+)$/);
      if (generic?.[1]) return generic[1];
      return "unknown";
    };

    for (const raw of streamingMessages as any[]) {
      const msg = raw?.message ?? raw;
      const role = msg?.role ?? raw?.role;
      const parts = Array.isArray(msg?.parts) ? msg.parts : Array.isArray(raw?.parts) ? raw.parts : [];
      if (role !== "assistant" || parts.length === 0) continue;

      const baseTimestamp =
        typeof raw?._creationTime === "number"
          ? raw._creationTime
          : typeof msg?._creationTime === "number"
            ? msg._creationTime
            : Date.now();

      for (const part of parts) {
        const partType = typeof part?.type === "string" ? part.type : "";
        const isResult = partType === "tool-result" || partType.startsWith("tool-result");
        const isError = partType === "tool-error" || partType.startsWith("tool-error");
        const isCall =
          !isResult &&
          !isError &&
          (partType === "tool-call" || partType.startsWith("tool-"));
        if (!isCall && !isResult && !isError) continue;

        const toolName = toToolName(part);
        const title = toolName;
        const toolCallId =
          typeof part?.toolCallId === "string" && part.toolCallId.trim() ? part.toolCallId.trim() : null;
        const idBase = toolCallId ?? raw?._id ?? raw?.id ?? msg?._id ?? msg?.id ?? "msg";
        const timestamp = baseTimestamp + eventCounter;
        eventCounter += 1;

        const resultText = part?.output ?? part?.result;
        const errorText = part?.error ?? part?.output ?? part?.result;

        events.push({
          id: `${idBase}-${eventCounter}`,
          type: isError ? "tool_error" : isResult ? "tool_end" : "tool_start",
          status: isError ? "error" : isResult ? "success" : "running",
          title,
          toolName,
          details:
            isResult && resultText
              ? typeof resultText === "string"
                ? String(resultText).slice(0, 160)
                : "Completed"
              : isError && errorText
                ? String(errorText).slice(0, 160)
                : isCall
                  ? "Executing..."
                  : undefined,
          timestamp,
        });
      }
    }

    return events;
  }, [chatMode, streamingMessages]);

  const createStreamingThread = useAction(api.domains.agents.fastAgentPanelStreaming.createThread);
  const sendStreamingMessage = useMutation(api.domains.agents.fastAgentPanelStreaming.initiateAsyncStreaming);
  const deleteStreamingThread = useMutation(api.domains.agents.fastAgentPanelStreaming.deleteThread);
  const deleteMessage = useMutation(api.domains.agents.fastAgentPanelStreaming.deleteMessage);
  const saveChatSessionToDossier = useMutation(api.domains.documents.documents.saveChatSessionToDossier);
  // Append to landing page signals log
  const appendToSignalsLog = useMutation((api as any).domains.landing.landingPageLog.appendFromUser);
  // NEW: Unified document generation and creation action
  const generateAndCreateDocument = useAction(api.domains.agents.fastAgentDocumentCreation.generateAndCreateDocument);
  // Auto-naming action for threads
  const autoNameThread = useAction(api.domains.agents.fastAgentPanelStreaming.autoNameThread);
  // Client does not trigger server workflows directly; coordinator handles routing via useCoordinator: true

  // Use the appropriate data based on mode
  const threads = chatMode === 'agent' ? agentThreadsPagination.results : streamingThreadsPagination.results;
  const threadsStatus = chatMode === 'agent' ? agentThreadsPagination.status : streamingThreadsPagination.status;
  const loadMoreThreads = chatMode === 'agent' ? agentThreadsPagination.loadMore : streamingThreadsPagination.loadMore;
  const hasMoreThreads = threadsStatus === "CanLoadMore";
  const isLoadingMoreThreads = threadsStatus === "LoadingMore";

  // For agent mode, use the regular messages
  // For streaming mode, we use streamingMessages directly (UIMessage format)
  const messages = agentMessages;

  const formatTimeAgo = useCallback((timestamp?: number | null): string => {
    if (!timestamp) return "";
    const diffMs = Date.now() - timestamp;
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }, []);

  // ========== EFFECTS ==========

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, liveThinking, liveToolCalls]);

  // Persist chat mode to localStorage
  useEffect(() => {
    localStorage.setItem('fastAgentPanel.chatMode', chatMode);
  }, [chatMode]);

  // Persist minimize mode to localStorage
  useEffect(() => {
    localStorage.setItem('fastAgentPanel.isMinimized', String(isMinimized));
  }, [isMinimized]);

  // Reset active thread when switching chat modes
  useEffect(() => {
    setActiveThreadId(null);
    toast.info(`Switched to ${chatMode === 'agent' ? 'Agent' : 'Agent Streaming'} mode`);
  }, [chatMode]);

  // Live events are derived from streaming messages (no state updates; avoids render loops).

  // Client no longer triggers workflows directly; coordinator handles routing via useCoordinator: true

  // ========== HANDLERS ==========

  const handleCreateThread = useCallback(async () => {
    if (chatMode === 'agent') {
      // For Agent-based API, threads are created automatically when sending the first message
      setActiveThreadId(null);
      toast.success("Ready to start new chat");
    } else {
      // For agent streaming mode, create a new thread immediately
      try {
        const threadId = await createStreamingThread({
          title: "New Chat",
          model: selectedModel,
          // Pass anonymous session ID for unauthenticated users
          anonymousSessionId: anonymousSession.sessionId ?? undefined,
        });
        setActiveThreadId(threadId);
        toast.success("New chat created");
      } catch (error) {
        console.error('Failed to create thread:', error);
        toast.error('Failed to create new chat');
      }
    }
  }, [chatMode, createStreamingThread, selectedModel, anonymousSession.sessionId]);

  const handleDeleteThread = useCallback(async (threadId: string) => {
    try {
      if (chatMode === 'agent') {
        await deleteAgentThread({ threadId });
      } else {
        await deleteStreamingThread({ threadId: threadId as Id<"chatThreadsStream"> });
      }

      // If deleted thread was active, select another
      if (activeThreadId === threadId) {
        const remainingThreads = (threads ?? []).filter((t) => t._id !== threadId);
        setActiveThreadId(remainingThreads[0]?._id ?? null);
      }

      toast.success('Conversation deleted');
    } catch (error) {
      console.error('Failed to delete thread:', error);
      toast.error('Failed to delete conversation');
    }
  }, [activeThreadId, threads, chatMode, deleteAgentThread, deleteStreamingThread]);

  const handleExportThread = useCallback((threadId: string) => {
    setExportingThreadId(threadId);
  }, []);

  const handleSaveSession = useCallback(async () => {
    if (!activeThreadId) {
      toast.error("No active chat session to save");
      return;
    }

    try {
      // Get the agent thread ID for streaming mode
      const threadIdToSave = chatMode === 'agent-streaming' && streamingThread?.agentThreadId
        ? streamingThread.agentThreadId
        : activeThreadId;

      // Get the thread title
      const currentThread = threads?.find((t) => t._id === activeThreadId);
      const threadTitle = currentThread?.title || "Chat Session";

      const result = await saveChatSessionToDossier({
        threadId: threadIdToSave,
        title: threadTitle,
      });

      toast.success(
        <div className="flex flex-col gap-1">
          <div className="font-medium">Session saved!</div>
          <div className="text-xs text-[var(--text-secondary)]">
            {result.assetCount} media assets linked
          </div>
        </div>
      );
    } catch (error) {
      console.error("Failed to save session:", error);
      toast.error("Failed to save chat session");
    }
  }, [activeThreadId, chatMode, streamingThread, threads, saveChatSessionToDossier]);

  const handleSendMessage = useCallback(async (content?: string) => {
    const text = (content ?? input).trim();
    console.log('[FastAgentPanel] 🎯 handleSendMessage called, text:', text.substring(0, 30) + '...', 'isBusy:', isBusy);
    if (!text || isBusy) return;

    // ⚡ CRITICAL GUARD: Prevent duplicate sends of same message within 3 seconds
    const now = Date.now();
    const DEDUPE_WINDOW_MS = 3000;
    if (lastSentMessageRef.current &&
        lastSentMessageRef.current.text === text &&
        now - lastSentMessageRef.current.timestamp < DEDUPE_WINDOW_MS) {
      console.log('[FastAgentPanel] 🛑 Send BLOCKED - duplicate message within', DEDUPE_WINDOW_MS, 'ms');
      return;
    }
    lastSentMessageRef.current = { text, timestamp: now };
    console.log('[FastAgentPanel] ✅ Send ALLOWED - message recorded for deduplication');

    // Check if anonymous user has exceeded their daily limit
    if (anonymousSession.isAnonymous && !anonymousSession.canSendMessage) {
      toast.error(
        <div className="flex flex-col gap-1">
          <div className="font-medium">Daily limit reached</div>
          <div className="text-xs">Sign in for unlimited access!</div>
        </div>
      );
      return;
    }

    // Check if this is a document creation request
    const docCreationMatch = text.match(/^(?:make|create)\s+(?:new\s+)?document\s+(?:about|on|for)\s+(.+)$/i);

    if (docCreationMatch && chatMode === 'agent-streaming') {
      const topic = docCreationMatch[1];
      console.log('[FastAgentPanel] Document creation request detected for topic:', topic);

      setInput('');
      setIsStreaming(true);

      try {
        // Get or create thread
        let threadId = activeThreadId;
        if (!threadId) {
          const streamingThread = await createStreamingThread({
            title: `Create document about ${topic}`,
            model: selectedModel,
            anonymousSessionId: anonymousSession.sessionId ?? undefined,
          });
          threadId = streamingThread;
          setActiveThreadId(threadId);
        }

        // Get the agent thread ID (may not be immediately available in the subscription after create)
        let agentThreadId: string | undefined =
          activeThreadId === threadId ? streamingThread?.agentThreadId : undefined;

        if (!agentThreadId) {
          const fetched = await convex.query(api.domains.agents.fastAgentPanelStreaming.getThreadByStreamId, {
            threadId: threadId as Id<"chatThreadsStream">,
          });
          agentThreadId = (fetched as any)?.agentThreadId;
        }

        if (!agentThreadId) {
          throw new Error("Agent thread ID not found");
        }

        toast.info("Generating and creating document...");

        // NEW: Use unified action for generation and creation
        const result = await generateAndCreateDocument({
          prompt: text,
          threadId: agentThreadId,
          isPublic: false,
        });

        console.log('[FastAgentPanel] Document created:', result.documentId);
        // Mark this thread as having created a document to prevent duplicate auto-create
        autoDocCreatedThreadIdsRef.current.add(agentThreadId);

        toast.success(
          <div className="flex flex-col gap-1">
            <div className="font-medium">Document created!</div>
            <div className="text-xs text-[var(--text-secondary)]">
              {result.title}
            </div>
          </div>
        );

        setIsStreaming(false);
        return;
      } catch (error) {
        console.error("Failed to create document:", error);
        toast.error("Failed to create document");
        setIsStreaming(false);
        return;
      }
    }

    // Build message with document context if documents are selected or dragged
    let messageContent = text;

    // Include dossier context if present (for act-aware agent interactions)
    const dossierPrefix = dossierPrefixRef.current;
    if (dossierPrefix) {
      messageContent = `${dossierPrefix}${messageContent}`;
    }

    // Include drag-and-drop context documents
    if (contextDocuments.length > 0) {
      const contextInfo = contextDocuments
        .filter(doc => !doc.analyzing) // Only include analyzed documents
        .map(doc => `${doc.title} (ID: ${doc.id})`)
        .join(', ');
      if (contextInfo) {
        messageContent = `[CONTEXT: Analyzing documents: ${contextInfo}]\n\n${messageContent}`;
      }
    }

    // Also include selected document IDs (legacy)
    if (selectedDocumentIds.size > 0) {
      const docIdArray = Array.from(selectedDocumentIds);
      messageContent = `[CONTEXT: Analyzing ${docIdArray.length} document(s): ${docIdArray.join(', ')}]\n\n${messageContent}`;
    }

    setInput('');
    setLiveTokens("");
    setLiveAgents([]);
    setIsStreaming(true);

    // Clear context documents and calendar events after sending
    setContextDocuments([]);
    setContextCalendarEvents([]);

    // Clear live state
    setLiveThinking([]);
    setLiveToolCalls([]);
    setLiveSources([]);

    try {
      if (chatMode === 'agent') {
        // Agent-based chat flow
        let result;
        if (!activeThreadId) {
          // Create new thread with first message
          result = await createThreadWithMessage({
            message: messageContent,
            model: selectedModel,
          });
          setActiveThreadId(result.threadId);
          console.log('[FastAgentPanel] New thread created:', result.threadId);
        } else {
          // Continue existing thread
          result = await continueThreadAction({
            threadId: activeThreadId,
            message: messageContent,
          });
          console.log('[FastAgentPanel] Continued thread:', activeThreadId);
        }

        console.log('[FastAgentPanel] Message sent with messageId:', result.messageId);
        setIsStreaming(false);
      } else {
        // Agent streaming mode chat flow - uses agent component's native streaming
        let threadId = activeThreadId;
        const isNewThread = !threadId;

        // Create thread if needed
        if (!threadId) {
          threadId = await createStreamingThread({
            title: messageContent.substring(0, 50),
            model: selectedModel,
            anonymousSessionId: anonymousSession.sessionId ?? undefined,
          });
          setActiveThreadId(threadId);
        }

        // Send message with optimistic updates using the mutation
        if (!threadId) throw new Error("Thread ID is required");

        const clientContext =
          typeof window !== "undefined"
            ? {
              timezone: (() => {
                try {
                  return Intl.DateTimeFormat().resolvedOptions().timeZone;
                } catch {
                  return undefined;
                }
              })(),
              locale: typeof navigator !== "undefined" ? navigator.language : undefined,
              utcOffsetMinutes: new Date().getTimezoneOffset(),
            }
            : undefined;

        console.log('[FastAgentPanel] 🚀 Calling sendStreamingMessage with threadId:', threadId, 'prompt:', messageContent.substring(0, 30) + '...');
        await sendStreamingMessage({
          threadId: threadId as Id<"chatThreadsStream">,
          prompt: messageContent,
          model: selectedModel,
          useCoordinator: true,  // Enable smart routing via coordinator
          arbitrageEnabled,
          anonymousSessionId: anonymousSession.sessionId ?? undefined,
          clientContext,
        });

        console.log('[FastAgentPanel] ✅ Streaming initiated successfully');
        setIsStreaming(false);

        // Auto-name the thread if it's new (fire and forget)
        if (isNewThread && threadId && isAuthenticated) {
          autoNameThread({
            threadId: threadId as Id<"chatThreadsStream">,
            firstMessage: text,
          }).then((result) => {
            if (!result.skipped) {
              console.log('[FastAgentPanel] Thread auto-named:', result.title);
            }
          }).catch((err) => {
            console.warn('[FastAgentPanel] Failed to auto-name thread:', err);
          });
        }
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message");
      setIsStreaming(false);
    }
  }, [
    input,
    isBusy,
    activeThreadId,
    fastMode,
    selectedModel,
    arbitrageEnabled,
    chatMode,
    selectedDocumentIds,
    contextDocuments,
    createThreadWithMessage,
    continueThreadAction,
    createStreamingThread,
    sendStreamingMessage,
    generateAndCreateDocument,
    convex,
    streamingThread,
    autoNameThread,
    isAuthenticated,
    anonymousSession,
  ]);

  // Auto-send contextual open prompt once streaming mode is active.
  useEffect(() => {
    if (!isOpen) return;
    if (!pendingAutoSend) return;
    if (chatMode !== "agent-streaming") return;
    if (isBusy) return;

    const { message, requestId } = pendingAutoSend;
    if (openOptions?.requestId && openOptions.requestId !== requestId) return;

    // ⚡ CRITICAL GUARD: Prevent duplicate auto-sends
    if (lastAutoSentRequestIdRef.current === requestId) {
      console.log('[FastAgentPanel] 🛑 Auto-send BLOCKED - already sent requestId:', requestId);
      return;
    }
    lastAutoSentRequestIdRef.current = requestId;

    console.log('[FastAgentPanel] ✅ Auto-send ALLOWED - requestId:', requestId);
    handleSendMessage(message);
    setPendingAutoSend(null);
    onOptionsConsumed?.();
  }, [isOpen, pendingAutoSend, chatMode, isBusy, openOptions?.requestId, handleSendMessage, onOptionsConsumed]);

  // No client heuristics; coordinator-only routing

  // Handle message deletion
  const handleDeleteMessage = useCallback(async (messageId: string) => {
    console.log('[FastAgentPanel] User requested deletion for messageId:', messageId);

    if (chatMode !== 'agent-streaming' || !activeThreadId) {
      console.warn('[FastAgentPanel] Cannot delete: not in streaming mode or no active thread');
      return;
    }

    try {
      await deleteMessage({
        threadId: activeThreadId as Id<"chatThreadsStream">,
        messageId,
      });
      toast.success('Message deleted');
      console.log('[FastAgentPanel] Message deleted successfully');
    } catch (err) {
      console.error('[FastAgentPanel] Failed to delete message:', err);
      toast.error('Failed to delete message');
    }
  }, [chatMode, activeThreadId, deleteMessage]);

  // Handle general message regeneration
  const handleRegenerateMessage = useCallback(async (messageKey: string) => {
    console.log('[FastAgentPanel] User requested regeneration for message:', messageKey);

    if (chatMode !== 'agent-streaming' || !activeThreadId || !streamingMessages) {
      console.warn('[FastAgentPanel] Cannot regenerate: not in streaming mode or no active thread');
      return;
    }

    // Find the message being regenerated
    const messageIndex = streamingMessages.findIndex(m => m.key === messageKey);
    if (messageIndex === -1) {
      console.warn('[FastAgentPanel] Message not found:', messageKey);
      return;
    }

    // Find the previous user message (the prompt that generated this response)
    let userPrompt = '';
    for (let i = messageIndex - 1; i >= 0; i--) {
      if (streamingMessages[i].role === 'user') {
        userPrompt = streamingMessages[i].text || '';
        break;
      }
    }

    if (!userPrompt) {
      console.warn('[FastAgentPanel] No user prompt found before this message');
      toast.error('Could not find the original prompt to regenerate');
      return;
    }

    console.log('[FastAgentPanel] Regenerating with prompt:', userPrompt.substring(0, 100));

    try {
      const clientContext =
        typeof window !== "undefined"
          ? {
            timezone: (() => {
              try {
                return Intl.DateTimeFormat().resolvedOptions().timeZone;
              } catch {
                return undefined;
              }
            })(),
            locale: typeof navigator !== "undefined" ? navigator.language : undefined,
            utcOffsetMinutes: new Date().getTimezoneOffset(),
          }
          : undefined;

      await sendStreamingMessage({
        threadId: activeThreadId as Id<"chatThreadsStream">,
        prompt: userPrompt,
        model: selectedModel,
        useCoordinator: true,
        clientContext,
      });
      toast.success('Regenerating response...');
    } catch (err) {
      console.error('[FastAgentPanel] Failed to regenerate:', err);
      toast.error('Failed to regenerate response');
    }
  }, [chatMode, activeThreadId, streamingMessages, sendStreamingMessage, selectedModel]);

  // Handle manual Mermaid diagram retry
  const handleMermaidRetry = useCallback(async (error: string, code: string) => {
    // ... (existing implementation)
  }, [chatMode, activeThreadId, sendStreamingMessage, selectedModel]);

  // Handle company/person/event/news selection
  const handleCompanySelect = useCallback(async (company: any) => {
    // ... (existing implementation)
  }, [chatMode, activeThreadId, sendStreamingMessage, selectedModel]);

  const handlePersonSelect = useCallback(async (person: any) => {
    // ... (existing implementation)
  }, [chatMode, activeThreadId, sendStreamingMessage, selectedModel]);

  const handleEventSelect = useCallback(async (event: any) => {
    // ... (existing implementation)
  }, [chatMode, activeThreadId, sendStreamingMessage, selectedModel]);

  const handleNewsSelect = useCallback(async (article: any) => {
    // ... (existing implementation)
  }, [chatMode, activeThreadId, sendStreamingMessage, selectedModel]);

  // Handle document selection from document action cards
  const handleDocumentSelect = useCallback((documentId: string) => {
    console.log('[FastAgentPanel] Document selected:', documentId);
    try {
      window.dispatchEvent(
        new CustomEvent('nodebench:openDocument', {
          detail: { documentId }
        })
      );
    } catch (err) {
      console.error('[FastAgentPanel] Failed to navigate to document:', err);
      toast.error('Failed to open document');
    }
  }, []);

  // Memoized message handlers for context provider (prevents callback prop drilling)
  const messageHandlers = useMemo(() => ({
    onCompanySelect: handleCompanySelect,
    onPersonSelect: handlePersonSelect,
    onEventSelect: handleEventSelect,
    onNewsSelect: handleNewsSelect,
    onDocumentSelect: handleDocumentSelect,
    onRegenerateMessage: handleRegenerateMessage,
    onDeleteMessage: handleDeleteMessage,
  }), [handleCompanySelect, handlePersonSelect, handleEventSelect, handleNewsSelect, handleDocumentSelect, handleRegenerateMessage, handleDeleteMessage]);

  // ========== MEMOIZED VALUES (must be before early return) ==========

  // Prepare messages for rendering - moved before early return to satisfy hooks rules
  const messagesToRender = useMemo(() => {
    if (chatMode === 'agent-streaming') {
      return streamingMessages;
    }
    return (agentMessages || []).map((msg: any) => ({
      role: msg.role || 'assistant',
      text: msg.text || msg.content || '',
      status: 'complete',
      parts: [{ type: 'text', text: msg.text || msg.content || '' }],
      _id: msg._id,
      _creationTime: msg._creationTime,
      model: msg.model,
    }));
  }, [chatMode, streamingMessages, agentMessages]);

  // Enable virtualization for long conversations (50+ messages)
  const { shouldVirtualize } = useMessageVirtualization(messagesToRender?.length ?? 0, 50);

  // Artifact extraction helpers
  const assistantTexts = useMemo(() => {
    if (!messagesToRender) return [] as string[];

    return messagesToRender
      .filter((msg: any) => (msg.role ?? msg?.message?.role) === 'assistant')
      .map((msg: any) => {
        if (typeof msg.text === 'string' && msg.text.trim()) return msg.text;
        if (typeof msg.content === 'string' && msg.content.trim()) return msg.content;
        if (Array.isArray(msg.content)) {
          const parts = msg.content
            .filter((c: any) => typeof c?.text === 'string')
            .map((c: any) => c.text)
            .join('\n\n');
          if (parts.trim()) return parts;
        }
        if (typeof msg.message?.text === 'string' && msg.message.text.trim()) return msg.message.text;
        return '';
      })
      .filter(Boolean);
  }, [messagesToRender]);

  const aggregatedMedia = useMemo<ExtractedMedia>(() => {
    const base: ExtractedMedia = { youtubeVideos: [], secDocuments: [], webSources: [], profiles: [], images: [] };

    const dedupe = <T,>(items: T[], getKey: (item: T) => string | undefined) => {
      const map = new Map<string, T>();
      items.forEach((item) => {
        const key = getKey(item);
        if (!key) return;
        if (!map.has(key)) map.set(key, item);
      });
      return Array.from(map.values());
    };

    const collected = assistantTexts.reduce((acc, text) => {
      const media = extractMediaFromText(text);
      acc.youtubeVideos.push(...media.youtubeVideos);
      acc.secDocuments.push(...media.secDocuments);
      acc.webSources.push(...media.webSources);
      acc.profiles.push(...media.profiles);
      acc.images.push(...media.images);
      return acc;
    }, base);

    return {
      youtubeVideos: dedupe(collected.youtubeVideos, (v: any) => v.url || v.videoId),
      secDocuments: dedupe(collected.secDocuments, (doc: any) => doc.accessionNumber || doc.documentUrl),
      webSources: dedupe(collected.webSources, (source: any) => source.url || source.title),
      profiles: dedupe(collected.profiles, (profile: any) => profile.url || profile.name),
      images: dedupe(collected.images, (img: any) => img.url),
    };
  }, [assistantTexts]);

  const aggregatedDocumentActions = useMemo<DocumentAction[]>(() => {
    const dedupe = (docs: DocumentAction[]) => {
      const map = new Map<string, DocumentAction>();
      docs.forEach((doc) => {
        if (!map.has(doc.documentId)) map.set(doc.documentId, doc);
      });
      return Array.from(map.values());
    };

    const docs = assistantTexts.flatMap((text) => extractDocumentActions(text));
    return dedupe(docs);
  }, [assistantTexts]);

  // Convert messages to Message type based on chat mode
  const uiMessages: Message[] = useMemo(() => {
    return (chatMode === 'agent-streaming' ? streamingMessages : agentMessages || []).map((msg: any) => {
      if (chatMode === 'agent-streaming') {
        // Agent streaming mode messages - from agent component
        const messageData = msg.message || msg;
        const role = messageData.role || 'assistant';

        // Extract content and ensure it's a string
        let content = '';
        if (typeof messageData.text === 'string') {
          content = messageData.text;
        } else if (typeof messageData.content === 'string') {
          content = messageData.content;
        } else if (typeof msg.text === 'string') {
          content = msg.text;
        } else if (typeof msg.content === 'string') {
          content = msg.content;
        } else {
          const textParts = messageData.parts?.filter((p: any) => p.type === 'text')?.map((p: any) => p.text) || [];
          content = textParts.join('');
        }

        return {
          id: msg._id,
          threadId: (activeThreadId || '') as any,
          role: role as 'user' | 'assistant' | 'system',
          content: String(content || ''),
          status: (msg.status || 'complete') as 'sending' | 'streaming' | 'complete' | 'error',
          timestamp: new Date(msg._creationTime || Date.now()),
          isStreaming: msg.status === 'streaming',
          model: selectedModel,
        };
      }

      // Agent mode messages
      return {
        id: msg._id,
        threadId: msg.threadId,
        role: (msg.role || 'assistant') as 'user' | 'assistant' | 'system',
        content: msg.text || msg.content || '',
        status: 'complete',
        timestamp: new Date(msg._creationTime),
        isStreaming: false,
        model: msg.model,
      };
    });
  }, [chatMode, streamingMessages, agentMessages, activeThreadId, selectedModel]);

  // ========== RENDER ==========

  if (!isOpen) return null;

  const focusSubscription = dossierBriefId ? (
    <DossierFocusSubscription
      briefId={dossierBriefId}
      dossierContextRef={dossierContextRef}
      dossierPrefixRef={dossierPrefixRef}
    />
  ) : null;

  // Minimized mode - compact vertical strip
  if (isMinimized) {
    return (
      <>
        {focusSubscription}
        <div className="fixed right-0 top-1/2 -translate-y-1/2 z-[1000] flex flex-col items-center gap-2 p-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-l-xl shadow-lg">
          {/* Expand button */}
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
            title="Expand panel"
          >
            <Maximize2 className="w-5 h-5 text-[var(--text-primary)]" />
          </button>

          {/* Status indicator */}
          <div className={`w-3 h-3 rounded-full ${isStreaming ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`} />

          {/* Recent threads icons */}
          {threads?.slice(0, 3).map((thread) => (
            <button
              key={thread._id}
              type="button"
              onClick={() => {
                setActiveThreadId(thread._id);
                setIsMinimized(false);
              }}
              className={`p-2 rounded-lg transition-colors ${activeThreadId === thread._id
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                : 'hover:bg-[var(--bg-hover)] text-[var(--text-muted)]'
                }`}
              title={thread.title || 'Untitled Thread'}
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          ))}

          {/* New chat button */}
          <button
            type="button"
            onClick={() => {
              setActiveThreadId(null);
              setIsMinimized(false);
            }}
            className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] transition-colors"
            title="New chat"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-[var(--text-muted)] hover:text-red-600 transition-colors mt-2"
            title="Close panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      {focusSubscription}
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-sm z-[999] lg:hidden"
          onClick={onClose}
        />
      )}

      <div className={`fast-agent-panel ${variant === 'sidebar' ? 'sidebar-mode' : ''} bg-[var(--bg-primary)] border-l border-[var(--border-color)]`}>
        {/* Simplified Header - Single Row */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
          {/* Status dot + Title */}
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isStreaming || isSwarmActive ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`} />
            <span className="text-sm font-medium text-[var(--text-primary)] truncate">
              {isSwarmActive ? `Swarm ${swarmTasks.filter(t => t.status === 'completed').length}/${swarmTasks.length}` :
               isStreaming ? 'Thinking...' : 'Chat'}
            </span>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Primary Actions */}
          <div className="flex items-center gap-1">
            {/* New Chat */}
            <button
              type="button"
              onClick={() => {
                setActiveThreadId(null);
                setInput('');
                setAttachedFiles([]);
              }}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              title="New chat (⌘1)"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New</span>
            </button>

            {/* Overflow Menu */}
            <div className="relative" ref={overflowMenuRef}>
              <button
                type="button"
                onClick={() => setShowOverflowMenu(!showOverflowMenu)}
                className={`p-1.5 rounded-md transition-colors ${showOverflowMenu ? 'bg-[var(--bg-secondary)]' : 'hover:bg-[var(--bg-secondary)]'}`}
                title="More options"
              >
                <MoreHorizontal className="w-4 h-4 text-[var(--text-muted)]" />
              </button>

              {/* Overflow Dropdown */}
              {showOverflowMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowOverflowMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 w-48 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)] shadow-lg z-50 py-1">
                    {/* Live Events */}
                    <button
                      type="button"
                      onClick={() => { setShowEventsPanel(!showEventsPanel); setShowOverflowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[var(--bg-secondary)] text-left"
                    >
                      <Activity className={`w-3.5 h-3.5 ${isStreaming ? 'text-blue-500' : ''}`} />
                      <span>Live Events</span>
                      {liveEvents.filter(e => e.status === 'running').length > 0 && (
                        <span className="ml-auto px-1.5 py-0.5 text-[9px] bg-blue-500 text-white rounded-full">
                          {liveEvents.filter(e => e.status === 'running').length}
                        </span>
                      )}
                    </button>

                    {/* Skills */}
                    <button
                      type="button"
                      onClick={() => { setShowSkillsPanel(true); setShowOverflowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[var(--bg-secondary)] text-left"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Skills</span>
                    </button>

                    {/* Signals */}
                    <button
                      type="button"
                      onClick={() => { navigate('/signals'); setShowOverflowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[var(--bg-secondary)] text-left"
                    >
                      <Radio className="w-3.5 h-3.5" />
                      <span>Signals</span>
                    </button>

                    {/* Share (only if authenticated and has thread) */}
                    {isAuthenticated && activeThreadId && (
                      <button
                        type="button"
                        onClick={async () => {
                          setShowOverflowMenu(false);
                          try {
                            const threadTitle = threads.find((t) => t._id === activeThreadId)?.title || 'Agent Thread Summary';
                            const recentMsgs = (streamingMessages ?? [])
                              .filter((m) => m.role === 'assistant' && m.content)
                              .slice(-3)
                              .map((m) => typeof m.content === 'string' ? m.content : JSON.stringify(m.content))
                              .join('\n\n---\n\n');
                            if (!recentMsgs.trim()) {
                              toast.error('No assistant messages to share');
                              return;
                            }
                            await appendToSignalsLog({
                              kind: 'note',
                              title: threadTitle,
                              markdown: recentMsgs.slice(0, 10000),
                              agentThreadId: activeThreadId,
                              tags: ['agent', 'shared'],
                            });
                            toast.success('Shared to Signals');
                          } catch (err: any) {
                            toast.error(err?.message || 'Failed to share');
                          }
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[var(--bg-secondary)] text-left"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Share to Signals</span>
                      </button>
                    )}

                    <div className="border-t border-[var(--border-color)] my-1" />

                    {/* Minimize */}
                    <button
                      type="button"
                      onClick={() => { setIsMinimized(true); setShowOverflowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[var(--bg-secondary)] text-left"
                    >
                      <Minimize2 className="w-3.5 h-3.5" />
                      <span>Minimize</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Dossier indicator (compact) */}
            <DossierModeIndicator compact />

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md transition-colors"
              title="Close panel"
            >
              <X className="w-4 h-4 text-[var(--text-muted)] hover:text-red-600" />
            </button>
          </div>
        </div>

        {/* Tab Bar - Chat, Sources, and Telemetry */}
        <div className="flex items-center px-3 border-b border-[var(--border-color)]">
          {([
            { id: 'chat', label: 'Chat' },
            { id: 'sources', label: 'Sources' },
            { id: 'telemetry', label: 'Telemetry' },
          ] as const).map((tab) => (
            <button
              type="button"
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-all -mb-px ${activeTab === tab.id
                ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Swarm Lanes View - Shows when thread has active swarm */}
        {activeThreadId && isSwarmActive && (
          <SwarmLanesView
            threadId={activeThreadId}
            compact={true}
          />
        )}

        {/* Skills Popover */}
        {showSkillsPanel && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowSkillsPanel(false)} />
            <SkillsPanel
              onClose={() => setShowSkillsPanel(false)}
              onSelectSkill={(skillName, description) => {
                const skillPrompt = `Use the "${skillName}" skill: ${description}`;
                setInput((prev) => prev ? `${prev}\n\n${skillPrompt}` : skillPrompt);
                toast.success(`Skill "${skillName}" added to your message`);
              }}
            />
          </>
        )}

        {/* Content Area */}
        <div className="fast-agent-panel-content bg-[var(--bg-primary)]">
          {/* Left Sidebar (Thread List) - Only show on chat tab when sidebar is toggled */}
          <div className={`panel-sidebar ${showSidebar && activeTab === 'chat' ? 'visible' : ''} border-r border-[var(--border-color)] bg-[var(--bg-secondary)]`}>
            <FastAgentThreadList
              threads={threads}
              activeThreadId={activeThreadId}
              onSelectThread={setActiveThreadId}
              onDeleteThread={handleDeleteThread}
              hasMore={hasMoreThreads}
              onLoadMore={() => loadMoreThreads(10)}
              isLoadingMore={isLoadingMoreThreads}
              className="h-full"
            />
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg-primary)] relative">
            {activeTab === 'telemetry' ? (
              <TaskManagerView isPublic={false} className="h-full" />
            ) : activeTab === 'sources' ? (
              <ArtifactsTab
                media={aggregatedMedia}
                documents={aggregatedDocumentActions}
                hasThread={Boolean(activeThreadId)}
                onDocumentSelect={handleDocumentSelect}
              />
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Live Events Section - Inline collapsible */}
                {showEventsPanel && liveEvents.length > 0 && (
                  <div className="flex-shrink-0 border-b border-[var(--border-color)] max-h-48 overflow-y-auto">
                    <div className="px-3 py-2">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Activity className={`w-3.5 h-3.5 ${isStreaming ? 'text-blue-500 animate-pulse' : 'text-[var(--text-muted)]'}`} />
                          <span className="text-xs font-medium text-[var(--text-primary)]">
                            Live Activity
                          </span>
                          {liveEvents.filter(e => e.status === 'running').length > 0 && (
                            <span className="px-1.5 py-0.5 text-[9px] bg-blue-500 text-white rounded-full">
                              {liveEvents.filter(e => e.status === 'running').length}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => setShowEventsPanel(false)}
                          className="p-1 rounded text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="space-y-1">
                        {liveEvents.slice(-5).map((event) => (
                          <div key={event.id} className="flex items-center gap-2 py-1 text-xs">
                            {event.status === 'running' ? (
                              <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                            ) : event.status === 'success' ? (
                              <div className="w-3 h-3 rounded-full bg-emerald-100 flex items-center justify-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              </div>
                            ) : (
                              <div className="w-3 h-3 rounded-full bg-amber-100 flex items-center justify-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              </div>
                            )}
                            <span className="text-[var(--text-secondary)] truncate flex-1">
                              {event.title || event.toolName || event.type.replace(/_/g, ' ')}
                            </span>
                            {event.duration && (
                              <span className="text-[10px] text-[var(--text-muted)]">{event.duration}ms</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Main scrollable chat area */}
                <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
                  {/* Parallel Agent Lanes (Live Activity) */}
                  {chatMode === 'agent-streaming' && streamingThread?.agentThreadId && (
                    <div className="mb-4">
                      <LiveAgentLanes
                        runId={streamingThread.agentThreadId}
                        className="mb-4"
                      />
                    </div>
                  )}

                  {/* Progressive Disclosure Trace */}
                  {disclosureEvents.length > 0 && (
                    <DisclosureTrace
                      events={disclosureEvents}
                      isExpanded={showDisclosureTrace}
                      onToggle={() => setShowDisclosureTrace(!showDisclosureTrace)}
                      budgetLimit={10000}
                      className="mb-4"
                    />
                  )}

                  {/* Empty State - Branding + Quick Actions */}
                  {!activeThreadId && (!messagesToRender || messagesToRender.length === 0) && (
                    <div className="flex-1 flex flex-col overflow-y-auto">
                      {/* Hero Section */}
                      <div className="flex flex-col items-center justify-center pt-8 pb-6 px-4">
                        {/* Big Robot Icon */}
                        <div className="w-16 h-16 rounded-2xl bg-[var(--text-primary)] flex items-center justify-center mb-4">
                          <Bot className="w-9 h-9 text-[var(--bg-primary)]" />
                        </div>

                        {/* Title */}
                        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-1">
                          Nodebench AI
                        </h2>

                       {/* Marketing Tagline */}
                       <p className="text-sm text-[var(--text-muted)] text-center max-w-xs">
                         Your intelligent research assistant. Search, analyze, and discover insights across documents, filings, and media.
                       </p>
                     </div>

                      {/* Recent threads / last run */}
                      <div className="px-4 pb-6">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs font-semibold text-[var(--text-secondary)]">
                            Recent chats
                          </div>
                          {threads.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setShowSidebar(true)}
                              className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] underline underline-offset-2"
                            >
                              View all
                            </button>
                          )}
                        </div>
                        <div className="space-y-2">
                          {threadsStatus === "LoadingFirstPage" ? (
                            <>
                              <div className="h-10 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] animate-pulse" />
                              <div className="h-10 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] animate-pulse" />
                            </>
                          ) : threads.length === 0 ? (
                            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2">
                              <div className="text-[11px] text-[var(--text-muted)]">
                                No chats yet — try a quick action below to start one.
                              </div>
                            </div>
                          ) : (
                            threads.slice(0, 3).map((thread: any) => {
                              const lastAt =
                                (thread?.lastMessageAt as number | undefined) ??
                                (thread?.updatedAt as number | undefined) ??
                                (thread?._creationTime as number | undefined);
                              const title = thread?.title || "New Chat";
                              const preview = (thread?.lastMessage as string | undefined) || "";
                              const ago = formatTimeAgo(lastAt);

                              return (
                                <button
                                  key={thread._id}
                                  type="button"
                                  onClick={() => setActiveThreadId(thread._id)}
                                  className="w-full text-left rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] transition-colors px-3 py-2"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="text-xs font-semibold text-[var(--text-primary)] truncate">
                                        {title}
                                      </div>
                                      {preview ? (
                                        <div className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
                                          {preview}
                                        </div>
                                      ) : (
                                        <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                                          No messages yet
                                        </div>
                                      )}
                                    </div>
                                    {ago ? (
                                      <div className="text-[10px] text-[var(--text-muted)] whitespace-nowrap">
                                        {ago}
                                      </div>
                                    ) : null}
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* Swarm Quick Actions */}
                      <SwarmQuickActions
                        onSpawn={async (query, agents) => {
                          try {
                            toast.info(`Spawning swarm with ${agents.length} agents...`);
                            const result = await spawnSwarm({
                              query,
                              agents,
                              model: selectedModel,
                            });
                            setActiveThreadId(result.threadId);
                            toast.success(`Swarm created with ${result.taskCount} agents`);
                          } catch (error: any) {
                            console.error('[FastAgentPanel] Swarm spawn failed:', error);
                            toast.error(error.message || 'Failed to spawn swarm');
                          }
                        }}
                        className="flex-1"
                      />
                    </div>
                  )}

                  <MessageHandlersProvider handlers={messageHandlers}>
                    <VirtualizedMessageList
                      messages={messagesToRender ?? []}
                      getMessageKey={(msg: any) => msg._id || msg.id || `msg-${msg.key}`}
                      renderMessage={(message: any) => (
                        <FastAgentUIMessageBubble
                          message={message}
                          onRegenerateMessage={() => handleRegenerateMessage(message.key)}
                          onDeleteMessage={() => handleDeleteMessage(message._id)}
                        />
                      )}
                      containerRef={scrollContainerRef}
                      enabled={shouldVirtualize}
                      bufferSize={5}
                      estimatedItemHeight={150}
                    />
                  </MessageHandlersProvider>

                  {/* Queued Indicator */}
                  {(streamingThread as any)?.runStatus === 'queued' && (
                    <div className="flex flex-col gap-2 px-4 mb-4">
                      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Waiting for available agent...</span>
                      </div>
                      <div className="text-xs text-blue-500 pl-5">
                        Position in queue: 1 (Estimated wait: &lt; 5s)
                      </div>
                    </div>
                  )}

                  {/* Streaming Indicator */}
                  {isBusy && (
                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] px-4 animate-pulse">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Thinking...</span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </div>
            )}

            {/* Anonymous User Banner */}
            {anonymousSession.isAnonymous && !anonymousSession.isLoading && (
              <div className={`mx-4 mt-2 px-3 py-2 rounded-lg border ${anonymousSession.canSendMessage
                ? 'bg-blue-500/10 border-blue-500/30'
                : 'bg-amber-500/10 border-amber-500/30'
                }`}>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    {anonymousSession.canSendMessage ? (
                      <>
                        <MessageSquare className="w-4 h-4 text-blue-400" />
                        <span className="text-[var(--text-secondary)]">
                          <span className="font-medium text-[var(--text-primary)]">{anonymousSession.remaining}</span>
                          {' '}of {anonymousSession.limit} free messages remaining today
                        </span>
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4 text-amber-400" />
                        <span className="text-[var(--text-secondary)]">
                          Daily limit reached. Sign in for unlimited access!
                        </span>
                      </>
                    )}
                  </div>
                  <a
                    href="/sign-in"
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-[var(--accent-primary)] text-white hover:opacity-90 transition-opacity"
                  >
                    <LogIn className="w-3 h-3" />
                    Sign in
                  </a>
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="p-3 border-t border-[var(--border-color)]">
              <FastAgentInputBar
                input={input}
                setInput={setInput}
                onSend={() => handleSendMessage(input)}
                isStreaming={isBusy}
                onStop={handleStopStreaming}
                selectedModel={selectedModel}
                onSelectModel={setSelectedModel}
                attachedFiles={attachedFiles}
                onAttachFiles={handleAttachFiles}
                onRemoveFile={handleRemoveFile}
                selectedDocumentIds={selectedDocumentIds}
                contextDocuments={contextDocuments}
                onAddContextDocument={handleAddContextDocument}
                onRemoveContextDocument={handleRemoveContextDocument}
                contextCalendarEvents={contextCalendarEvents}
                onAddCalendarEvent={handleAddCalendarEvent}
                onRemoveCalendarEvent={handleRemoveCalendarEvent}
                onSpawn={async (query, agents) => {
                  try {
                    toast.info(`Spawning swarm with ${agents.length} agents...`);
                    const result = await spawnSwarm({
                      query,
                      agents,
                      model: selectedModel,
                    });
                    // Switch to the new swarm thread
                    setActiveThreadId(result.threadId);
                    toast.success(`Swarm created with ${result.taskCount} agents`);
                  } catch (error: any) {
                    console.error('[FastAgentPanel] Swarm spawn failed:', error);
                    toast.error(error.message || 'Failed to spawn swarm');
                  }
                }}
              />
            </div>
          </div>

        </div>

        {/* Export Menu */}
        {exportingThreadId && (() => {
          const thread = threads?.find((t) => t._id === exportingThreadId);
          if (!thread) return null;

          // Convert to Thread type for ExportMenu
          const exportThread: Thread = {
            _id: thread._id,
            userId: thread.userId,
            title: thread.title,
            pinned: Boolean((thread as any).pinned),
            createdAt: (thread as any).createdAt ?? thread._creationTime,
            updatedAt: (thread as any).updatedAt ?? thread._creationTime,
            _creationTime: thread._creationTime,
            messageCount: (thread as any).messageCount,
            lastMessage: (thread as any).lastMessage,
            lastMessageAt: (thread as any).lastMessageAt,
            toolsUsed: (thread as any).toolsUsed,
            modelsUsed: (thread as any).modelsUsed,
          };

          return (
            <ExportMenu
              thread={exportThread}
              messages={uiMessages}
              onClose={() => setExportingThreadId(null)}
            />
          );
        })()}

        {/* Settings Panel */}
        {showSettings && (
          <SettingsPanel
            fastMode={fastMode}
            onFastModeChange={setFastMode}
            model={selectedModel}
            onModelChange={setSelectedModel}
            arbitrageMode={arbitrageEnabled}
            onArbitrageModeChange={setArbitrageEnabled}
            onClose={() => setShowSettings(false)}
          />
        )}

      </div>
    </>
  );
}

interface ArtifactsTabProps {
  media: ExtractedMedia;
  documents: DocumentAction[];
  hasThread: boolean;
  onDocumentSelect: (documentId: string) => void;
}

function ArtifactsTab({ media, documents, hasThread, onDocumentSelect }: ArtifactsTabProps) {
  const totalSources = media.webSources.length + media.secDocuments.length;
  const totalVideos = media.youtubeVideos.length;
  const totalProfiles = media.profiles.length;
  const totalImages = media.images.length;
  const totalDocs = documents.length;
  const totalArtifacts = totalSources + totalVideos + totalProfiles + totalImages + totalDocs;

  if (totalArtifacts === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-6 flex items-center justify-center text-center bg-[var(--bg-primary)]">
        <div className="space-y-2 max-w-md">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            No artifacts yet.
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            {hasThread
              ? 'Run a query or wait for the agent to finish to see collected sources, filings, media, and generated documents.'
              : 'Start a thread to collect sources, filings, media, and generated documents as the agent works.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[var(--bg-primary)]">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {[{ label: 'Sources & Filings', value: totalSources }, { label: 'Videos', value: totalVideos }, { label: 'People', value: totalProfiles }, { label: 'Images', value: totalImages }, { label: 'Doc actions', value: totalDocs }] // Keep compact summary
          .filter(card => card.value > 0)
          .map((card) => (
            <div
              key={card.label}
              className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 flex items-center justify-between text-xs"
            >
              <span className="font-medium text-[var(--text-primary)]">{card.label}</span>
              <span className="text-[var(--accent-primary)] font-semibold">{card.value}</span>
            </div>
          ))}
      </div>

      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-xs font-semibold text-[var(--text-primary)]">Artifacts</p>
            <p className="text-[10px] text-[var(--text-muted)]">Evidence the agent discovered, with links and media.</p>
          </div>
        </div>

        <div className="space-y-4">
          <RichMediaSection media={media} showCitations={true} />

          {documents.length > 0 && (
            <div className="border-t border-[var(--border-color)] pt-3">
              <DocumentActionGrid
                documents={documents}
                title="Generated Documents"
                onDocumentSelect={onDocumentSelect}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
