// src/components/FastAgentPanel/FastAgentPanel.tsx
// Main container component for the new ChatGPT-like AI chat sidebar

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { X, Zap, Settings, Plus, Radio, Save, PanelLeftClose, PanelLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useUIMessages, type UIMessagesQuery } from '@convex-dev/agent/react';

import './FastAgentPanel.animations.css';
import { ThreadList } from './FastAgentPanel.ThreadList';
import { MessageStream } from './FastAgentPanel.MessageStream';
import { UIMessageStream } from './FastAgentPanel.UIMessageStream';
import { InputBar } from './FastAgentPanel.InputBar';
import { FileUpload } from './FastAgentPanel.FileUpload';
import { ExportMenu } from './FastAgentPanel.ExportMenu';
import { Settings as SettingsPanel } from './FastAgentPanel.Settings';
import { AgentHierarchy } from './FastAgentPanel.AgentHierarchy';
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
  const [isThreadListCollapsed, setIsThreadListCollapsed] = useState(false);

  // Live streaming state
  const [liveThinking, setLiveThinking] = useState<ThinkingStep[]>([]);
  const [liveTokens, setLiveTokens] = useState<string>("");
  const [liveAgents, setLiveAgents] = useState<SpawnedAgent[]>([]);

  const [liveToolCalls, setLiveToolCalls] = useState<ToolCall[]>([]);
  const [liveSources, setLiveSources] = useState<Source[]>([]);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Track auto-created documents to avoid duplicates (by agentThreadId) and processed message IDs
  const autoDocCreatedThreadIdsRef = useRef<Set<string>>(new Set());
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
  const createThreadWithMessage = useAction(api.agentChat.createThreadWithMessage);
  const continueThreadAction = useAction(api.agentChat.continueThread);
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
      console.log('[FastAgentPanel] 🔍 streamingMessages:', streamingMessages);
      console.log('[FastAgentPanel] 🔍 streamingMessages.length:', streamingMessages?.length);
      if (streamingMessages && streamingMessages.length > 0) {
        console.log('[FastAgentPanel] Messages updated:', streamingMessages.length, 'messages');
        const lastMessage = streamingMessages[streamingMessages.length - 1];
        if (lastMessage) {
          console.log('[FastAgentPanel] Last message:', {
            role: lastMessage.role,
            textLength: lastMessage.text?.length || 0,
            textPreview: (lastMessage.text || '').substring(0, 50) + ((lastMessage.text?.length || 0) > 50 ? '...' : ''),
            status: lastMessage.status,
          });

        }
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

  // Use the appropriate data based on mode
  const threads = chatMode === 'agent' ? agentThreads : streamingThreads;

  // Debug: Log threads data
  useEffect(() => {
    if (threads && threads.length > 0) {
      console.log('[FastAgentPanel] Threads received:', threads.length);
      console.log('[FastAgentPanel] First thread:', {
        _id: threads[0]._id,
        title: threads[0].title,
        messageCount: threads[0].messageCount,
        lastMessage: threads[0].lastMessage?.substring(0, 50),
        toolsUsed: threads[0].toolsUsed,
        modelsUsed: threads[0].modelsUsed,
      });
    }
  }, [threads]);

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
  // NOTE: Auto-create document logic has been moved to the unified generateAndCreateDocument action
  // The action now handles both generation and creation atomically on the server
  // This simplifies the UI and ensures consistency




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

  const handlePinThread = useCallback(async (_threadId: string) => {
    // Note: Agent API doesn't support pinning yet
    // This is a future enhancement
    toast.info('Pinning not yet supported with Agent API');
  }, []);

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
            prompt: messageContent,
            model: selectedModel,
            fastMode,
          });
          setActiveThreadId(result.threadId);
          console.log('[FastAgentPanel] New thread created:', result.threadId);
        } else {
          // Continue existing thread
          result = await continueThreadAction({
            threadId: activeThreadId,
            prompt: messageContent,
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
  ]);

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
      });
      toast.success('Regenerating response...');
    } catch (err) {
      console.error('[FastAgentPanel] Failed to regenerate:', err);
      toast.error('Failed to regenerate response');
    }
  }, [chatMode, activeThreadId, streamingMessages, sendStreamingMessage, selectedModel]);

  // Handle manual Mermaid diagram retry
  const handleMermaidRetry = useCallback(async (error: string, code: string) => {
    console.log('[FastAgentPanel] User requested Mermaid diagram fix:', error);

    // Send correction request to the agent
    const correctionPrompt = `[MERMAID_ERROR] The previous Mermaid diagram has a syntax error. Please fix it.

Error: ${error}

Original code:
\`\`\`mermaid
${code}
\`\`\`

Please respond with ONLY the corrected Mermaid diagram in a \`\`\`mermaid code block. Fix the syntax error and ensure all edges use proper syntax (-->|Label| or --> not -- or -)`;

    // Send the correction request
    try {
      if (chatMode === 'agent-streaming' && activeThreadId) {
        await sendStreamingMessage({
          threadId: activeThreadId as Id<"chatThreadsStream">,
          prompt: correctionPrompt,
          model: selectedModel,
        });
        toast.success('Correction request sent to AI');
        console.log('[FastAgentPanel] Correction request sent');
      }
    } catch (err) {
      console.error('[FastAgentPanel] Failed to send correction request:', err);
      toast.error('Failed to send correction request');
    }
  }, [chatMode, activeThreadId, sendStreamingMessage, selectedModel]);

  // Handle company selection from SEC filing disambiguation
  const handleCompanySelect = useCallback(async (company: any) => {
    if (chatMode !== 'agent-streaming' || !activeThreadId) {
      console.warn('[FastAgentPanel] Company selection only works in agent-streaming mode');
      return;
    }

    console.log('[FastAgentPanel] Company selected:', company);

    // Create a confirmation message
    const confirmationMessage = `I confirm: ${company.name} (CIK: ${company.cik})`;

    // Send the confirmation message
    try {
      await sendStreamingMessage({
        threadId: activeThreadId as Id<"chatThreadsStream">,
        prompt: confirmationMessage,
        model: selectedModel,
      });
      toast.success('Company selection confirmed');
      console.log('[FastAgentPanel] Company selection sent');
    } catch (err) {
      console.error('[FastAgentPanel] Failed to send company selection:', err);
      toast.error('Failed to confirm company selection');
    }
  }, [chatMode, activeThreadId, sendStreamingMessage, selectedModel]);

  // Handle person selection from people profile disambiguation
  const handlePersonSelect = useCallback(async (person: any) => {
    if (chatMode !== 'agent-streaming' || !activeThreadId) {
      console.warn('[FastAgentPanel] Person selection only works in agent-streaming mode');
      return;
    }

    console.log('[FastAgentPanel] Person selected:', person);

    // Create a confirmation message
    const confirmationMessage = `I confirm: ${person.name}${person.profession ? ` (${person.profession})` : ''}${person.organization ? ` at ${person.organization}` : ''}`;

    // Send the confirmation message
    try {
      await sendStreamingMessage({
        threadId: activeThreadId as Id<"chatThreadsStream">,
        prompt: confirmationMessage,
        model: selectedModel,
      });
      toast.success('Person selection confirmed');
      console.log('[FastAgentPanel] Person selection sent');
    } catch (err) {
      console.error('[FastAgentPanel] Failed to send person selection:', err);
      toast.error('Failed to confirm person selection');
    }
  }, [chatMode, activeThreadId, sendStreamingMessage, selectedModel]);

  // Handle event selection from recent event disambiguation
  const handleEventSelect = useCallback(async (event: any) => {
    if (chatMode !== 'agent-streaming' || !activeThreadId) {
      console.warn('[FastAgentPanel] Event selection only works in agent-streaming mode');
      return;
    }

    console.log('[FastAgentPanel] Event selected:', event);

    // Create a confirmation message
    const confirmationMessage = `I confirm: ${event.name}${event.date ? ` (${event.date})` : ''}`;

    // Send the confirmation message
    try {
      await sendStreamingMessage({
        threadId: activeThreadId as Id<"chatThreadsStream">,
        prompt: confirmationMessage,
        model: selectedModel,
      });
      toast.success('Event selection confirmed');
      console.log('[FastAgentPanel] Event selection sent');
    } catch (err) {
      console.error('[FastAgentPanel] Failed to send event selection:', err);
      toast.error('Failed to confirm event selection');
    }
  }, [chatMode, activeThreadId, sendStreamingMessage, selectedModel]);

  // Handle news article selection from recent news disambiguation
  const handleNewsSelect = useCallback(async (article: any) => {
    if (chatMode !== 'agent-streaming' || !activeThreadId) {
      console.warn('[FastAgentPanel] News selection only works in agent-streaming mode');
      return;
    }

    console.log('[FastAgentPanel] News article selected:', article);

    // Create a confirmation message
    const confirmationMessage = `I confirm: ${article.headline}${article.source ? ` (${article.source})` : ''}`;

    // Send the confirmation message
    try {
      await sendStreamingMessage({
        threadId: activeThreadId as Id<"chatThreadsStream">,
        prompt: confirmationMessage,
        model: selectedModel,
      });
      toast.success('News article selection confirmed');
      console.log('[FastAgentPanel] News selection sent');
    } catch (err) {
      console.error('[FastAgentPanel] Failed to send news selection:', err);
      toast.error('Failed to confirm news selection');
    }
  }, [chatMode, activeThreadId, sendStreamingMessage, selectedModel]);

  // Handle document selection from document action cards
  const handleDocumentSelect = useCallback((documentId: string) => {
    console.log('[FastAgentPanel] Document selected:', documentId);

    // Dispatch custom event to navigate to the document
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
  const displayMessages: Message[] = (messages || []).map((msg: any) => {
    if (chatMode === 'agent-streaming') {
      // Agent streaming mode messages - from agent component
      // Messages may have nested structure: msg.message.role and msg.message.text
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
        // If content is an array or object, try to stringify parts
        const textParts = messageData.parts?.filter((p: any) => p.type === 'text')?.map((p: any) => p.text) || [];
        content = textParts.join('');
      }

      // Debug logging
      if (typeof content !== 'string' || content === '') {
        console.log('[FastAgentPanel] Message structure:', { msg, messageData, role, content, type: typeof content });
      }

      return {
        id: msg._id,
        threadId: (activeThreadId || '') as any,
        role: role as 'user' | 'assistant' | 'system',
        content: String(content || ''), // Ensure it's always a string
        status: (msg.status || 'complete') as 'sending' | 'streaming' | 'complete' | 'error',
        timestamp: new Date(msg._creationTime || Date.now()),
        isStreaming: msg.status === 'streaming',
        model: selectedModel,
      };
    }

    // Agent mode messages - convert from Agent component format
    // Extract role from msg.message.role or msg.role
    const role = msg.message?.role || msg.role || 'assistant';

    // Extract content - Agent messages have multiple possible structures:
    // 1. msg.text (flattened text representation)
    // 2. msg.message.content (can be string or array of parts)
    let content = '';

    // Try flattened text first (most reliable)
    if (msg.text) {
      content = msg.text;
    }
    // Try msg.message.content
    else if (msg.message?.content) {
      const msgContent = msg.message.content;
      if (typeof msgContent === 'string') {
        content = msgContent;
      } else if (Array.isArray(msgContent)) {
        // Extract text from parts array
        const textParts = msgContent
          .filter((p: any) => p.type === 'text' || p.type === 'reasoning')
          .map((p: any) => p.text)
          .filter((t: any) => t);
        content = textParts.join('\n');
      }
    }
    // Fallback to msg.content
    else if (msg.content) {
      if (typeof msg.content === 'string') {
        content = msg.content;
      } else if (Array.isArray(msg.content)) {
        const textParts = msg.content
          .filter((p: any) => p.type === 'text' || p.type === 'reasoning')
          .map((p: any) => p.text)
          .filter((t: any) => t);
        content = textParts.join('\n');
      }
    }

    // Extract thinking steps from message content if it's an array
    const contentArray = Array.isArray(msg.message?.content) ? msg.message.content : [];
    const thinkingSteps = contentArray
      .filter((part: any) => part.type === 'reasoning')
      .map((part: any) => ({
        type: 'step' as const,
        content: part.text || '',
        timestamp: new Date(msg._creationTime),
      }))
      .filter((step: any) => step.content.length > 0);

    // Extract tool calls from message content
    const toolCalls = contentArray
      .filter((part: any) => part.type === 'tool-call' && part.toolName)
      .map((part: any, idx: number) => ({
        callId: part.toolCallId || `call-${idx}`,
        toolName: part.toolName,
        args: part.args || {},
        result: undefined,
        error: undefined,
        status: 'complete' as const,
        elapsedMs: undefined,
        timestamp: new Date(msg._creationTime),
      }));

    // Map Agent status to our status type
    let status: 'sending' | 'streaming' | 'complete' | 'error' = 'complete';
    if (msg.status === 'pending') status = 'streaming';
    else if (msg.status === 'failed') status = 'error';
    else if (msg.status === 'success') status = 'complete';

    return {
      id: msg._id,
      threadId: msg.threadId,
      role: role as 'user' | 'assistant' | 'system',
      content,
      status,
      timestamp: new Date(msg._creationTime),
      runId: undefined,
      streamId: undefined, // Don't use StreamingMessage component for Agent messages
      isStreaming: status === 'streaming',
      model: msg.model,
      fastMode: undefined,
      tokensUsed: msg.usage ? {
        input: msg.usage.promptTokens || 0,
        output: msg.usage.completionTokens || 0,
      } : undefined,
      elapsedMs: msg.elapsedMs,
      thinkingSteps: thinkingSteps.length > 0 ? thinkingSteps : undefined,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      sources: msg.sources,
    };
  });

  // Convert threads to Thread type based on chat mode
  const displayThreads: Thread[] = (threads || []).map((thread: any) => {
    if (chatMode === 'agent-streaming') {
      // Agent streaming mode threads - already in correct format
      return {
        _id: thread._id,
        userId: thread.userId as Id<"users">,
        title: thread.title || 'New Chat',
        pinned: thread.pinned || false,
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt,
        _creationTime: thread.createdAt,
        messageCount: thread.messageCount,
        lastMessage: thread.lastMessage,
        lastMessageAt: thread.lastMessageAt,
        toolsUsed: thread.toolsUsed,
        modelsUsed: thread.modelsUsed,
      };
    }

    // Agent mode threads - convert from Agent component format
    // Filter out archived threads for agent mode
    const threadId = thread.threadId || thread._id;
    return {
      _id: threadId,
      userId: thread.userId as Id<"users">,
      title: thread.title || thread.summary || 'New Chat', // Use title first, then summary
      pinned: false, // Agent component doesn't have pinned
      createdAt: thread._creationTime,
      updatedAt: thread.lastMessageAt || thread._creationTime, // ✅ FIX: Use lastMessageAt for sorting
      _creationTime: thread._creationTime,
      messageCount: thread.messageCount,
      lastMessage: thread.lastMessage,
      lastMessageAt: thread.lastMessageAt,
      toolsUsed: thread.toolsUsed,
      modelsUsed: thread.modelsUsed,
    };
  }).filter((thread: any) => {
    // Only filter archived for agent mode
    if (chatMode === 'agent') {
      return !thread.title?.startsWith('[ARCHIVED]');
    }
    return true;
  });

  const streamingMessageId = (() => {
    for (let i = displayMessages.length - 1; i >= 0; i -= 1) {
      if (displayMessages[i].status === 'streaming') {
        return displayMessages[i].id;
      }
    }
    return undefined;
  })();

  return (
    <div className="fast-agent-panel">
      {/* Header */}
      <div className="fast-agent-panel-header">
        <div className="header-left">
          <h2 className="header-title">Fast Agent</h2>
          <button
            onClick={() => setFastMode(!fastMode)}
            className={`fast-mode-toggle ${fastMode ? 'active' : ''}`}
            title={fastMode ? 'Fast Mode ON' : 'Fast Mode OFF'}
          >
            <Zap className="h-4 w-4" />
            {fastMode && <span className="fast-mode-label">Fast</span>}
          </button>
          <button
            onClick={() => setChatMode(chatMode === 'agent' ? 'agent-streaming' : 'agent')}
            className={`chat-mode-toggle ${chatMode === 'agent-streaming' ? 'active' : ''}`}
            title={`Mode: ${chatMode === 'agent' ? 'Agent' : 'Agent Streaming'}`}
          >
            <Radio className="h-4 w-4" />
            <span className="chat-mode-label">{chatMode === 'agent' ? 'Agent' : 'Streaming'}</span>
          </button>

          {/* Multi-document selector indicator */}
          {selectedDocumentIds.size > 0 && (
            <div className="document-context-indicator" title={`${selectedDocumentIds.size} document(s) selected`}>
              <span className="doc-count-badge">{selectedDocumentIds.size}</span>
              <span className="doc-label">docs</span>
            </div>
          )}
        </div>

        <div className="header-right">
          <button
            onClick={() => setShowDocumentSelector(!showDocumentSelector)}
            className={`icon-button ${selectedDocumentIds.size > 0 ? 'active' : ''}`}
            title={`Select documents for context (${selectedDocumentIds.size} selected)`}
          >
            📄
          </button>
          <button
            onClick={() => { void handleSaveSession(); }}
            className="icon-button"
            title="Save Chat Session to Documents"
            disabled={!activeThreadId}
          >
            <Save className="h-4 w-4" />
          </button>
          <button
            onClick={() => { void handleCreateThread(); }}
            className="icon-button"
            title="New Chat"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="icon-button"
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="icon-button"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Document Selector Panel */}
      {showDocumentSelector && (
        <div className="document-selector-panel">
          <div className="selector-header">
            <h3>Select Documents for Context</h3>
            <button
              onClick={() => setShowDocumentSelector(false)}
              className="close-button"
              title="Close"
            >
              ✕
            </button>
          </div>
          <div className="selector-content">
            <p className="selector-hint">
              {selectedDocumentIds.size > 0
                ? `${selectedDocumentIds.size} document(s) selected. Use these in your queries for multi-document analysis.`
                : 'No documents selected. Click the document icon in the header to select documents.'}
            </p>
            {selectedDocumentIds.size > 0 && (
              <div className="selected-docs-list">
                <div className="list-label">Selected Documents:</div>
                <div className="doc-ids">
                  {Array.from(selectedDocumentIds).map((docId) => (
                    <div key={docId} className="doc-id-item">
                      <span className="doc-id">{docId}</span>
                      <button
                        onClick={() => {
                          const newSet = new Set(selectedDocumentIds);
                          newSet.delete(docId);
                          setSelectedDocumentIds(newSet);
                        }}
                        className="remove-button"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="selector-actions">
              <button
                onClick={() => setSelectedDocumentIds(new Set())}
                className="clear-button"
                disabled={selectedDocumentIds.size === 0}
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="fast-agent-panel-content">
        {/* Thread List Collapse Toggle - Always Visible */}
        <button
          onClick={() => setIsThreadListCollapsed(!isThreadListCollapsed)}
          className="thread-list-collapse-toggle"
          title={isThreadListCollapsed ? 'Expand thread list' : 'Collapse thread list'}
          aria-label={isThreadListCollapsed ? 'Expand thread list' : 'Collapse thread list'}
        >
          {isThreadListCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>

        {/* Thread List */}
        <ThreadList
          threads={displayThreads}
          activeThreadId={activeThreadId}
          onSelectThread={setActiveThreadId}
          onPinThread={(threadId) => {
            void handlePinThread(threadId);
          }}
          onDeleteThread={(threadId) => {
            void handleDeleteThread(threadId);
          }}
          onExportThread={handleExportThread}
          isCollapsed={isThreadListCollapsed}
        />

        {/* Main Chat Area */}
        <div className="chat-area">
          {/* Agent hierarchy / spawned agents */}
          <AgentHierarchy agents={liveAgents} isStreaming={isStreaming} />

          {/* Messages - Use UIMessageStream for streaming mode, MessageStream for agent mode */}
          {chatMode === 'agent-streaming' ? (
            <UIMessageStream
              messages={streamingMessages || []}
              autoScroll={true}
              onMermaidRetry={handleMermaidRetry}
              onRegenerateMessage={handleRegenerateMessage}
              onDeleteMessage={handleDeleteMessage}
              onCompanySelect={handleCompanySelect}
              onPersonSelect={handlePersonSelect}
              onEventSelect={handleEventSelect}
              onNewsSelect={handleNewsSelect}
              onDocumentSelect={handleDocumentSelect}
            />
          ) : (
            <MessageStream
              messages={displayMessages}
              isStreaming={isStreaming}
              streamingMessageId={streamingMessageId}
              liveThinking={liveThinking}
              liveToolCalls={liveToolCalls}
              liveSources={liveSources}
              liveTokens={liveTokens}
            />
          )}

          {/* File Upload */}
          {activeThreadId && chatMode === 'agent-streaming' && (
            <FileUpload
              threadId={activeThreadId as Id<"chatThreadsStream">}
              onFileSubmitted={() => {
                // Refresh messages after file submission
                // The agent will automatically respond
              }}
            />
          )}

          {/* Input Bar */}
          <InputBar
            onSend={(content) => {
              void handleSendMessage(content);
            }}
            disabled={isStreaming}
            placeholder="Ask me anything..."
          />
        </div>
      </div>

      <style>{`
        .fast-agent-panel {
          position: fixed;
          right: 0;
          top: 0;
          bottom: 0;
          width: 900px;
          max-width: 90vw;
          background: var(--bg-primary);
          border-left: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          z-index: 1000;
          box-shadow: -4px 0 24px rgba(0, 0, 0, 0.1);
        }

        .fast-agent-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid var(--border-color);
          background: var(--bg-primary);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .header-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary);
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .fast-mode-toggle {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.375rem 0.75rem;
          border-radius: 0.5rem;
          border: 1px solid var(--border-color);
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .fast-mode-toggle.active {
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          color: white;
          border-color: #fbbf24;
          box-shadow: 0 2px 8px rgba(251, 191, 36, 0.3);
        }

        .fast-mode-label {
          font-size: 0.8125rem;
        }

        .chat-mode-toggle {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.375rem 0.75rem;
          border-radius: 0.5rem;
          border: 1px solid var(--border-color);
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .chat-mode-toggle.active {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border-color: #10b981;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
        }

        .chat-mode-label {
          font-size: 0.8125rem;
        }

        .header-right {
          display: flex;
          gap: 0.5rem;
        }

        .icon-button {
          padding: 0.5rem;
          border-radius: 0.5rem;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.15s;
        }

        .icon-button:hover {
          background: var(--bg-secondary);
          color: var(--text-primary);
        }

        .fast-agent-panel-content {
          flex: 1;
          display: flex;
          overflow: hidden;
          position: relative;
        }

        .thread-list-collapse-toggle {
          position: absolute;
          left: 0;
          top: 0;
          z-index: 100;
          width: 40px;
          height: 40px;
          padding: 0.5rem;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.6;
        }

        .thread-list-collapse-toggle:hover {
          opacity: 1;
          color: var(--text-primary);
        }

        .thread-list-collapse-toggle:active {
          transform: scale(0.9);
        }

        .chat-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
      `}</style>

      {/* Export Menu */}
      {exportingThreadId && (() => {
        const thread = displayThreads.find(t => t._id === exportingThreadId);
        if (!thread) return null;

        return (
          <ExportMenu
            thread={thread}
            messages={displayMessages}
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
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
