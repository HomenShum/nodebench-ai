// src/components/FastAgentPanel/FastAgentPanel.tsx
// Main container component for the new ChatGPT-like AI chat sidebar

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { X, Zap, Settings, Plus } from 'lucide-react';
import { ConfirmationDialog } from './ConfirmationDialog';
import { toast } from 'sonner';

import './FastAgentPanel.animations.css';
import { ChatStreamManager, createChatStream } from '../../lib/chatStream';
import { ThreadList } from './FastAgentPanel.ThreadList';
import { MessageStream } from './FastAgentPanel.MessageStream';
import { InputBar } from './FastAgentPanel.InputBar';
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
}

/**
 * Generate a concise thread title from the first message
 */
function generateThreadTitle(message: string): string {
  // Remove extra whitespace
  const cleaned = message.trim().replace(/\s+/g, ' ');

  // Extract first sentence or first 50 chars
  const firstSentence = cleaned.match(/^[^.!?]+[.!?]?/)?.[0] || cleaned;

  // Truncate to 50 chars
  if (firstSentence.length <= 50) {
    return firstSentence;
  }

  // Find last complete word within 50 chars
  const truncated = firstSentence.slice(0, 50);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > 20) {
    return truncated.slice(0, lastSpace) + '...';
  }

  return truncated + '...';
}

/**
 * FastAgentPanel - Next-gen AI chat sidebar with ChatGPT-like UX
 *
 * Features:
 * - Real-time streaming responses
 * - Thread-based conversations
 * - Fast mode by default
 * - Live thinking/tool visualization
 * - Clean, minimal interface
 */
