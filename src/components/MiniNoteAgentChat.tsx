import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { useUIMessages, useSmoothText } from '@convex-dev/agent/react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Bot, User, Loader2, ChevronDown, ChevronRight, Wrench, AlertCircle, LogIn, MessageSquare } from 'lucide-react';
import type { ToolUIPart } from 'ai';
import { extractMediaFromText, removeMediaMarkersFromText } from '@features/agents/components/FastAgentPanel/utils/mediaExtractor';
import { toast } from 'sonner';
import { RichMediaSection } from '@features/agents/components/FastAgentPanel/RichMediaSection';
import { StepTimeline, toolPartsToTimelineSteps } from '@features/agents/components/FastAgentPanel/StepTimeline';
import { HumanRequestList } from '@features/agents/components/FastAgentPanel/HumanRequestCard';
import { useAnonymousSession } from '@features/agents/hooks/useAnonymousSession';

interface MiniNoteAgentChatProps {
  user: any | null | undefined;
  pendingPrompt?: string;
  onPromptConsumed?: () => void;
  prefillInput?: string;
  onPrefillConsumed?: () => void;
  onSignInRequired?: () => Promise<void>;
}

/**
 * MiniNoteAgentChat - Enhanced ChatGPT-like panel with streaming, media display, and agent progress
 * Features:
 * - Real-time streaming responses with smooth text animation
 * - Rich media display (videos, sources, images)
 * - Collapsible agent progress (tools, reasoning)
 * - Syntax highlighting for code blocks
 * - Better visual hierarchy and feedback
 */
