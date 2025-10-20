// Agent Workflow Panel component
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useMcp } from "../../hooks/useMcp";
import { useContextPills } from "../../hooks/contextPills";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import {
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  MarkerType,
} from 'reactflow';

import {
  Send,
  Server as ServerIcon,
  FileText,
  Brain,
  Wrench,
  ChevronDown,
  ChevronRight,
  X,
  Sparkles,
  Zap,
  Settings,
  Info,
  Key,
  Eye,
  EyeOff,
  Upload,
  Hash,
  Image as ImageIcon,
  FileCheck,
  Calendar,
} from 'lucide-react';

import { toast } from "sonner";

import { ContextPills } from "../ContextPills";
import { FileTypeIcon } from "../FileTypeIcon";
import { inferFileType, type FileType } from "../../lib/fileTypes";
import { EnhancedMcpPanel } from "../EnhancedMcpPanel";
import { Input as AIChatPanelInput, Messages as AIChatPanelMessages, ContextPill, useThinkingMode, useExpandedThinking, renderThinkingStep } from "../../features/chat";
import { nodeTypes } from "../../features/chat/flow/nodeTypes";

// Import new modular components
import { AIChatPanelHeader } from "./AIChatPanel.Header";
import { AIChatPanelQuickActions } from "./AIChatPanel.QuickActions";
import { AIChatPanelMcpSelector } from "./AIChatPanel.McpSelector";
import { AIChatPanelErrorBanner } from "./AIChatPanel.ErrorBanner";
import { AIChatPanelTurnDetails, type TurnDetails } from "./AIChatPanel.TurnDetails";
import { AIChatPanelChatView } from "./AIChatPanel.ChatView";
import { AIChatPanelFlowView } from "./AIChatPanel.FlowView";


// Minimal shared action type used for AI change proposals
type AIToolAction = {
  type:
    | 'createNode'
    | 'updateNode'
    | 'archiveNode'
    | 'createDocument'
    | 'updateDocument'
    | 'archiveDocument';
  markdown?: string;
  nodeId?: Id<'nodes'>;
  title?: string;
  parentId?: Id<'nodes'>;
};


interface AIChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onDocumentSelect: (documentId: Id<"documents">) => void;
  selectedDocumentId?: Id<"documents">;
  selectedNodeId?: Id<"nodes">;
  smsMessage?: string;
  onSmsMessageProcessed?: () => void;
  // Selected files for AI chat context
  selectedFileIds?: Id<"files">[];
  // Show/hide the MCP Integration Panel and external toggle
  showMcpPanel?: boolean;
  onToggleMcpPanel?: () => void;
  // Quick prompt handoff from MainLayout top bar
  pendingQuickPrompt?: string;
  onQuickPromptConsumed?: () => void;
}

interface ThinkingStep {
  type: 'thinking' | 'tool_call' | 'result';
  content: string;
  timestamp: Date;
  toolCall?: {
    name: string;
    args?: any;
    result?: any;
    error?: string;
  };
}

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: any[];
  isProcessing?: boolean;
  thinkingSteps?: ThinkingStep[];
  isThinking?: boolean;
  documentCreated?: {
    id: Id<"documents">;
    title: string;
  };
  isContextPrompt?: boolean;
  originalMessage?: string;
  candidateDocs?: any[];
}

// Local conversation node data used only for building the flow graph
interface FlowConversationNodeData {
  messageId: string;
  type: 'user' | 'assistant';
  title: string;
  content: string;
  timestamp: Date;
  status: 'active' | 'completed' | 'error';
  thinkingSteps?: any[];
  toolCalls?: any[];
  artifacts?: any[];
  adaptations?: any[];
  candidateDocs?: any[];
  documentCreated?: { title?: string } | null;
}

// Context Pill Component for showing selected documents/files
// [removed] ContextPill component has been extracted to ./AIChatPanel.ContextPill.tsx to avoid nested block comment issues.



// Helper functions for model-aware file upload




// Helper functions for model-aware file upload
const filterFilesByModel = (files: File[], model: 'openai' | 'gemini') => {
  const validFiles: File[] = [];
  const invalidFiles: File[] = [];

  files.forEach(file => {
    if (model === 'gemini') {
      // Gemini supports all file types
      validFiles.push(file);
    } else if (model === 'openai') {
      // OpenAI only supports images
      if (file.type.startsWith('image/')) {
        validFiles.push(file);
      } else {
        invalidFiles.push(file);
      }
    }
  });

  return { validFiles, invalidFiles };
};

const getAcceptedFileTypes = (model: 'openai' | 'gemini') => {
  if (model === 'gemini') {
    return 'video/*,audio/*,image/*,.pdf,.doc,.docx,.csv,.txt,.md';
  } else {
    return 'image/*';
  }
};

const getUploadTooltip = (model: 'openai' | 'gemini') => {
  if (model === 'gemini') {
    return 'Upload File (All types supported)';
  } else {
    return 'Upload Image (Images only)';
  }
};

const getPlaceholderText = (model: 'openai' | 'gemini', selectedDocumentId?: string) => {
  const baseText = selectedDocumentId ? 'Ask to add content' : 'Ask me anything...';
  const fileText = model === 'gemini' ? 'or drop files...' : 'or drop images...';
  return `${baseText} ${fileText}`;
};

