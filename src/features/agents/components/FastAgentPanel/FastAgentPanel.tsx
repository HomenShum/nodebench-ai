// src/components/FastAgentPanel/FastAgentPanel.tsx
// Main container component for the new ChatGPT-like AI chat sidebar

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useAction, useConvexAuth } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import { X, Zap, Settings, Plus, Radio, Save, PanelLeftClose, PanelLeft, Bot, Loader2, ChevronDown, MessageSquare, Activity, Minimize2, Maximize2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { useUIMessages, type UIMessagesQuery } from '@convex-dev/agent/react';

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
import { SkillsPanel } from './FastAgentPanel.SkillsPanel';
import { AgentTasksTab } from './FastAgentPanel.AgentTasksTab';
import { EditsTab } from './FastAgentPanel.EditsTab';
import { BriefTab } from './FastAgentPanel.BriefTab';
import { MemoryStatusHeader, type PlanItem } from './MemoryStatusHeader';
import { ContextBar, type ContextConstraint } from './ContextBar';
import { LiveAgentLanes } from '@/features/agents/views/LiveAgentLanes';
import type { LiveEvent } from './LiveEventCard';
import { RichMediaSection } from './RichMediaSection';
import { DocumentActionGrid, extractDocumentActions, type DocumentAction } from './DocumentActionCard';
import { extractMediaFromText, type ExtractedMedia } from './utils/mediaExtractor';
import type { SpawnedAgent } from './types/agent';

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
}: FastAgentPanelProps) {
  // ========== AUTH ==========
  const { isAuthenticated } = useConvexAuth();

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

  // Chat mode: 'agent' (non-streaming) or 'agent-streaming' (with streaming output)
  const [chatMode, setChatMode] = useState<'agent' | 'agent-streaming'>(() => {
    // Load from localStorage
    const saved = localStorage.getItem('fastAgentPanel.chatMode');
    return (saved === 'agent-streaming' || saved === 'agent') ? saved : 'agent';
  });

  // Settings
  const [fastMode, setFastMode] = useState(true);
  // Use approved model aliases only (7 approved models)
  const [selectedModel, setSelectedModel] = useState<'gpt-5.2' | 'claude-sonnet-4.5' | 'claude-opus-4.5' | 'claude-haiku-4.5' | 'gemini-3-pro' | 'gemini-2.5-flash' | 'gemini-2.5-pro'>('gpt-5.2');
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
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);

  // Skills Panel state
  const [showSkillsPanel, setShowSkillsPanel] = useState(false);

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

  // Tab state - MUST be declared before any conditional logic or loops
  const [activeTab, setActiveTab] = useState<'thread' | 'artifacts' | 'tasks' | 'brief' | 'edits'>('thread');
  const [isThreadDropdownOpen, setIsThreadDropdownOpen] = useState(false);
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Track auto-created documents to avoid duplicates (by agentThreadId) and processed message IDs
  const autoDocCreatedThreadIdsRef = useRef<Set<string>>(new Set());

  const humanRequests = useQuery(
    api.domains.agents.humanInTheLoop.getPendingHumanRequests,
    activeThreadId ? { threadId: activeThreadId } : 'skip'
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

  // ========== CONVEX QUERIES & MUTATIONS ==========
  // Agent mode: Using @convex-dev/agent component
  const agentThreads = useQuery(
    api.domains.agents.agentChat.listUserThreads,
    isAuthenticated ? {} : "skip"
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
  const streamingThreads = useQuery(
    api.domains.agents.fastAgentPanelStreaming.listThreads,
    isAuthenticated && chatMode === 'agent-streaming' ? {} : "skip"
  );

  // Get the agent thread ID for streaming mode
  const streamingThread = useQuery(
    api.domains.agents.fastAgentPanelStreaming.getThreadByStreamId,
    activeThreadId && chatMode === 'agent-streaming'
      ? { threadId: activeThreadId as Id<"chatThreadsStream"> }
      : "skip"
  );

  // Use useUIMessages hook for streaming messages with delta support
  // This hook expects the threadId to be the Agent component's threadId (string), not our chatThreadsStream ID
  const { results: streamingMessages, status: _streamingStatus, error: streamError } = useUIMessages(
    api.domains.agents.fastAgentPanelStreaming.getThreadMessagesWithStreaming,
    streamingThread?.agentThreadId && chatMode === 'agent-streaming'
      ? {
        threadId: streamingThread.agentThreadId,
      }
      : "skip",
    {
      initialNumItems: 100,
      stream: true,  // ✅ CRITICAL: Enable streaming deltas!
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

  // Debug: Log when streaming messages update
  useEffect(() => {
    if (chatMode === 'agent-streaming') {
      if (streamingMessages && streamingMessages.length > 0) {
        // console.log('[FastAgentPanel] Messages updated:', streamingMessages.length, 'messages');
      }
    }
  }, [streamingMessages, chatMode]);

  const createStreamingThread = useAction(api.domains.agents.fastAgentPanelStreaming.createThread);
  const sendStreamingMessage = useMutation(api.domains.agents.fastAgentPanelStreaming.initiateAsyncStreaming);
  const deleteStreamingThread = useMutation(api.domains.agents.fastAgentPanelStreaming.deleteThread);
  const deleteMessage = useMutation(api.domains.agents.fastAgentPanelStreaming.deleteMessage);
  const saveChatSessionToDossier = useMutation(api.domains.documents.documents.saveChatSessionToDossier);
  // NEW: Unified document generation and creation action
  const generateAndCreateDocument = useAction(api.domains.agents.fastAgentDocumentCreation.generateAndCreateDocument);
  // Auto-naming action for threads
  const autoNameThread = useAction(api.domains.agents.fastAgentPanelStreaming.autoNameThread);
  // Client does not trigger server workflows directly; coordinator handles routing via useCoordinator: true

  // Use the appropriate data based on mode
  const threads = chatMode === 'agent' ? agentThreads : streamingThreads;

  // For agent mode, use the regular messages
  // For streaming mode, we use streamingMessages directly (UIMessage format)
  const messages = agentMessages;

  // ========== EFFECTS ==========

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, liveThinking, liveToolCalls]);

  // Auto-select first thread if none selected
  useEffect(() => {
    if (!activeThreadId && threads && threads.length > 0) {
      // Agent component threads have both _id and threadId
      const firstThread = threads[0] as any;
      setActiveThreadId(firstThread.threadId || firstThread._id);
    }
  }, [threads, activeThreadId]);

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

  // Extract live events from streaming messages
  useEffect(() => {
    if (!streamingMessages || streamingMessages.length === 0) return;

    const events: LiveEvent[] = [];
    let eventCounter = 0;

    streamingMessages.forEach((msg: any) => {
      if (msg.role !== 'assistant' || !msg.parts) return;

      msg.parts.forEach((part: any) => {
        if (part.type === 'tool-call' || part.type === 'tool-result') {
          const isResult = part.type === 'tool-result';
          const toolName = part.toolName || 'unknown';

          events.push({
            id: `${msg._id || msg.id}-${eventCounter++}`,
            type: isResult ? 'tool_end' : 'tool_start',
            status: isResult ? 'done' : 'running',
            title: toolName,
            toolName,
            details: isResult && part.output ?
              (typeof part.output === 'string' ? part.output.slice(0, 100) : 'Completed') :
              'Executing...',
            timestamp: Date.now() - (streamingMessages.length - eventCounter) * 1000,
          });
        }
      });
    });

    setLiveEvents(events);
  }, [streamingMessages]);

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
        });
        setActiveThreadId(threadId);
        toast.success("New chat created");
      } catch (error) {
        console.error('Failed to create thread:', error);
        toast.error('Failed to create new chat');
      }
    }
  }, [chatMode, createStreamingThread, selectedModel]);

  const handleDeleteThread = useCallback(async (threadId: string) => {
    try {
      if (chatMode === 'agent') {
        await deleteAgentThread({ threadId });
      } else {
        await deleteStreamingThread({ threadId: threadId as Id<"chatThreadsStream"> });
      }

      // If deleted thread was active, select another
      if (activeThreadId === threadId) {
        const remainingThreads = threads?.filter((t: any) => {
          const tId = chatMode === 'agent' ? t.threadId : t._id;
          return tId !== threadId;
        });
        const nextId = chatMode === 'agent'
          ? (remainingThreads?.[0] as any)?.threadId
          : (remainingThreads?.[0] as any)?._id;
        setActiveThreadId(nextId || null);
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
      const currentThread = threads?.find((t: any) => {
        const tId = chatMode === 'agent' ? t.threadId : t._id;
        return tId === activeThreadId;
      });
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
    if (!text || isStreaming) return;

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
          });
          threadId = streamingThread;
          setActiveThreadId(threadId);
        }

        // Get the agent thread ID
        const streamingThread = streamingThreads?.find((t: any) => t._id === threadId);
        const agentThreadId = streamingThread?.agentThreadId;

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

    // Include drag-and-drop context documents
    if (contextDocuments.length > 0) {
      const contextInfo = contextDocuments
        .filter(doc => !doc.analyzing) // Only include analyzed documents
        .map(doc => `${doc.title} (ID: ${doc.id})`)
        .join(', ');
      if (contextInfo) {
        messageContent = `[CONTEXT: Analyzing documents: ${contextInfo}]\n\n${text}`;
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
          });
          setActiveThreadId(threadId);
        }

        // Send message with optimistic updates using the mutation
        if (!threadId) throw new Error("Thread ID is required");

        await sendStreamingMessage({
          threadId: threadId as Id<"chatThreadsStream">,
          prompt: messageContent,
          model: selectedModel,
          useCoordinator: true,  // Enable smart routing via coordinator
          arbitrageEnabled,
        });

        console.log('[FastAgentPanel] Streaming initiated');
        setIsStreaming(false);

        // Auto-name the thread if it's new (fire and forget)
        if (isNewThread && threadId) {
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
    isStreaming,
    activeThreadId,
    fastMode,
    selectedModel,
    chatMode,
    selectedDocumentIds,
    contextDocuments,
    createThreadWithMessage,
    continueThreadAction,
    createStreamingThread,
    sendStreamingMessage,
    generateAndCreateDocument,
    streamingThreads,
    streamingThread,
    autoNameThread,
  ]);

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
      await sendStreamingMessage({
        threadId: activeThreadId as Id<"chatThreadsStream">,
        prompt: userPrompt,
        model: selectedModel,
        useCoordinator: true,
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

  // Minimized mode - compact vertical strip
  if (isMinimized) {
    return (
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
    );
  }

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-sm z-[999] lg:hidden"
          onClick={onClose}
        />
      )}

      <div className={`fast-agent-panel ${variant === 'sidebar' ? 'sidebar-mode' : ''} bg-white border-l border-gray-200`}>
        {/* Header */}
        <div className="fast-agent-panel-header border-b border-gray-200 bg-white">
          <div className="flex flex-col gap-4 w-full">
            {/* Top Row: Thread Selector & New Button */}
            <div className="flex items-center justify-between mb-3">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsThreadDropdownOpen(!isThreadDropdownOpen)}
                  className="flex items-center gap-2 px-2 py-1.5 -ml-2 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors text-left max-w-[200px]"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-[var(--text-primary)] truncate">
                      {activeThreadId
                        ? threads?.find(t => t._id === activeThreadId)?.title || 'Untitled Thread'
                        : 'New Chat'}
                    </div>
                    <div className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${isStreaming ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`} />
                      {isStreaming ? 'Thinking...' : 'Ready'}
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${isThreadDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Thread Dropdown */}
                {isThreadDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsThreadDropdownOpen(false)}
                    />
                    <div className="absolute top-full left-0 mt-1 w-64 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg shadow-lg z-50 py-1 max-h-[300px] overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveThreadId(null);
                          setInput('');
                          setAttachedFiles([]);
                          setIsThreadDropdownOpen(false);
                        }}
                        className="w-full px-3 py-2 text-left text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] flex items-center gap-2"
                      >
                        <div className="w-6 h-6 rounded bg-[var(--bg-secondary)] flex items-center justify-center">
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                        New Chat
                      </button>

                      <div className="my-1 border-t border-[var(--border-color)]" />

                      <div className="px-3 py-1 text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
                        Recent
                      </div>

                      {threads?.map((thread) => (
                        <button
                          type="button"
                          key={thread._id}
                          onClick={() => {
                            setActiveThreadId(thread._id);
                            setIsThreadDropdownOpen(false);
                          }}
                          className={`w-full px-3 py-2 text-left text-xs hover:bg-[var(--bg-secondary)] flex items-center gap-2 ${activeThreadId === thread._id ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                            }`}
                        >
                          <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{thread.title || 'Untitled Thread'}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Live Events toggle */}
                <button
                  type="button"
                  onClick={() => setShowEventsPanel(!showEventsPanel)}
                  className={`flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md border transition-colors ${showEventsPanel
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border-[var(--border-color)]'
                    }`}
                  title="Toggle Live Events Panel"
                >
                  <Activity className={`w-3.5 h-3.5 ${isStreaming ? 'animate-pulse text-blue-500' : ''}`} />
                  Live
                  {liveEvents.filter(e => e.status === 'running').length > 0 && (
                    <span className="px-1 py-0.5 text-[10px] bg-blue-500 text-white rounded-full">
                      {liveEvents.filter(e => e.status === 'running').length}
                    </span>
                  )}
                </button>

                {/* Skills button with popover */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowSkillsPanel(!showSkillsPanel)}
                    className={`flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md border transition-colors ${showSkillsPanel
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border-[var(--border-color)]'
                      }`}
                    title="Browse Skills"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Skills
                  </button>

                  {/* Skills Popover */}
                  {showSkillsPanel && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowSkillsPanel(false)}
                      />
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
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveThreadId(null);
                    setInput('');
                    setAttachedFiles([]);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] text-xs font-medium rounded-md border border-[var(--border-color)] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New
                </button>

                {/* Minimize button */}
                <button
                  type="button"
                  onClick={() => setIsMinimized(true)}
                  className="p-1.5 hover:bg-[var(--bg-hover)] rounded-md transition-colors"
                  title="Minimize panel"
                >
                  <Minimize2 className="w-4 h-4 text-[var(--text-muted)]" />
                </button>

                {/* Close button */}
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

            {/* Bottom Row: Tabs */}
            <div className="flex p-1 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
              {(['thread', 'artifacts', 'tasks', 'brief', 'edits'] as const).map((tab) => (
                <button
                  type="button"
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === tab
                    ? 'bg-[var(--bg-primary)] text-[var(--accent-primary)] shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                    }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="fast-agent-panel-content bg-[var(--bg-primary)]">
          {/* Left Sidebar (Thread List) - Only show on thread tab when sidebar is toggled */}
          <div className={`panel-sidebar ${showSidebar && activeTab === 'thread' ? 'visible' : ''} border-r border-[var(--border-color)] bg-[var(--bg-secondary)]`}>
            <FastAgentThreadList
              threads={threads || []}
              activeThreadId={activeThreadId}
              onSelectThread={setActiveThreadId}
              onDeleteThread={handleDeleteThread}
              className="h-full"
            />
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg-primary)] relative">
            {activeTab === 'artifacts' ? (
              <ArtifactsTab
                media={aggregatedMedia}
                documents={aggregatedDocumentActions}
                hasThread={Boolean(activeThreadId)}
                onDocumentSelect={handleDocumentSelect}
              />
            ) : activeTab === 'tasks' ? (
              <AgentTasksTab agentThreadId={streamingThread?.agentThreadId || null} />
            ) : activeTab === 'brief' ? (
              <BriefTab />
            ) : activeTab === 'edits' ? (
              <EditsTab activeThreadId={streamingThread?.agentThreadId || null} />
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Memory Status Header (Plan Progress) */}
                <MemoryStatusHeader
                  planItems={planItems}
                  currentFocus={agentPlans?.[0]?.goal}
                  isLoading={agentPlans === undefined}
                />

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
                <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
                  {/* Parallel Agent Lanes (Live Activity) */}
                  {chatMode === 'agent-streaming' && streamingThread?.agentThreadId && (
                    <div className="mb-4">
                      <LiveAgentLanes
                        runId={streamingThread.agentThreadId}
                        className="mb-4"
                      />
                    </div>
                  )}

                  {/* Welcome / Empty State */}
                  {!activeThreadId && (!messagesToRender || messagesToRender.length === 0) && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 text-[var(--text-secondary)]">
                      <div className="w-12 h-12 bg-[var(--bg-secondary)] rounded-xl flex items-center justify-center mb-4">
                        <Bot className="w-6 h-6 text-[var(--text-muted)]" />
                      </div>
                      <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">Nodebench AI</h3>
                      <p className="text-xs text-[var(--text-muted)] max-w-[200px]">
                        Ready to help with your coding tasks.
                      </p>
                    </div>
                  )}

                  {messagesToRender?.map((message: any) => (
                    <FastAgentUIMessageBubble
                      key={message._id || message.id}
                      message={message}
                      onRegenerateMessage={() => handleRegenerateMessage(message.key)}
                      onDeleteMessage={() => handleDeleteMessage(message._id)}
                      onCompanySelect={handleCompanySelect}
                      onPersonSelect={handlePersonSelect}
                      onEventSelect={handleEventSelect}
                      onNewsSelect={handleNewsSelect}
                      onDocumentSelect={handleDocumentSelect}
                    />
                  ))}

                  {/* Streaming Indicator */}
                  {isStreaming && (
                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] px-4 animate-pulse">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Thinking...</span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="p-4 bg-[var(--bg-primary)]/80 backdrop-blur-sm border-t border-[var(--border-color)]">
              {/* Context Bar - Shows active constraints */}
              <ContextBar
                constraints={contextConstraints}
                onEditConstraints={() => toast.info('Edit constraints modal (coming soon)')}
              />
              <FastAgentInputBar
                input={input}
                setInput={setInput}
                onSend={() => handleSendMessage(input)}
                isStreaming={isStreaming}
                onStop={() => setIsStreaming(false)}
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
              />
            </div>
          </div>

        </div>

        {/* Export Menu */}
        {exportingThreadId && (() => {
          const thread = threads?.find((t: any) => (chatMode === 'agent' ? t.threadId : t._id) === exportingThreadId);
          if (!thread) return null;

          // Convert to Thread type for ExportMenu
          const exportThread: Thread = {
            _id: thread._id,
            userId: thread.userId,
            title: thread.title,
            pinned: false,
            createdAt: thread._creationTime,
            updatedAt: thread._creationTime,
            _creationTime: thread._creationTime,
            messageCount: thread.messageCount,
            lastMessage: thread.lastMessage,
            lastMessageAt: thread.lastMessageAt,
            toolsUsed: thread.toolsUsed,
            modelsUsed: thread.modelsUsed,
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
