// src/components/FastAgentPanel/FastAgentPanel.tsx
// Main container component for the new ChatGPT-like AI chat sidebar

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConvex, usePaginatedQuery, useQuery, useMutation, useAction, useConvexAuth } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import { X, Plus, Radio, Bot, Loader2, ChevronDown, ArrowDown, MessageSquare, Activity, Minimize2, Maximize2, BookOpen, LogIn, Share2, MoreHorizontal, Download, ClipboardCopy, Search, ArrowUp, ArrowDownIcon, Eye, Palette, GripVertical } from 'lucide-react';
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
import { TraceAuditPanel, TraceContentLabeler } from './FastAgentPanel.TraceAuditPanel';
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
import { DEFAULT_MODEL, MODEL_UI_INFO, type ApprovedModel } from '@shared/llm/approvedModels';
import { useAnonymousSession } from '../../hooks/useAnonymousSession';
import { useAgentNavigation } from '../../hooks/useAgentNavigation';

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
  // Forward-ref for stableSendMessage (avoids TDZ in scheduled messages useEffect)
  const stableSendMessageRef = useRef<((content?: string) => void) | null>(null);

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

  // Wide / split-view mode
  const [isWideMode, setIsWideMode] = useState(false);

  // Live Events Panel state
  const [showEventsPanel, setShowEventsPanel] = useState(false);
  // Note: liveEvents useMemo is defined after streamingMessages to avoid reference before initialization

  // Skills Panel state
  const [showSkillsPanel, setShowSkillsPanel] = useState(false);

  // Keyboard shortcuts overlay state
  const [showShortcutsOverlay, setShowShortcutsOverlay] = useState(false);

  // Conversation search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMatchIndex, setSearchMatchIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Response length control
  const [responseLength, setResponseLength] = useState<'brief' | 'detailed' | 'exhaustive'>('detailed');

  // Command palette (Ctrl+K)
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const commandInputRef = useRef<HTMLInputElement>(null);

  // Focus mode
  const [isFocusMode, setIsFocusMode] = useState(false);

  // Auto-scroll pause
  const [isAutoScrollPaused, setIsAutoScrollPaused] = useState(false);
  const lastScrollTopRef = useRef(0);

  // Scroll progress
  const [scrollProgress, setScrollProgress] = useState(0);

  // Typing speed indicator
  const typingStartRef = useRef<number>(0);
  const typingWordCountRef = useRef<number>(0);
  const [typingWpm, setTypingWpm] = useState(0);

  // Context window meter — derived from actual MODEL_UI_INFO
  const contextLimit = useMemo(() => {
    const info = MODEL_UI_INFO[selectedModel as ApprovedModel];
    if (!info) return 32000;
    const cw = info.contextWindow;
    if (cw.endsWith('M')) return parseFloat(cw) * 1_000_000;
    if (cw.endsWith('K')) return parseFloat(cw) * 1_000;
    return parseInt(cw, 10) || 32000;
  }, [selectedModel]);

  // Conversation timeline toggle
  const [showTimeline, setShowTimeline] = useState(false);

  // Context pruning UI
  const [showContextPruning, setShowContextPruning] = useState(false);

  // Artifacts/Canvas panel
  const [showArtifacts, setShowArtifacts] = useState(false);
  const [artifactContent, setArtifactContent] = useState<{ type: 'html' | 'svg' | 'code'; content: string; language?: string } | null>(null);

  // Focus/mode presets
  const FOCUS_MODES = [
    { id: 'default', label: 'Default', icon: '💬', prompt: '' },
    { id: 'academic', label: 'Academic', icon: '🎓', prompt: 'Respond in an academic style with citations, formal language, and structured analysis.' },
    { id: 'creative', label: 'Creative', icon: '🎨', prompt: 'Respond creatively with vivid language, metaphors, and engaging narrative.' },
    { id: 'precise', label: 'Precise', icon: '🎯', prompt: 'Be extremely precise and concise. Use bullet points. No fluff. Facts only.' },
    { id: 'code', label: 'Code', icon: '💻', prompt: 'Focus on code. Provide working examples with comments. Use best practices.' },
  ] as const;
  const [focusMode, setFocusMode] = useState('default');
  const [showFocusPicker, setShowFocusPicker] = useState(false);

  // Tone/style presets
  const TONE_PRESETS = [
    { id: 'neutral', label: 'Neutral', icon: '⚖️' },
    { id: 'formal', label: 'Formal', icon: '🏛️' },
    { id: 'casual', label: 'Casual', icon: '😊' },
    { id: 'technical', label: 'Technical', icon: '⚙️' },
  ] as const;
  const [tonePreset, setTonePreset] = useState('neutral');

  // Auto-save drafts (localStorage)
  const draftKey = `fa_draft_${activeThreadId || 'new'}`;
  useEffect(() => {
    if (input.length > 0) {
      localStorage.setItem(draftKey, input);
    } else {
      localStorage.removeItem(draftKey);
    }
  }, [input, draftKey]);
  useEffect(() => {
    const saved = localStorage.getItem(draftKey);
    if (saved && !input) setInput(saved);
  }, [activeThreadId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Message pinning (localStorage-backed)
  const [pinnedMsgIds, setPinnedMsgIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('fa_pinned_msgs');
      return saved ? new Set(JSON.parse(saved) as string[]) : new Set();
    } catch { return new Set(); }
  });
  const togglePinMsg = useCallback((msgId: string) => {
    setPinnedMsgIds(prev => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId); else next.add(msgId);
      localStorage.setItem('fa_pinned_msgs', JSON.stringify([...next]));
      return next;
    });
  }, []);

  // Message bookmarks (localStorage-backed)
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('fa_bookmarks');
      return saved ? new Set(JSON.parse(saved) as string[]) : new Set();
    } catch { return new Set(); }
  });
  const toggleBookmark = useCallback((msgId: string) => {
    setBookmarkedIds(prev => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId); else next.add(msgId);
      localStorage.setItem('fa_bookmarks', JSON.stringify([...next]));
      return next;
    });
  }, []);

  // Overflow menu state (for secondary actions)
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const overflowMenuRef = useRef<HTMLDivElement>(null);

  // Custom system prompt per thread (localStorage-backed)
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  useEffect(() => {
    if (activeThreadId) {
      const saved = localStorage.getItem(`fa_sysprompt_${activeThreadId}`);
      setSystemPrompt(saved || '');
    } else {
      setSystemPrompt('');
    }
  }, [activeThreadId]);
  const saveSystemPrompt = useCallback(() => {
    if (activeThreadId) {
      if (systemPrompt.trim()) {
        localStorage.setItem(`fa_sysprompt_${activeThreadId}`, systemPrompt);
      } else {
        localStorage.removeItem(`fa_sysprompt_${activeThreadId}`);
      }
    }
    setShowSystemPrompt(false);
    toast.success('System prompt saved');
  }, [activeThreadId, systemPrompt]);

  // Quick reply templates (localStorage-backed)
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [quickReplies, setQuickReplies] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('fa_quick_replies');
      return saved ? JSON.parse(saved) as string[] : [
        'Summarize this in bullet points',
        'What are the key risks?',
        'Compare pros and cons',
        'Give me actionable next steps',
      ];
    } catch { return []; }
  });

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

  // ========== TIER 13 STATE ==========

  // Voice input (Web Speech API)
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const startVoiceInput = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { toast.error('Speech recognition not supported in this browser'); return; }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results).map((r: any) => r[0].transcript).join('');
      setInput(prev => prev + transcript);
    };
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => { setIsRecording(false); toast.error('Voice input failed'); };
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, [setInput]);
  const stopVoiceInput = useCallback(() => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  }, []);

  // RLHF feedback per message
  const [feedbackMap, setFeedbackMap] = useState<Record<string, 'up' | 'down'>>({});
  const [showFeedbackComment, setShowFeedbackComment] = useState<string | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const handleFeedback = useCallback((msgId: string, vote: 'up' | 'down') => {
    setFeedbackMap(prev => ({ ...prev, [msgId]: vote }));
  }, []);

  // Font size / density
  const [fontSize, setFontSize] = useState<number>(() => {
    try { return parseInt(localStorage.getItem('fa_font_size') || '14', 10); } catch { return 14; }
  });
  useEffect(() => { localStorage.setItem('fa_font_size', String(fontSize)); }, [fontSize]);

  // Conversation analytics overlay
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Side-by-side model comparison
  const [showModelComparison, setShowModelComparison] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<{ modelA: string; modelB: string; responseA: string; responseB: string } | null>(null);

  // Drag-and-drop overlay
  const [isDragOver, setIsDragOver] = useState(false);

  // Thread branch tree
  const [showBranchTree, setShowBranchTree] = useState(false);

  // Auto-title (moved after messagesToRender definition)
  // Message edit diff tracking
  const [editDiffs, setEditDiffs] = useState<Record<string, { oldText: string; newText: string }>>({});

  // contextWindowMsgs (moved after messagesToRender definition)

  // ========== TIER 14 STATE ==========

  // Streaming speed indicator (state only; useEffect moved after messagesToRender)
  const [streamingStats, setStreamingStats] = useState<{ startTime: number; firstTokenTime: number | null; tokenCount: number; tokensPerSec: number }>({ startTime: 0, firstTokenTime: null, tokenCount: 0, tokensPerSec: 0 });
  const prevStreamingTextRef = useRef('');

  // Message threading (reply-to)
  const [replyToMsgId, setReplyToMsgId] = useState<string | null>(null);
  // replyToMsg (moved after messagesToRender definition)

  // Persistent cross-thread memory
  const [memories, setMemories] = useState<Array<{ id: string; text: string; createdAt: number }>>(() => {
    try { return JSON.parse(localStorage.getItem('fa_memories') || '[]'); } catch { return []; }
  });
  const [showMemoryPanel, setShowMemoryPanel] = useState(false);
  const addMemory = useCallback((text: string) => {
    const mem = { id: `mem_${Date.now()}`, text, createdAt: Date.now() };
    setMemories(prev => {
      const updated = [mem, ...prev].slice(0, 50);
      localStorage.setItem('fa_memories', JSON.stringify(updated));
      return updated;
    });
    toast.success('Saved to memory');
  }, []);
  const removeMemory = useCallback((id: string) => {
    setMemories(prev => {
      const updated = prev.filter(m => m.id !== id);
      localStorage.setItem('fa_memories', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Conversation starters
  const conversationStarters = useMemo(() => [
    { icon: '💡', label: 'Brainstorm ideas', prompt: 'Help me brainstorm creative ideas for ' },
    { icon: '📊', label: 'Analyze data', prompt: 'Analyze the following data and provide insights: ' },
    { icon: '✍️', label: 'Write content', prompt: 'Write a professional ' },
    { icon: '🔍', label: 'Research topic', prompt: 'Research and summarize the key points about ' },
    { icon: '🐛', label: 'Debug code', prompt: 'Help me debug this code:\n```\n' },
    { icon: '📝', label: 'Summarize', prompt: 'Summarize the following:\n' },
  ], []);

  // Image paste preview
  const [imagePreview, setImagePreview] = useState<Array<{ file: File; url: string }>>([]);
  useEffect(() => {
    return () => { imagePreview.forEach(img => URL.revokeObjectURL(img.url)); };
  }, [imagePreview]);

  // Keyboard message navigation
  const [focusedMsgIdx, setFocusedMsgIdx] = useState<number | null>(null);

  // Right-click context menu
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; msgId: string; role: string } | null>(null);

  // Message annotations
  const [annotations, setAnnotations] = useState<Record<string, string[]>>(() => {
    try { return JSON.parse(localStorage.getItem('fa_annotations') || '{}'); } catch { return {}; }
  });
  const addAnnotation = useCallback((msgId: string, note: string) => {
    setAnnotations(prev => {
      const updated = { ...prev, [msgId]: [...(prev[msgId] || []), note] };
      localStorage.setItem('fa_annotations', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // High contrast / accessibility mode
  const [highContrast, setHighContrast] = useState(() => localStorage.getItem('fa_high_contrast') === 'true');
  useEffect(() => { localStorage.setItem('fa_high_contrast', String(highContrast)); }, [highContrast]);

  // Smart paste detection
  const detectPasteType = useCallback((text: string): 'url' | 'json' | 'code' | 'text' => {
    if (/^https?:\/\//.test(text.trim())) return 'url';
    try { JSON.parse(text); return 'json'; } catch { /* not json */ }
    if (/^(import |export |const |let |var |function |class |def |public |private )/.test(text.trim())) return 'code';
    return 'text';
  }, []);

  // Conversation import
  const [showImport, setShowImport] = useState(false);

  // Message scheduling
  const [scheduledMessages, setScheduledMessages] = useState<Array<{ id: string; text: string; scheduledAt: number }>>([]);
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setScheduledMessages(prev => {
        const ready = prev.filter(m => m.scheduledAt <= now);
        const remaining = prev.filter(m => m.scheduledAt > now);
        ready.forEach(m => { void stableSendMessageRef.current?.(m.text); });
        return remaining;
      });
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Conversation snapshots
  const [snapshots, setSnapshots] = useState<Array<{ id: string; name: string; messageCount: number; createdAt: number }>>(() => {
    try { return JSON.parse(localStorage.getItem('fa_snapshots') || '[]'); } catch { return []; }
  });
  // saveSnapshot (moved after messagesToRender definition)

  // detectedLanguage (moved after messagesToRender definition)

  // Performance metrics (state only; useEffect moved after isBusy)
  const [perfMetrics, setPerfMetrics] = useState<{ responseTimes: number[]; avgLatency: number; p95Latency: number }>({ responseTimes: [], avgLatency: 0, p95Latency: 0 });
  const responseStartRef = useRef<number>(0);

  // ========== TIER 15: AGENT + PERF + A11Y + POLISH ==========

  // Tool approval UI (HITL)
  const [pendingApprovals, setPendingApprovals] = useState<Array<{ id: string; toolName: string; args: any; riskLevel: 'low' | 'medium' | 'high'; createdAt: number }>>([]);
  const approveToolCall = useCallback((id: string) => {
    setPendingApprovals(prev => prev.filter(a => a.id !== id));
    toast.success('Tool call approved');
  }, []);
  const rejectToolCall = useCallback((id: string) => {
    setPendingApprovals(prev => prev.filter(a => a.id !== id));
    toast.info('Tool call rejected');
  }, []);

  // Multi-agent handoff visualization
  const [agentHandoffs, setAgentHandoffs] = useState<Array<{ id: string; fromAgent: string; toAgent: string; reason: string; status: 'active' | 'completed'; timestamp: number }>>([]);

  // Persona switching
  const personas = useMemo(() => [
    { id: 'default', name: 'Assistant', icon: '🤖', systemPrompt: 'You are a helpful assistant.' },
    { id: 'coder', name: 'Code Expert', icon: '💻', systemPrompt: 'You are an expert programmer. Focus on clean, efficient code with best practices.' },
    { id: 'writer', name: 'Writer', icon: '✍️', systemPrompt: 'You are a professional writer. Focus on clarity, engagement, and proper structure.' },
    { id: 'analyst', name: 'Data Analyst', icon: '📊', systemPrompt: 'You are a data analyst. Focus on insights, patterns, and data-driven recommendations.' },
    { id: 'researcher', name: 'Researcher', icon: '🔬', systemPrompt: 'You are a thorough researcher. Provide well-sourced, balanced analysis.' },
  ], []);
  const [activePersona, setActivePersona] = useState('default');
  const [showPersonaPicker, setShowPersonaPicker] = useState(false);
  const currentPersona = useMemo(() => personas.find(p => p.id === activePersona) || personas[0], [personas, activePersona]);

  // ========== KEYBOARD SHORTCUTS ==========
  // "/" : focus input (GitHub/Slack pattern), Escape: close or blur, Ctrl+Shift+N: new thread
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isModKey = e.metaKey || e.ctrlKey;
      const active = document.activeElement as HTMLElement | null;
      const isTyping = active?.matches('textarea, input, [contenteditable]');

      // "/" — Focus input bar (only when not already typing)
      if (e.key === '/' && !isTyping && !isModKey) {
        e.preventDefault();
        const inputEl = document.querySelector<HTMLTextAreaElement>('[placeholder="Message..."]');
        inputEl?.focus();
        return;
      }

      // Ctrl/Cmd+Shift+N — New thread
      if (isModKey && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        setActiveThreadId(null);
        setInput('');
        const inputEl = document.querySelector<HTMLTextAreaElement>('[placeholder="Message..."]');
        inputEl?.focus();
        return;
      }

      // Ctrl/Cmd+K — Open command palette
      if (isModKey && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
        setCommandQuery('');
        setTimeout(() => commandInputRef.current?.focus(), 50);
        return;
      }

      // Ctrl/Cmd+T — Toggle conversation timeline
      if (isModKey && e.key === 't') {
        e.preventDefault();
        setShowTimeline(prev => !prev);
        return;
      }

      // Ctrl/Cmd+F — Open conversation search
      if (isModKey && e.key === 'f') {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
        return;
      }

      // "?" — Show keyboard shortcuts overlay (only when not typing)
      if (e.key === '?' && !isTyping && !isModKey) {
        e.preventDefault();
        setShowShortcutsOverlay(prev => !prev);
        return;
      }

      // J/K — Navigate messages (Vim-style, only when not typing)
      if ((e.key === 'j' || e.key === 'k') && !isTyping && !isModKey) {
        e.preventDefault();
        if (!messagesToRender || messagesToRender.length === 0) return;
        setFocusedMsgIdx(prev => {
          const max = messagesToRender.length - 1;
          if (prev === null) return e.key === 'j' ? 0 : max;
          const next = e.key === 'j' ? Math.min(prev + 1, max) : Math.max(prev - 1, 0);
          const msgEls = scrollContainerRef.current?.querySelectorAll('.msg-entrance');
          if (msgEls && msgEls[next]) {
            msgEls[next].scrollIntoView({ behavior: 'smooth', block: 'center' });
            (msgEls[next] as HTMLElement).style.outline = '2px solid var(--accent-primary, #3b82f6)';
            setTimeout(() => { (msgEls[next] as HTMLElement).style.outline = ''; }, 1500);
          }
          return next;
        });
        return;
      }

      // Escape — Close command palette, search, overlay, blur input, or close panel
      if (e.key === 'Escape') {
        if (contextMenu) {
          setContextMenu(null);
        } else if (showMemoryPanel) {
          setShowMemoryPanel(false);
        } else if (showImport) {
          setShowImport(false);
        } else if (showAnalytics) {
          setShowAnalytics(false);
        } else if (showBranchTree) {
          setShowBranchTree(false);
        } else if (showArtifacts) {
          setShowArtifacts(false);
        } else if (showCommandPalette) {
          setShowCommandPalette(false);
          setCommandQuery('');
        } else if (showTimeline) {
          setShowTimeline(false);
        } else if (showContextPruning) {
          setShowContextPruning(false);
        } else if (showPersonaPicker) {
          setShowPersonaPicker(false);
        } else if (showFocusPicker) {
          setShowFocusPicker(false);
        } else if (showSearch) {
          setShowSearch(false);
          setSearchQuery('');
          setSearchMatchIndex(0);
        } else if (showShortcutsOverlay) {
          setShowShortcutsOverlay(false);
        } else if (isTyping) {
          active?.blur();
        } else {
          onClose();
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, showShortcutsOverlay, showSearch]);

  // Artifacts panel event listener
  useEffect(() => {
    const handleArtifact = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.content) {
        setArtifactContent({ type: detail.type || 'code', content: detail.content, language: detail.language });
        setShowArtifacts(true);
      }
    };
    window.addEventListener('fa-open-artifact', handleArtifact);
    return () => window.removeEventListener('fa-open-artifact', handleArtifact);
  }, []);

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
  const [activeTab, setActiveTab] = useState<'chat' | 'sources' | 'telemetry' | 'trace'>('chat');
  const [isThreadDropdownOpen, setIsThreadDropdownOpen] = useState(false);

  // ========== AGENT-DRIVEN NAVIGATION ==========
  // Allows agents to request UI view switches via Convex mutation
  const handleAgentNavigate = useCallback((targetView: string, _context?: any) => {
    const viewRoutes: Record<string, string> = {
      signals: '/signals',
      dossier: '/dossier',
      research: '/research',
      analytics: '/analytics',
      feed: '/feed',
      calendar: '/calendar',
      documents: '/documents',
      settings: '/settings',
    };
    const route = viewRoutes[targetView] || `/${targetView}`;
    navigate(route);
  }, [navigate]);

  useAgentNavigation({
    threadId: activeThreadId,
    onNavigate: handleAgentNavigate,
    enabled: isAuthenticated && isOpen,
  });

  // Swarm hooks - for parallel agent orchestration
  const { swarm, tasks: swarmTasks, isActive: isSwarmActive } = useSwarmByThread(activeThreadId || undefined);
  const { spawnSwarm } = useSwarmActions();

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scroll-to-bottom FAB state
  const [showScrollFab, setShowScrollFab] = useState(false);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      setShowScrollFab(distanceFromBottom > 120);

      // Auto-scroll pause detection
      if (scrollTop < lastScrollTopRef.current - 20) {
        setIsAutoScrollPaused(true);
      }
      if (distanceFromBottom < 30) {
        setIsAutoScrollPaused(false);
      }
      lastScrollTopRef.current = scrollTop;

      // Scroll progress bar
      const maxScroll = scrollHeight - clientHeight;
      setScrollProgress(maxScroll > 0 ? scrollTop / maxScroll : 0);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [activeThreadId]);

  // Ref-based callback pattern for stable handleSendMessage reference
  // This prevents re-renders when callback dependencies change
  const handleSendMessageRef = useRef<(content?: string) => Promise<void>>();

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

  // Prepare messages for rendering - must be before any useMemo/useCallback/useEffect that references messagesToRender
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

  // Auto-title from first exchange (must be after messagesToRender)
  const autoTitle = useMemo(() => {
    if (!messagesToRender || messagesToRender.length === 0) return null;
    const firstUser = messagesToRender.find((m: any) => m.role === 'user');
    const firstAI = messagesToRender.find((m: any) => m.role === 'assistant');
    if (!firstUser) return null;
    const userText = (firstUser.text || firstUser.content || '').slice(0, 40);
    const aiText = firstAI ? (firstAI.text || firstAI.content || '').slice(0, 30) : '';
    const topic = userText.split(/[.?!]/)[0].trim();
    return topic || null;
  }, [messagesToRender]);

  // Multi-turn context indicator
  const contextWindowMsgs = useMemo(() => {
    if (!messagesToRender || messagesToRender.length === 0) return { inContext: 0, total: 0 };
    const totalTokens = messagesToRender.reduce((s: number, m: any) => s + Math.ceil((m.text || m.content || '').length / 4), 0);
    const maxTokens = 128000;
    let runningTokens = 0;
    let inContext = 0;
    for (let i = messagesToRender.length - 1; i >= 0; i--) {
      const t = Math.ceil((messagesToRender[i].text || messagesToRender[i].content || '').length / 4);
      if (runningTokens + t > maxTokens) break;
      runningTokens += t;
      inContext++;
    }
    return { inContext, total: messagesToRender.length };
  }, [messagesToRender]);

  // Reply-to message lookup
  const replyToMsg = useMemo(() => {
    if (!replyToMsgId || !messagesToRender) return null;
    return messagesToRender.find((m: any) => (m._id || m.id || m.key) === replyToMsgId) || null;
  }, [replyToMsgId, messagesToRender]);

  // Multi-language auto-detect
  const detectedLanguage = useMemo(() => {
    if (!messagesToRender || messagesToRender.length === 0) return null;
    const lastUser = [...messagesToRender].reverse().find((m: any) => m.role === 'user');
    if (!lastUser) return null;
    const text = (lastUser as any).text || (lastUser as any).content || '';
    if (/[\u4e00-\u9fff]/.test(text)) return 'Chinese';
    if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return 'Japanese';
    if (/[\uac00-\ud7af]/.test(text)) return 'Korean';
    if (/[\u0600-\u06ff]/.test(text)) return 'Arabic';
    if (/[\u0400-\u04ff]/.test(text)) return 'Russian';
    if (/[àáâãéêíóôõúüç]/i.test(text)) return 'Portuguese/Spanish';
    if (/[äöüß]/i.test(text)) return 'German';
    if (/[àâéèêëïîôùûüÿç]/i.test(text)) return 'French';
    return null;
  }, [messagesToRender]);

  // Streaming stats useEffect (must be after messagesToRender)
  useEffect(() => {
    if (isBusy && messagesToRender && messagesToRender.length > 0) {
      const lastMsg = messagesToRender[messagesToRender.length - 1] as any;
      if (lastMsg?.role === 'assistant' && lastMsg?.status === 'streaming') {
        const text = lastMsg.text || lastMsg.content || '';
        if (streamingStats.startTime === 0) {
          setStreamingStats(prev => ({ ...prev, startTime: Date.now() }));
        }
        if (text.length > 0 && !streamingStats.firstTokenTime) {
          setStreamingStats(prev => ({ ...prev, firstTokenTime: Date.now() }));
        }
        const tokens = Math.ceil(text.length / 4);
        const elapsed = (Date.now() - (streamingStats.firstTokenTime || Date.now())) / 1000;
        const tps = elapsed > 0.5 ? Math.round(tokens / elapsed) : 0;
        setStreamingStats(prev => ({ ...prev, tokenCount: tokens, tokensPerSec: tps }));
        prevStreamingTextRef.current = text;
      }
    } else if (!isBusy && streamingStats.startTime > 0) {
      setTimeout(() => setStreamingStats({ startTime: 0, firstTokenTime: null, tokenCount: 0, tokensPerSec: 0 }), 3000);
    }
  }, [isBusy, messagesToRender, streamingStats.startTime, streamingStats.firstTokenTime]);

  // Conversation snapshot save (must be after messagesToRender + autoTitle)
  const saveSnapshot = useCallback(() => {
    if (!messagesToRender || messagesToRender.length === 0) { toast.error('No messages to snapshot'); return; }
    const snap = { id: `snap_${Date.now()}`, name: autoTitle || 'Snapshot', messageCount: messagesToRender.length, createdAt: Date.now() };
    const snapsData = JSON.parse(localStorage.getItem('fa_snap_data') || '{}');
    snapsData[snap.id] = messagesToRender.map((m: any) => ({ role: m.role, text: m.text || m.content || '' }));
    localStorage.setItem('fa_snap_data', JSON.stringify(snapsData));
    setSnapshots(prev => {
      const updated = [snap, ...prev].slice(0, 20);
      localStorage.setItem('fa_snapshots', JSON.stringify(updated));
      return updated;
    });
    toast.success('Snapshot saved');
  }, [messagesToRender, autoTitle]);

  // Performance metrics useEffect (must be after isBusy)
  useEffect(() => {
    if (isBusy && responseStartRef.current === 0) {
      responseStartRef.current = Date.now();
    } else if (!isBusy && responseStartRef.current > 0) {
      const elapsed = Date.now() - responseStartRef.current;
      responseStartRef.current = 0;
      setPerfMetrics(prev => {
        const times = [...prev.responseTimes, elapsed].slice(-50);
        const sorted = [...times].sort((a, b) => a - b);
        const avg = Math.round(times.reduce((s, t) => s + t, 0) / times.length);
        const p95 = sorted[Math.floor(sorted.length * 0.95)] || avg;
        return { responseTimes: times, avgLatency: avg, p95Latency: p95 };
      });
    }
  }, [isBusy]);

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
            {result.mediaCount ?? 0} media assets linked
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

  // Update ref for stable callback reference
  handleSendMessageRef.current = handleSendMessage;

  // Stable callback wrapper - never changes reference, always calls latest implementation
  const stableSendMessage = useCallback((content?: string) => {
    return handleSendMessageRef.current?.(content);
  }, []);
  stableSendMessageRef.current = stableSendMessage;

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
    stableSendMessage(message);
    setPendingAutoSend(null);
    onOptionsConsumed?.();
  }, [isOpen, pendingAutoSend, chatMode, isBusy, openOptions?.requestId, stableSendMessage, onOptionsConsumed]);

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

  // Enable virtualization for long conversations (50+ messages)
  const { shouldVirtualize } = useMessageVirtualization(messagesToRender?.length ?? 0, 50);

  // Conversation export callbacks (must be after messagesToRender)
  const conversationToMarkdown = useCallback(() => {
    const msgs = messagesToRender ?? [];
    if (msgs.length === 0) return '';
    const threadTitle = threads.find((t) => t._id === activeThreadId)?.title || 'Conversation';
    const lines: string[] = [`# ${threadTitle}\n`];
    for (const msg of msgs) {
      const role = msg.role === 'user' ? '**You**' : '**Assistant**';
      const text = typeof msg.content === 'string' ? msg.content : (msg.text ?? JSON.stringify(msg.content ?? ''));
      const ts = msg._creationTime ? new Date(msg._creationTime).toLocaleString() : '';
      lines.push(`### ${role}${ts ? ` — ${ts}` : ''}\n`);
      lines.push(text.trim());
      lines.push('');
    }
    return lines.join('\n');
  }, [messagesToRender, threads, activeThreadId]);

  const handleCopyAsMarkdown = useCallback(async () => {
    const md = conversationToMarkdown();
    if (!md) { toast.error('No messages to copy'); return; }
    await navigator.clipboard.writeText(md);
    toast.success('Conversation copied as Markdown');
  }, [conversationToMarkdown]);

  const handleDownloadMarkdown = useCallback(() => {
    const md = conversationToMarkdown();
    if (!md) { toast.error('No messages to download'); return; }
    const threadTitle = threads.find((t) => t._id === activeThreadId)?.title || 'conversation';
    const slug = threadTitle.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 60);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Downloaded as Markdown');
  }, [conversationToMarkdown, threads, activeThreadId]);

  // Shared conversation link
  const shareConversation = useCallback(() => {
    const md = conversationToMarkdown?.();
    if (md) {
      const blob = new Blob([md], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      navigator.clipboard.writeText(url);
      toast.success('Conversation link copied to clipboard');
    } else {
      toast.error('No conversation to share');
    }
  }, [conversationToMarkdown]);

  // Conversation search: compute match count from messages
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim() || !messagesToRender) return [] as number[];
    const q = searchQuery.toLowerCase();
    const indices: number[] = [];
    messagesToRender.forEach((msg: any, i: number) => {
      const text = typeof msg.content === 'string' ? msg.content : (msg.text ?? '');
      if (text.toLowerCase().includes(q)) indices.push(i);
    });
    return indices;
  }, [searchQuery, messagesToRender]);

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

      <div
        className={`fast-agent-panel ${variant === 'sidebar' ? 'sidebar-mode' : ''} ${isWideMode ? 'wide-mode' : ''} ${isFocusMode ? 'focus-mode' : ''} ${highContrast ? 'high-contrast' : ''} bg-[var(--bg-primary)] border-l border-[var(--border-color)]`}
        style={{ fontSize: `${fontSize}px` }}
        role="complementary"
        aria-label="AI Chat Panel"
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={(e) => { if (e.currentTarget === e.target) setIsDragOver(false); }}
      >
        {/* Skip to content link (a11y) */}
        <a href="#fa-chat-input" className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:bg-[var(--accent-primary)] focus:text-white focus:px-3 focus:py-1.5 focus:rounded focus:text-xs">
          Skip to chat input
        </a>

        {/* Simplified Header - Single Row (Glassmorphism) */}
        <div className="glass-header flex items-center gap-2 px-3 py-2">
          {/* Status dot + Title */}
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isStreaming || isSwarmActive ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`} />
            <span className="text-sm font-medium text-[var(--text-primary)] truncate">
              {isSwarmActive ? `Swarm ${swarmTasks.filter(t => t.status === 'completed').length}/${swarmTasks.length}` :
               isStreaming ? 'Thinking...' : 'Chat'}
            </span>
            {/* Auto-detected conversation topic */}
            {!isStreaming && activeThreadId && messagesToRender && messagesToRender.length > 0 && (() => {
              const firstUserMsg = messagesToRender.find((m: any) => m.role === 'user');
              if (!firstUserMsg) return null;
              const topic = (firstUserMsg.text || firstUserMsg.content || '').slice(0, 40);
              if (!topic) return null;
              return (
                <span className="text-[9px] text-[var(--text-muted)] truncate max-w-[120px] hidden sm:inline" title={firstUserMsg.text || firstUserMsg.content || ''}>
                  {topic}{(firstUserMsg.text || firstUserMsg.content || '').length > 40 ? '...' : ''}
                </span>
              );
            })()}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Primary Actions */}
          <div className="flex items-center gap-1">
            {/* Persona Switcher */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowPersonaPicker(p => !p)}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded-md hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-colors"
                title={`Persona: ${currentPersona.name}`}
                aria-haspopup="listbox"
                aria-expanded={showPersonaPicker}
              >
                <span>{currentPersona.icon}</span>
                <span className="hidden sm:inline text-[10px]">{currentPersona.name}</span>
                <ChevronDown className="w-3 h-3 opacity-50" />
              </button>
              {showPersonaPicker && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowPersonaPicker(false)} />
                  <div className="absolute right-0 top-full mt-1 w-44 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)] shadow-lg z-50 py-1" role="listbox" aria-label="Select persona">
                    {personas.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        role="option"
                        aria-selected={p.id === activePersona}
                        onClick={() => { setActivePersona(p.id); setShowPersonaPicker(false); toast.success(`Switched to ${p.name}`); }}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-left transition-colors ${p.id === activePersona ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] font-medium' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`}
                      >
                        <span>{p.icon}</span>
                        <span>{p.name}</span>
                        {p.id === activePersona && <span className="ml-auto text-[9px]">✓</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

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

                    {/* Export options (when thread has messages) */}
                    {activeThreadId && messagesToRender && messagesToRender.length > 0 && (
                      <>
                        <div className="border-t border-[var(--border-color)] my-1" />
                        <button
                          type="button"
                          onClick={() => { void handleCopyAsMarkdown(); setShowOverflowMenu(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[var(--bg-secondary)] text-left"
                        >
                          <ClipboardCopy className="w-3.5 h-3.5" />
                          <span>Copy as Markdown</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => { handleDownloadMarkdown(); setShowOverflowMenu(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[var(--bg-secondary)] text-left"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download .md</span>
                        </button>
                      </>
                    )}

                    {/* System Prompt */}
                    {activeThreadId && (
                      <button
                        type="button"
                        onClick={() => { setShowSystemPrompt(true); setShowOverflowMenu(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[var(--bg-secondary)] text-left"
                      >
                        <Bot className="w-3.5 h-3.5" />
                        <span>System Prompt</span>
                        {systemPrompt && <span className="ml-auto text-[9px] text-green-500">●</span>}
                      </button>
                    )}

                    {/* Conversation Analytics */}
                    {messagesToRender && messagesToRender.length > 0 && (
                      <>
                        <div className="border-t border-[var(--border-color)] my-1" />
                        <div className="px-3 py-2 text-[10px] text-[var(--text-muted)] space-y-1">
                          <div className="font-medium text-[var(--text-secondary)] text-xs mb-1">Thread Stats</div>
                          <div className="flex justify-between">
                            <span>Messages</span>
                            <span className="tabular-nums">{messagesToRender.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Words</span>
                            <span className="tabular-nums">{messagesToRender.reduce((sum: number, m: any) => sum + ((m.text || m.content || '').split(/\s+/).filter(Boolean).length), 0).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Est. tokens</span>
                            <span className="tabular-nums">~{Math.ceil(messagesToRender.reduce((sum: number, m: any) => sum + (m.text || m.content || '').length, 0) / 4).toLocaleString()}</span>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="border-t border-[var(--border-color)] my-1" />

                    {/* Focus Mode Toggle */}
                    <button
                      type="button"
                      onClick={() => { setIsFocusMode(prev => !prev); setShowOverflowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[var(--bg-secondary)] text-left"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{isFocusMode ? 'Exit Focus Mode' : 'Focus Mode'}</span>
                    </button>

                    {/* Share Thread */}
                    {activeThreadId && (
                      <button
                        type="button"
                        onClick={() => {
                          const url = `${window.location.origin}/chat/${activeThreadId}`;
                          navigator.clipboard.writeText(url);
                          toast.success('Thread link copied to clipboard');
                          setShowOverflowMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[var(--bg-secondary)] text-left"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Share Thread Link</span>
                      </button>
                    )}

                    {/* Wide Mode / Split View Toggle */}
                    <button
                      type="button"
                      onClick={() => { setIsWideMode(prev => !prev); setShowOverflowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[var(--bg-secondary)] text-left"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>{isWideMode ? 'Normal Width' : 'Wide Mode'}</span>
                    </button>

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

        {/* Conversation Search Bar */}
        {showSearch && (
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] flex-shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSearchMatchIndex(0); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (searchMatches.length > 0) {
                    const next = e.shiftKey
                      ? (searchMatchIndex - 1 + searchMatches.length) % searchMatches.length
                      : (searchMatchIndex + 1) % searchMatches.length;
                    setSearchMatchIndex(next);
                    const msgIdx = searchMatches[next];
                    const el = scrollContainerRef.current?.querySelectorAll('[data-msg-index]')?.[msgIdx];
                    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }
                if (e.key === 'Escape') {
                  setShowSearch(false);
                  setSearchQuery('');
                  setSearchMatchIndex(0);
                }
              }}
              placeholder="Search messages..."
              className="flex-1 bg-transparent text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] border-none focus:ring-0 focus:outline-none py-0"
            />
            {searchQuery && (
              <span className="text-[10px] text-[var(--text-muted)] tabular-nums flex-shrink-0">
                {searchMatches.length > 0 ? `${searchMatchIndex + 1}/${searchMatches.length}` : '0 results'}
              </span>
            )}
            <button
              type="button"
              onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchMatchIndex(0); }}
              className="p-1 hover:bg-[var(--bg-tertiary)] rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tab Bar - Chat, Sources, and Telemetry (hidden in focus mode) */}
        <div className={`flex items-center px-3 border-b border-[var(--border-color)] ${isFocusMode ? 'hidden' : ''}`}>
          {([
            { id: 'chat', label: 'Chat' },
            { id: 'sources', label: 'Sources' },
            { id: 'trace', label: 'Trace' },
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
          <div className={`panel-sidebar ${showSidebar && activeTab === 'chat' && !isFocusMode ? 'visible' : ''} border-r border-[var(--border-color)] bg-[var(--bg-secondary)]`}>
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
            ) : activeTab === 'trace' ? (
              <div className="flex-1 overflow-y-auto p-3">
                {/* Show TraceAuditPanel for: active swarm ID or active thread */}
                {isSwarmActive && activeThreadId ? (
                  <TraceAuditPanel
                    executionId={activeThreadId}
                    className="h-full"
                  />
                ) : activeThreadId ? (
                  <TraceAuditPanel
                    executionId={activeThreadId}
                    className="h-full"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <div className="w-10 h-10 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-3">
                      <svg className="w-5 h-5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                    </div>
                    <p className="text-sm font-medium text-[var(--text-primary)] mb-1">No Execution Trace</p>
                    <p className="text-xs text-[var(--text-muted)] max-w-xs">
                      Audit logs appear here when agent swarms execute. Each step is deterministically recorded.
                    </p>
                  </div>
                )}
              </div>
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

                {/* Scroll progress bar */}
                {scrollProgress > 0.01 && scrollProgress < 0.99 && (
                  <div className="h-[2px] bg-[var(--bg-secondary)] flex-shrink-0">
                    <div className="h-full bg-[var(--accent-primary)] transition-all duration-100" style={{ width: `${scrollProgress * 100}%` }} />
                  </div>
                )}

                {/* Main scrollable chat area */}
                <div ref={scrollContainerRef} role="log" aria-label="Chat messages" aria-live="polite" className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth relative">

                  {/* Conversation Starters (empty thread) */}
                  {(!messagesToRender || messagesToRender.length === 0) && !isBusy && (
                    <div className="flex flex-col items-center justify-center h-full py-12 animate-in fade-in duration-500">
                      <div className="text-3xl mb-3">👋</div>
                      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">How can I help you today?</h3>
                      <p className="text-[11px] text-[var(--text-muted)] mb-6">Choose a starter or type your own message</p>
                      <div className="grid grid-cols-2 gap-2 w-full max-w-[360px]">
                        {conversationStarters.map((starter, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setInput(starter.prompt)}
                            className="flex items-center gap-2 p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] hover:border-[var(--accent-primary)] transition-all text-left group"
                          >
                            <span className="text-lg">{starter.icon}</span>
                            <span className="text-[11px] font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">{starter.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Conversation Memory Chips */}
                  {activeThreadId && messagesToRender && messagesToRender.length > 2 && (
                    <div className="flex items-center gap-1.5 flex-wrap mb-2">
                      <span className="text-[9px] font-medium text-[var(--text-muted)] uppercase tracking-wider mr-1">Context:</span>
                      {(() => {
                        const topics = new Set<string>();
                        messagesToRender.slice(0, 6).forEach((m: any) => {
                          const t = (m.text || m.content || '').slice(0, 200);
                          const words = t.split(/\s+/).filter((w: string) => w.length > 5 && /^[A-Z]/.test(w));
                          words.slice(0, 2).forEach((w: string) => topics.add(w.replace(/[^a-zA-Z]/g, '')));
                        });
                        return Array.from(topics).slice(0, 4).map(topic => (
                          <span key={topic} className="px-2 py-0.5 text-[9px] font-medium bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-full text-[var(--text-secondary)]">
                            {topic}
                          </span>
                        ));
                      })()}
                      <span className="px-2 py-0.5 text-[9px] font-medium bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-full text-blue-600 dark:text-blue-400">
                        {selectedModel}
                      </span>
                    </div>
                  )}

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
                      <div className="flex flex-col items-center justify-center pt-10 pb-8 px-4">
                        {/* Hero Icon */}
                        <div className="relative w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 border-2 border-green-200 dark:border-green-800/40 flex items-center justify-center mb-5">
                          <Bot className="w-7 h-7 text-green-700 dark:text-green-400" />
                          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-500 border-2 border-[var(--bg-primary)]" />
                        </div>

                        {/* Title */}
                        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                          Nodebench AI
                        </h2>

                       {/* Marketing Tagline */}
                       <p className="text-[13px] text-[var(--text-muted)] text-center max-w-[280px] leading-relaxed">
                         Your intelligent research assistant. Search, analyze, and discover insights across documents, filings, and media.
                       </p>

                       {/* Suggestion Chips (ChatGPT pattern) */}
                       <div className="flex flex-wrap justify-center gap-2 mt-5 max-w-[340px]">
                         {[
                           { label: 'Analyze NVIDIA financials', icon: '📊' },
                           { label: 'Compare Tesla vs Rivian', icon: '⚡' },
                           { label: 'Latest FDA approvals', icon: '💊' },
                           { label: 'Summarize SEC filings', icon: '📄' },
                         ].map((chip) => (
                           <button
                             key={chip.label}
                             type="button"
                             onClick={() => {
                               setInput(chip.label);
                             }}
                             className="chip-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)]"
                           >
                             <span>{chip.icon}</span>
                             {chip.label}
                           </button>
                         ))}
                       </div>
                     </div>

                      {/* Recent threads / last run */}
                      <div className="px-4 pb-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
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
                              <div className="h-12 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 animate-pulse" />
                              <div className="h-12 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 animate-pulse" />
                            </>
                          ) : threads.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-secondary)]/30 px-4 py-3 text-center">
                              <div className="text-[12px] text-[var(--text-muted)]">
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

                  {/* Tool Approval Banner (HITL) */}
                  {pendingApprovals.length > 0 && (
                    <div className="mx-2 mb-2 space-y-1.5" role="alert" aria-label="Pending tool approvals">
                      {pendingApprovals.map(approval => (
                        <div key={approval.id} className={`flex items-center gap-2 p-2 rounded-lg border text-[11px] ${
                          approval.riskLevel === 'high' ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' :
                          approval.riskLevel === 'medium' ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800' :
                          'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800'
                        }`}>
                          <span className="text-base">{approval.riskLevel === 'high' ? '🔴' : approval.riskLevel === 'medium' ? '🟡' : '🟢'}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-[var(--text-primary)]">Tool: {approval.toolName}</div>
                            <div className="text-[var(--text-muted)] truncate">{JSON.stringify(approval.args).slice(0, 60)}</div>
                          </div>
                          <button type="button" onClick={() => approveToolCall(approval.id)} className="px-2 py-1 rounded bg-green-500 text-white text-[10px] font-medium hover:bg-green-600 transition-colors">Approve</button>
                          <button type="button" onClick={() => rejectToolCall(approval.id)} className="px-2 py-1 rounded bg-[var(--bg-secondary)] text-[var(--text-muted)] text-[10px] font-medium hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors">Reject</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Multi-Agent Handoff Cards */}
                  {agentHandoffs.length > 0 && (
                    <div className="mx-2 mb-2 flex gap-1.5 overflow-x-auto pb-1" role="status" aria-label="Agent handoffs">
                      {agentHandoffs.map(h => (
                        <div key={h.id} className={`flex-shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] ${h.status === 'active' ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800' : 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${h.status === 'active' ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`} />
                          <span className="font-medium text-[var(--text-primary)]">{h.fromAgent}</span>
                          <span className="text-[var(--text-muted)]">→</span>
                          <span className="font-medium text-[var(--text-primary)]">{h.toAgent}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <MessageHandlersProvider handlers={messageHandlers}>
                    <VirtualizedMessageList
                      messages={messagesToRender ?? []}
                      getMessageKey={(msg: any) => msg._id || msg.id || `msg-${msg.key}`}
                      renderMessage={(message: any) => (
                        <div onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, msgId: message._id || message.id || message.key, role: message.role }); }}>
                          {/* Timestamp grouping: date divider */}
                          {(() => {
                            if (!message._creationTime) return null;
                            const msgDate = new Date(message._creationTime).toDateString();
                            const prevMsg = messagesToRender[Math.max(0, messagesToRender.indexOf(message) - 1)];
                            const prevDate = prevMsg?._creationTime ? new Date(prevMsg._creationTime).toDateString() : null;
                            if (prevDate === msgDate && prevMsg !== message) return null;
                            const today = new Date().toDateString();
                            const yesterday = new Date(Date.now() - 86400000).toDateString();
                            const label = msgDate === today ? 'Today' : msgDate === yesterday ? 'Yesterday' : msgDate;
                            return (
                              <div className="flex items-center gap-3 py-2 mb-2">
                                <div className="flex-1 h-px bg-[var(--border-color)]" />
                                <span className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">{label}</span>
                                <div className="flex-1 h-px bg-[var(--border-color)]" />
                              </div>
                            );
                          })()}
                          <FastAgentUIMessageBubble
                            message={message}
                            onRegenerateMessage={() => handleRegenerateMessage(message.key)}
                            onDeleteMessage={() => handleDeleteMessage(message._id)}
                            onEditMessage={(newText: string) => {
                              void stableSendMessage(newText);
                            }}
                            searchHighlight={searchQuery || undefined}
                            isBookmarked={bookmarkedIds.has(message._id || message.id || message.key)}
                            onToggleBookmark={() => toggleBookmark(message._id || message.id || message.key)}
                            isMessagePinned={pinnedMsgIds.has(message._id || message.id || message.key)}
                            onTogglePin={() => togglePinMsg(message._id || message.id || message.key)}
                            feedbackVote={feedbackMap[message._id || message.id || message.key] || null}
                            onFeedback={(vote) => handleFeedback(message._id || message.id || message.key, vote)}
                            fontSize={fontSize}
                            editDiff={editDiffs[message._id || message.id || message.key] || null}
                            isInContext={(() => {
                              if (!messagesToRender) return true;
                              const idx = messagesToRender.indexOf(message);
                              const startIdx = messagesToRender.length - contextWindowMsgs.inContext;
                              return idx >= startIdx;
                            })()}
                          />
                        </div>
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

                  {/* Follow-up suggestion chips (shown after last assistant message, not while streaming) */}
                  {!isBusy && messagesToRender && messagesToRender.length > 0 && (() => {
                    const lastMsg = messagesToRender[messagesToRender.length - 1];
                    if (lastMsg?.role !== 'assistant') return null;
                    const txt = (lastMsg.text || lastMsg.content || '').slice(0, 600);
                    if (!txt || txt.length < 30) return null;
                    // Extract key noun phrases for follow-up suggestions
                    const sentences = txt.split(/[.!?\n]+/).filter((s: string) => s.trim().length > 10);
                    const suggestions: string[] = [];
                    if (sentences.length > 0) suggestions.push(`Tell me more about ${sentences[0].trim().split(/\s+/).slice(0, 5).join(' ')}...`);
                    if (sentences.length > 1) suggestions.push(`How does this compare to alternatives?`);
                    if (txt.length > 200) suggestions.push(`Summarize the key takeaways`);
                    if (suggestions.length === 0) return null;
                    return (
                      <div className="flex flex-wrap gap-2 px-4 pb-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {suggestions.slice(0, 3).map((s, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => { setInput(s); void stableSendMessage(s); }}
                            className="text-xs px-3 py-1.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)] transition-all"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    );
                  })()}

                  <div ref={messagesEndRef} />
                </div>

                {/* Auto-scroll paused "New messages" pill */}
                {isAutoScrollPaused && isBusy && (
                  <button
                    type="button"
                    onClick={() => {
                      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                      setIsAutoScrollPaused(false);
                    }}
                    className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors animate-in fade-in slide-in-from-bottom-2"
                  >
                    ↓ New messages
                  </button>
                )}

                {/* Conversation Minimap (right edge) */}
                {messagesToRender && messagesToRender.length > 4 && (
                  <div className="absolute right-1 top-2 bottom-2 w-[6px] z-20 opacity-0 hover:opacity-100 transition-opacity duration-300">
                    {messagesToRender.map((msg: any, idx: number) => {
                      const isUser = msg.role === 'user';
                      const charLen = (msg.text || msg.content || '').length;
                      const totalChars = messagesToRender.reduce((s: number, m: any) => s + (m.text || m.content || '').length, 0);
                      const heightPct = Math.max(2, (charLen / Math.max(1, totalChars)) * 100);
                      return (
                        <div
                          key={idx}
                          className="w-full rounded-sm cursor-pointer hover:brightness-125 transition-all"
                          style={{
                            height: `${heightPct}%`,
                            background: isUser ? '#3b82f6' : '#22c55e',
                            opacity: 0.5,
                            marginBottom: '1px',
                          }}
                          title={`${isUser ? 'You' : 'AI'}: ${(msg.text || msg.content || '').slice(0, 50)}`}
                        />
                      );
                    })}
                  </div>
                )}

                {/* Scroll-to-bottom FAB (Claude/ChatGPT pattern) */}
                {showScrollFab && (
                  <button
                    type="button"
                    onClick={() => {
                      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 w-8 h-8 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all duration-200 animate-in fade-in slide-in-from-bottom-2"
                    title="Scroll to bottom"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Anonymous User Banner */}
            {anonymousSession.isAnonymous && !anonymousSession.isLoading && (
              <div className={`mx-3 mt-2 px-3 py-2.5 rounded-xl border backdrop-blur-sm ${anonymousSession.canSendMessage
                ? 'bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-blue-200/50'
                : 'bg-gradient-to-r from-amber-50/80 to-orange-50/80 border-amber-200/50'
                }`}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-2.5">
                    {anonymousSession.canSendMessage ? (
                      <>
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                          <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                        </div>
                        <span className="text-[12px] text-stone-600">
                          <span className="font-semibold text-stone-800">{anonymousSession.remaining}</span>
                          {' '}of {anonymousSession.limit} free messages remaining today
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                          <LogIn className="w-3.5 h-3.5 text-amber-600" />
                        </div>
                        <span className="text-[12px] text-stone-600">
                          Daily limit reached. Sign in for unlimited access!
                        </span>
                      </>
                    )}
                  </div>
                  <a
                    href="/sign-in"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
                  >
                    <LogIn className="w-3 h-3" />
                    Sign in
                  </a>
                </div>
              </div>
            )}

            {/* Quick Actions Toolbar */}
            {messagesToRender && messagesToRender.length > 0 && !isBusy && (
              <div className="flex items-center gap-1 px-3 pt-1.5">
                <span className="text-[8px] text-[var(--text-muted)] uppercase tracking-wider mr-1">Quick:</span>
                {[
                  { label: 'Summarize', action: 'Summarize the conversation so far in 3 bullet points' },
                  { label: 'Simplify', action: 'Explain your last response in simpler terms' },
                  { label: 'Expand', action: 'Expand on your last point with more detail and examples' },
                  { label: 'Translate', action: 'Translate your last response to Spanish' },
                ].map((qa, i) => (
                  <button
                    key={i}
                    type="button"
                    className="text-[9px] px-2 py-0.5 rounded-md bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                    onClick={() => { setInput(qa.action); }}
                  >
                    {qa.label}
                  </button>
                ))}
              </div>
            )}

            {/* Focus Mode + Tone Picker Chips */}
            <div className="flex items-center gap-1.5 px-3 pt-1">
              {/* Focus Mode Picker */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowFocusPicker(p => !p)}
                  className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-md bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  title="Focus mode"
                >
                  {FOCUS_MODES.find(m => m.id === focusMode)?.icon} {FOCUS_MODES.find(m => m.id === focusMode)?.label}
                </button>
                {showFocusPicker && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowFocusPicker(false)} />
                    <div className="absolute bottom-full left-0 mb-1 z-50 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg shadow-xl overflow-hidden">
                      {FOCUS_MODES.map(mode => (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => { setFocusMode(mode.id); setShowFocusPicker(false); }}
                          className={`w-full flex items-center gap-2 px-3 py-1.5 text-[10px] hover:bg-[var(--bg-secondary)] text-left transition-colors ${focusMode === mode.id ? 'bg-[var(--bg-secondary)] font-semibold' : ''}`}
                        >
                          <span>{mode.icon}</span>
                          <span>{mode.label}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Tone Preset Chips */}
              {TONE_PRESETS.map(tone => (
                <button
                  key={tone.id}
                  type="button"
                  onClick={() => setTonePreset(tone.id)}
                  className={`text-[9px] px-1.5 py-0.5 rounded-md border transition-colors ${tonePreset === tone.id ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)] text-[var(--accent-primary)] font-medium' : 'bg-transparent border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                  title={`Tone: ${tone.label}`}
                >
                  {tone.icon}
                </button>
              ))}
            </div>

            {/* Follow-up Suggestion Chips */}
            {messagesToRender && messagesToRender.length > 0 && !isBusy && (() => {
              const lastMsg = messagesToRender[messagesToRender.length - 1] as any;
              if (!lastMsg || lastMsg.role === 'user') return null;
              const text = (lastMsg.text || lastMsg.content || '').slice(0, 300).toLowerCase();
              const suggestions: string[] = [];
              if (text.includes('financ') || text.includes('revenue') || text.includes('earning')) {
                suggestions.push('Compare to competitors', 'Show quarterly trends', 'Break down by segment');
              } else if (text.includes('research') || text.includes('study') || text.includes('paper')) {
                suggestions.push('Find related papers', 'Summarize key findings', 'What are the limitations?');
              } else if (text.includes('code') || text.includes('function') || text.includes('implement')) {
                suggestions.push('Add error handling', 'Write tests', 'Optimize performance');
              } else {
                suggestions.push('Tell me more', 'Give me examples', 'What are the alternatives?');
              }
              return (
                <div className="flex flex-wrap gap-1.5 px-3 pt-2">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      className="smart-action-chip text-[10px]"
                      onClick={() => { setInput(s); }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              );
            })()}

            {/* Reply-To Indicator */}
            {replyToMsg && (
              <div className="mx-3 mt-1 px-3 py-1.5 rounded-t-lg border border-b-0 border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center gap-2">
                <div className="w-0.5 h-6 rounded-full bg-[var(--accent-primary)]" />
                <div className="flex-1 min-w-0">
                  <span className="text-[9px] text-[var(--text-muted)]">Replying to {(replyToMsg as any).role === 'user' ? 'yourself' : 'AI'}</span>
                  <p className="text-[10px] text-[var(--text-secondary)] truncate">{((replyToMsg as any).text || (replyToMsg as any).content || '').slice(0, 80)}</p>
                </div>
                <button type="button" onClick={() => setReplyToMsgId(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs">&times;</button>
              </div>
            )}

            {/* Language Detection Indicator */}
            {detectedLanguage && !isBusy && (
              <div className="mx-3 mt-1 flex items-center gap-1.5">
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 font-medium">
                  🌐 {detectedLanguage} detected
                </span>
                <button
                  type="button"
                  className="text-[9px] text-[var(--accent-primary)] hover:underline"
                  onClick={() => setInput(`Translate your last response to English`)}
                >
                  Translate to English
                </button>
              </div>
            )}

            {/* Image Paste Preview Thumbnails */}
            {imagePreview.length > 0 && (
              <div className="mx-3 mt-1 flex items-center gap-2 flex-wrap">
                {imagePreview.map((img, i) => (
                  <div key={i} className="relative group">
                    <img src={img.url} alt="" className="w-12 h-12 rounded-lg object-cover border border-[var(--border-color)]" />
                    <button
                      type="button"
                      onClick={() => setImagePreview(prev => { URL.revokeObjectURL(prev[i].url); return prev.filter((_, j) => j !== i); })}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Scheduled Messages Indicator */}
            {scheduledMessages.length > 0 && (
              <div className="mx-3 mt-1 text-[9px] text-[var(--text-muted)] flex items-center gap-1">
                <span>🕐</span>
                {scheduledMessages.length} scheduled message{scheduledMessages.length > 1 ? 's' : ''} pending
              </div>
            )}

            {/* Voice Input + Input Area */}
            <div className="p-3 border-t border-[var(--border-color)]">
              {/* Voice Input Button */}
              <div className="flex items-center gap-2 mb-1.5">
                <button
                  type="button"
                  onClick={isRecording ? stopVoiceInput : startVoiceInput}
                  className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-md border transition-all ${isRecording
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-300 text-red-600 animate-pulse'
                    : 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                  title={isRecording ? 'Stop recording' : 'Voice input'}
                >
                  {isRecording ? '⏹ Stop' : '🎙 Voice'}
                </button>
                {/* Font Size Slider */}
                <div className="flex items-center gap-1 ml-auto">
                  <span className="text-[8px] text-[var(--text-muted)]">A</span>
                  <input
                    type="range"
                    min={10}
                    max={18}
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-[50px] h-1 accent-[var(--accent-primary)]"
                    title={`Font size: ${fontSize}px`}
                  />
                  <span className="text-[10px] text-[var(--text-muted)]">A</span>
                </div>
              </div>
              <FastAgentInputBar
                id="fa-chat-input"
                input={input}
                setInput={setInput}
                onSend={() => stableSendMessage(input)}
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
                responseLength={responseLength}
                onResponseLengthChange={setResponseLength}
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

            {/* Persistent Status Bar */}
            <div className="status-bar">
              <div className={`status-dot ${isAuthenticated ? 'connected' : 'disconnected'}`} />
              <span>{isAuthenticated ? 'Connected' : 'Offline'}</span>
              <span className="opacity-50">|</span>
              <span className="tabular-nums">{selectedModel}</span>
              {messagesToRender && messagesToRender.length > 0 && (() => {
                const totalChars = messagesToRender.reduce((sum: number, m: any) => sum + (m.text || m.content || '').length, 0);
                const tokensUsed = Math.ceil(totalChars / 4);
                const pct = Math.min((tokensUsed / contextLimit) * 100, 100);
                const color = pct > 85 ? '#ef4444' : pct > 60 ? '#f59e0b' : '#22c55e';
                return (
                  <>
                    <span className="opacity-50">|</span>
                    <span className="tabular-nums">{messagesToRender.length} msgs</span>
                    <span className="opacity-50">|</span>
                    {/* Context Window Meter */}
                    <button
                      type="button"
                      onClick={() => setShowContextPruning(p => !p)}
                      className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                      title={`Context: ~${tokensUsed.toLocaleString()} / ${(contextLimit / 1000).toFixed(0)}K tokens (${pct.toFixed(0)}%)\nClick to manage context`}
                    >
                      <div className="w-[40px] h-[4px] bg-[var(--border-color)] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
                      </div>
                      <span className="tabular-nums" style={{ color }}>{pct.toFixed(0)}%</span>
                    </button>
                  </>
                );
              })()}
              {isBusy && (
                <>
                  <span className="opacity-50">|</span>
                  <span className="text-blue-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                    Generating
                    {streamingStats.tokensPerSec > 0 && (
                      <span className="text-[8px] tabular-nums ml-0.5">{streamingStats.tokensPerSec} tok/s</span>
                    )}
                  </span>
                  {streamingStats.firstTokenTime && streamingStats.startTime > 0 && (
                    <span className="text-[8px] text-[var(--text-muted)] tabular-nums">
                      TTFT: {streamingStats.firstTokenTime - streamingStats.startTime}ms
                    </span>
                  )}
                </>
              )}
              {!isBusy && perfMetrics.avgLatency > 0 && (
                <>
                  <span className="opacity-50">|</span>
                  <span className="text-[8px] text-[var(--text-muted)] tabular-nums" title={`Avg: ${perfMetrics.avgLatency}ms, P95: ${perfMetrics.p95Latency}ms (${perfMetrics.responseTimes.length} samples)`}>
                    avg {(perfMetrics.avgLatency / 1000).toFixed(1)}s
                  </span>
                </>
              )}
              {messagesToRender && messagesToRender.length > 0 && contextWindowMsgs.total > contextWindowMsgs.inContext && (
                <>
                  <span className="opacity-50">|</span>
                  <span className="text-orange-500 text-[9px]" title={`${contextWindowMsgs.inContext}/${contextWindowMsgs.total} messages in context window`}>
                    {contextWindowMsgs.inContext}/{contextWindowMsgs.total} in ctx
                  </span>
                </>
              )}
              <span className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setShowAnalytics(true)}
                  className="opacity-40 hover:opacity-80 text-[9px] transition-opacity"
                  title="Analytics"
                >
                  📊
                </button>
                <button
                  type="button"
                  onClick={() => setShowTimeline(p => !p)}
                  className="opacity-40 hover:opacity-80 text-[9px] transition-opacity"
                  title="Conversation timeline"
                >
                  Timeline
                </button>
                <span className="opacity-40 text-[9px]">Ctrl+K</span>
              </span>
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

        {/* Keyboard Shortcuts Overlay */}
        {showShortcutsOverlay && (
          <>
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setShowShortcutsOverlay(false)} />
            <div className="absolute inset-0 z-50 flex items-center justify-center p-8 pointer-events-none">
              <div className="pointer-events-auto bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl shadow-2xl w-full max-w-sm p-5 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Keyboard Shortcuts</h3>
                  <button type="button" onClick={() => setShowShortcutsOverlay(false)} className="action-btn p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-md hover:bg-[var(--bg-secondary)]">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2.5 text-xs">
                  {[
                    { keys: '/', desc: 'Focus message input' },
                    { keys: '?', desc: 'Toggle this overlay' },
                    { keys: 'Ctrl+F', desc: 'Search messages' },
                    { keys: 'Ctrl+K', desc: 'Command palette' },
                    { keys: 'Ctrl+T', desc: 'Conversation timeline' },
                    { keys: 'Ctrl+Shift+N', desc: 'New conversation' },
                    { keys: 'j', desc: 'Next message' },
                    { keys: 'k', desc: 'Previous message' },
                    { keys: 'Escape', desc: 'Close overlays / blur / close' },
                    { keys: 'Enter', desc: 'Send message' },
                    { keys: 'Shift+Enter', desc: 'New line in message' },
                  ].map((s) => (
                    <div key={s.keys} className="flex items-center justify-between">
                      <span className="text-[var(--text-secondary)]">{s.desc}</span>
                      <div className="flex items-center gap-1">
                        {s.keys.split('+').map((k) => (
                          <kbd key={k} className="px-1.5 py-0.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded text-[10px] font-mono text-[var(--text-muted)]">{k}</kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-[10px] text-[var(--text-muted)] text-center">Press <kbd className="px-1 py-0.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded text-[10px] font-mono">?</kbd> or <kbd className="px-1 py-0.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded text-[10px] font-mono">Esc</kbd> to close</p>
              </div>
            </div>
          </>
        )}

        {/* System Prompt Editor Modal */}
        {showSystemPrompt && (
          <>
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm z-50" onClick={() => setShowSystemPrompt(false)} />
            <div className="absolute inset-x-4 top-20 z-50 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl shadow-2xl p-4 max-h-[300px] flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Custom System Prompt</h3>
                <button type="button" onClick={() => setShowSystemPrompt(false)} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-md hover:bg-[var(--bg-secondary)]">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Enter a custom system prompt for this thread (e.g., 'You are a financial analyst specializing in tech stocks...')"
                className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-3 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/20"
                rows={5}
              />
              <div className="flex items-center justify-between mt-3">
                <button
                  type="button"
                  onClick={() => { setSystemPrompt(''); if (activeThreadId) localStorage.removeItem(`fa_sysprompt_${activeThreadId}`); toast.success('System prompt cleared'); }}
                  className="text-xs text-red-500 hover:text-red-600 px-2 py-1"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={saveSystemPrompt}
                  className="text-xs px-4 py-1.5 rounded-lg bg-[var(--text-primary)] text-[var(--bg-primary)] hover:opacity-80 font-medium"
                >
                  Save
                </button>
              </div>
            </div>
          </>
        )}

        {/* Quick Reply Templates */}
        {showQuickReplies && (
          <>
            <div className="absolute inset-0 z-40" onClick={() => setShowQuickReplies(false)} />
            <div className="absolute bottom-24 left-3 right-3 z-50 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl shadow-2xl p-3">
              <div className="text-xs font-medium text-[var(--text-secondary)] mb-2">Quick Replies</div>
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {quickReplies.map((reply, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => { setInput(reply); setShowQuickReplies(false); }}
                    className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] transition-colors truncate"
                  >
                    {reply}
                  </button>
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-[var(--border-color)]">
                <input
                  type="text"
                  placeholder="Add a new template..."
                  className="w-full text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                      const val = (e.target as HTMLInputElement).value.trim();
                      const updated = [...quickReplies, val];
                      setQuickReplies(updated);
                      localStorage.setItem('fa_quick_replies', JSON.stringify(updated));
                      (e.target as HTMLInputElement).value = '';
                      toast.success('Template added');
                    }
                  }}
                />
              </div>
            </div>
          </>
        )}

        {/* Command Palette (Ctrl+K) */}
        {showCommandPalette && (
          <>
            <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" onClick={() => setShowCommandPalette(false)} />
            <div className="absolute inset-x-4 top-16 z-50 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden max-h-[400px] flex flex-col">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-color)]">
                <Search className="w-4 h-4 text-[var(--text-muted)]" />
                <input
                  ref={commandInputRef}
                  type="text"
                  value={commandQuery}
                  onChange={(e) => setCommandQuery(e.target.value)}
                  placeholder="Search commands, threads, actions..."
                  className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') { setShowCommandPalette(false); setCommandQuery(''); }
                  }}
                />
                <kbd className="px-1.5 py-0.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded text-[10px] font-mono text-[var(--text-muted)]">Esc</kbd>
              </div>
              <div className="overflow-y-auto p-2 space-y-0.5">
                {[
                  { label: 'New Thread', shortcut: 'Ctrl+Shift+N', action: () => { setActiveThreadId(null); setInput(''); } },
                  { label: 'Search Messages', shortcut: 'Ctrl+F', action: () => { setShowSearch(true); setTimeout(() => searchInputRef.current?.focus(), 50); } },
                  { label: 'Focus Mode', shortcut: '', action: () => setIsFocusMode(prev => !prev) },
                  { label: 'Wide Mode', shortcut: '', action: () => setIsWideMode(prev => !prev) },
                  { label: 'System Prompt', shortcut: '', action: () => setShowSystemPrompt(true) },
                  { label: 'Quick Replies', shortcut: '', action: () => setShowQuickReplies(true) },
                  { label: 'Keyboard Shortcuts', shortcut: '?', action: () => setShowShortcutsOverlay(true) },
                  { label: 'Conversation Timeline', shortcut: 'Ctrl+T', action: () => setShowTimeline(true) },
                  { label: 'Context Window Usage', shortcut: '', action: () => setShowContextPruning(true) },
                  { label: '📊 Analytics Dashboard', shortcut: '', action: () => setShowAnalytics(true) },
                  { label: '🌳 Thread Branches', shortcut: '', action: () => setShowBranchTree(true) },
                  { label: '🔗 Share Conversation', shortcut: '', action: () => shareConversation() },
                  { label: '⚙️ System Prompt', shortcut: '', action: () => setShowSystemPrompt(true) },
                  { label: '🧠 Memory Panel', shortcut: '', action: () => setShowMemoryPanel(true) },
                  { label: '📥 Import Conversation', shortcut: '', action: () => setShowImport(true) },
                  { label: '📸 Save Snapshot', shortcut: '', action: () => saveSnapshot() },
                  { label: '🔆 High Contrast Mode', shortcut: '', action: () => setHighContrast(p => !p) },
                  ...(threads || []).slice(0, 5).map(t => ({ label: `Thread: ${t.title || 'New Chat'}`, shortcut: '', action: () => setActiveThreadId(t._id) })),
                ].filter(cmd => !commandQuery || cmd.label.toLowerCase().includes(commandQuery.toLowerCase())).map((cmd, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => { cmd.action(); setShowCommandPalette(false); setCommandQuery(''); }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg hover:bg-[var(--bg-secondary)] text-left transition-colors"
                  >
                    <span className="text-[var(--text-primary)]">{cmd.label}</span>
                    {cmd.shortcut && (
                      <kbd className="px-1.5 py-0.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded text-[9px] font-mono text-[var(--text-muted)]">{cmd.shortcut}</kbd>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Conversation Timeline Overlay */}
        {showTimeline && messagesToRender && messagesToRender.length > 0 && (
          <>
            <div className="absolute inset-0 z-40" onClick={() => setShowTimeline(false)} />
            <div className="absolute inset-x-3 top-14 bottom-14 z-50 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-color)]">
                <span className="text-xs font-semibold text-[var(--text-primary)]">Conversation Timeline</span>
                <button type="button" onClick={() => setShowTimeline(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm">&times;</button>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                <div className="relative border-l-2 border-[var(--border-color)] ml-3 space-y-0">
                  {messagesToRender.map((msg: any, idx: number) => {
                    const isUser = msg.role === 'user';
                    const text = (msg.text || msg.content || '').slice(0, 80);
                    const charLen = (msg.text || msg.content || '').length;
                    const tokEst = Math.ceil(charLen / 4);
                    return (
                      <div
                        key={idx}
                        className="relative pl-6 py-1.5 group hover:bg-[var(--bg-secondary)] rounded-r-lg transition-colors cursor-pointer"
                        onClick={() => {
                          const msgEls = scrollContainerRef.current?.querySelectorAll('.msg-entrance');
                          if (msgEls && msgEls[idx]) {
                            msgEls[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
                            (msgEls[idx] as HTMLElement).style.outline = '2px solid var(--accent-primary, #3b82f6)';
                            (msgEls[idx] as HTMLElement).style.outlineOffset = '4px';
                            (msgEls[idx] as HTMLElement).style.borderRadius = '12px';
                            setTimeout(() => { (msgEls[idx] as HTMLElement).style.outline = 'none'; }, 2000);
                          }
                          setShowTimeline(false);
                        }}
                        title="Click to scroll to this message"
                      >
                        <div className={`absolute left-[-5px] top-3 w-2.5 h-2.5 rounded-full border-2 border-[var(--bg-primary)] ${isUser ? 'bg-blue-500' : 'bg-green-500'}`} />
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-muted)]">{isUser ? 'You' : 'AI'}</span>
                          <span className="text-[9px] tabular-nums text-[var(--text-muted)]">~{tokEst} tok</span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 truncate">{text || '(empty)'}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="px-4 py-2 border-t border-[var(--border-color)] text-[10px] text-[var(--text-muted)] flex items-center justify-between">
                <span>{messagesToRender.length} messages</span>
                <span>~{Math.ceil(messagesToRender.reduce((s: number, m: any) => s + (m.text || m.content || '').length, 0) / 4).toLocaleString()} tokens total</span>
              </div>
            </div>
          </>
        )}

        {/* Context Pruning UI */}
        {showContextPruning && messagesToRender && messagesToRender.length > 0 && (
          <>
            <div className="absolute inset-0 z-40" onClick={() => setShowContextPruning(false)} />
            <div className="absolute inset-x-3 bottom-12 z-50 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden max-h-[320px] flex flex-col">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-color)]">
                <span className="text-xs font-semibold text-[var(--text-primary)]">Context Window</span>
                <button type="button" onClick={() => setShowContextPruning(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm">&times;</button>
              </div>
              <div className="px-4 py-2 border-b border-[var(--border-color)]">
                {(() => {
                  const totalChars = messagesToRender.reduce((s: number, m: any) => s + (m.text || m.content || '').length, 0);
                  const tokUsed = Math.ceil(totalChars / 4);
                  const pct = Math.min((tokUsed / contextLimit) * 100, 100);
                  return (
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] mb-1">
                        <span>{tokUsed.toLocaleString()} tokens used</span>
                        <span>{(contextLimit / 1000).toFixed(0)}K limit ({selectedModel})</span>
                      </div>
                      <div className="w-full h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: pct > 85 ? '#ef4444' : pct > 60 ? '#f59e0b' : '#22c55e' }}
                        />
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-color)]">
                {messagesToRender.map((msg: any, idx: number) => {
                  const isUser = msg.role === 'user';
                  const charLen = (msg.text || msg.content || '').length;
                  const tokEst = Math.ceil(charLen / 4);
                  const pctOfTotal = messagesToRender.length > 0
                    ? ((tokEst / Math.max(1, Math.ceil(messagesToRender.reduce((s: number, m: any) => s + (m.text || m.content || '').length, 0) / 4))) * 100)
                    : 0;
                  return (
                    <div key={idx} className="flex items-center gap-2 px-4 py-1.5 text-[10px]">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isUser ? 'bg-blue-500' : 'bg-green-500'}`} />
                      <span className="font-medium text-[var(--text-secondary)] w-6">{isUser ? 'You' : 'AI'}</span>
                      <span className="flex-1 truncate text-[var(--text-muted)]">{(msg.text || msg.content || '').slice(0, 60)}</span>
                      <div className="flex items-center gap-1">
                        <div className="w-[30px] h-[3px] bg-[var(--border-color)] rounded-full overflow-hidden">
                          <div className="h-full bg-[var(--text-muted)] rounded-full" style={{ width: `${Math.min(pctOfTotal * 2, 100)}%` }} />
                        </div>
                        <span className="tabular-nums text-[var(--text-muted)]">{tokEst}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Artifacts/Canvas Panel */}
        {showArtifacts && artifactContent && (
          <>
            <div className="absolute inset-0 z-40 bg-black/20" onClick={() => setShowArtifacts(false)} />
            <div className="absolute inset-y-2 right-2 w-[45%] min-w-[300px] z-50 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-color)] glass-header">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    {artifactContent.type === 'html' ? '🌐 HTML Preview' : artifactContent.type === 'svg' ? '🎨 SVG Preview' : `📄 ${artifactContent.language || 'Code'}`}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-muted)]">
                    {artifactContent.content.length} chars
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard.writeText(artifactContent.content); toast.success('Copied'); }}
                    className="text-[10px] px-2 py-1 rounded-md hover:bg-[var(--bg-secondary)] text-[var(--text-muted)]"
                  >
                    Copy
                  </button>
                  <button type="button" onClick={() => setShowArtifacts(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm px-1">&times;</button>
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                {artifactContent.type === 'html' || artifactContent.type === 'svg' ? (
                  <iframe
                    srcDoc={artifactContent.type === 'svg'
                      ? `<!DOCTYPE html><html><body style="margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f9fafb">${artifactContent.content}</body></html>`
                      : artifactContent.content}
                    className="w-full h-full border-none bg-white"
                    sandbox="allow-scripts"
                    title="Artifact Preview"
                  />
                ) : (
                  <pre className="text-[11px] font-mono p-4 overflow-auto text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
                    {artifactContent.content}
                  </pre>
                )}
              </div>
            </div>
          </>
        )}

        {/* Drag-and-Drop File Upload Overlay */}
        {isDragOver && (
          <div
            className="absolute inset-0 z-[60] bg-blue-500/10 border-2 border-dashed border-blue-500 rounded-xl flex items-center justify-center backdrop-blur-sm"
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragOver(false);
              const files = Array.from(e.dataTransfer.files);
              if (files.length > 0) {
                setAttachedFiles(prev => [...prev, ...files]);
                toast.success(`${files.length} file(s) attached`);
              }
            }}
          >
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Download className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Drop files here</span>
              <span className="text-xs text-blue-500">Images, PDFs, documents</span>
            </div>
          </div>
        )}

        {/* Conversation Analytics Dashboard */}
        {showAnalytics && messagesToRender && messagesToRender.length > 0 && (
          <>
            <div className="absolute inset-0 z-40" onClick={() => setShowAnalytics(false)} />
            <div className="absolute inset-x-3 top-14 bottom-14 z-50 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-color)]">
                <span className="text-xs font-semibold text-[var(--text-primary)]">📊 Conversation Analytics</span>
                <button type="button" onClick={() => setShowAnalytics(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm">&times;</button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {(() => {
                  const userMsgs = messagesToRender.filter((m: any) => m.role === 'user');
                  const aiMsgs = messagesToRender.filter((m: any) => m.role === 'assistant');
                  const totalChars = messagesToRender.reduce((s: number, m: any) => s + (m.text || m.content || '').length, 0);
                  const totalTokens = Math.ceil(totalChars / 4);
                  const avgUserLen = userMsgs.length > 0 ? Math.ceil(userMsgs.reduce((s: number, m: any) => s + (m.text || m.content || '').length, 0) / userMsgs.length) : 0;
                  const avgAiLen = aiMsgs.length > 0 ? Math.ceil(aiMsgs.reduce((s: number, m: any) => s + (m.text || m.content || '').length, 0) / aiMsgs.length) : 0;
                  const costEstimate = (totalTokens / 1000000 * 3).toFixed(4);
                  return (
                    <>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: 'Messages', value: messagesToRender.length, sub: `${userMsgs.length} you / ${aiMsgs.length} AI` },
                          { label: 'Tokens', value: totalTokens.toLocaleString(), sub: `~$${costEstimate} est.` },
                          { label: 'Model', value: selectedModel.split('/').pop() || selectedModel, sub: `${(contextLimit / 1000).toFixed(0)}K ctx` },
                        ].map((stat, i) => (
                          <div key={i} className="bg-[var(--bg-secondary)] rounded-lg p-3 text-center">
                            <div className="text-lg font-bold text-[var(--text-primary)]">{stat.value}</div>
                            <div className="text-[10px] text-[var(--text-muted)]">{stat.label}</div>
                            <div className="text-[9px] text-[var(--text-muted)] mt-0.5">{stat.sub}</div>
                          </div>
                        ))}
                      </div>
                      <div>
                        <div className="text-[10px] font-semibold text-[var(--text-secondary)] mb-2">Token Distribution</div>
                        <div className="flex items-end gap-1 h-[80px]">
                          {messagesToRender.map((msg: any, idx: number) => {
                            const len = Math.ceil((msg.text || msg.content || '').length / 4);
                            const maxLen = Math.max(...messagesToRender.map((m: any) => Math.ceil((m.text || m.content || '').length / 4)));
                            const height = Math.max(4, (len / Math.max(1, maxLen)) * 100);
                            return (
                              <div
                                key={idx}
                                className="flex-1 rounded-t-sm transition-all"
                                style={{ height: `${height}%`, background: msg.role === 'user' ? '#3b82f6' : '#22c55e', opacity: 0.7 }}
                                title={`${msg.role === 'user' ? 'You' : 'AI'}: ~${len} tokens`}
                              />
                            );
                          })}
                        </div>
                        <div className="flex justify-between text-[8px] text-[var(--text-muted)] mt-1">
                          <span>Start</span>
                          <span>Latest</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-semibold text-[var(--text-secondary)] mb-2">Average Length</div>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] w-8 text-[var(--text-muted)]">You</span>
                            <div className="flex-1 h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min((avgUserLen / Math.max(avgUserLen, avgAiLen, 1)) * 100, 100)}%` }} />
                            </div>
                            <span className="text-[9px] text-[var(--text-muted)] tabular-nums w-12 text-right">{avgUserLen} ch</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] w-8 text-[var(--text-muted)]">AI</span>
                            <div className="flex-1 h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                              <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min((avgAiLen / Math.max(avgUserLen, avgAiLen, 1)) * 100, 100)}%` }} />
                            </div>
                            <span className="text-[9px] text-[var(--text-muted)] tabular-nums w-12 text-right">{avgAiLen} ch</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-[9px] text-[var(--text-muted)]">
                        Context: {contextWindowMsgs.inContext}/{contextWindowMsgs.total} messages in window
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </>
        )}

        {/* Thread Branch Tree */}
        {showBranchTree && threads && threads.length > 0 && (
          <>
            <div className="absolute inset-0 z-40" onClick={() => setShowBranchTree(false)} />
            <div className="absolute inset-x-3 top-14 bottom-14 z-50 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-color)]">
                <span className="text-xs font-semibold text-[var(--text-primary)]">🌳 Thread Branches</span>
                <button type="button" onClick={() => setShowBranchTree(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm">&times;</button>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                <div className="relative border-l-2 border-[var(--border-color)] ml-4 space-y-0">
                  {threads.slice(0, 20).map((thread: any, idx: number) => {
                    const isActive = thread._id === activeThreadId;
                    return (
                      <div
                        key={thread._id || idx}
                        className={`relative pl-6 py-2 cursor-pointer rounded-r-lg transition-colors ${isActive ? 'bg-[var(--accent-primary)]/10' : 'hover:bg-[var(--bg-secondary)]'}`}
                        onClick={() => { setActiveThreadId(thread._id); setShowBranchTree(false); }}
                      >
                        <div className={`absolute left-[-5px] top-4 w-2.5 h-2.5 rounded-full border-2 border-[var(--bg-primary)] ${isActive ? 'bg-[var(--accent-primary)]' : 'bg-[var(--text-muted)]'}`} />
                        <div className="text-[11px] font-medium text-[var(--text-primary)] truncate">{thread.title || 'Untitled'}</div>
                        <div className="text-[9px] text-[var(--text-muted)]">
                          {(thread as any).messageCount || '?'} msgs · {new Date(thread._creationTime).toLocaleDateString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Right-Click Context Menu */}
        {contextMenu && (
          <>
            <div className="fixed inset-0 z-[70]" onClick={() => setContextMenu(null)} onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }} />
            <div
              className="fixed z-[80] bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg shadow-2xl py-1 min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
              style={{ left: contextMenu.x, top: contextMenu.y }}
            >
              {[
                { label: '📋 Copy text', action: () => { const m = messagesToRender?.find((m: any) => (m._id || m.id || m.key) === contextMenu.msgId); if (m) navigator.clipboard.writeText((m as any).text || (m as any).content || ''); toast.success('Copied'); } },
                { label: '↩️ Reply', action: () => setReplyToMsgId(contextMenu.msgId) },
                { label: '🧠 Remember this', action: () => { const m = messagesToRender?.find((m: any) => (m._id || m.id || m.key) === contextMenu.msgId); if (m) addMemory(((m as any).text || (m as any).content || '').slice(0, 200)); } },
                { label: '📌 Pin', action: () => togglePinMsg(contextMenu.msgId) },
                { label: '🔖 Bookmark', action: () => toggleBookmark(contextMenu.msgId) },
                ...(contextMenu.role === 'user' ? [{ label: '✏️ Edit', action: () => { /* editing handled in bubble */ } }] : []),
                { label: '🗑️ Delete', action: () => handleDeleteMessage(contextMenu.msgId as any) },
              ].map((item, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { item.action(); setContextMenu(null); }}
                  className="w-full text-left px-3 py-1.5 text-[11px] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Memory Panel */}
        {showMemoryPanel && (
          <>
            <div className="absolute inset-0 z-40" onClick={() => setShowMemoryPanel(false)} />
            <div className="absolute inset-x-3 top-14 bottom-14 z-50 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-color)]">
                <span className="text-xs font-semibold text-[var(--text-primary)]">🧠 Memory ({memories.length})</span>
                <button type="button" onClick={() => setShowMemoryPanel(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm">&times;</button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {memories.length === 0 && (
                  <div className="text-center py-8 text-[var(--text-muted)] text-xs">
                    <p>No memories saved yet.</p>
                    <p className="mt-1 text-[10px]">Right-click a message and select "Remember this"</p>
                  </div>
                )}
                {memories.map(mem => (
                  <div key={mem.id} className="flex items-start gap-2 p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-[var(--text-secondary)]">{mem.text}</p>
                      <span className="text-[9px] text-[var(--text-muted)]">{new Date(mem.createdAt).toLocaleDateString()}</span>
                    </div>
                    <button type="button" onClick={() => removeMemory(mem.id)} className="text-[var(--text-muted)] hover:text-red-500 text-xs flex-shrink-0">&times;</button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Conversation Import Dialog */}
        {showImport && (
          <>
            <div className="absolute inset-0 z-40" onClick={() => setShowImport(false)} />
            <div className="absolute inset-x-3 top-1/4 z-50 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-color)]">
                <span className="text-xs font-semibold text-[var(--text-primary)]">📥 Import Conversation</span>
                <button type="button" onClick={() => setShowImport(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm">&times;</button>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-[11px] text-[var(--text-muted)]">Paste a ChatGPT or Claude conversation export (JSON format)</p>
                <textarea
                  className="w-full h-[120px] p-2 text-[11px] font-mono bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] resize-none focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                  placeholder='{"messages": [{"role": "user", "content": "..."}, ...]}'
                />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowImport(false)} className="text-[10px] px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-muted)]">Cancel</button>
                  <button type="button" onClick={() => { toast.info('Import feature coming soon'); setShowImport(false); }} className="text-[10px] px-3 py-1.5 rounded-lg bg-[var(--accent-primary)] text-white">Import</button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Drag-to-resize handle (left edge) */}
        {variant !== 'sidebar' && (
          <div
            className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[var(--accent-primary)]/30 transition-colors z-50 group"
            onMouseDown={(e) => {
              e.preventDefault();
              const startX = e.clientX;
              const panel = (e.target as HTMLElement).closest('.fast-agent-panel') as HTMLElement;
              if (!panel) return;
              const startWidth = panel.offsetWidth;
              const onMove = (ev: MouseEvent) => {
                const delta = startX - ev.clientX;
                const newWidth = Math.max(400, Math.min(1200, startWidth + delta));
                panel.style.width = `${newWidth}px`;
              };
              const onUp = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
              };
              document.addEventListener('mousemove', onMove);
              document.addEventListener('mouseup', onUp);
            }}
          >
            <div className="absolute left-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="w-3 h-3 text-[var(--text-muted)]" />
            </div>
          </div>
        )}

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