export function AIChatPanel({ isOpen, onClose, onDocumentSelect: _onDocumentSelect, selectedDocumentId, selectedNodeId, smsMessage, onSmsMessageProcessed, selectedFileIds = [], showMcpPanel, onToggleMcpPanel, pendingQuickPrompt, onQuickPromptConsumed }: AIChatPanelProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { expandedThinking, toggleThinking, resetThinking } = useExpandedThinking();
  const [selectedModel, setSelectedModel] = useState<'openai' | 'gemini'>('openai');
  // Specific OpenAI model variant to use; default to nano
  const [openaiVariant, setOpenaiVariant] = useState<'gpt-5-nano' | 'gpt-5-mini'>('gpt-5-nano');
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [showLlmInfo, setShowLlmInfo] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'flow'>('chat');

  // Manual chat persistence control (default off)
  const [autoSaveChat, setAutoSaveChat] = useState<boolean>(() => {
    try { return localStorage.getItem('nb.autoSaveChat') === '1'; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem('nb.autoSaveChat', autoSaveChat ? '1' : '0'); } catch { /* no-op */ }
  }, [autoSaveChat]);

  // If the MCP panel is shown from outside, ensure we're on the Chat tab where it's rendered
  useEffect(() => {
    if (showMcpPanel) setActiveTab('chat');
  }, [showMcpPanel]);

  // MCP connection state
  const { sessionId: mcpSessionId, invoking: mcpConnecting, servers, selectServer, tools } = useMcp();
  const { setContextDocs, setToolsMcp, setUiInfo, focused, viewingDocs, previousDocs, contextDocs, toolsMcp, uiInfo } = useContextPills();

  // Query available MCP servers from the database
  const availableMcpServersRaw = useQuery(api.mcp.listMcpServers, {});
  const mcpServersList = useMemo(() => availableMcpServersRaw ?? [], [availableMcpServersRaw]);

  // Find a Tavily server for web search (prefer enabled ones)
  const tavilyServer = mcpServersList.find(server =>
    server.name?.toLowerCase().includes('tavily') && server.isEnabled
  ) || mcpServersList.find(server =>
    server.name?.toLowerCase().includes('tavily')
  );

  const [apiKeys, setApiKeys] = useState<{openai: string, gemini: string}>({openai: '', gemini: ''});
  const [showApiKeyInput, setShowApiKeyInput] = useState<{openai: boolean, gemini: boolean}>({openai: false, gemini: false});
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string>('');
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Persisted chat thread document id for this panel session
  const [threadDocumentId, setThreadDocumentId] = useState<Id<"documents"> | null>(null);

  // React Flow state - Simplified
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedFlowNode, setSelectedFlowNode] = useState<string | null>(null);
  const [selectedTurnDetails, setSelectedTurnDetails] = useState<TurnDetails | null>(null);
  const reactFlowInstanceRef = useRef<any>(null);
  const flowContainerRef = useRef<HTMLDivElement | null>(null);
  const [flowReady, setFlowReady] = useState(false);
  // Measure container to avoid React Flow error 004 (needs width & height)
  useEffect(() => {
    if (activeTab !== 'flow') { setFlowReady(false); return; }
    const el = flowContainerRef.current;
    if (!el) return;
    const check = () => {
      const rect = el.getBoundingClientRect();
      setFlowReady(rect.width > 0 && rect.height > 0);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [activeTab]);

  // Keep React Flow node.selected in sync with selectedFlowNode
  useEffect(() => {
    setNodes(prev => prev.map(n => ({
      ...n,
      selected: selectedFlowNode ? n.id === selectedFlowNode : false,
    })));
  }, [selectedFlowNode, setNodes]);

  // Counter for unique ID generation to prevent duplicate React keys
  const idCounterRef = useRef(0);
  // Conversation turn counter and last node tracker to avoid stacking and ensure chaining
  const turnCounterRef = useRef(0);
  const lastNodeIdRef = useRef<string | null>(null);

  // Context selection state
  const [selectedContextDocumentIds, setSelectedContextDocumentIds] = useState<Id<"documents">[]>([]);
  const [selectedContextFileIds, setSelectedContextFileIds] = useState<Id<"files">[]>([]);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemName, setEditingItemName] = useState<string>('');
  const [expandedGroups, setExpandedGroups] = useState(new Set<string>(['documents']));
  const editCommittedRef = useRef<boolean>(false);

  // Additional state variables
  const [showContext, setShowContext] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('nb.showContext');
      return v ? v === '1' : true;
    } catch {
      return true;
    }
  });
  // Error banner state for surfacing tool call failures
  const [errorBanner, setErrorBanner] = useState<{
    message: string;
    errors: Array<{ tool: string; message: string }>;
    expanded: boolean;
  } | null>(null);

  // Track which chat messages have already been persisted to avoid duplicates on manual save
  const [savedMessageIds, setSavedMessageIds] = useState<Set<string>>(new Set());

  // Thinking mode toggle for agentic multi-step workflows (persisted)
  const { thinkingMode, setThinkingMode } = useThinkingMode();
  useEffect(() => {
    try {
      localStorage.setItem('nb.showContext', showContext ? '1' : '0');
    } catch (e) {
      // Ignore storage errors (e.g., private mode, SSR).
      void e;
    }
  }, [showContext]);



  // Provide UI-level context pill summary to help the agent understand the interface
  useEffect(() => {
    const rightPanelModel = selectedModel === 'openai' ? `OpenAI (${openaiVariant})` : 'Gemini';
    const mcpSummary = servers?.length ? `${servers.length} server${servers.length > 1 ? 's' : ''} available` : 'none';

    // Layout-aware, authoritative UI map. Keep concise but specific.
    const summary = [
      // Sidebar
      '- Sidebar (left, resizable): Documents/Public/Calendar tabs, file selection for context, AI Chat toggle, SMS-to-chat hook.',
      // Top bar
      '- Top Bar: title (My Documents/Public Documents), Grid toggle (in Documents view), Theme toggle (Light/Dark), Help, User avatar/name.',
      // Main content
      '- Main Content: TabManager shows current document editor or a multi-document grid depending on Grid mode.',
      // Right panel
      `- Right AI Panel (resizable): Tabs → Chat (messages, model selector=${rightPanelModel}, MCP servers=${mcpSummary}, Context=${showContext ? 'visible' : 'hidden'}, input row) and Flow (conversation graph).`,
      // Controls quick recap
      '- Quick Actions: document helpers (New Doc, Find Docs, Add Section, Outline, Checklist).'
    ].join('\n');

    setUiInfo({ summary });
  }, [selectedModel, openaiVariant, servers, showContext, setUiInfo]);

  // Build a concise context summary from context pills state
  const buildSynthContext = useCallback(() => {
    const lines: string[] = [];
    if (focused) {
      const preview = focused.preview ? (focused.preview.length > 160 ? focused.preview.slice(0, 160) + "…" : focused.preview) : undefined;
      lines.push(
        `Focused: doc=${String(focused.documentId)}${focused.blockId ? ` block=${focused.blockId}` : ""}${preview ? ` | ${preview}` : ""}`
      );
    }
    if (viewingDocs && viewingDocs.length) {
      lines.push(`Viewing: ${viewingDocs.map(d => d.title || String(d.id)).join(", ")}`);
    }
    if (previousDocs && previousDocs.length) {
      lines.push(`Previously Viewed: ${previousDocs.map(d => d.title || String(d.id)).join(", ")}`);
    }
    if (contextDocs && contextDocs.length) {
      lines.push(`Context Docs: ${contextDocs.map(d => d.title || String(d.id)).join(", ")}`);
    }
    if (toolsMcp?.mcpServerName) {
      lines.push(`MCP: ${toolsMcp.mcpServerName}${toolsMcp.toolCount ? ` (${toolsMcp.toolCount} tools)` : ""}`);
    }
    if (uiInfo?.summary) {
      lines.push(`UI: ${uiInfo.summary}`);
    }
    return lines.join("\n");
  }, [focused, viewingDocs, previousDocs, contextDocs, toolsMcp, uiInfo]);

  // LLM information for UI transparency
  const llmInfo = useMemo(() => {
    const provider = selectedModel === 'openai' ? 'OpenAI' : 'Google Gemini';
    const model = selectedModel === 'openai' ? openaiVariant : 'gemini-2.5-flash';
    const fileSupport = selectedModel === 'gemini' ? 'Files (PDF, CSV, images, etc.)' : 'Images';
    const toolCalls = ['proposeNode', 'proposeUpdateNode', 'openDoc', 'editDoc'];
    const mcpServerCount = Array.isArray(servers) ? servers.length : (servers ? 1 : 0);
    const mcpToolCount = Array.isArray(tools) ? tools.length : (typeof (tools as any)?.count === 'number' ? (tools as any).count : 0);
    return { provider, model, fileSupport, toolCalls, mcp: { servers: mcpServerCount, tools: mcpToolCount } };
  }, [selectedModel, openaiVariant, servers, tools]);

  // Helper function to get document file type and icon
  const _getDocumentFileType = useCallback((document: any): { type: string; icon: any; color: string } => {
    const title = document.title?.toLowerCase() || '';
    const content = document.content?.toLowerCase() || '';

    // Check file extension in title
    if (title.endsWith('.pdf')) {
      return { type: 'PDF Documents', icon: FileText, color: 'text-red-500' };
    }
    if (title.endsWith('.csv') || title.includes('csv') || content.includes('csv')) {
      return { type: 'CSV/Data Files', icon: Hash, color: 'text-green-500' };
    }
    if (title.endsWith('.docx') || title.endsWith('.doc') || title.includes('word')) {
      return { type: 'Word Documents', icon: FileText, color: 'text-blue-500' };
    }
    if (title.endsWith('.xlsx') || title.endsWith('.xls') || title.includes('excel') || title.includes('spreadsheet')) {
      return { type: 'Spreadsheets', icon: Hash, color: 'text-emerald-500' };
    }
    if (title.endsWith('.pptx') || title.endsWith('.ppt') || title.includes('presentation')) {
      return { type: 'Presentations', icon: FileText, color: 'text-orange-500' };
    }
    if (title.endsWith('.txt') || title.endsWith('.md') || title.includes('readme')) {
      return { type: 'Text Files', icon: FileText, color: 'text-gray-500' };
    }
    if (title.endsWith('.json') || title.endsWith('.xml') || title.endsWith('.yaml') || title.endsWith('.yml')) {
      return { type: 'Config/Data Files', icon: Settings, color: 'text-purple-500' };
    }
    if (title.includes('report') || title.includes('analysis') || title.includes('summary')) {
      return { type: 'Reports & Analysis', icon: FileCheck, color: 'text-indigo-500' };
    }
    if (title.includes('meeting') || title.includes('notes') || title.includes('agenda')) {
      return { type: 'Meeting Notes', icon: Calendar, color: 'text-yellow-600' };
    }

    // Default category
    return { type: 'General', icon: FileText, color: 'text-gray-600' };
  }, []);

  // Auto-fit whenever nodes/edges change to keep the graph in view
  useEffect(() => {
    if (reactFlowInstanceRef.current && (nodes.length > 0 || edges.length > 0)) {
      // Defer to the next tick to allow layout updates
      const id = setTimeout(() => {
        try {
          reactFlowInstanceRef.current?.fitView({ padding: 0.2 });
        } catch (e) {
          // Ignore fitView errors when instance is not ready
          void e;
        }
      }, 0);
      return () => clearTimeout(id);
    }
  }, [nodes.length, edges.length]);

  // Generate unique ID for messages to prevent React key duplication
  const generateUniqueId = useCallback((prefix: string = 'msg') => {
    // Use a ref-based counter that increments immediately to prevent race conditions
    const counter = ++idCounterRef.current;
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substr(2, 5);
    return `${prefix}_${timestamp}_${counter}_${randomSuffix}`;
  }, []);

  const _createNode = useMutation(api.nodes_extras.create);
  const _updateNode = useMutation(api.nodes.update);
  const _archiveNode = useMutation(api.nodes_extras.archive);
  const _createDocument = useMutation(api.prosemirror.createDocumentWithInitialSnapshot);
  const _updateDocument = useMutation(api.documents.update);
  const _archiveDocument = useMutation(api.documents.archive);
  const _renameFile = useMutation(api.files.renameFile);
  const _generateAIResponse = useAction(api.ai.generateResponse);
  const chatWithAgent = useAction(api.aiAgents.chatWithAgent);
  // Chat thread persistence mutations
  const startChatThread = useMutation(api.chatThreads.start);
  const appendChatMessage = useMutation(api.chatThreads.appendMessage);

  // Context selection queries
  const availableDocuments = useQuery(api.documents.getSidebarWithOptions, { sortBy: 'updated', sortOrder: 'desc' });
  // Auth status to guard persistence
  const currentUser = useQuery(api.auth.loggedInUser);
  const availableFiles = useQuery(api.files.listRecentFiles, { limit: 50 });
  // Enriched metadata for selected context files
  const selectedFilesBasic = useQuery(api.chunks.getFilesBasicPublic, { fileIds: selectedContextFileIds });

  // Derived counts for context header (placed after queries to avoid TDZ)
  const contextCounts = useMemo(() => {
    const docsSel = selectedContextDocumentIds.length;
    const filesSel = selectedContextFileIds.length;
    const docsTotal = availableDocuments?.length ?? 0;
    const filesTotal = availableFiles?.length ?? 0;
    return { docsSel, filesSel, docsTotal, filesTotal };
  }, [selectedContextDocumentIds, selectedContextFileIds, availableDocuments, availableFiles]);

  // Context-aware quick actions
  const handleSummarizeSelectedDocs = useCallback(() => {
    const titles = (availableDocuments ?? [])
      .filter((d: any) => selectedContextDocumentIds.includes(d._id))
      .map((d: any) => d.title)
      .slice(0, 10);
    const suffix = titles.length ? `: ${titles.join(', ')}` : '';
    handleQuickAction(`Summarize the selected docs${suffix}`);
  }, [availableDocuments, selectedContextDocumentIds]);

  const handleCompareSelectedDocs = useCallback(() => {
    const titles = (availableDocuments ?? [])
      .filter((d: any) => selectedContextDocumentIds.includes(d._id))
      .map((d: any) => d.title)
      .slice(0, 6);
    if (titles.length >= 2) {
      handleQuickAction(`Compare these documents and highlight differences: ${titles.join(' | ')}`);
    } else {
      handleQuickAction('Compare the selected document with related content.');
    }
  }, [availableDocuments, selectedContextDocumentIds]);

  const handleCompareSelectedFiles = useCallback(() => {
    const names = (availableFiles ?? [])
      .filter((f: any) => selectedContextFileIds.includes(f._id))
      .map((f: any) => f.fileName)
      .slice(0, 6);
    if (names.length >= 2) {
      handleQuickAction(`Compare these files and summarize key differences: ${names.join(' | ')}`);
    } else {
      handleQuickAction('Compare the selected file with similar content.');
    }
  }, [availableFiles, selectedContextFileIds]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Sync MCP/tools to Context Pills
  useEffect(() => {
    try {
      const current = servers?.find(s => s._id === mcpSessionId) || mcpServersList?.find(s => s._id === mcpSessionId);
      setToolsMcp({ mcpServerName: current?.name, toolCount: tools?.length || 0 });
    } catch {
      // no-op
    }
  }, [mcpSessionId, servers, tools, mcpServersList, setToolsMcp]);

  // Sync selected context documents to Context Pills
  useEffect(() => {
    if (!availableDocuments) return;
    const idSet = new Set(selectedContextDocumentIds);
    const docs = (availableDocuments || []).filter((d: any) => idSet.has(d._id)).map((d: any) => ({ id: d._id, title: d.title }));
    setContextDocs(docs);
  }, [selectedContextDocumentIds, availableDocuments, setContextDocs]);

  // Effect to handle React Flow resize when panel dimensions change
  useEffect(() => {
    const handleResize = () => {
      // Use timeout to ensure the DOM has updated
      setTimeout(() => {
        if (reactFlowInstanceRef.current) {
          reactFlowInstanceRef.current.fitView({ padding: 0.2 });
        }
      }, 100);
    };

    // Listen for window resize events
    window.addEventListener('resize', handleResize);

    // Also trigger resize on component mount to ensure proper initial sizing
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);



  const handleClearMessages = () => {
    // Clear all messages
    setMessages([]);
    // Clear expanded thinking states
    resetThinking();
    // Reset conversation nodes
    setNodes([]);
    setEdges([]);
    setSelectedTurnDetails(null);
    setSelectedFlowNode(null);
    // Reset layout counters/refs
    turnCounterRef.current = 0;
    lastNodeIdRef.current = null;
    // Clear any lingering error banners
    setErrorBanner(null);
    console.log('🧹 [FRONTEND] Cleared all messages and workflow');
  };

  // ChatGPT-like message actions
  const handleEditMessage = (messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditingContent(content);
  };

  const handleSaveEdit = async () => {
    if (!editingMessageId || !editingContent.trim()) return;

    // Find the message index to edit
    const messageIndex = messages.findIndex(m => m.id === editingMessageId);
    if (messageIndex === -1) return;

    // Remove all messages after the edited message (rollback)
    const newMessages = messages.slice(0, messageIndex);

    // Update the edited message content
    const editedMessage = { ...messages[messageIndex], content: editingContent.trim() };
    newMessages.push(editedMessage);

    setMessages(newMessages);
    setEditingMessageId(null);
    setEditingContent('');

    // Rerun from this point if it was a user message
    if (editedMessage.type === 'user') {
      await handleSendMessage(editingContent.trim());
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent('');
  };

  const handleRollbackToMessage = (messageId: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    // Keep messages up to and including the selected message
    const newMessages = messages.slice(0, messageIndex + 1);
    setMessages(newMessages);
  };

  const handleUndoLastResponse = () => {
    // Remove the last assistant message
    let lastAssistantIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].type === 'assistant') {
        lastAssistantIndex = i;
        break;
      }
    }
    if (lastAssistantIndex === -1) return;

    const newMessages = messages.slice(0, lastAssistantIndex);
    setMessages(newMessages);
  };

  const handleRerunFromMessage = async (messageId: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    const message = messages[messageIndex];
    if (message.type !== 'user') return;

    // Rollback to this message first
    handleRollbackToMessage(messageId);

    // Then rerun the AI response
    setTimeout(() => {
      void handleSendMessage(message.content);
    }, 100);
  };

  // Simplified conversation turn node creation
  const addConversationTurn = useCallback((
    type: 'user' | 'assistant',
    messageId: string,
    content: string,
    status: 'active' | 'completed' | 'error' = 'active',
    details?: {
      thinkingSteps?: any[];
      toolCalls?: any[];
      artifacts?: any[];
      adaptations?: any[];
      documentCreated?: any;
    }
  ) => {
    const uniqueId = generateUniqueId('turn');

    // Calculate position for compact layout using a monotonic counter to avoid stacking
    const xSpacing = 280;
    const ySpacing = 150;
    const maxPerRow = 4;
    const index = turnCounterRef.current;
    turnCounterRef.current = index + 1;

    const row = Math.floor(index / maxPerRow);
    const col = index % maxPerRow;

    const position = {
      x: 50 + (col * xSpacing),
      y: 50 + (row * ySpacing)
    };

    const turnData: ConversationTurnData = {
      messageId,
      type,
      title: type === 'user' ? 'User Message' : 'Assistant Response',
      content,
      timestamp: new Date(),
      status,
      ...details
    };

    const newNode: Node = {
      id: uniqueId,
      type: 'conversationTurn',
      position,
      data: turnData
    };

    setNodes(prev => [...prev, newNode]);

    // Chain to the previous node via ref to avoid race conditions
    const previousId = lastNodeIdRef.current;
    lastNodeIdRef.current = uniqueId;
    if (previousId) {
      const newEdge: Edge = {
        id: `${previousId}-${uniqueId}`,
        source: previousId,
        target: uniqueId,
        animated: status === 'active',
        style: {
          stroke: status === 'error' ? '#ef4444' : status === 'completed' ? '#10b981' : '#3b82f6',
          strokeWidth: 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: status === 'error' ? '#ef4444' : status === 'completed' ? '#10b981' : '#3b82f6',
        },
      };
      setEdges(prev => [...prev, newEdge]);
    }

    // Auto-fit after updates
    setTimeout(() => {
      reactFlowInstanceRef.current?.fitView({ padding: 0.2 });
    }, 0);

    return uniqueId;
  }, [generateUniqueId, setNodes, setEdges]);

  // Update node status
  const updateNodeStatus = useCallback((nodeId: string, status: 'active' | 'completed' | 'error', details?: Partial<ConversationTurnData>) => {
    setNodes(prev => prev.map(node => {
      if (node.id === nodeId) {
        return {
          ...node,
          data: {
            ...node.data,
            status,
            ...(details || {})
          }
        };
      }
      return node;
    }));

    // Update edge animation
    setEdges(prev => prev.map(edge => {
      if (edge.target === nodeId) {
        const nextColor = status === 'error' ? '#ef4444' : status === 'completed' ? '#10b981' : '#3b82f6';
        const markerEndObj = (edge.markerEnd && typeof edge.markerEnd === 'object')
          ? { ...(edge.markerEnd as any), color: nextColor }
          : { type: MarkerType.ArrowClosed, color: nextColor } as any;
        return {
          ...edge,
          animated: status === 'active',
          style: {
            ...(edge.style || {}),
            stroke: nextColor
          },
          markerEnd: markerEndObj
        };
      }
      return edge;
    }));
  }, [setNodes, setEdges]);

  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedFlowNode(node.id);

    // Show detailed view for AI nodes with process details
    const turnData = node.data as FlowConversationNodeData;
    if (turnData.type === 'assistant' && (
      (turnData.thinkingSteps?.length || 0) > 0 ||
      (turnData.toolCalls?.length || 0) > 0 ||
      (turnData.artifacts?.length || 0) > 0
    )) {
      setSelectedTurnDetails(turnData);
    } else {
      setSelectedTurnDetails(null);
    }
  }, []);

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge(params, eds));
  }, [setEdges]);

  // Context selection handlers
  const handleDocumentContextToggle = useCallback((docId: Id<"documents">) => {
    setSelectedContextDocumentIds(prev =>
      prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  }, []);

  const handleFileContextToggle = useCallback((fileId: Id<"files">) => {
    setSelectedContextFileIds(prev =>
      prev.includes(fileId)
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  }, []);

  // File type detection and grouping functions
  // (removed unused getFileType helper)

  const getSpecificFileType = useCallback((title: string): string => {
    const lowerTitle = title.toLowerCase();

    if (/\.pdf$/.test(lowerTitle)) return 'pdf';
    if (/\.csv$/.test(lowerTitle)) return 'csv';
    if (/\.(xlsx|xls)$/.test(lowerTitle)) return 'excel';
    if (/\.(png|jpg|jpeg|gif|svg|webp)$/.test(lowerTitle)) return 'image';
    if (/\.json$/.test(lowerTitle)) return 'json';
    if (/\.(js|ts|jsx|tsx|py|rb|go|rs|html|css|scss|sh)$/.test(lowerTitle)) return 'code';
    if (/\.(txt|md)$/.test(lowerTitle)) return 'text';
    // Fallback for general documents
    return 'document';
  }, []);

  const FileIcon = useCallback(({ fileType, className }: { fileType: string; className?: string }) => {
    const iconMap: { [key: string]: { svg: React.JSX.Element; color: string } } = {
      document: {
        color: '#666666',
        svg: (
          <>
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path>
            <path d="M14 2v4a2 2 0 0 0 2 2h4"></path>
            <path d="M10 9H8"></path>
            <path d="M16 13H8"></path>
            <path d="M16 17H8"></path>
          </>
        ),
      },
      csv: {
        color: '#10b981',
        svg: (
          <>
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="9" y1="3" x2="9" y2="21"></line>
            <line x1="15" y1="3" x2="15" y2="21"></line>
            <line x1="3" y1="9" x2="21" y2="9"></line>
            <line x1="3" y1="15" x2="21" y2="15"></line>
          </>
        ),
      },
      excel: {
        color: '#059669',
        svg: (
          <>
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <rect x="7" y="7" width="3" height="9"></rect>
            <rect x="14" y="7" width="3" height="5"></rect>
          </>
        ),
      },
      pdf: {
        color: '#dc2626',
        svg: (
          <>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7l-6-5z"/>
            <path d="M14 2v5h5"/>
            <path d="M9 13h6"/>
            <path d="M9 17h3"/>
          </>
        ),
      },
      image: {
        color: '#3b82f6',
        svg: (
          <>
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </>
        ),
      },
      json: {
        color: '#f59e0b',
        svg: (
          <>
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
            <polyline points="13 2 13 9 20 9"/>
            <path d="M12 12h.01"/>
            <path d="M12 17h.01"/>
          </>
        ),
      },
      code: {
        color: '#8b5cf6',
        svg: (
          <>
            <polyline points="16 18 22 12 16 6"></polyline>
            <polyline points="8 6 2 12 8 18"></polyline>
          </>
        ),
      },
      text: {
        color: '#6b7280',
        svg: (
          <>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </>
        ),
      },
    };

    const details = iconMap[fileType as keyof typeof iconMap] || iconMap.document;

    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke={details.color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        {details.svg}
      </svg>
    );
  }, []);

  const toggleGroupExpansion = useCallback((groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  }, []);

  const startEditing = useCallback((id: string, currentName: string) => {
    setEditingItemId(id);
    setEditingItemName(currentName);
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingItemId(null);
    setEditingItemName('');
  }, []);

  const _saveEdit = useCallback(async (id: string, newName: string) => {
    const trimmed = (newName ?? '').trim();
    if (!trimmed) {
      cancelEditing();
      return;
    }

    try {
      // Prefer selected context to determine type
      const isDoc = selectedContextDocumentIds.some((docId) => (docId as any) === id);
      const isFile = selectedContextFileIds.some((fileId) => (fileId as any) === id);

      if (isDoc) {
        await _updateDocument({ id: id as any, title: trimmed });
      } else if (isFile) {
        await _renameFile({ fileId: id as any, fileName: trimmed });
      } else {
        // Fallback: try to resolve from available lists
        const doc = availableDocuments?.find((d: any) => d._id === id);
        if (doc) {
          await _updateDocument({ id: doc._id, title: trimmed });
        } else {
          const file = availableFiles?.find((f: any) => f._id === id);
          if (file) {
            await _renameFile({ fileId: file._id, fileName: trimmed });
          } else {
            throw new Error('Item not found in current context');
          }
        }
      }

      cancelEditing();
    } catch (err: any) {
      setErrorBanner({
        message: 'Rename failed',
        errors: [
          {
            tool: 'rename',
            message: err?.message || 'Failed to rename item',
          },
        ],
        expanded: false,
      });
    }
  }, [
    _renameFile,
    _updateDocument,
    availableDocuments,
    availableFiles,
    cancelEditing,
    selectedContextDocumentIds,
    selectedContextFileIds,
    setErrorBanner,
  ]);

  const clearContextSelection = useCallback(() => {
    setSelectedContextDocumentIds([]);
    setSelectedContextFileIds([]);
  }, []);

  // Keep local file-context selection in sync with external prop
  useEffect(() => {
    if (!selectedFileIds) return;
    setSelectedContextFileIds((prev) => {
      const next = selectedFileIds;
      // Avoid unnecessary state updates if identical
      if (prev.length === next.length && prev.every((id) => next.includes(id))) {
        return prev;
      }
      return next;
    });
  }, [selectedFileIds]);

  const handleResetWorkflow = () => {
    // Clear conversation flow
    setNodes([]);
    setEdges([]);
    setSelectedTurnDetails(null);
    setSelectedFlowNode(null);
    setErrorBanner(null);
  };


  const handleSendMessage = useCallback(async (message?: string) => {
    const userMessageContent = message ?? input.trim();
    if (!userMessageContent || isLoading) return;

    const userMessage: Message = {
      id: generateUniqueId('user'),
      type: 'user',
      content: userMessageContent,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    if (!message) {
      setInput('');
    }
    setIsLoading(true);

    // Add simplified user turn node
    const _userNodeId = addConversationTurn('user', userMessage.id, userMessageContent, 'completed');

    // Add processing AI turn node
    const aiNodeId = addConversationTurn('assistant', generateUniqueId('ai'), 'Processing your request...', 'active');

    try {
      console.log('🎯 [FRONTEND] Starting AI request with:', { userMessageContent, selectedModel, selectedDocumentId });

      // Call the AI action with selected model
      console.log('🎯 [FRONTEND] Calling chatWithAgent...');
      const synthContext = buildSynthContext();

      // Conditionally persist based on user toggle
      // Ensure a chat thread document exists; seed with context summary if available (only if authenticated and auto-save is ON)
      let currentThreadId = threadDocumentId;
      if (currentUser && autoSaveChat) {
        if (!currentThreadId) {
          try {
            const createdId = await startChatThread({
              initialContext: synthContext ? `Context Summary:\n${synthContext}` : undefined,
            });
            setThreadDocumentId(createdId);
            currentThreadId = createdId;
            // Auto-open only when auto-save is enabled
            try { _onDocumentSelect(createdId as Id<'documents'>); } catch (e) { void e; }
          } catch (e) {
            console.warn('⚠️ [FRONTEND] Failed to start chat thread document:', e);
          }
        }
        if (currentThreadId) {
          try {
            await appendChatMessage({
              threadDocumentId: currentThreadId,
              role: 'user',
              content: userMessageContent,
              timestamp: Date.now(),
            });
            setSavedMessageIds((prev) => new Set(prev).add(userMessage.id));
          } catch (e) {
            console.warn('⚠️ [FRONTEND] Failed to append user message to thread document:', e);
          }
        }
      } else if (!currentUser) {
        console.warn('⚠️ [FRONTEND] Skipping chat thread persistence: user not authenticated');
      }

      let messageWithContext = synthContext
        ? `Context Summary:\n${synthContext}\n---\nUser Message:\n${userMessageContent}`
        : userMessageContent;

      // If the user says to insert/append/place/put "this section",
      // include the last assistant content verbatim to ensure deterministic insertion.
      if (/\b(insert|append|place|put|add)\b.*\b(this|that|the)\b\s*section\b/i.test(userMessageContent)) {
        const lastAssistant = [...messages].reverse().find(m => m.type === 'assistant');
        if (lastAssistant && lastAssistant.content && lastAssistant.content.trim().length > 0) {
          messageWithContext += `\n\nReference section to insert verbatim at the end of the current document:\n\n\`\`\`md\n${lastAssistant.content}\n\`\`\``;
        }
      }

      // If Thinking mode is enabled, prepend an explicit hint so the backend/agent plans multi-step
      if (thinkingMode) {
        const thinkingHint = [
          'Thinking Mode: enabled',
          'Desired workflow: plan -> gather context (RAG + MCP search) -> re-rank -> instruct -> stream -> self-check -> revise -> persist',
          'Return thinkingSteps for UI when possible.'
        ].join('\n');
        messageWithContext = `${thinkingHint}\n\n${messageWithContext}`;
      }
      const responseText = await chatWithAgent({
        threadId: undefined, // Let backend create/manage threads
        message: messageWithContext,
        selectedDocumentId: selectedDocumentId || undefined, // Convert null to undefined for Convex validation
        model: selectedModel,
        openaiVariant: selectedModel === 'openai' ? openaiVariant : undefined,
        mcpServerId: tavilyServer?._id || undefined // Pass detected Tavily MCP server for web search
      });

      console.log('🎯 [FRONTEND] Got response from backend:', {
        responseText,
        responseType: typeof responseText,
        responseLength: responseText?.length,
        isEmpty: !responseText || responseText.trim() === ''
      });

      // Check if response contains structured data (JSON) with tool calls, artifacts, or document creation
      let actualResponseText = responseText || 'No response received from AI';
      let createdDocumentId: string | null = null;
      let toolCalls: any[] = [];
      let artifacts: any[] = [];
      let thinkingSteps: any[] = [];
      let adaptations: any[] = [];
      let candidateDocs: any[] = [];
      let proposedActionsTopLevel: any[] | undefined;

      try {
        // Try to parse as JSON in case it contains structured response
        const parsedResponse = JSON.parse(responseText);

        // Handle new structured response format with all agent data
        if (parsedResponse.finalResponse !== undefined) {
          actualResponseText = parsedResponse.finalResponse;
          toolCalls = parsedResponse.toolCalls || [];
          artifacts = parsedResponse.artifacts || [];
          thinkingSteps = parsedResponse.thinkingSteps || [];
          adaptations = parsedResponse.adaptations || [];
          candidateDocs = Array.isArray(parsedResponse.candidateDocs) ? parsedResponse.candidateDocs : [];

          console.log('🎯 [FRONTEND] Detected structured response:', {
            text: actualResponseText.substring(0, 100) + '...',
            toolCallsCount: toolCalls.length,
            artifactsCount: artifacts.length,
            thinkingStepsCount: thinkingSteps.length,
            adaptationsCount: adaptations.length
          });

          // Side effects for tool results (openDocument/openDoc, summarizeDocument, editDoc, proposal tools)
          try {
            if (Array.isArray(toolCalls)) {
              const openedDocIds: Id<"documents">[] = [];
              for (const call of toolCalls) {
                const name = call?.name || call?.toolName;
                // Support both backend shapes: result vs output
                const resultPayload = call?.result ?? call?.output ?? call?.data ?? call?.payload;

                // Open/focus document tools
                if ((name === 'openDocument' || name === 'openDoc') && resultPayload?.openedDocumentId) {
                  try {
                    console.log('🎯 [FRONTEND] Opening document from tool result:', {
                      tool: name,
                      docId: resultPayload.openedDocumentId,
                    });
                    _onDocumentSelect(resultPayload.openedDocumentId as Id<"documents">);
                    openedDocIds.push(resultPayload.openedDocumentId as Id<"documents">);
                  } catch (e) {
                    console.warn('⚠️ [FRONTEND] Failed to open document from tool result:', e);
                  }
                  continue;
                }
                if (name === 'summarizeDocument' && resultPayload?.documentId) {
                  try {
                    _onDocumentSelect(resultPayload.documentId as Id<"documents">);
                  } catch (e) {
                    console.warn('⚠️ [FRONTEND] Failed to focus summarized document:', e);
                  }
                  continue;
                }
                if (name === 'editDoc' && resultPayload?.documentId) {
                  try {
                    _onDocumentSelect(resultPayload.documentId as Id<"documents">);
                  } catch (e) {
                    console.warn('⚠️ [FRONTEND] Failed to focus edited document:', e);
                  }
                  // If backend returned the created node id, request the Editor to focus it
                  if (resultPayload?.createdNodeId) {
                    try {
                      const docId = resultPayload.documentId as Id<"documents">;
                      const nodeId = resultPayload.createdNodeId as string;
                      setTimeout(() => {
                        try {
                          window.dispatchEvent(new CustomEvent('nodebench:focusNode', {
                            detail: { documentId: docId, nodeId },
                          }));
                        } catch (e) {
                          console.warn('⚠️ [FRONTEND] Failed to dispatch focusNode event:', e);
                        }
                      }, 120);
                    } catch (e) {
                      console.warn('⚠️ [FRONTEND] Focus created node failed:', e);
                    }
                  }
                  continue;
                }

                // Proposal tools: dispatch event for Editor proposal overlay
                if (name === 'proposeNode' || name === 'proposeUpdateNode') {
                  const obj = (resultPayload && typeof resultPayload === 'object') ? resultPayload : undefined;
                  const actions = Array.isArray(obj?.actions) ? obj.actions : undefined;
                  const message = typeof obj?.message === 'string' ? obj.message : 'AI proposed changes';
                  if (Array.isArray(actions) && actions.length > 0) {
                    try {
                      window.dispatchEvent(new CustomEvent('nodebench:aiProposal', {
                        detail: { actions, message },
                      }));
                      console.log('🎯 [FRONTEND] Dispatched AI proposal to Editor', { count: actions.length, message });
                    } catch (e) {
                      console.warn('⚠️ [FRONTEND] Failed to dispatch AI proposal event:', e);
                    }
                  }
                }
              }

              // If multiple docs were opened in one response, emit an event for grid-capable layouts
              if (openedDocIds.length > 1 && typeof window !== 'undefined') {
                try {
                  window.dispatchEvent(new CustomEvent('ai:openMultipleDocuments', {
                    detail: { documentIds: openedDocIds },
                  }));
                  console.log('🧩 [FRONTEND] Emitted ai:openMultipleDocuments', openedDocIds);
                } catch (e) {
                  console.warn('⚠️ [FRONTEND] Failed to emit ai:openMultipleDocuments:', e);
                }
              }
            }
          } catch (e) {
            console.warn('⚠️ [FRONTEND] Tool side-effect handling failed:', e);
          }
          // Fallback: some agent runs may return a flat shape instead of toolCalls
          if (!Array.isArray(toolCalls) || toolCalls.length === 0) {
            if (parsedResponse.openedDocumentId) {
              console.log('🎯 [FRONTEND] Fallback openDocument from top-level payload:', parsedResponse.openedDocumentId);
              try {
                _onDocumentSelect(parsedResponse.openedDocumentId as Id<"documents">);
              } catch (e) {
                console.warn('⚠️ [FRONTEND] Failed to open document (fallback):', e);
              }
            } else if (parsedResponse.documentId) {
                console.log('🎯 [FRONTEND] Fallback focus document from top-level payload:', parsedResponse.documentId);
                try {
                  _onDocumentSelect(parsedResponse.documentId as Id<"documents">);
                } catch (e) {
                  console.warn('⚠️ [FRONTEND] Failed to focus document (fallback):', e);
                }
                // If a created node id is provided at top-level, also request focus
                if (parsedResponse.createdNodeId) {
                  try {
                    const docId = parsedResponse.documentId as Id<"documents">;
                    const nodeId = parsedResponse.createdNodeId as string;
                    setTimeout(() => {
                      try {
                        window.dispatchEvent(new CustomEvent('nodebench:focusNode', {
                          detail: { documentId: docId, nodeId },
                        }));
                      } catch (e) {
                        console.warn('⚠️ [FRONTEND] Failed to dispatch focusNode event (fallback):', e);
                      }
                    }, 120);
                  } catch (e) {
                    console.warn('⚠️ [FRONTEND] Focus created node failed (fallback):', e);
                  }
                }
            } else if (Array.isArray(parsedResponse.actions) && parsedResponse.actions.length > 0) {
                // Fallback proposal payload at top level
                try {
                  const message = parsedResponse.message || 'AI proposed changes';
                  window.dispatchEvent(new CustomEvent('nodebench:aiProposal', {
                    detail: { actions: parsedResponse.actions, message },
                  }));
                  console.log('🎯 [FRONTEND] Dispatched fallback AI proposal to Editor', { count: parsedResponse.actions.length, message });
                } catch (e) {
                  console.warn('⚠️ [FRONTEND] Failed to dispatch fallback AI proposal event:', e);
                }
                // Also capture into message for visibility and future logic
                proposedActionsTopLevel = parsedResponse.actions;
              }
            }
          }

        // Handle legacy document creation format
        if (parsedResponse.text && parsedResponse.documentCreated) {
          actualResponseText = parsedResponse.text;
          createdDocumentId = parsedResponse.documentCreated.id;
          console.log('🎯 [FRONTEND] Detected document creation:', {
            documentId: createdDocumentId,
            title: parsedResponse.documentCreated.title
          });
        }
      } catch {
        // Not JSON, use response as-is
        console.log('🎯 [FRONTEND] Response is plain text, not structured JSON');
      }

      // Surface failed tool calls via an error banner
      try {
        const failed = Array.isArray(toolCalls)
          ? toolCalls
              .filter((tc: any) => tc && (tc.success === false || !!tc.error || (tc.result && typeof tc.result === 'object' && 'error' in tc.result)))
              .map((tc: any) => ({
                tool: tc.toolName || tc.name || 'Tool',
                message:
                  (tc.error && String(tc.error)) ||
                  (tc.result && typeof tc.result?.error === 'string' ? tc.result.error : 'Tool call failed'),
              }))
          : [];
        if (failed.length > 0) {
          setErrorBanner({ message: 'One or more tools failed', errors: failed, expanded: false });
        } else {
          setErrorBanner(null);
        }
      } catch {
        // no-op if we can't parse errors
      }

      // Create AI response message
      const aiResponseMessage: Message = {
        id: generateUniqueId('assistant'),
        type: 'assistant',
        content: actualResponseText,
        timestamp: new Date(),
        candidateDocs,
        actions: Array.isArray(proposedActionsTopLevel) ? proposedActionsTopLevel : undefined,
      };

      console.log('🎯 [FRONTEND] Created AI response message:', aiResponseMessage);

      // If proposals exist at top-level, ensure the editor overlay opens immediately
      if (Array.isArray(proposedActionsTopLevel) && proposedActionsTopLevel.length > 0) {
        try {
          window.dispatchEvent(new CustomEvent('nodebench:aiProposal', {
            detail: { actions: proposedActionsTopLevel, message: actualResponseText },
          }));
          console.log('🎯 [FRONTEND] Auto-dispatched top-level AI proposal to Editor overlay');
          // Re-dispatch shortly after in case the editor listener wasn't ready yet
          setTimeout(() => {
            try {
              window.dispatchEvent(new CustomEvent('nodebench:aiProposal', {
                detail: { actions: proposedActionsTopLevel, message: actualResponseText },
              }));
              console.log('🎯 [FRONTEND] Re-dispatched AI proposal to Editor overlay');
            } catch (e) {
              console.warn('⚠️ [FRONTEND] Failed to re-dispatch AI proposal overlay:', e);
            }
          }, 200);
        } catch (e) {
          console.warn('⚠️ [FRONTEND] Failed to auto-dispatch AI proposal overlay:', e);
        }
      }

      // Update messages
      console.log('🎯 [FRONTEND] Updating messages state...');
      setMessages(prev => {
        const updated = prev.concat([aiResponseMessage]);
        console.log('🎯 [FRONTEND] Messages updated:', {
          before: prev.length,
          after: updated.length,
          newMessage: aiResponseMessage.content.substring(0, 50) + '...'
        });
        return updated;
      });

      // Update AI node with completion status and detailed data
      updateNodeStatus(aiNodeId, 'completed', {
        content: actualResponseText,
        thinkingSteps,
        toolCalls,
        artifacts,
        adaptations,
        candidateDocs,
        documentCreated: createdDocumentId ? { id: createdDocumentId } : undefined
      });

      // Append the assistant's response to the thread document (only if authenticated)
      if (currentUser && currentThreadId && autoSaveChat) {
        try {
          await appendChatMessage({
            threadDocumentId: currentThreadId,
            role: 'assistant',
            content: actualResponseText,
            timestamp: Date.now(),
            candidateDocs: Array.isArray(candidateDocs) && candidateDocs.length > 0 ? candidateDocs : undefined,
          });
          // Find the just-added assistant message in local state (it's the last we pushed)
          const lastAssistant = aiResponseMessage.id;
          setSavedMessageIds((prev) => new Set(prev).add(lastAssistant));
        } catch (e) {
          console.warn('⚠️ [FRONTEND] Failed to append assistant message to thread document:', e);
        }
      }

      // If a document was created, automatically open it
      if (createdDocumentId) {
        console.log('🎯 [FRONTEND] Auto-opening created document:', createdDocumentId);
        _onDocumentSelect(createdDocumentId as Id<"documents">);
      }
    } catch (error) {
      console.error('🎯 [FRONTEND] Error generating response:', error);
      console.error('🎯 [FRONTEND] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        type: typeof error,
        errorObject: error
      });
      // Show a top-level banner for request errors too
      try {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        setErrorBanner({ message: 'Chat failed', errors: [{ tool: 'chatWithAgent', message: msg }], expanded: false });
      } catch (e) {
        console.debug('⚠️ [FRONTEND] Failed to set error banner', e);
      }

      // Update AI node with error status
      updateNodeStatus(aiNodeId, 'error', {
        content: 'An error occurred while processing the request'
      });

      // Add error message
      console.log('🎯 [FRONTEND] Adding error message to chat');
      setMessages(prev => prev.concat([{
        id: generateUniqueId('error'),
        type: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      }]));
    } finally {
      console.log('🎯 [FRONTEND] Setting isLoading to false');
      setIsLoading(false);
    }
  }, [
    input,
    isLoading,
    selectedDocumentId,
    selectedModel,
    openaiVariant,
    addConversationTurn,
    updateNodeStatus,
    chatWithAgent,
    generateUniqueId,
    buildSynthContext,
    tavilyServer?._id,
    _onDocumentSelect,
    startChatThread,
    appendChatMessage,
    threadDocumentId,
    messages,
    currentUser,
    thinkingMode,
    autoSaveChat,
  ]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  const handleQuickAction = (action: string) => {
    setInput(action);
  };

  // Handle incoming SMS messages - placed after handleSendMessage is defined
  useEffect(() => {
    if (smsMessage && isOpen) {
      const processSms = async () => {
        const messageText = typeof smsMessage === 'object'
          ? ((smsMessage as any).message || String(smsMessage)) :
          String(smsMessage);
        const doIt = window.confirm(`Process incoming SMS in chat?\n\n${messageText}`);
        if (doIt) {
          const prompt = `SMS received: "${messageText}". Please help me respond to this message or take appropriate action.`;
          await handleSendMessage(prompt);
        }
        onSmsMessageProcessed?.();
      };
      void processSms();
    }
  }, [smsMessage, isOpen, handleSendMessage, onSmsMessageProcessed]);

  // Manual save of the entire chat transcript into a thread document
  const handleManualSaveChat = useCallback(async () => {
    if (!currentUser) {
      alert('Please sign in to save chat.');
      return;
    }
    try {
      let currentThreadId = threadDocumentId;
      if (!currentThreadId) {
        const createdId = await startChatThread({
          initialContext: (() => { const c = buildSynthContext(); return c ? `Context Summary:\n${c}` : undefined; })(),
        });
        setThreadDocumentId(createdId);
        currentThreadId = createdId;
      }
      for (const m of messages) {
        if (savedMessageIds.has(m.id)) continue; // skip duplicates already saved
        await appendChatMessage({
          threadDocumentId: currentThreadId!,
          role: m.type,
          content: m.content,
          timestamp: m.timestamp.getTime(),
          candidateDocs: m.type === 'assistant' && Array.isArray(m.candidateDocs) && m.candidateDocs.length > 0 ? m.candidateDocs as any : undefined,
        });
        setSavedMessageIds((prev) => {
          const next = new Set(prev);
          next.add(m.id);
          return next;
        });
      }
      try { _onDocumentSelect(currentThreadId as Id<'documents'>); } catch { /* no-op */ }
      try { toast.success('Chat saved to thread document'); } catch { /* no-op */ }
    } catch (e) {
      console.warn('Failed to save chat transcript', e);
      try { toast.error('Failed to save chat'); } catch { /* no-op */ }
    }
  }, [currentUser, threadDocumentId, messages, startChatThread, appendChatMessage, buildSynthContext, _onDocumentSelect]);

  // Handle quick prompt from MainLayout via prop to avoid race conditions
  useEffect(() => {
    if (!isOpen) return;
    const text = pendingQuickPrompt?.trim();
    if (!text) return;
    setActiveTab('chat');
    void handleSendMessage(text);
    onQuickPromptConsumed?.();
  }, [pendingQuickPrompt, isOpen, handleSendMessage, onQuickPromptConsumed]);

  // Listen for global quick prompts dispatched by other components (e.g., DocumentCards, Planner)
  // Event shape: new CustomEvent('ai:quickPrompt', { detail: { prompt: string, documentId?: string } })
  useEffect(() => {
    const onQuickPrompt = (ev: Event) => {
      try {
        const ce = ev as CustomEvent<{ prompt?: string; documentId?: string }>;
        const text = ce?.detail?.prompt?.trim();
        if (!text) return;
        setActiveTab('chat');
        const docId = ce?.detail?.documentId;
        if (docId) {
          // Focus the requested document before sending, then delay send slightly to allow prop to update
          try {
            _onDocumentSelect(docId as Id<'documents'>);
          } catch (e) {
            console.warn('Failed to focus document from ai:quickPrompt', e);
          }
          setTimeout(() => {
            void handleSendMessage(text);
          }, 75);
        } else {
          void handleSendMessage(text);
        }
      } catch {
        // no-op
      }
    };
    // Cast to EventListener for add/removeEventListener compatibility
    const listener = onQuickPrompt as unknown as EventListener;
    window.addEventListener('ai:quickPrompt', listener);
    return () => {
      window.removeEventListener('ai:quickPrompt', listener);
    };
  }, [handleSendMessage, _onDocumentSelect]);



















  // Detailed turn view component
  const renderTurnDetails = () => {
    if (!selectedTurnDetails) return null;

    return (
      <div className="absolute top-4 right-4 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-96 overflow-y-auto">
        <div className="p-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-medium text-sm">Turn Details</h3>
          <button
            onClick={() => setSelectedTurnDetails(null)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-3 space-y-3">
          {/* Thinking Steps */}
          {selectedTurnDetails.thinkingSteps && selectedTurnDetails.thinkingSteps.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
                <Brain className="h-3 w-3" />
                Thinking Steps ({selectedTurnDetails.thinkingSteps.length})
              </h4>
              <div className="space-y-2">
                {selectedTurnDetails.thinkingSteps.map((step, index) => (
                  <div key={index} className="p-2 bg-purple-50 border border-purple-200 rounded text-xs">
                    <div className="font-medium text-purple-700">{step.type}</div>
                    <p className="text-gray-700 mt-1">{step.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tool Calls */}
          {selectedTurnDetails.toolCalls && selectedTurnDetails.toolCalls.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
                <Wrench className="h-3 w-3" />
                Tool Calls ({selectedTurnDetails.toolCalls.length})
              </h4>
              <div className="space-y-2">
                {selectedTurnDetails.toolCalls.map((tool, index) => (
                  <div key={index} className="p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                    <div className="font-medium text-blue-700">{tool.toolName}</div>
                    <p className="text-gray-700 mt-1">{tool.reasoning}</p>
                    {tool.success ? (
                      <div className="text-green-600 text-xs mt-1">✅ Success</div>
                    ) : (
                      <div className="text-red-600 text-xs mt-1">❌ Failed</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Artifacts */}
          {selectedTurnDetails.artifacts && selectedTurnDetails.artifacts.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Artifacts ({selectedTurnDetails.artifacts.length})
              </h4>
              <div className="space-y-2">
                {selectedTurnDetails.artifacts.map((artifact, index) => (
                  <div key={index} className="p-2 bg-green-50 border border-green-200 rounded text-xs">
                    <div className="font-medium text-green-700">{artifact.title}</div>
                    <div className="text-gray-600">{artifact.type}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Document Created */}
          {selectedTurnDetails.documentCreated && (
            <div className="p-2 bg-indigo-50 border border-indigo-200 rounded text-xs">
              <div className="font-medium text-indigo-700 flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Document Created
              </div>
              <div className="text-gray-700 mt-1">{selectedTurnDetails.documentCreated.title || 'Untitled Document'}</div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="right-panel flex flex-col h-full">
      {/* Header with Tabs */}
      <AIChatPanelHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        autoSaveChat={autoSaveChat}
        setAutoSaveChat={setAutoSaveChat}
        onSaveChat={handleManualSaveChat}
        onClose={onClose}
        isLoading={isLoading}
      />

      {/* Error Banner */}
      <AIChatPanelErrorBanner
        errorBanner={errorBanner}
        onDismiss={() => setErrorBanner(null)}
        onToggleExpanded={() => setErrorBanner((prev) => (prev ? { ...prev, expanded: !prev.expanded } : prev))}
      />

      {/* Flow View */}
      <AIChatPanelFlowView
        activeTab={activeTab}
        flowReady={flowReady}
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        handleNodeClick={handleNodeClick}
        selectedFlowNode={selectedFlowNode}
        setSelectedFlowNode={setSelectedFlowNode}
        selectedTurnDetails={selectedTurnDetails}
        setSelectedTurnDetails={setSelectedTurnDetails}
      />

      {/* Chat View */}
      <AIChatPanelChatView
        activeTab={activeTab}
        selectedDocumentId={selectedDocumentId}
        selectedNodeId={selectedNodeId}
        messages={messages}
        isLoading={isLoading}
        hoveredMessageId={hoveredMessageId}
        setHoveredMessageId={setHoveredMessageId}
        editingMessageId={editingMessageId}
        editingContent={editingContent}
        setEditingContent={setEditingContent}
        handleSaveEdit={handleSaveEdit}
        handleCancelEdit={handleCancelEdit}
        expandedThinking={expandedThinking}
        toggleThinking={toggleThinking}
        renderThinkingStep={renderThinkingStep}
        onDocumentSelect={_onDocumentSelect}
        handleQuickAction={handleQuickAction}
        handleEditMessage={handleEditMessage}
        handleRerunFromMessage={handleRerunFromMessage}
        handleRollbackToMessage={handleRollbackToMessage}
        handleUndoLastResponse={handleUndoLastResponse}
      />





      <div className="p-4 border-t border-[var(--border-color)] sticky bottom-0 bg-[var(--bg-primary)] z-10">
        {/* Proposal UI is handled entirely by the Editor overlay; removed chat-level proposal panel */}
        {/* Model Selection and API Key Configuration */}
        <div className="mb-3 p-2 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
          <div className="flex items-center justify-between gap-2">
            {/* Compact Model Selection */}
            <div className="flex items-center gap-2 flex-1">
              <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                <Brain className="h-3 w-3" />
                <span>Model:</span>
              </div>
              <div className="flex bg-[var(--bg-primary)] rounded-md border border-[var(--border-color)] overflow-hidden">
                <button
                  onClick={() => setSelectedModel("openai")}
                  className={`flex items-center gap-1 px-2 py-1 text-xs transition-colors ${
                    selectedModel === "openai"
                      ? "bg-[var(--accent-primary)] text-white"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                  }`}
                >
                  <Sparkles className="h-3 w-3" />
                  GPT-5
                </button>
                <button
                  onClick={() => setSelectedModel("gemini")}
                  className={`flex items-center gap-1 px-2 py-1 text-xs transition-colors ${
                    selectedModel === "gemini"
                      ? "bg-[var(--accent-primary)] text-white"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                  }`}
                >
                  <Zap className="h-3 w-3" />
                  Gemini
                </button>
              </div>
            </div>

            {/* Model Info + API Key Toggles */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowLlmInfo((v) => !v)}
                className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors ${
                  showLlmInfo
                    ? "bg-[var(--accent-secondary)] text-white"
                    : "bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
                }`}
                title="Show model details"
              >
                <Info className="h-3 w-3" />
                {showLlmInfo ? "Hide" : "Info"}
              </button>
              <button
                onClick={() => setShowApiKeys(!showApiKeys)}
                className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors ${
                  showApiKeys
                    ? "bg-[var(--accent-primary)] text-white"
                    : "bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
                }`}
                title="Configure API Keys"
              >
                <Key className="h-3 w-3" />
                {showApiKeys ? "Hide" : "Keys"}
              </button>
              {/* Thinking Mode Toggle */}
              <button
                onClick={() => setThinkingMode((v) => !v)}
                className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors ${
                  thinkingMode
                    ? 'bg-purple-600 text-white shadow-sm animate-pulse'
                    : 'bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]'
                }`}
                aria-pressed={thinkingMode}
                title="Enable multi-step planning and tool-use (Alt+T)"
              >
                <Brain className="h-3 w-3" />
                {thinkingMode ? 'Thinking' : 'Think'}
              </button>
              {/* Screen reader announcement for Thinking mode */}
              <div className="sr-only" aria-live="polite" aria-atomic="true">
                {thinkingMode ? 'Thinking mode enabled' : 'Thinking mode disabled'}
              </div>
            </div>
          </div>

          {/* API Key Configuration */}
          {showApiKeys && (
            <div className="mt-3 space-y-3 pt-3 border-t border-[var(--border-color)]">
              {/* OpenAI API Key */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[var(--text-primary)]">OpenAI API Key</label>
                  <button
                    onClick={() => setShowApiKeyInput(prev => ({...prev, openai: !prev.openai}))}
                    className="flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    {showApiKeyInput.openai ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {showApiKeyInput.openai ? 'Hide' : 'Show'}
                  </button>
                </div>
                {showApiKeyInput.openai && (
                  <input
                    type="password"
                    value={apiKeys.openai}
                    onChange={(e) => setApiKeys(prev => ({...prev, openai: e.target.value}))}
                    placeholder="sk-..."
                    className="w-full px-2 py-1 text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] text-[var(--text-primary)]"
                  />
                )}
                <p className="text-xs text-[var(--text-muted)]">
                  {apiKeys.openai ? '✅ Custom OpenAI key configured' : '🔄 Using default key (limited usage)'}
                </p>
              </div>
            </div>
          )}

          {/* LLM Info Panel */}
          {showLlmInfo && (
            <div className="mt-3 p-2 bg-[var(--bg-primary)] rounded-md border border-[var(--border-color)]">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-[var(--text-secondary)]">
                  <span className="font-medium text-[var(--text-primary)]">{llmInfo.provider}</span>
                  <span className="mx-1">•</span>
                  <span>{llmInfo.model}</span>
                </div>
                {selectedModel === 'openai' && (
                  <div className="flex items-center bg-[var(--bg-secondary)] rounded-md border border-[var(--border-color)] overflow-hidden">
                    <button
                      onClick={() => setOpenaiVariant('gpt-5-nano')}
                      className={`px-2 py-1 text-xs ${openaiVariant === 'gpt-5-nano' ? 'bg-[var(--accent-primary)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
                    >
                      nano
                    </button>
                    <button
                      onClick={() => setOpenaiVariant('gpt-5-mini')}
                      className={`px-2 py-1 text-xs ${openaiVariant === 'gpt-5-mini' ? 'bg-[var(--accent-primary)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
                    >
                      mini
                    </button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                <div className="flex items-center gap-1">
                  <Brain className="h-3 w-3" />
                  <span className="text-[var(--text-secondary)]">Capabilities:</span>
                  <span className="text-[var(--text-primary)]">Chat, Tool Calls{Array.isArray(servers) && servers.length ? ', Search (MCP)' : ''}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Wrench className="h-3 w-3" />
                  <span className="text-[var(--text-secondary)]">Tool calls:</span>
                  <span className="text-[var(--text-primary)]">{llmInfo.toolCalls.join(', ')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <ServerIcon className="h-3 w-3" />
                  <span className="text-[var(--text-secondary)]">MCP:</span>
                  <span className="text-[var(--text-primary)]">
                    {llmInfo.mcp.servers ? `${llmInfo.mcp.servers} server${llmInfo.mcp.servers > 1 ? 's' : ''}` : 'none'}
                    {llmInfo.mcp.tools ? `, ${llmInfo.mcp.tools} tools` : ''}
                    {mcpConnecting ? ' (connecting...)' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Upload className="h-3 w-3" />
                  <span className="text-[var(--text-secondary)]">File input:</span>
                  <span className="text-[var(--text-primary)]">{llmInfo.fileSupport}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Context section (toggle) - Chat tab only */}
        <div className={`mt-3 ${activeTab === 'chat' ? '' : 'hidden'}`}>
          <button
            id="context-section-button"
            onClick={() => setShowContext((v) => !v)}
            className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded transition-colors"
            aria-expanded={showContext}
            aria-controls="context-pills-panel"
            title={`Docs in context: ${contextCounts.docsSel} / ${contextCounts.docsTotal} • Files in context: ${contextCounts.filesSel} / ${contextCounts.filesTotal}`}
          >
            {showContext ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            <span className="text-[var(--text-secondary)]">
              <span className="text-[var(--text-primary)] font-medium">AI Context</span>
              <span className="mx-1">•</span>
              Docs {contextCounts.docsSel}/{contextCounts.docsTotal} in context
              <span className="mx-1">•</span>
              Files {contextCounts.filesSel}/{contextCounts.filesTotal} in context
            </span>
          </button>
          {showContext && (
            <div id="context-pills-panel" className="mt-2 space-y-2">
              <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide">Selected for Chat</div>
              <div className="flex items-center flex-wrap gap-1">
                {selectedContextDocumentIds.map((docId) => {
                  const doc = availableDocuments?.find(d => d._id === docId);
                  if (!doc) return null;
                  const isEditing = editingItemId === (docId as unknown as string);
                  if (isEditing) {
                    return (
                      <div key={`doc-edit-${docId}`} className="inline-flex items-center gap-1">
                        <input
                          autoFocus
                          value={editingItemName}
                          onChange={(e) => setEditingItemName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (!editCommittedRef.current) {
                                editCommittedRef.current = true;
                                void _saveEdit(docId as unknown as string, editingItemName);
                              }
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              setEditingItemId(null);
                            }
                          }}
                          onBlur={() => {
                            if (!editCommittedRef.current) {
                              editCommittedRef.current = true;
                              void _saveEdit(docId as unknown as string, editingItemName);
                            }
                            setTimeout(() => { editCommittedRef.current = false; }, 0);
                          }}
                          className="px-2 py-1 text-xs rounded border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
                        />
                      </div>
                    );
                  }
                  return (
                    <div key={`doc-${docId}`} className="inline-flex items-center gap-1">
                      <ContextPill
                        id={docId}
                        title={doc.title}
                        type="document"
                        metadata={{
                          createdAt: doc._creationTime,
                          nodeCount: (doc as any).nodeCount || 0,
                          wordCount: (doc as any).wordCount || 0,
                        }}
                        onRemove={() => handleDocumentContextToggle(docId)}
                      />
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          editCommittedRef.current = false;
                          startEditing(docId as unknown as string, doc.title);
                        }}
                        className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
                        title="Rename document"
                        aria-label="Rename document"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
                {/* File Context Pills */}
                {selectedContextFileIds.map((fileId) => {
                  const enriched = selectedFilesBasic?.find((f: any) => f._id === fileId);
                  const fallback = availableFiles?.find((f: any) => f._id === fileId);
                  const fileAny: any = enriched ?? fallback;
                  if (!fileAny) return null;
                  const isEditing = editingItemId === (fileId as unknown as string);
                  if (isEditing) {
                    return (
                      <div key={`file-edit-${fileId}`} className="inline-flex items-center gap-1">
                        <input
                          autoFocus
                          value={editingItemName}
                          onChange={(e) => setEditingItemName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (!editCommittedRef.current) {
                                editCommittedRef.current = true;
                                void _saveEdit(fileId as unknown as string, editingItemName);
                              }
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              setEditingItemId(null);
                            }
                          }}
                          onBlur={() => {
                            if (!editCommittedRef.current) {
                              editCommittedRef.current = true;
                              void _saveEdit(fileId as unknown as string, editingItemName);
                            }
                            setTimeout(() => { editCommittedRef.current = false; }, 0);
                          }}
                          className="px-2 py-1 text-xs rounded border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
                        />
                      </div>
                    );
                  }
                  return (
                    <div key={`file-${fileId}`} className="inline-flex items-center gap-1">
                      <ContextPill
                        id={fileId}
                        title={fileAny.fileName}
                        type="file"
                        metadata={{
                          createdAt: fileAny._creationTime,
                          size: fileAny.fileSize ?? fileAny.size,
                          mimeType: fileAny.mimeType,
                          analyzedAt: fileAny.analyzedAt,
                        }}
                        onRemove={() => handleFileContextToggle(fileId)}
                      />
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          editCommittedRef.current = false;
                          startEditing(fileId as unknown as string, fileAny.fileName);
                        }}
                        className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
                        title="Rename file"
                        aria-label="Rename file"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
                {/* UI Interface Guide Pill */}
                {uiInfo?.summary && (
                  <ContextPill
                    key="ui-info"
                    id="ui-info"
                    title="Interface Guide"
                    type="document"
                    metadata={{}}
                    details={uiInfo.summary}
                    onRemove={() => setUiInfo({ summary: '' })}
                  />
                )}
                {/* Clear All Button */}
                {(selectedContextDocumentIds.length > 0 || selectedContextFileIds.length > 0) && (
                  <button
                    onClick={clearContextSelection}
                    className="ml-1 flex items-center gap-1 px-2 py-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded transition-colors"
                    title="Clear all context"
                  >
                    <X className="h-3 w-3" />
                    Clear All
                  </button>
                )}
              </div>

              {/* Unauthenticated metadata note */}
              {!currentUser && selectedContextFileIds.length > 0 && (
                <div className="text-[11px] text-gray-500 italic">
                  Limited file details shown. Sign in to view full metadata.
                </div>
              )}

              {/* Contextual Actions based on selections */}
              {(selectedContextDocumentIds.length > 0 || selectedContextFileIds.length > 0) && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedContextDocumentIds.length > 0 && (
                    <>
                      <button
                        onClick={handleSummarizeSelectedDocs}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                        title="Summarize the selected documents"
                      >
                        <Sparkles className="h-3 w-3" /> Summarize selected docs
                      </button>
                      {selectedContextDocumentIds.length > 1 && (
                        <button
                          onClick={handleCompareSelectedDocs}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                          title="Compare the selected documents"
                        >
                          <FileText className="h-3 w-3" /> Compare docs
                        </button>
                      )}
                    </>
                  )}
                  {selectedContextFileIds.length > 1 && (
                    <button
                      onClick={handleCompareSelectedFiles}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                      title="Compare the selected files"
                    >
                      <FileCheck className="h-3 w-3" /> Compare files
                    </button>
                  )}
                </div>
              )}

              {/* Divider */}
              <div className="border-t border-[var(--border-color)]" />

              {/* Quick Select: Documents */}
              {availableDocuments && availableDocuments.length > 0 && (
                <div>
                  <button
                    className="flex items-center gap-1 text-xs text-[var(--text-secondary)] mb-1 hover:text-[var(--text-primary)]"
                    onClick={() => toggleGroupExpansion('documents')}
                    aria-expanded={expandedGroups.has('documents')}
                  >
                    {expandedGroups.has('documents') ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                    <span>Docs in Context {contextCounts.docsSel}/{contextCounts.docsTotal}</span>
                  </button>
                  {expandedGroups.has('documents') && (
                    <div className="flex flex-wrap gap-1">
                      {availableDocuments.slice(0, 12).map((doc) => {
                        const isSelected = selectedContextDocumentIds.includes(doc._id);
                        const isEditing = editingItemId === (doc._id as unknown as string);
                        if (isEditing) {
                          return (
                            <div key={doc._id} className="inline-flex items-center gap-1">
                              <input
                                autoFocus
                                value={editingItemName}
                                onChange={(e) => setEditingItemName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (!editCommittedRef.current) {
                                      editCommittedRef.current = true;
                                      void _saveEdit(doc._id as unknown as string, editingItemName);
                                    }
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    setEditingItemId(null);
                                  }
                                }}
                                onBlur={() => {
                                  if (!editCommittedRef.current) {
                                    editCommittedRef.current = true;
                                    void _saveEdit(doc._id as unknown as string, editingItemName);
                                  }
                                  setTimeout(() => { editCommittedRef.current = false; }, 0);
                                }}
                                className="px-2 py-1 text-xs rounded border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
                              />
                            </div>
                          );
                        }
                        return (
                          <button
                            key={doc._id}
                            onClick={() => handleDocumentContextToggle(doc._id)}
                            onDoubleClick={(e) => {
                              e.preventDefault();
                              editCommittedRef.current = false;
                              startEditing(doc._id as unknown as string, doc.title);
                            }}
                            className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded border transition-colors ${
                              isSelected
                                ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]'
                                : 'bg-[var(--bg-primary)] text-[var(--text-primary)] border-[var(--border-color)] hover:border-[var(--accent-primary)]'
                            }`}
                            title={doc.title}
                          >
                            <FileIcon fileType={getSpecificFileType(doc.title)} className="h-3 w-3" />
                            <span className="truncate max-w-[120px]">{doc.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Divider between Documents and Files */}
              {availableDocuments && availableDocuments.length > 0 && availableFiles && availableFiles.length > 0 && (
                <div className="border-t border-[var(--border-color)]" />
              )}

              {/* Quick Select: Files */}
              {availableFiles && availableFiles.length > 0 && (
                <div>
                  <button
                    className="flex items-center gap-1 text-xs text-[var(--text-secondary)] mb-1 hover:text-[var(--text-primary)]"
                    onClick={() => toggleGroupExpansion('files')}
                    aria-expanded={expandedGroups.has('files')}
                  >
                    {expandedGroups.has('files') ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                    <span>Files in Context {contextCounts.filesSel}/{contextCounts.filesTotal}</span>
                  </button>
                  {expandedGroups.has('files') && (
                    <div className="flex flex-wrap gap-1">
                      {availableFiles.slice(0, 12).map((file) => {
                        const isSelected = selectedContextFileIds.includes(file._id);
                        const isEditing = editingItemId === (file._id as unknown as string);
                        if (isEditing) {
                          return (
                            <div key={file._id} className="inline-flex items-center gap-1">
                              <input
                                autoFocus
                                value={editingItemName}
                                onChange={(e) => setEditingItemName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (!editCommittedRef.current) {
                                      editCommittedRef.current = true;
                                      void _saveEdit(file._id as unknown as string, editingItemName);
                                    }
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    setEditingItemId(null);
                                  }
                                }}
                                onBlur={() => {
                                  if (!editCommittedRef.current) {
                                    editCommittedRef.current = true;
                                    void _saveEdit(file._id as unknown as string, editingItemName);
                                  }
                                  setTimeout(() => { editCommittedRef.current = false; }, 0);
                                }}
                                className="px-2 py-1 text-xs rounded border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
                              />
                            </div>
                          );
                        }
                        return (
                          <button
                            key={file._id}
                            onClick={() => handleFileContextToggle(file._id)}
                            onDoubleClick={(e) => {
                              e.preventDefault();
                              editCommittedRef.current = false;
                              startEditing(file._id as unknown as string, file.fileName);
                            }}
                            className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded border transition-colors ${
                              isSelected
                                ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]'
                                : 'bg-[var(--bg-primary)] text-[var(--text-primary)] border-[var(--border-color)] hover:border-[var(--accent-primary)]'
                            }`}
                            title={file.fileName}
                          >
          <AIChatPanelInput
            input={input}
            onChangeInput={setInput}
            onKeyPress={handleKeyPress}
            placeholder={getPlaceholderText(selectedModel, selectedDocumentId)}
            isLoading={isLoading}
            onSend={() => void handleSendMessage()}
            onFilesDrop={(files) => {
              const { validFiles, invalidFiles } = filterFilesByModel(files, selectedModel);
              if (invalidFiles.length > 0) {
                console.warn(`${selectedModel.toUpperCase()} doesn't support:`, invalidFiles.map(f => f.name));
              }
              if (validFiles.length > 0) {
                const fileNames = validFiles.map(f => f.name).join(', ');
                setInput(prev => prev + (prev ? ' ' : '') + `[File: ${fileNames}]`);
              }
            }}
          />

                            <FileIcon fileType={getSpecificFileType(file.fileName)} className="h-3 w-3" />
                            <span className="truncate max-w-[120px]">{file.fileName}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Existing higher-level context pills (focused/viewing/MCP) */}
              <ContextPills inline />
            </div>
          )}
        </div>

        {/* MCP Integration Panel (Chat tab only) */}
        {activeTab === 'chat' && showMcpPanel && (
          <div className="border border-[var(--border-color)] rounded-md p-2 mb-2 bg-[var(--bg-secondary)]/30">
            <EnhancedMcpPanel onClose={() => onToggleMcpPanel?.()} />
          </div>
        )}

        {/* Chat Input with Model-Aware Upload Support (Chat tab only) */}
        <div className={`${activeTab === 'chat' ? '' : 'hidden'} space-y-2`}>
          {/* Text Input Row - Full Width */}
          <AIChatPanelInput
            input={input}
            onChangeInput={setInput}
            onKeyPress={handleKeyPress}
            placeholder={getPlaceholderText(selectedModel, selectedDocumentId)}
            isLoading={isLoading}
            onSend={() => void handleSendMessage()}
            onFilesDrop={(files) => {
              const { validFiles, invalidFiles } = filterFilesByModel(files, selectedModel);
              if (invalidFiles.length > 0) {
                console.warn(`${selectedModel.toUpperCase()} doesn't support:`, invalidFiles.map(f => f.name));
              }
              if (validFiles.length > 0) {
                const fileNames = validFiles.map(f => f.name).join(', ');
                setInput(prev => prev + (prev ? ' ' : '') + `[File: ${fileNames}]`);
              }
            }}
          />

          {false && (<div className="flex gap-2">
            <div
              className="flex-1 relative"
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const files = Array.from(e.dataTransfer.files);
                if (files.length > 0) {
                  const { validFiles, invalidFiles } = filterFilesByModel(files, selectedModel);

                  if (invalidFiles.length > 0) {
                    // Show warning for unsupported files
                    console.warn(`${selectedModel.toUpperCase()} doesn't support:`, invalidFiles.map(f => f.name));
                    // Optionally show a toast or inline warning
                  }

                  if (validFiles.length > 0) {
                    const fileNames = validFiles.map(f => f.name).join(', ');
                    setInput(prev => prev + (prev ? ' ' : '') + `[File: ${fileNames}]`);
                  }
                }
              }}
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={getPlaceholderText(selectedModel, selectedDocumentId)}
                className="w-full px-3 py-2 border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                disabled={isLoading}
              />
            </div>

            <button
              onClick={() => void handleSendMessage()}
              disabled={!input.trim() || isLoading}
              className="px-3 py-2 bg-[var(--accent-primary)] text-white rounded-md hover:bg-[var(--accent-primary-hover)] disabled:opacity-50 transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>)}

          {/* Controls Row - Below Input */}
          <div className="flex gap-2 items-center">
            <button
              onClick={() => {
                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.accept = getAcceptedFileTypes(selectedModel);
                fileInput.onchange = (e) => {
                  const files = Array.from((e.target as HTMLInputElement).files || []);
                  if (files.length > 0) {
                    const fileNames = files.map(f => f.name).join(', ');
                    setInput(prev => (prev ? prev + ' ' : '') + `[File: ${fileNames}]`);
                  }
                };
                fileInput.click();
              }}
              className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--accent-secondary)] hover:bg-[var(--accent-secondary)]/10 rounded transition-colors border border-transparent hover:border-[var(--accent-secondary)]/20"
              title={getUploadTooltip(selectedModel)}
              disabled={isLoading}
            >
              {selectedModel === 'gemini' ? (
                <Upload className="h-3.5 w-3.5" />
              ) : (
                <ImageIcon className="h-3.5 w-3.5" />
              )}
            </button>

            {/* MCP Server Selector */}
            <AIChatPanelMcpSelector
              servers={servers}
              mcpSessionId={mcpSessionId}
              onSelectServer={selectServer}
              showMcpPanel={showMcpPanel}
              onToggleMcpPanel={onToggleMcpPanel}
              toolsCount={tools?.length ?? 0}
              isLoading={isLoading}
            />

            {/* Developer Tools - Hidden in production */}
            {process.env.NODE_ENV === 'development' && (
              <details className="ml-2 inline-block">
                <summary className="px-2 py-1 text-xs border border-[var(--border-color)] rounded hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] cursor-pointer">
                  Dev Tools
                </summary>
                <div className="absolute right-0 mt-1 p-2 bg-white border border-[var(--border-color)] rounded shadow-lg z-50 flex flex-col gap-1">
                  <button
                    onClick={() => {
                      const actions = [{ type: 'updateNode', nodeId: (selectedNodeId as any) || undefined, markdown: 'Test: Replace block\n\n- old\n+ new' }];
                      window.dispatchEvent(new CustomEvent('nodebench:aiProposal', { detail: { actions, message: 'Test: Replace' } }));
                    }}
                    className="px-2 py-1 text-xs border border-[var(--border-color)] rounded hover:bg-[var(--bg-hover)] whitespace-nowrap"
                  >
                    Test Replace Block
                  </button>
                  <button
                    onClick={() => {
                      const actions = [{ type: 'createNode', markdown: '## Test Insert\nInserted below current block.' }];
                      window.dispatchEvent(new CustomEvent('nodebench:aiProposal', { detail: { actions, message: 'Test: Insert' } }));
                    }}
                    className="px-2 py-1 text-xs border border-[var(--border-color)] rounded hover:bg-[var(--bg-hover)] whitespace-nowrap"
                  >
                    Test Insert Below
                  </button>
                  <button
                    onClick={() => {
                      const id = generateUniqueId('assistant');
                      const thinkingSteps: ThinkingStep[] = [
                        { type: 'thinking', content: 'Analyzing...', timestamp: new Date() },
                        { type: 'tool_call', content: 'Calling tool', timestamp: new Date(), toolCall: { name: 'proposeNode', args: {} } },
                      ];
                      setMessages((prev) => prev.concat({ id, type: 'assistant', content: 'Test thinking', timestamp: new Date(), thinkingSteps, isThinking: false }));
                    }}
                    className="px-2 py-1 text-xs border border-[var(--border-color)] rounded hover:bg-[var(--bg-hover)] whitespace-nowrap"
                  >
                    Test Thinking
                  </button>
                  <button
                    onClick={() => {
                      const id = generateUniqueId('assistant');
                      const candidateDocs = [
                        { documentId: 'mock-1' as any, title: 'Mock Doc', score: 0.9, snippet: 'Test...', source: 'RAG' },
                      ];
                      setMessages((prev) => prev.concat({ id, type: 'assistant', content: 'Test RAG', timestamp: new Date(), candidateDocs }));
                    }}
                    className="px-2 py-1 text-xs border border-[var(--border-color)] rounded hover:bg-[var(--bg-hover)] whitespace-nowrap"
                  >
                    Test RAG
                  </button>
                </div>
              </details>
            )}
          </div>
        </div>
        <p className={`${activeTab === 'chat' ? '' : 'hidden'} text-xs text-[var(--text-muted)] mt-2`}>
          {selectedDocumentId ?
            selectedNodeId ? "Try: \"expand this section\"" : "Try: \"add a section about...\"" :
            "Try: \"create a document about...\""
          }
        </p>
      </div>
    </div>
  );
}