export default function MiniNoteAgentChat({ user, pendingPrompt, onPromptConsumed, prefillInput, onPrefillConsumed, onSignInRequired }: MiniNoteAgentChatProps) {
  const [input, setInput] = useState('');
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [threadId, setThreadId] = useState<Id<'chatThreadsStream'> | null>(null);
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Prevent duplicate auto-sends when pendingPrompt is provided
  const lastAutoSentKeyRef = useRef<string | null>(null);
  // Optimistic message display
  const [optimisticUserMessage, setOptimisticUserMessage] = useState<string | null>(null);
  // Track if we're waiting for agent response (after send completes but before agent responds)
  const [waitingForAgent, setWaitingForAgent] = useState(false);

  // Anonymous session support (5 free messages/day)
  const anonymousSession = useAnonymousSession();

  // Cross-remount/Tab dedupe for auto-send
  const DEDUPE_TTL_MS = 4000;
  const canAutoSend = (text: string) => {
    try {
      const now = Date.now();
      const rec = JSON.parse(sessionStorage.getItem('miniNote:lastAutoSend') || 'null');
      if (rec && rec.text === text && now - rec.at < DEDUPE_TTL_MS) return false;
      sessionStorage.setItem('miniNote:lastAutoSend', JSON.stringify({ text, at: now }));
      return true;
    } catch {
      return true;
    }
  };

  // Mount diagnostics
  useEffect(() => {
    console.log('[MiniNoteAgentChat] mount');
    return () => console.log('[MiniNoteAgentChat] unmount');
  }, []);


  const createThread = useAction(api.domains.agents.fastAgentPanelStreaming.createThread);
  const sendStreaming = useMutation(api.domains.agents.fastAgentPanelStreaming.initiateAsyncStreaming);
  const cancelStreaming = useMutation(api.domains.agents.fastAgentPanelStreaming.requestStreamCancel);

  // Resolve agent thread for UI messages
  const streamingThread = useQuery(
    api.domains.agents.fastAgentPanelStreaming.getThreadByStreamId,
    threadId ? { threadId } : 'skip'
  ) as any;

  const agentThreadId = streamingThread?.agentThreadId as string | undefined;
  const { results: uiMessages } = useUIMessages(
    api.domains.agents.fastAgentPanelStreaming.getThreadMessagesWithStreaming,
    agentThreadId ? { threadId: agentThreadId } : 'skip',
    { initialNumItems: 100, stream: true }
  );

  // Query for human-in-the-loop requests
  const humanRequests = useQuery(
    api.agents.humanInTheLoop.getPendingHumanRequests,
    agentThreadId ? { threadId: agentThreadId } : 'skip'
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef(0);

  // Auto-scroll on new messages
  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [uiMessages?.length, optimisticUserMessage, waitingForAgent]);

  // Detect when agent has responded (clear waiting state)
  useEffect(() => {
    if (!waitingForAgent) return;

    const currentCount = uiMessages?.length || 0;
    // If we have more messages than before, agent has responded
    if (currentCount > lastMessageCountRef.current) {
      console.log('[MiniNoteAgentChat] Agent responded, clearing waiting state');
      setWaitingForAgent(false);
    }
    lastMessageCountRef.current = currentCount;
  }, [uiMessages?.length, waitingForAgent]);

  // Consume pending prompt from parent (auto-send) with de-duplication
  useEffect(() => {
    const text = pendingPrompt?.trim();
    console.log('[MiniNoteAgentChat] pendingPrompt effect triggered, text:', text, 'user:', !!user, 'lastSent:', lastAutoSentKeyRef.current);

    // If cleared, allow same prompt to be sent again in the future
    if (!text) {
      lastAutoSentKeyRef.current = null;
      return;
    }
    if (!user) {
      console.log('[MiniNoteAgentChat] No user, skipping send');
      return;
    }

    // Guard against duplicate triggers from re-renders/user changes
    if (lastAutoSentKeyRef.current === text) {
      console.log('[MiniNoteAgentChat] Duplicate detected, skipping send');
      return;
    }
    // Cross-remount dedupe (sessionStorage, short TTL)
    if (!canAutoSend(text)) {
      console.log('[MiniNoteAgentChat] Session dedupe blocked auto-send');
      return;
    }
    lastAutoSentKeyRef.current = text;

    console.log('[MiniNoteAgentChat] Calling send() for pendingPrompt');
    void send(text);
    onPromptConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPrompt]); // Only depend on pendingPrompt, not user (to avoid re-triggering on user changes)

  // Consume prefill input from parent (populate input field, don't send)
  useEffect(() => {
    const text = prefillInput?.trim();
    if (!text) return;
    setInput(text);
    onPrefillConsumed?.();
    // Focus the input after a short delay
    setTimeout(() => {
      inputRef.current?.focus();
      // Move cursor to end
      if (inputRef.current) {
        inputRef.current.selectionStart = inputRef.current.value.length;
        inputRef.current.selectionEnd = inputRef.current.value.length;
      }
    }, 100);
  }, [prefillInput, onPrefillConsumed]);

  const send = async (text: string) => {
    const msg = text.trim();
    if (!msg) return;

    // Prevent duplicate sends (global guard across mounts) + waiting state
     
    if (creating || sending || waitingForAgent || (window as any).__miniNoteSendLock) {
      console.log('[MiniNoteAgentChat] Already sending or locked, ignoring duplicate send');
      return;
    }
     
    (window as any).__miniNoteSendLock = true;

    // Check anonymous user rate limit
    if (anonymousSession.isAnonymous && !anonymousSession.canSendMessage) {
      toast.error(
        <div className="flex flex-col gap-1">
          <div className="font-medium">Daily limit reached</div>
          <div className="text-xs">Sign in for unlimited access!</div>
        </div>
      );
       
      (window as any).__miniNoteSendLock = false;
      return;
    }

    // If no user and not anonymous, trigger sign-in first
    if (!user && !anonymousSession.isAnonymous) {
      if (onSignInRequired) {
        try {
          await onSignInRequired();
          // After sign-in completes, component will re-render with user
          // We need to preserve the message and retry
          setInput(msg); // Keep the message in input
          return;
        } catch (err) {
          console.error('[MiniNoteAgentChat] Sign-in failed:', err);
          toast.error('Sign-in failed. Please try again.');
          return;
        }
      }
      return;
    }

    console.log('[MiniNoteAgentChat] send() called with:', msg.substring(0, 50));

    // Immediately show optimistic user message
    setOptimisticUserMessage(msg);
    setInput('');

    try {
      if (!threadId) {
        console.log('[MiniNoteAgentChat] Creating new thread...');
        setCreating(true);
        const newId = await createThread({
          title: 'Mini Note Agent',
          anonymousSessionId: anonymousSession.sessionId ?? undefined,
        });
        console.log('[MiniNoteAgentChat] Thread created:', newId);
        setThreadId(newId as Id<'chatThreadsStream'>);
        setCreating(false);
        setSending(true);
        console.log('[MiniNoteAgentChat] Sending message to new thread...');
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
        await sendStreaming({
          threadId: newId as Id<'chatThreadsStream'>,
          prompt: msg,
          useCoordinator: true,  // Enable smart routing via coordinator
          anonymousSessionId: anonymousSession.sessionId ?? undefined,
          clientContext,
        });
        setSending(false);
        // Clear optimistic message once backend confirms
        setOptimisticUserMessage(null);
        // Now waiting for agent to respond
        setWaitingForAgent(true);
      } else {
        console.log('[MiniNoteAgentChat] Sending message to existing thread:', threadId);
        setSending(true);
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
        await sendStreaming({
          threadId,
          prompt: msg,
          useCoordinator: true,  // Enable smart routing via coordinator
          anonymousSessionId: anonymousSession.sessionId ?? undefined,
          clientContext,
        });
        setSending(false);
        // Clear optimistic message once backend confirms
        setOptimisticUserMessage(null);
        // Now waiting for agent to respond
        setWaitingForAgent(true);
      }
    } catch (e) {
      console.error('MiniNoteAgentChat send failed:', e);
      setSending(false);
      setCreating(false);
      setOptimisticUserMessage(null);
      setWaitingForAgent(false);
      // Restore the message to input on error
      setInput(msg);
      const errorMsg = e instanceof Error ? e.message : 'Failed to send message';
      toast.error(errorMsg);
    } finally {
       
      setTimeout(() => { (window as any).__miniNoteSendLock = false; }, 1200);
    }
  };

  const handleStop = async () => {
    if (!threadId || cancelling) return;
    try {
      setCancelling(true);
      await cancelStreaming({ threadId });
    } catch (err) {
      console.warn('MiniNoteAgentChat stop failed', err);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-transparent">
      {/* Messages area */}
      <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {(!uiMessages || uiMessages.length === 0) && !sending && !optimisticUserMessage && (
          <div className="h-full flex items-center justify-center text-center">
            <div>
              <div className="inline-flex items-center justify-center w-12 h-12 bg-[var(--accent-primary)]/10 rounded-full mb-3">
                <Bot className="h-6 w-6 text-[var(--accent-primary)]" />
              </div>
              <div className="text-lg font-medium text-[var(--text-primary)] mb-1">Start a conversation</div>
              <div className="text-sm text-[var(--text-secondary)] max-w-xs">
                Ask anything. I can help research, summarize, and draft dossiers.
              </div>
            </div>
          </div>
        )}

        {/* Human-in-the-Loop Requests */}
        {humanRequests && humanRequests.length > 0 && (
          <div className="mb-4">
            <HumanRequestList
              requests={humanRequests}
              onRespond={() => {
                console.log('[MiniNoteAgentChat] Human request responded');
              }}
            />
          </div>
        )}

        {/* Messages */}
        {uiMessages && uiMessages.map((m: any, idx: number) => (
          <MessageBubble
            key={m.key || idx}
            message={m}
            isExpanded={expandedMessageId === (m.key || idx)}
            onToggleExpand={() => setExpandedMessageId(expandedMessageId === (m.key || idx) ? null : (m.key || idx))}
          />
        ))}

        {/* Optimistic user message (shown immediately while sending) */}
        {optimisticUserMessage && (
          <div className="flex justify-end">
            <div className="max-w-[85%] bg-[var(--accent-primary)] text-white rounded-2xl overflow-hidden shadow-sm">
              <div className="px-4 py-3">
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <p>{optimisticUserMessage}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Agent thinking indicator - show while sending OR waiting for agent response */}
        {(sending || waitingForAgent) && (
          <div className="flex justify-start">
            <div className="bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-2xl px-4 py-3 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-[var(--accent-primary)]" />
              <span className="text-sm">Thinking…</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Anonymous User Banner */}
      {anonymousSession.isAnonymous && !anonymousSession.isLoading && (
        <div className={`mx-3 mt-2 px-3 py-2 rounded-lg border ${
          anonymousSession.canSendMessage
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
                    {' '}of {anonymousSession.limit} free messages remaining
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

      {/* Composer */}
      <div className="border-t border-[var(--border-color)] p-3 bg-[var(--bg-primary)]">
        <div className="flex items-start gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if ((e.key === 'Enter') && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                void send(input);
              }
            }}
            placeholder="Send a message… (Ctrl/Cmd + Enter to send)"
            rows={2}
            className="flex-1 px-3 py-2 border border-[var(--border-color)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent resize-y"
          />
          <button
            type="button"
            onClick={() => void send(input)}
            disabled={creating || sending || waitingForAgent || !input.trim() || (anonymousSession.isAnonymous && !anonymousSession.canSendMessage)}
            className="h-10 px-3 py-2 mt-[2px] rounded-md text-white disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 transition-colors"
            title={!user && !anonymousSession.isAnonymous ? 'Click to sign in and send' : 'Send message'}
          >
            {sending ? 'Sending…' : waitingForAgent ? 'Processing…' : !user && !anonymousSession.isAnonymous ? 'Send (sign in)' : 'Send'}
          </button>
          {(sending || waitingForAgent) && (
            <button
              type="button"
              onClick={handleStop}
              disabled={!threadId || cancelling}
              className="h-10 px-3 py-2 mt-[2px] rounded-md text-[var(--text-secondary)] bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:bg-[var(--bg-secondary)]/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelling ? 'Stopping…' : 'Stop'}
            </button>
          )}
        </div>
        <div className="text-xs text-[var(--text-secondary)] mt-1">Shift+Enter for new line.</div>
      </div>
    </div>
  );
}

/**
 * MessageBubble - Enhanced message rendering with streaming, media, and agent progress
 */
function MessageBubble({
  message,
  isExpanded,
  onToggleExpand,
}: {
  message: any;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const isUser = message.role === 'user';

  // Use smooth text for streaming
  const [visibleText] = useSmoothText(message.text, {
    startStreaming: message.status === 'streaming',
  });

  // Extract tool parts and reasoning
  const toolParts = (message.parts || []).filter((p: any): p is ToolUIPart =>
    p.type.startsWith('tool-')
  );
  const reasoningParts = (message.parts || []).filter((p: any) => p.type === 'reasoning');
  const reasoningText = reasoningParts.map((p: any) => p.text).join('\n');

  // Extract media from text
  const extractedMedia = useMemo(() => {
    if (isUser) return { youtubeVideos: [], secDocuments: [], webSources: [], profiles: [], images: [] };
    return extractMediaFromText(visibleText || '');
  }, [isUser, visibleText]);

  const hasToolsOrReasoning = toolParts.length > 0 || reasoningText;
  const cleanText = removeMediaMarkersFromText(visibleText || '');

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] ${isUser ? 'bg-[var(--accent-primary)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'} rounded-2xl overflow-hidden shadow-sm`}>
        {/* Main message content */}
        <div className="px-4 py-3">
          {/* Avatar + role for assistant */}
          {!isUser && (
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded-full bg-[var(--accent-primary)]/20 flex items-center justify-center">
                <Bot className="h-3 w-3 text-[var(--accent-primary)]" />
              </div>
              <span className="text-xs font-medium text-[var(--text-secondary)]">Mini Note Agent</span>
            </div>
          )}

          {/* Message text with markdown and syntax highlighting */}
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown
              components={{
                code({ inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={vscDarkPlus}
                      language={match[1]}
                      PreTag="div"
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {cleanText}
            </ReactMarkdown>
          </div>
        </div>

        {/* Rich media section */}
        {!isUser && (extractedMedia.youtubeVideos.length > 0 || extractedMedia.webSources.length > 0 || extractedMedia.profiles.length > 0 || extractedMedia.images.length > 0) && (
          <div className="border-t border-[var(--border-color)]/20 px-4 py-3">
            <RichMediaSection media={extractedMedia} />
          </div>
        )}

        {/* Collapsible agent progress */}
        {!isUser && hasToolsOrReasoning && (
          <div className="border-t border-[var(--border-color)]/20">
            <button
              type="button"
              onClick={onToggleExpand}
              className="w-full px-4 py-2 flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]/5 transition-colors"
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <Wrench className="h-3 w-3" />
              <span>Agent Process ({toolParts.length} tools)</span>
            </button>

            {isExpanded && (
              <div className="px-4 py-3 border-t border-[var(--border-color)]/20 space-y-3">
                {reasoningText && (
                  <div className="text-xs">
                    <div className="font-medium text-[var(--text-secondary)] mb-1">Reasoning:</div>
                    <div className="text-[var(--text-secondary)]/80 whitespace-pre-wrap">{reasoningText}</div>
                  </div>
                )}
                {toolParts.length > 0 && (
                  <div>
                    <StepTimeline steps={toolPartsToTimelineSteps(toolParts)} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
