// src/components/FastAgentPanel/FastAgentPanel.tsx
// Main container component for the new ChatGPT-like AI chat sidebar

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { X, Zap, Settings, Plus, Radio, Save, PanelLeftClose, PanelLeft, Bot, Loader2, ChevronDown, MessageSquare, Activity } from 'lucide-react';
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
import { LiveEventsPanel } from './LiveEventsPanel';
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
  const [selectedModel, setSelectedModel] = useState<'gpt-5' | 'gpt-5-mini' | 'gpt-5-nano' | 'gemini'>('gpt-5');

  // Thread list collapse state
  const [showSidebar, setShowSidebar] = useState(false);

  // Live Events Panel state
  const [showEventsPanel, setShowEventsPanel] = useState(false);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);

  // File attachment state
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  const handleAttachFiles = (files: File[]) => {
    setAttachedFiles(prev => [...prev, ...files]);
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Live streaming state
  const [liveThinking, setLiveThinking] = useState<ThinkingStep[]>([]);
  const [liveTokens, setLiveTokens] = useState<string>("");
  const [liveAgents, setLiveAgents] = useState<SpawnedAgent[]>([]);

  const [liveToolCalls, setLiveToolCalls] = useState<ToolCall[]>([]);
  const [liveSources, setLiveSources] = useState<Source[]>([]);

  // Tab state - MUST be declared before any conditional logic or loops
  const [activeTab, setActiveTab] = useState<'thread' | 'tasks' | 'edits' | 'artifacts'>('thread');
  const [isThreadDropdownOpen, setIsThreadDropdownOpen] = useState(false);
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Track auto-created documents to avoid duplicates (by agentThreadId) and processed message IDs
  const autoDocCreatedThreadIdsRef = useRef<Set<string>>(new Set());

  // Query for human-in-the-loop requests
  const humanRequests = useQuery(
    api.humanInTheLoop.getPendingHumanRequests,
    activeThreadId ? { threadId: activeThreadId } : 'skip'
  );
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
  const agentThreads = useQuery(api.agentChat.listUserThreads);
  const agentMessagesResult = useQuery(
    api.agentChat.getThreadMessages,
    activeThreadId && chatMode === 'agent' ? {
      threadId: activeThreadId,
      paginationOpts: { numItems: 100, cursor: null }
    } : "skip"
  );
  const agentMessages = agentMessagesResult?.page;

  // Agent-based actions
  const createThreadWithMessage = useAction(api.agentChatActions.createThreadWithMessage);
  const continueThreadAction = useAction(api.agentChatActions.continueThread);
  const deleteAgentThread = useMutation(api.agentChat.deleteThread);

  // Agent Streaming mode: Using agent component's native streaming
  const streamingThreads = useQuery(
    api.fastAgentPanelStreaming.listThreads,
    chatMode === 'agent-streaming' ? {} : "skip"
  );

  // Get the agent thread ID for streaming mode
  const streamingThread = useQuery(
    api.fastAgentPanelStreaming.getThreadByStreamId,
    activeThreadId && chatMode === 'agent-streaming'
      ? { threadId: activeThreadId as Id<"chatThreadsStream"> }
      : "skip"
  );

  // Use useUIMessages hook for streaming messages with delta support
  // This hook expects the threadId to be the Agent component's threadId (string), not our chatThreadsStream ID
  const { results: streamingMessages, status: _streamingStatus, error: streamError } = useUIMessages(
    api.fastAgentPanelStreaming.getThreadMessagesWithStreaming,
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

  const createStreamingThread = useAction(api.fastAgentPanelStreaming.createThread);
  const sendStreamingMessage = useMutation(api.fastAgentPanelStreaming.initiateAsyncStreaming);
  const deleteStreamingThread = useMutation(api.fastAgentPanelStreaming.deleteThread);
  const deleteMessage = useMutation(api.fastAgentPanelStreaming.deleteMessage);
  const saveChatSessionToDossier = useMutation(api.documents.saveChatSessionToDossier);
  // NEW: Unified document generation and creation action
  const generateAndCreateDocument = useAction(api.fastAgentDocumentCreation.generateAndCreateDocument);
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

    // Build message with document context if documents are selected
    let messageContent = text;
    if (selectedDocumentIds.size > 0) {
      const docIdArray = Array.from(selectedDocumentIds);
      messageContent = `[CONTEXT: Analyzing ${docIdArray.length} document(s): ${docIdArray.join(', ')}]\n\n${text}`;
    }

    setInput('');
    setLiveTokens("");
    setLiveAgents([]);
    setIsStreaming(true);

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
        });

        console.log('[FastAgentPanel] Streaming initiated');
        setIsStreaming(false);
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
    createThreadWithMessage,
    continueThreadAction,
    createStreamingThread,
    sendStreamingMessage,
    generateAndCreateDocument,
    streamingThreads,
    streamingThread,
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

  // ========== RENDER ==========

  if (!isOpen) return null;

  // Convert messages to Message type based on chat mode
  const uiMessages: Message[] = (chatMode === 'agent-streaming' ? streamingMessages : agentMessages || []).map((msg: any) => {
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

  // Prepare messages for rendering
  const messagesToRender = chatMode === 'agent-streaming'
    ? streamingMessages
    : (agentMessages || []).map((msg: any) => ({
      role: msg.role || 'assistant',
      text: msg.text || msg.content || '',
      status: 'complete',
      parts: [{ type: 'text', text: msg.text || msg.content || '' }],
      _id: msg._id,
      _creationTime: msg._creationTime,
      model: msg.model,
    }));

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

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-sm z-[999] lg:hidden"
          onClick={onClose}
        />
      )}

      max-width: calc(100vw - 2rem);
      background: var(--bg-primary);
      border-radius: 1rem;
      display: flex;
      flex-direction: column;
      z-index: 1000;
      box-shadow:
      0 0 0 1px rgba(0,0,0,0.05),
      0 10px 15px -3px rgba(0,0,0,0.1),
      0 4px 6px -2px rgba(0,0,0,0.05);
      overflow: hidden;
        }

      .fast-agent-panel.sidebar-mode {
        position: relative;
      right: auto;
      bottom: auto;
      top: auto;
      width: 100%;
      height: 100%;
      border-radius: 0;
      box-shadow: none;
      border-left: 1px solid var(--border-color);
        }

      .fast-agent-panel-header {
        padding: 1rem;
      background: var(--bg-primary);
      border-bottom: 1px solid var(--border-color);
      flex-shrink: 0;
        }

      .fast-agent-panel-content {
        flex: 1;
      display: flex;
      overflow: hidden;
      position: relative;
        }

      .panel-sidebar {
        width: 0;
      overflow: hidden;
      transition: width 0.3s ease;
      border-right: 1px solid var(--border-color);
      background: var(--bg-secondary);
        }

      .panel-sidebar.visible {
        width: 260px;
        }
        `}</style >

    {/* Export Menu */ }
  {
    exportingThreadId && (() => {
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
    })()
  }

  {/* Settings Panel */ }
  {
    showSettings && (
      <SettingsPanel
        fastMode={fastMode}
        onFastModeChange={setFastMode}
        model={selectedModel}
        onModelChange={setSelectedModel}
        onClose={() => setShowSettings(false)}
      />
    )
  }
      </div >
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