export function FastAgentPanel({
  isOpen,
  onClose,
  selectedDocumentId: _selectedDocumentId,
}: FastAgentPanelProps) {
  // ========== STATE ==========
  const [activeThreadId, setActiveThreadId] = useState<Id<"chatThreads"> | null>(null);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [exportingThreadId, setExportingThreadId] = useState<Id<"chatThreads"> | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Settings
  const [fastMode, setFastMode] = useState(true);
  const [selectedModel, setSelectedModel] = useState<'gpt-5' | 'gpt-5-mini' | 'gpt-5-nano' | 'gemini'>('gpt-5');

  // Live streaming state
  const [liveThinking, setLiveThinking] = useState<ThinkingStep[]>([]);
  const [liveTokens, setLiveTokens] = useState<string>("");
  const [liveAgents, setLiveAgents] = useState<SpawnedAgent[]>([]);

  const [liveToolCalls, setLiveToolCalls] = useState<ToolCall[]>([]);
  const [liveSources, setLiveSources] = useState<Source[]>([]);

  // Refs
  const streamManagerRef = useRef<ChatStreamManager>(createChatStream());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ========== CONVEX QUERIES & MUTATIONS ==========
  const threads = useQuery(api.fastAgentPanel.listThreads);
  const messages = useQuery(
    api.fastAgentPanel.getMessages,
    activeThreadId ? { threadId: activeThreadId } : "skip"
  );

  const createThread = useMutation(api.fastAgentPanel.createThread);
  const updateThread = useMutation(api.fastAgentPanel.updateThread);
  const deleteThread = useMutation(api.fastAgentPanel.deleteThread);
  const sendMessage = useAction(api.fastAgentPanel.sendMessage); // For data operations
  const sendMessageWithStreaming = useMutation(api.fastAgentPanelStreaming.sendMessageWithStreaming);

  // Data operations
  const isDataOperation = useAction(api.agents.intentParser.isDataOperationRequest);
  const parseIntent = useAction(api.agents.intentParser.parseDataOperationIntent);
  const executeDataOp = useAction(api.agents.dataOperations.executeDataOperation);


  // Confirmation dialog state for destructive data operations
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPrompt, setConfirmPrompt] = useState<string>("");
  const pendingIntentRef = useRef<{
    entityType: string;
    operation: string;
    params: any;
  } | null>(null);

  // ========== EFFECTS ==========

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, liveThinking, liveToolCalls]);

  // Auto-select first thread if none selected
  useEffect(() => {
    if (!activeThreadId && threads && threads.length > 0) {
      setActiveThreadId(threads[0]._id);
    }
  }, [threads, activeThreadId]);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      streamManagerRef.current.close();
    };
  }, []);

  // ========== HANDLERS ==========

  const handleCreateThread = useCallback(async () => {
    try {
      const newThreadId = await createThread({
        title: "New Chat",
        pinned: false,
      });
      setActiveThreadId(newThreadId);
      toast.success("New chat created");
    } catch (error) {
      console.error("Failed to create thread:", error);
      toast.error("Failed to create chat");
    }
  }, [createThread]);

  const handlePinThread = useCallback(async (threadId: Id<"chatThreads">) => {
    try {
      const thread = threads?.find(t => t._id === threadId);
      if (!thread) return;

      await updateThread({
        threadId,
        pinned: !thread.pinned,
      });
    } catch (error) {
      console.error('Failed to pin thread:', error);
      toast.error('Failed to pin conversation');
    }
  }, [threads, updateThread]);

  const handleDeleteThread = useCallback(async (threadId: Id<"chatThreads">) => {
    try {
      await deleteThread({ threadId });

      // If deleted thread was active, select another
      if (activeThreadId === threadId) {
        const remainingThreads = threads?.filter(t => t._id !== threadId);
        setActiveThreadId(remainingThreads?.[0]?._id || null);
      }

      toast.success('Conversation deleted');
    } catch (error) {
      console.error('Failed to delete thread:', error);
      toast.error('Failed to delete conversation');
    }
  }, [activeThreadId, threads, deleteThread]);

  const handleExportThread = useCallback((threadId: Id<"chatThreads">) => {
    setExportingThreadId(threadId);
  }, []);

  const handleSendMessage = useCallback(async (content?: string) => {
    const text = (content ?? input).trim();
    if (!text || isStreaming) return;

    let threadId = activeThreadId;

    // Create thread if none exists
    if (!threadId) {
      try {
        // Auto-generate meaningful title from first message
        const autoTitle = generateThreadTitle(text);
        threadId = await createThread({
          title: autoTitle,
          pinned: false,
        });
        setActiveThreadId(threadId);
      } catch (error) {
        console.error("Failed to create thread:", error);
        toast.error("Failed to create chat");
        return;
      }
    }

    const messageContent = text;
    setInput('');
    setLiveTokens("");
    setLiveAgents([]);

    setIsStreaming(true);

    // Clear live state
    setLiveThinking([]);
    setLiveToolCalls([]);
    setLiveSources([]);

    try {
      // Check if this is a data operation request
      const isDataOp = await isDataOperation({ userMessage: messageContent });

      if (isDataOp) {
        // Handle as data operation
        setLiveThinking([{ type: 'step', content: 'Parsing data operation intent...' }]);

        const intent = await parseIntent({ userMessage: messageContent });

        setLiveThinking((prev) => [
          ...prev,
          { type: 'step', content: `Detected: ${intent.operation} ${intent.entityType}` },
        ]);

        // Execute the operation
        const opResult = await executeDataOp({
          entityType: intent.entityType,
          operation: intent.operation,
          params: intent.params,
          threadId,
        });

        if (opResult.requiresConfirmation) {
          // Show confirmation dialog with stored intent
          pendingIntentRef.current = {
            entityType: intent.entityType,
            operation: intent.operation,
            params: { ...intent.params, confirmed: true },
          };
          setConfirmPrompt(opResult.confirmationPrompt || 'Confirmation required');
          setConfirmOpen(true);
          setIsStreaming(false);
          setLiveThinking([]);
          return;
        }

        if (opResult.success) {
          toast.success(opResult.message || 'Operation completed');

          // Add result message to thread
          await sendMessage({
            threadId,
            content: messageContent,
            fastMode,
            model: selectedModel,
          });
        } else {
          toast.error('Operation failed');
        }

        setIsStreaming(false);
        setLiveThinking([]);
        setLiveToolCalls([]);
        setLiveSources([]);
        return;
      }

      // Normal chat flow with persistent text streaming
      const result = await sendMessageWithStreaming({
        threadId,
        content: messageContent,
        model: selectedModel,
        fastMode,
      });

      console.log('[FastAgentPanel] Message sent with streamId:', result.streamId);

      // The StreamingMessage component will initiate and display the stream via useStream hook
      setIsStreaming(false);
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
    createThread,
    sendMessage,
    sendMessageWithStreaming,
    isDataOperation,
    parseIntent,
    executeDataOp,
  ]);



  // ========== RENDER ==========

  if (!isOpen) return null;

  // Convert Convex messages to Message type
  const displayMessages: Message[] = (messages || []).map((msg) => {
    const thinkingSteps = Array.isArray((msg as any).thinkingSteps)
      ? (msg as any).thinkingSteps
          .map((step: any) => ({
            type: typeof step?.type === 'string' ? step.type : 'step',
            content: typeof step?.content === 'string' ? step.content : '',
            timestamp:
              typeof step?.timestamp === 'number'
                ? new Date(step.timestamp)
                : step?.timestamp instanceof Date
                ? step.timestamp
                : step?.timestamp
                ? new Date(step.timestamp)
                : undefined,
          }))
          .filter((step: any) => step.content.length > 0)
      : undefined;

    const toolCalls = Array.isArray((msg as any).toolCalls)
      ? (msg as any).toolCalls.map((call: any, idx: number) => ({
          callId: String(call?.callId ?? call?.id ?? `call-${idx}`),
          toolName: typeof call?.toolName === 'string' ? call.toolName : call?.name ?? 'tool',
          args: call?.args,
          result: call?.result,
          error: typeof call?.error === 'string' ? call.error : undefined,
          status: call?.status,
          elapsedMs: typeof call?.elapsedMs === 'number' ? call.elapsedMs : undefined,
          timestamp:
            typeof call?.timestamp === 'number'
              ? new Date(call.timestamp)
              : call?.timestamp instanceof Date
              ? call.timestamp
              : call?.timestamp
              ? new Date(call.timestamp)
              : undefined,
        }))
      : undefined;

    const sources = Array.isArray((msg as any).sources)
      ? (msg as any).sources.map((source: any, idx: number) => ({
          title: typeof source?.title === 'string' ? source.title : `Source ${idx + 1}`,
          documentId: source?.documentId,
          url: typeof source?.url === 'string' ? source.url : undefined,
          snippet: typeof source?.snippet === 'string' ? source.snippet : undefined,
          score: typeof source?.score === 'number' ? source.score : undefined,
          datetime: typeof source?.datetime === 'string' ? source.datetime : undefined,
          publishedDate: typeof source?.publishedDate === 'string' ? source.publishedDate : undefined,
          type: typeof source?.type === 'string' ? source.type : undefined,
          thumbnail: typeof source?.thumbnail === 'string' ? source.thumbnail : undefined,
          mediaUrl: typeof source?.mediaUrl === 'string' ? source.mediaUrl : undefined,
        }))
      : undefined;

    return {
      id: msg._id,
      threadId: msg.threadId,
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
      status: msg.status as 'sending' | 'streaming' | 'complete' | 'error',
      timestamp: new Date(msg.createdAt),
      runId: msg.runId || undefined,
      streamId: msg.streamId, // For persistent text streaming
      isStreaming: msg.isStreaming, // Whether message is actively streaming
      model: msg.model,
      fastMode: msg.fastMode,
      tokensUsed: msg.tokensUsed,
      elapsedMs: msg.elapsedMs,
      thinkingSteps,
      toolCalls,
      sources,
    };
  });

  // Convert Convex threads to Thread type
  const displayThreads: Thread[] = (threads || []).map(thread => ({
    ...thread,
  }));

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
        </div>

        <div className="header-right">
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

      {/* Content Area */}
      <div className="fast-agent-panel-content">
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
        />

        {/* Main Chat Area */}
        <div className="chat-area">
          {/* Agent hierarchy / spawned agents */}
          <AgentHierarchy agents={liveAgents} isStreaming={isStreaming} />
          {/* Messages */}
          <MessageStream
            messages={displayMessages}
            isStreaming={isStreaming}
            streamingMessageId={streamingMessageId}
            liveThinking={liveThinking}
            liveToolCalls={liveToolCalls}
            liveSources={liveSources}
            liveTokens={liveTokens}
          />

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
        }

        .chat-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
      `}</style>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmOpen}
        title="Please confirm"
        message={confirmPrompt}
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        onConfirm={() => {
          void (async () => {
            try {
              const intent = pendingIntentRef.current;
              if (!intent) { setConfirmOpen(false); return; }
              setConfirmOpen(false);
              setIsStreaming(true);
              const opResult = await executeDataOp({
                entityType: intent.entityType,
                operation: intent.operation,
                params: intent.params,
                threadId: activeThreadId!,
              });
              if (opResult.success) {
                toast.success(opResult.message || 'Operation completed');
              } else {
                toast.error('Operation failed');
              }
            } catch (e: any) {
              toast.error(e?.message || 'Operation failed');
            } finally {
              setIsStreaming(false);
            }
          })();
        }}
        onCancel={() => {
          setConfirmOpen(false);
          pendingIntentRef.current = null;
        }}
        variant="warning"
      />

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
