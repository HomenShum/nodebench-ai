// Agent Workflow Panel component

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useMcp } from "../hooks/useMcp";
import { useContextPills } from "../hooks/contextPills";
import { useQuery, useMutation, useAction, useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  Handle,
  Position,
  NodeTypes,
  MarkerType,
  BackgroundVariant
} from 'reactflow';
import 'reactflow/dist/style.css';
import type { NodeProps } from 'reactflow';

import {
  Send,
  Server as ServerIcon,
  FileText,
  Search,
  Edit3,
  Plus,
  CheckCircle,
  AlertCircle,
  Brain,
  Wrench,
  Loader2,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  X,
  Sparkles,
  Zap,
  Key,
  Eye,
  EyeOff,
  Edit2,
  ArrowUp,
  Undo2,
  Check,
  Trash2,
  Upload,
  Image as ImageIcon,
  Hash,
  Settings,
  FileCheck,
  Calendar,
  User,
  Bot,
  Activity,
  Info,
  Save
} from 'lucide-react';

import { toast } from "sonner";

import { ContextPills } from "./ContextPills";
import { FileTypeIcon } from "./FileTypeIcon";
import { inferFileType, type FileType } from "../lib/fileTypes";
import { EnhancedMcpPanel } from "./EnhancedMcpPanel";
import { AIChatPanelInput } from "./AIChatPanel/AIChatPanel.Input";

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
  // Visual density: minimal hides advanced controls by default
  variant?: 'minimal' | 'full';
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
  planExplain?: string;
  plan?: any;
  runId?: string;
}

interface ConversationTurnData {
  messageId: string;
  type: 'user' | 'assistant';
  title: string;
  content: string;
  timestamp: Date;
  status: 'active' | 'completed' | 'error';
  // Detailed process info for AI turns
  thinkingSteps?: any[];
  toolCalls?: any[];
  artifacts?: any[];
  adaptations?: any[];
  candidateDocs?: any[];
  documentCreated?: any;
}

// Context Pill Component for showing selected documents/files
interface ContextPillProps {
  id: string;
  title: string;
  type: 'document' | 'file';
  metadata: {



    createdAt?: number;
    nodeCount?: number;
    wordCount?: number;
    size?: number;
    mimeType?: string;
    analyzedAt?: number;
  };
  details?: string;
  onRemove: () => void;
}

const ContextPill: React.FC<ContextPillProps> = ({ id, title, type, metadata, details, onRemove }) => {
  const [showPopover, setShowPopover] = useState(false);
  const [hovered, setHovered] = useState(false);
  const pillRef = useRef<HTMLDivElement>(null);
  const iconType: FileType = type === 'document'
    ? inferFileType({ name: title, isNodebenchDoc: true })
    : inferFileType({ name: title, mimeType: metadata?.mimeType });

  // Optional raw content preview (document-only) — defer query until hover for performance
  const convex = useConvex();
  const [previewText, setPreviewText] = useState<string | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    async function fetchPreview() {
      try {
        if (hovered && type === 'document') {
          const nodes = await convex.query(api.nodes.by_document, { docId: id as any });
          if (cancelled) return;
          if (Array.isArray(nodes) && nodes.length > 0) {
            const txt = (nodes as any[])
              .map(n => (n && typeof (n as any).text === 'string') ? (n as any).text : '')
              .filter(Boolean)
              .join('\n\n')



              .slice(0, 400);
            setPreviewText(txt && txt.trim().length ? txt : undefined);
          } else {
            setPreviewText(undefined);
          }
        } else {
          setPreviewText(undefined);
        }
      } catch {
        if (!cancelled) setPreviewText(undefined);
      }
    }
    void fetchPreview();
    return () => { cancelled = true; };
  }, [hovered, type, id, convex]);

  const formatBytes = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Unknown date';
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="relative" ref={pillRef}>
      <div
        className="flex items-center gap-1 px-2 py-1 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] rounded-full text-xs border border-[var(--accent-primary)]/20 hover:bg-[var(--accent-primary)]/20 transition-colors cursor-pointer relative"
        onClick={() => setShowPopover(!showPopover)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title={`Click to view details for ${title}`}
      >
        {hovered && previewText && (
          <div className="absolute left-0 top-full mt-1 z-20 max-w-[60vw] sm:max-w-[40vw] p-2 bg-[var(--bg-primary)] border border-[var(--border-color)] shadow rounded text-[11px] text-[var(--text-secondary)] whitespace-pre-wrap">
            {previewText}
          </div>
        )}
        <FileTypeIcon type={iconType} className="h-3 w-3" />
        <span className="truncate max-w-[80px]">{title}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="flex items-center justify-center w-4 h-4 rounded-full hover:bg-[var(--accent-primary)]/30 transition-colors"
          title="Remove from context"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      </div>

      {/* Popover */}
      {showPopover && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowPopover(false)}
          />
          <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-3">
            <div className="flex items-center gap-2 mb-2">
              <FileTypeIcon type={iconType} className="h-4 w-4" />
              <span className="font-medium text-sm text-gray-800">{title}</span>
            </div>

            <div className="space-y-1 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Type:</span>
                <span className="font-medium">{type === 'document' ? 'Document' : 'File'}</span>
              </div>

              {metadata.createdAt && (
                <div className="flex justify-between">
                  <span>Created:</span>
                  <span className="font-medium">{formatDate(metadata.createdAt)}</span>
                </div>
              )}

              {type === 'document' && (
                <>
                  {metadata.nodeCount !== undefined && (
                    <div className="flex justify-between">
                      <span>Sections:</span>
                      <span className="font-medium">{metadata.nodeCount}</span>
                    </div>
                  )}
                  {metadata.wordCount !== undefined && (
                    <div className="flex justify-between">
                      <span>Words:</span>
                      <span className="font-medium">{metadata.wordCount.toLocaleString()}</span>
                    </div>
                  )}
                </>
              )}

              {type === 'file' && (
                <>
                  {metadata.size && (
                    <div className="flex justify-between">
                      <span>Size:</span>
                      <span className="font-medium">{formatBytes(metadata.size)}</span>
                    </div>
                  )}
                  {metadata.mimeType && (
                    <div className="flex justify-between">
                      <span>Type:</span>
                      <span className="font-medium">{metadata.mimeType}</span>
                    </div>
                  )}
                  {metadata.analyzedAt && (
                    <div className="flex justify-between">
                      <span>Analyzed:</span>
                      <span className="font-medium">{formatDate(metadata.analyzedAt)}</span>
                    </div>
                  )}
                </>
              )}
            </div>
            {details && (
              <div className="mt-2 text-xs text-gray-700 whitespace-pre-wrap max-h-40 overflow-auto">
                {details}
              </div>
            )}

            {type === 'document' && (
              <div className="mt-2">
                <button
                  onClick={async () => {
                    try {
                      const nodes = await convex.query(api.nodes.by_document, { docId: id as any });
                      const text = Array.isArray(nodes)
                        ? (nodes as any[])
                            .map(n => (n && typeof (n as any).text === 'string') ? (n as any).text : '')
                            .filter(Boolean)
                            .join('\n\n')
                        : '';
                      window.dispatchEvent(new CustomEvent('nodebench:showRawPreview', { detail: { title, text } }));
                    } catch { /* ignore */ }
                    setShowPopover(false);
                  }}
                  className="flex items-center gap-1 w-full px-2 py-1 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded transition-colors"
                >
                  Show full raw
                </button>
              </div>
            )}

            <div className="mt-3 pt-2 border-t border-gray-200">
              <button
                onClick={() => {
                  onRemove();
                  setShowPopover(false);
                }}
                className="flex items-center gap-1 w-full px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
              >
                <X className="h-3 w-3" />
                Remove from context
              </button>
            </div>
          </div>
        </>
      )}


    </div>
  );
};

// Compact React Flow Node Component
const ConversationTurnNode = ({ data, selected }: NodeProps<ConversationTurnData>) => {
  const isUser = data.type === 'user';
  const hasDetails = (data.thinkingSteps?.length || 0) > 0 || (data.toolCalls?.length || 0) > 0 || (data.artifacts?.length || 0) > 0;

  const getStatusColor = () => {
    switch (data.status) {
      case 'completed': return isUser ? '#3b82f6' : '#10b981'; // blue for user, green for completed AI
      case 'error': return '#ef4444'; // red
      case 'active': return '#f59e0b'; // amber
      default: return '#6b7280'; // gray
    }
  };

  const statusColor = getStatusColor();
  const isActive = data.status === 'active';

  return (
    <div
      className={`bg-white rounded-lg shadow-md border-2 p-3 min-w-[180px] max-w-[250px] transition-all duration-200 hover:shadow-lg ${
        isActive ? 'animate-pulse' : ''
      } ${hasDetails ? 'cursor-pointer hover:scale-105' : ''} ${selected ? 'ring-2 ring-[var(--accent-primary)] ring-offset-2 ring-offset-white' : ''}`}
      style={{ borderColor: statusColor }}
    >
      <Handle type="target" position={Position.Left} style={{ background: statusColor }} />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center gap-1">
          {isUser ? (
            <User className="h-4 w-4" style={{ color: statusColor }} />
          ) : (
            <Bot className="h-4 w-4" style={{ color: statusColor }} />
          )}
          <span className="font-medium text-sm text-gray-800">
            {isUser ? 'User' : 'Assistant'}
          </span>
        </div>

        {/* Activity indicator for AI with details */}
        {!isUser && hasDetails && (
          <div className="flex items-center gap-1 ml-auto">
            <Activity className="h-3 w-3 text-gray-500" />
            <span className="text-xs text-gray-500">
              {(data.thinkingSteps?.length || 0) + (data.toolCalls?.length || 0)}
            </span>
          </div>
        )}
      </div>

      {/* Content Preview */}
      <div className="text-xs text-gray-600 mb-2 line-clamp-3">
        {data.content.substring(0, 120)}
        {data.content.length > 120 && '...'}
      </div>

      {/* Process Summary for AI nodes */}
      {!isUser && hasDetails && (
        <div className="flex flex-wrap gap-1 mb-2">
          {data.thinkingSteps && data.thinkingSteps.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
              <Brain className="h-2.5 w-2.5" />
              {data.thinkingSteps.length}
            </span>
          )}
          {data.toolCalls && data.toolCalls.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
              <Wrench className="h-2.5 w-2.5" />
              {data.toolCalls.length}
            </span>
          )}
          {data.artifacts && data.artifacts.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
              <FileText className="h-2.5 w-2.5" />
              {data.artifacts.length}
            </span>
          )}
        </div>
      )}

      {/* Document creation indicator */}
      {data.documentCreated && (
        <div className="flex items-center gap-1 mb-2 px-2 py-1 bg-indigo-50 rounded">
          <FileText className="h-3 w-3 text-indigo-600" />
          <span className="text-xs text-indigo-700 font-medium">Doc Created</span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs">
        <span className={`font-medium ${
          data.status === 'completed' ? 'text-green-600' :
          data.status === 'error' ? 'text-red-600' :
          data.status === 'active' ? 'text-amber-600' :
          'text-gray-500'
        }`}>
          {data.status === 'active' ? 'Processing...' :
           data.status === 'error' ? 'Error' :
           data.status === 'completed' ? 'Complete' : 'Ready'}
        </span>
        <span className="text-gray-400">
          {data.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <Handle type="source" position={Position.Right} style={{ background: statusColor }} />
    </div>
  );
};


// Live streaming view of an agent run (Convex subscriptions)
export const AgentRunStream: React.FC<{ runId?: string }> = ({ runId }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const run: any = useQuery((api as any).aiAgents?.getAgentRun as any, runId ? { runId } as any : 'skip');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const events: any[] = (useQuery((api as any).aiAgents?.listAgentRunEvents as any, runId ? { runId } as any : 'skip') as any[]) || [];
  const [elapsed, setElapsed] = useState<number>(0);
  const [showTools, setShowTools] = useState<boolean>(true);
  useEffect(() => {
    if (!run) return;
    const start = Number(run?.createdAt || Date.now());
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [run?.createdAt]);
  if (!runId) return null;
  const sorted = [...events].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
  const toolEvents = sorted.filter((e) => String(e.kind || '').startsWith('tool'));
  const argEvents = toolEvents.filter((e) => String(e.kind || '').startsWith('tool.args.'));
  const nonArgTools = toolEvents.filter((e) => !String(e.kind || '').startsWith('tool.args.'));
  const toolArgAgg = useMemo(() => {
    const m = new Map<string, { name: string; index: number; buffer: string; done: boolean; parsed?: any }>();
    for (const ev of argEvents) {
      const name = String(ev?.data?.name || 'tool');
      const idx = Number(ev?.data?.index ?? 0);
      const key = `${name}:${idx}`;
      const entry = m.get(key) || { name, index: idx, buffer: '', done: false };
      if (String(ev.kind).endsWith('.delta')) {
        entry.buffer += String(ev?.data?.delta || '');
      } else if (String(ev.kind).endsWith('.done')) {
        entry.done = true;
        const argStr = String(ev?.data?.arguments || '');
        if (argStr) {
          try { entry.parsed = JSON.parse(argStr); } catch { entry.buffer = argStr; }
        }
      }
      m.set(key, entry);
    }
    return Array.from(m.values());
  }, [argEvents]);
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  const mm = Math.floor(elapsed / 60);
  const ss = elapsed % 60;
  // Summary info: doc title(s) and current step
  const docIdsFromEvents = useMemo(() => {
    const ids = new Set<string>();
    if (run?.documentId) ids.add(String(run.documentId));
    for (const e of sorted) {
      if (e?.kind === 'context.docs' && e?.data?.ids) {
        for (const id of e.data.ids as any[]) { if (id) ids.add(String(id)); }
      }
    }
    return Array.from(ids);
  }, [run?.documentId, sorted]);
  const titlesRes: any = useQuery((api as any).documents?.getTitles as any, docIdsFromEvents.length ? ({ ids: docIdsFromEvents } as any) : 'skip');
  const docNames = (Array.isArray(titlesRes) ? titlesRes.map((t: any) => t.title) : []).join(', ');
  const lastStep = [...sorted].reverse().find((e) => String(e.kind || '').startsWith('step.'));
  const [showDetails, setShowDetails] = useState(false);
  return (
    <div className="mt-2 border border-[var(--border-color)] rounded">
      <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] px-2 py-1 flex-wrap">
        <Activity className="h-3 w-3" />
        <span>
          Execution Progress {run?.status ? `(${run.status})` : ''}
        </span>
        <span className="mx-2 opacity-50">•</span>
        <span>Working on doc(s): <span className="text-[var(--text-primary)]">{docNames || '—'}</span></span>
        <span className="mx-2 opacity-50">•</span>
        <span>Current step: <span className="text-[var(--text-primary)]">{lastStep?.message || '—'}</span></span>
        {run?.status === 'running' && (
          <span className="ml-auto font-mono text-[var(--text-secondary)]">{mm}:{pad(ss)}</span>
        )}
        <button className="ml-2 px-1 py-0.5 text-[10px] border rounded hover:bg-[var(--bg-hover)]" onClick={() => setShowDetails(v => !v)}>
          {showDetails ? 'Hide details' : 'Show details'}
        </button>
      </div>
      {showDetails && (
        <div className="px-2 pb-2 space-y-1">
        {/* Tool Calls Accordion */}
        <div className="bg-[var(--bg-tertiary)] rounded">
          <button
            className="w-full text-left text-xs px-2 py-1 flex items-center justify-between"
            onClick={() => setShowTools((v) => !v)}
          >
            <span className="font-semibold">Tool calls</span>
            <span className="opacity-60">{showTools ? '▾' : '▸'}</span>
          </button>
          {showTools && (toolArgAgg.length > 0 || nonArgTools.length > 0) && (
            <div className="px-2 pb-2 space-y-2">
              {/* Aggregated function-call arguments (live) */}
              {toolArgAgg.length > 0 && (
                <div className="space-y-1">
                  {toolArgAgg.map((t) => (
                    <div key={`toolargs-${t.name}-${t.index}`} className="text-xs p-2 bg-[var(--bg-secondary)] rounded">
                      <div className="flex items-center justify-between">
                        <div className="font-mono text-[var(--accent-primary)]">{t.name} args</div>
                        <div className="opacity-60">{t.done ? 'done' : 'streaming…'}</div>
                      </div>
                      <pre className="mt-1 text-[10px] whitespace-pre-wrap break-all opacity-80">
                        {t.parsed ? JSON.stringify(t.parsed, null, 2).slice(0, 3000) : (t.buffer || '')}
                      </pre>
                    </div>
                  ))}
                </div>
              )}

              {/* Non-arg tool events */}
              {nonArgTools.length > 0 && (
                <div className="space-y-1">
                  {nonArgTools.slice(-20).map((e: any, i: number) => (
                    <div key={`tool-${e.seq ?? i}`} className="text-xs p-2 bg-[var(--bg-secondary)] rounded">
                      <div className="font-mono text-[var(--accent-primary)]">
                        {String(e.data?.toolName || e.kind)}
                      </div>
                      {e.message ? (
                        <div className="opacity-80">{e.message}</div>
                      ) : null}
                      {e.data?.input ? (
                        <pre className="mt-1 text-[10px] whitespace-pre-wrap break-all opacity-70">{JSON.stringify(e.data.input)}</pre>
                      ) : null}
                      {e.data?.output ? (
                        <pre className="mt-1 text-[10px] whitespace-pre-wrap break-all opacity-70">{JSON.stringify(e.data.output).slice(0, 1000)}</pre>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}

              {toolArgAgg.length === 0 && nonArgTools.length === 0 && (
                <div className="text-xs opacity-60 px-2 pb-2">No tool calls yet.</div>
              )}
            </div>
          )}
        </div>

        {/* Recent events */}
        {sorted.slice(-20).map((e, i) => (
          <div key={`${e.seq ?? i}`} className="text-xs p-2 bg-[var(--bg-tertiary)] rounded">
            <span className="font-mono text-[var(--accent-primary)]">{e.kind}</span>
            {e.message ? <span>: {e.message}</span> : null}
          </div>
        ))}
        </div>
      )}
    </div>
  );
};

// React Flow node types - defined outside component to prevent recreation on every render
const nodeTypes: NodeTypes = {
  conversationTurn: ConversationTurnNode,
};

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

export function AIChatPanel({ isOpen, onClose, onDocumentSelect: _onDocumentSelect, selectedDocumentId, selectedNodeId, smsMessage, onSmsMessageProcessed, selectedFileIds = [], showMcpPanel, onToggleMcpPanel, pendingQuickPrompt, onQuickPromptConsumed, variant = 'minimal' }: AIChatPanelProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [thinkingElapsed, setThinkingElapsed] = useState(0);
  const lastPromptRef = useRef<string>('');

  useEffect(() => {
    let id: number | undefined;
    if (isLoading) {
      const start = Date.now();
      const tick = () => setThinkingElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
      tick();
      id = window.setInterval(tick, 1000);
    } else {
      setThinkingElapsed(0);
    }
    return () => { if (id) window.clearInterval(id); };
  }, [isLoading]);
  const fmt = (s: number) => `${Math.floor(s/60)}:${(s%60<10?'0':'')}${s%60}`;
  const [expandedThinking, setExpandedThinking] = useState<Set<string>>(new Set());
  const [expandedIntent, setExpandedIntent] = useState<Set<string>>(new Set());
  const [expandedPlan, setExpandedPlan] = useState<Set<string>>(new Set());

  const [selectedModel, setSelectedModel] = useState<'openai' | 'gemini'>('openai');
  const [useOrchestrator, setUseOrchestrator] = useState<boolean>(() => {
    try { return window.localStorage.getItem('aiChat.useOrchestrator') === '1'; } catch { return false; }
  });
  const isMinimal = variant === 'minimal';
  const convex = useConvex();


  // Specific OpenAI model variant to use; default to nano
  const [openaiVariant, setOpenaiVariant] = useState<'gpt-5-nano' | 'gpt-5-mini'>('gpt-5-nano');
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [showLlmInfo, setShowLlmInfo] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'flow'>('chat');
  // Preview of pmOperations returned by AI (applied only on accept)
  const [pmOpsPreview, setPmOpsPreview] = useState<any[] | null>(null);
  const [showOpsDetails, setShowOpsDetails] = useState(false);

  // Auto-select the currently viewed editor document for chat if none explicitly selected
  useEffect(() => {
    const onFocus = (evt: Event) => {
      const e = evt as CustomEvent<{ documentId?: string; blockId?: string; preview?: string }>;
      const docId = e.detail?.documentId as any;
      if (!docId) return;
      setSelectedContextDocumentIds(prev => (prev && prev.length ? prev : [docId]));
    };


    window.addEventListener('nodebench:editor:focused', onFocus as EventListener);
    return () => window.removeEventListener('nodebench:editor:focused', onFocus as EventListener);

  }, []);

  // Preferences and raw preview modal
  const [includeDocContext, setIncludeDocContext] = useState(true);
  const [docContextLimit, setDocContextLimit] = useState(1800);
  const [rawPreviewModal, setRawPreviewModal] = useState<{ title: string; text: string } | null>(null);
  useEffect(() => {
    const onShow = (evt: Event) => {
      const e = evt as CustomEvent<{ title?: string; text?: string }>;
      if (e.detail?.text) setRawPreviewModal({ title: e.detail?.title || 'Raw Content', text: e.detail.text });
    };
    window.addEventListener('nodebench:showRawPreview', onShow as EventListener);
    return () => window.removeEventListener('nodebench:showRawPreview', onShow as EventListener);
  }, []);



  const [lastToolCall, setLastToolCall] = useState<any | null>(null);
  const applyPmOpsPreview = useCallback(() => {
    if (pmOpsPreview && pmOpsPreview.length > 0) {
      try {
        window.dispatchEvent(new CustomEvent('nodebench:ai:applyPmOperations', {
          detail: { operations: pmOpsPreview, documentId: selectedDocumentId || undefined }
        }));
      } catch {}
    }
    setPmOpsPreview(null);
  }, [pmOpsPreview, selectedDocumentId]);
  const discardPmOpsPreview = useCallback(() => setPmOpsPreview(null), []);

  // Announce AI Chat mount/unmount for shadow Tiptap lifecycle
  useEffect(() => {
    try { window.dispatchEvent(new CustomEvent('nodebench:aiChat:mounted')); } catch {}
    return () => {
      try { window.dispatchEvent(new CustomEvent('nodebench:aiChat:unmounted')); } catch {}
    };
  }, []);

  // Request PM context from the hidden Tiptap provider
  const requestPmContext = useCallback(async (timeoutMs: number = 500): Promise<any | null> => {
    const requestId = Math.random().toString(36).slice(2);
    return await new Promise<any | null>((resolve) => {
      let done = false;
      const onCtx = (evt: Event) => {
        const e = evt as CustomEvent<{ requestId: string; context: any }>; // loose type
        if (e.detail?.requestId !== requestId) return;
        done = true;
        try { window.removeEventListener('nodebench:ai:pmContext', onCtx as EventListener); } catch {}
        resolve(e.detail?.context ?? null);
      };
      window.addEventListener('nodebench:ai:pmContext', onCtx as EventListener);
      try {
        window.dispatchEvent(new CustomEvent('nodebench:ai:requestPmContext', { detail: { requestId } }));
      } catch {}
      setTimeout(() => {
        if (done) return;
        try { window.removeEventListener('nodebench:ai:pmContext', onCtx as EventListener); } catch {}
        resolve(null);
      }, timeoutMs);
    });
  }, []);


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
  // Hover previews for candidate docs in assistant messages
  const [candidatePreview, setCandidatePreview] = useState<Record<string, string | undefined>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Persisted chat thread document id for this panel session
  const [threadDocumentId, setThreadDocumentId] = useState<Id<"documents"> | null>(null);

  // React Flow state - Simplified
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedFlowNode, setSelectedFlowNode] = useState<string | null>(null);
  const [selectedTurnDetails, setSelectedTurnDetails] = useState<ConversationTurnData | null>(null);
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
    errors: Array<{ tool: string; message: string }>;
    expanded: boolean;
  } | null>(null);

  // Track which chat messages have already been persisted to avoid duplicates on manual save
  const [savedMessageIds, setSavedMessageIds] = useState<Set<string>>(new Set());

  // Thinking mode toggle for agentic multi-step workflows (persisted)
  const [thinkingMode, setThinkingMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('nb.thinking') === '1';
    } catch {
      return false;
    }
  });

  // Persist preferences
  useEffect(() => {
    try {
      localStorage.setItem('nb.thinking', thinkingMode ? '1' : '0');
    } catch (e) {
      // Ignore storage errors (e.g., private mode, SSR). Ensure 'e' referenced to satisfy ESLint.
      void e;
    }
  }, [thinkingMode]);
  useEffect(() => {
    try {
      localStorage.setItem('nb.showContext', showContext ? '1' : '0');
    } catch (e) {
      // Ignore storage errors (e.g., private mode, SSR).
      void e;
    }
  }, [showContext]);

  // Keyboard shortcut: Alt+T toggles Thinking mode
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        setThinkingMode((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

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
    const model = selectedModel === 'openai' ? openaiVariant : 'gemini-2.0-flash';
    const fileSupport = selectedModel === 'gemini' ? 'Files (PDF, CSV, images, etc.)' : 'Images';
    const toolCalls = ['proposeNode', 'proposeUpdateNode', 'openDoc', 'editDoc', 'nodebench_apply_diff', 'nodebench_replace_document'];
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

  // Decide whether to propose changes or auto-apply them in the editor
  const proposeOrApply = useCallback((actions: any[], message: string) => {
    try {
      const anchorBlockId = (focused && (focused as any).blockId) ? String((focused as any).blockId) : undefined;
      const targetDoc = selectedDocumentId || (focused && (focused as any).documentId) || selectedContextDocumentIds?.[0];
      // Auto-apply when we have a clear target document context
      if (targetDoc) {
        window.dispatchEvent(new CustomEvent('nodebench:applyActions', {
          detail: { actions, anchorBlockId },
        }));

      } else {
        window.dispatchEvent(new CustomEvent('nodebench:aiProposal', {
          detail: { actions, message },
        }));
      }
    } catch (e) {
      console.warn('\u26a0\ufe0f [FRONTEND] proposeOrApply failed:', e);
    }
  }, [focused, selectedDocumentId, selectedContextDocumentIds]);

  const _createNode = useMutation(api.nodes_extras.create);
  const _updateNode = useMutation(api.nodes.update);
  const _archiveNode = useMutation(api.nodes_extras.archive);
  const _createDocument = useMutation(api.documents.create);
  const _updateDocument = useMutation(api.documents.update);
  const _archiveDocument = useMutation(api.documents.archive);
  const _renameFile = useMutation(api.files.renameFile);
  const _generateAIResponse = useAction(api.ai.generateResponse);
  // Temporary cast to avoid IDE mismatch if Convex types aren’t regenerated yet
  const chatWithAgent = useAction((api as any).aiAgents.chatWithAgent as any);
  const runOrchestrate = useAction((api as any).agents.orchestrate.run as any);
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


  // Active document title for hints/chips
  const activeDocTitle = useMemo(() => {
    try {
      const t = (focused as any)?.title;
      if (t) return String(t);
      if (selectedDocumentId && Array.isArray(availableDocuments)) {
        const d = (availableDocuments as any[]).find((dd: any) => String(dd._id) === String(selectedDocumentId));
        if (d?.title) return String(d.title);
      }
    } catch {}
    return undefined;
  }, [focused, selectedDocumentId, availableDocuments]);

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
    const node: any = messagesEndRef.current;
    if (node && typeof node.scrollIntoView === 'function') {
      try { node.scrollIntoView({ behavior: 'smooth' }); } catch { /* ignore */ }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Sync MCP/tools to Context Pills
  // Show applied changes from editor in the chat thread
  useEffect(() => {
    const handler = (evt: any) => {
      try {
        const actions: any[] = evt?.detail?.actions ?? [];
        if (!Array.isArray(actions) || actions.length === 0) return;
        const id = generateUniqueId('assistant');
        const summary = actions.map((a) => `${a.type}${a.nodeId ? `#${a.nodeId}` : ''}`).join(', ');
        setMessages((prev) => prev.concat({
          id,
          type: 'assistant',
          content: `Applied ${actions.length} change(s): ${summary}`,
          timestamp: new Date(),
        } as any));
      } catch (e) {
        console.warn('Failed to append applied-actions message', e);
      }
    };
    window.addEventListener('nodebench:appliedActions', handler as any);
    return () => window.removeEventListener('nodebench:appliedActions', handler as any);
  }, []);

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

  const toggleThinking = (messageId: string) => {
    setExpandedThinking(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const handleClearMessages = () => {
    // Clear all messages
    setMessages([]);
    // Clear expanded thinking/plan states
    setExpandedThinking(new Set());
    setExpandedIntent(new Set());
    setExpandedPlan(new Set());
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
    const turnData = node.data as ConversationTurnData;
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
    lastPromptRef.current = userMessageContent;

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
          'Workflow: intent -> plan -> gather context (RAG + MCP) -> choose tools -> execute -> self-check -> revise -> persist',
          'Intent classes: (a) edit doc (b) code change (c) answer/explain (d) search/research (e) data/file ops',
          'Tool selection: prefer minimal safe tool calls; defer expensive ops; preview before apply; anchor to current selection when editing',
          'Gotchas: token limits; ambiguous anchors; schema/index requirements; read-only vs mutating; id types; encoding; rate limits',
          'Quick refs: provide 1-2 canonical examples for chosen approach (syntax/snippets) when helpful',
          'Assessment: state assumptions, complexity, and test strategy for code tasks',
          'Return thinkingSteps for UI when possible.'
        ].join('\n');
        messageWithContext = `${thinkingHint}\n\n${messageWithContext}`;


      }

      // Attach precise PM context (doc JSON + selection + node spans) if available
      try {
        const pmCtx = await requestPmContext(600);
        if (pmCtx) {
          // System-level Doc Context (first ~1800 chars) for immediate grounding
          try {
            const limit = Math.max(200, Math.min(5000, docContextLimit || 1800));

            // Smart summary: headings + first lines under each (compact)
            try {
              const nodesArr = Array.isArray(pmCtx.nodes) ? pmCtx.nodes as any[] : [];
              const lines: string[] = [];
              let currentHeading: string | null = null;
              let added = 0;
              for (let i = 0; i < nodesArr.length && lines.join('\n').length < limit; i++) {
                const n: any = nodesArr[i];
                const typeName = String(n?.type || '');
                const t = typeof n?.text === 'string' ? String(n.text).trim() : '';
                if (/heading/i.test(typeName) && t) {
                  // Try to detect heading level from common shapes
                  const lvlFromAttrs = (n?.attrs && (n as any).attrs.level) || (n as any).level || (n as any).props?.level;
                  const lvlFromType = (() => { const m = typeName.match(/(\d)/); return m ? parseInt(m[1], 10) : undefined; })();
                  let level: number | undefined = Number(lvlFromAttrs) || Number(lvlFromType) || undefined;
                  if (!Number.isFinite(level)) level = undefined;
                  if (level && level > 6) level = 6;
                  const lvlLabel = level ? `H${Math.min(3, Math.max(1, level))}` : 'H';

                  currentHeading = t.replace(/\s+/g, ' ').slice(0, 100);
                  lines.push(`${lvlLabel} • ${currentHeading}`);
                  added++;
                  if (added >= 12) break;
                } else if (currentHeading && t) {
                  const firstLine = t.split(/\r?\n/).find((s: string) => s.trim().length > 0) || '';
                  if (firstLine) {
                    // Indent follow-up line slightly under the heading
                    lines.push(`  - ${firstLine.slice(0, 140)}`);
                    currentHeading = null;
                  }
                }
              }
              const summaryText = lines.join('\n').slice(0, limit);
              if (includeDocContext && summaryText.trim().length > 0) {
                messageWithContext = `System: Doc Smart Summary\n\n${summaryText}\n---\n` + messageWithContext;
              }
            } catch { /* ignore */ }

            // Plain slice fallback/additional grounding
            const plain = Array.isArray(pmCtx.nodes)
              ? pmCtx.nodes.map((n: any) => (typeof n.text === 'string' ? n.text : '')).filter(Boolean).join('\n').slice(0, limit)
              : '';
            if (includeDocContext && plain && plain.trim().length > 0) {
              messageWithContext = `System: Doc Context (first ${limit} chars)\n\n${plain}\n---\n` + messageWithContext;
            }
          } catch { /* ignore */ }

          // Attach precise PM context as JSON for tools
          const pmJson = JSON.stringify(pmCtx);
          messageWithContext += "\n\nPM Context JSON (doc, selection, nodes):\n\n```json\n" + pmJson + "\n```\n";
        }
      } catch { /* ignore */ }

      // If orchestrator mode is enabled and we have a focused document, run the orchestrator and write to the Agent Timeline instead of chatWithAgent.
      if (useOrchestrator && selectedDocumentId) {
        try {
          const res = await runOrchestrate({
            documentId: selectedDocumentId as any,
            name: 'Orchestration',
            taskSpec: { goal: userMessageContent, type: 'ad-hoc', topic: userMessageContent } as any,
          } as any);
          const assistantMsg: Message = {
            id: generateUniqueId('assistant'),
            type: 'assistant',
            content: res?.result || 'Orchestrator finished.',
            timestamp: new Date(),
          } as any;
          (assistantMsg as any).timelineId = String(res?.timelineId || '');
          setMessages((prev) => [...prev, assistantMsg]);
        } catch (e) {
          console.error('Orchestrator run failed', e);
          try { toast.error('Orchestrator failed: ' + ((e as any)?.message || '')); } catch {}
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // Auto-retry wrapper to handle transient Convex disconnections
      const callOnce = async () => await chatWithAgent({
        threadId: undefined, // backend manages agent thread
        message: messageWithContext,
        selectedDocumentId: (selectedDocumentId || (focused && (focused as any).documentId)) || undefined,
        model: selectedModel,
        openaiVariant: selectedModel === 'openai' ? openaiVariant : undefined,
        mcpServerId: tavilyServer?._id || undefined,
      });

	      // Launch the action and try to attach to the live run stream immediately
	      const startedAt = Date.now();
	      const callPromise = callOnce();
	      let placeholderAssistantId: string | null = null;
	      try {
	        const tryAttach = async () => {
	          for (let i = 0; i < 3; i++) {
	            // eslint-disable-next-line @typescript-eslint/no-explicit-any
	            const latestRun: any = await (convex as any).query((api as any).aiAgents.latestAgentRunForUser as any, {});
	            const createdAt = Number(latestRun?.createdAt || 0);
	            if (latestRun?._id && latestRun?.status === 'running' && createdAt >= startedAt - 2000) {
	              const attachMsg: Message = {
	                id: generateUniqueId('assistant'),
	                type: 'assistant',
	                content: 'Working… live execution details below.',
	                timestamp: new Date(),
	                runId: String(latestRun._id),
	              } as any;
	              placeholderAssistantId = attachMsg.id;
	              setMessages((prev) => [...prev, attachMsg]);
	              updateNodeStatus(userMessage.id, 'completed');
	              break;
	            }
	            await new Promise((r) => setTimeout(r, 250));
	          }
	        };
	        void tryAttach();
	      } catch { /* ignore attach errors */ }


      let responseText: string | undefined;
      try {
        responseText = await callPromise;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const isTransient = /Connection lost while action was in flight|WebSocket|connection/i.test(msg);
        if (isTransient) {
          const delays = [800, 1500];
          for (let i = 0; i < delays.length && responseText === undefined; i++) {
            await new Promise((r) => setTimeout(r, delays[i]));
            try { responseText = await callOnce(); } catch { /* keep trying */ }
          }
          // If still no response, attach to latest running run so the user can see progress
          if (responseText === undefined) {
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const latestRun: any = await (convex as any).query((api as any).aiAgents.latestAgentRunForUser as any, {});
              if (latestRun?._id) {
                const attachMsg: Message = {
                  id: generateUniqueId('assistant'),
                  type: 'assistant',
                  content: 'Reattached to a running agent. Streaming progress below…',
                  timestamp: new Date(),
                  runId: String(latestRun._id),
                } as any;
                setMessages((prev) => [...prev, attachMsg]);
                updateNodeStatus(userMessage.id, 'completed');
                return; // Early exit; we’ve attached to the stream
              }
            } catch {
              // fall through to error handling
            }
          }
        }
        if (responseText === undefined) throw err;
      }

      if (responseText === undefined) { throw new Error('No response from AI after retries'); }

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

	      // If the model returned structured PM operations, apply them immediately
	      try {
	        const maybe = JSON.parse(responseText as string);
	        const ops = (maybe && (maybe.pmOperations || maybe.operations)) as any[] | undefined;
	        if (Array.isArray(ops) && ops.length > 0) {
	          try {
	            // auto-apply disabled; hold for preview
            setPmOpsPreview(ops);
            /* window.dispatchEvent(new CustomEvent('nodebench:ai:applyPmOperations', {
	              detail: { operations: ops, documentId: selectedDocumentId || undefined }
	            })); */
	          } catch {}
	        }
	      } catch { /* ignore non-JSON */ }

      let thinkingSteps: any[] = [];
      let adaptations: any[] = [];
      let candidateDocs: any[] = [];
      let proposedActionsTopLevel: any[] | undefined;
      let planExplain: string | undefined;
      let plan: any | undefined;
      let runIdFromResponse: string | undefined;

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
          planExplain = parsedResponse.planExplain || (parsedResponse.plan && parsedResponse.plan.explain);
          plan = parsedResponse.plan && typeof parsedResponse.plan === 'object' ? parsedResponse.plan : undefined;

          runIdFromResponse = typeof parsedResponse.runId === 'string' ? parsedResponse.runId : undefined;

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
                try { if (toolCalls.length > 0) setLastToolCall(toolCalls[toolCalls.length - 1]); } catch {}

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
                      proposeOrApply(actions, message);
                      console.log('🎯 [FRONTEND] Dispatched AI proposal to Editor', { count: actions.length, message });
                    } catch (e) {
                      console.warn('⚠️ [FRONTEND] Failed to dispatch AI proposal event:', e);
                    }
                  }
                  continue;
                }

                // Nodebench AI editing intents (preview-first): convert to pmOperations
                if (name === 'nodebench_apply_diff' && Array.isArray(resultPayload?.diffs)) {
                  try {
                    const diffs = resultPayload.diffs as Array<{ before: string; delete?: string; insert?: string }>;
                    const ops = diffs.map((d) => ({
                      type: 'anchoredReplace',
                      anchor: String(d.before || ''),
                      delete: typeof d.delete === 'string' ? d.delete : '',
                      insert: typeof d.insert === 'string' ? d.insert : '',
                    }));
                    if (ops.length > 0) {
                      setPmOpsPreview(ops);
                      if (resultPayload?.documentId) {
                        try { _onDocumentSelect(resultPayload.documentId as Id<'documents'>); } catch {}
                      }
                      console.log('🧩 [FRONTEND] Prepared pmOpsPreview from nodebench_apply_diff', { count: ops.length });
                    }
                  } catch (e) {
                    console.warn('⚠️ [FRONTEND] Failed to prepare ops for nodebench_apply_diff', e);
                  }
                  continue;
                }

                if (name === 'nodebench_replace_document' && typeof resultPayload?.content === 'string') {
                  try {
                    const ops = [{ type: 'replaceDocument', content: String(resultPayload.content) }];
                    setPmOpsPreview(ops);
                    if (resultPayload?.documentId) {
                      try { _onDocumentSelect(resultPayload.documentId as Id<'documents'>); } catch {}
                    }
                    console.log('🧩 [FRONTEND] Prepared pmOpsPreview from nodebench_replace_document');
                  } catch (e) {
                    console.warn('⚠️ [FRONTEND] Failed to prepare ops for nodebench_replace_document', e);
                  }
                  continue;
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
                  proposeOrApply(parsedResponse.actions, message);
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
          setErrorBanner({ errors: failed, expanded: false });
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
        thinkingSteps,
        planExplain,
        plan,
        runId: runIdFromResponse,
      };

      console.log('🎯 [FRONTEND] Created AI response message:', aiResponseMessage);

      // If proposals exist at top-level, ensure the editor overlay opens immediately
      if (Array.isArray(proposedActionsTopLevel) && proposedActionsTopLevel.length > 0) {
        try {
          proposeOrApply(proposedActionsTopLevel, actualResponseText);
          console.log('🎯 [FRONTEND] Auto-dispatched top-level AI proposal to Editor overlay');
          // Re-dispatch shortly after in case the editor listener wasn't ready yet
          setTimeout(() => {
            try {
              proposeOrApply(proposedActionsTopLevel, actualResponseText);
              console.log('🎯 [FRONTEND] Re-dispatched AI proposal to Editor overlay');
            } catch (e) {
              console.warn('⚠️ [FRONTEND] Failed to re-dispatch AI proposal overlay:', e);
            }
          }, 200);
        } catch (e) {
          console.warn('⚠️ [FRONTEND] Failed to auto-dispatch AI proposal overlay:', e);
        }
      }

      // Update messages (replace placeholder streaming bubble if present)
      console.log('🎯 [FRONTEND] Updating messages state...');
      setMessages(prev => {
        if (placeholderAssistantId) {
          const replaced = prev.map(m => (
            m.id === placeholderAssistantId
              ? ({ ...aiResponseMessage, id: m.id, runId: (m as any).runId || aiResponseMessage.runId } as any)
              : m
          ));
          console.log('🎯 [FRONTEND] Replaced placeholder assistant message with final response');
          return replaced;
        }
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
        setErrorBanner({ errors: [{ tool: 'chatWithAgent', message: msg }], expanded: false });
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
    proposeOrApply,
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

  const renderThinkingStep = (step: any, index: number) => {
    const getIcon = () => {
      switch (step.type) {
        case 'thinking': return <Brain className="h-3 w-3 text-purple-600" />;
        case 'tool_call': return <Wrench className="h-3 w-3 text-blue-600" />;
        case 'result': return step.toolCall?.error ? <AlertCircle className="h-3 w-3 text-red-600" /> : <CheckCircle className="h-3 w-3 text-green-600" />;
        default: return <Brain className="h-3 w-3 text-gray-600" />;
      }
    };
    const getColor = () => {
      switch (step.type) {
        case 'thinking': return 'border-purple-200 bg-purple-50';
        case 'tool_call': return 'border-blue-200 bg-blue-50';
        case 'result': return step.toolCall?.error ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50';
        default: return 'border-gray-200 bg-gray-50';
      }
    };

    return (
      <div key={index} className={`p-2 rounded border ${getColor()} text-xs`}>
        <div className="flex items-center gap-2 mb-1">
          {getIcon()}
          <span className="font-medium capitalize">{(step.type || 'unknown').replace('_', ' ')}</span>
          <span className="text-gray-500 ml-auto">{step.timestamp?.toLocaleTimeString?.([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) || 'N/A'}</span>
        </div>
        <p className="text-gray-700">{step.content || 'No content'}</p>
        {step.toolCall && (
          <div className="mt-1 p-1 bg-white bg-opacity-50 rounded text-xs">
            <div><strong>Tool:</strong> {step.toolCall.name}</div>
            {step.toolCall.args && <div><strong>Args:</strong> {JSON.stringify(step.toolCall.args, null, 2)}</div>}
            {step.toolCall.result && <div><strong>Result:</strong> {JSON.stringify(step.toolCall.result, null, 2)}</div>}
            {step.toolCall.error && <div className="text-red-600"><strong>Error:</strong> {step.toolCall.error}</div>}
          </div>
        )}
      </div>
    );
  };

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

  // Dynamically inform other layouts (e.g., Agent Timeline) about our width so they can avoid being clipped
  const rightPanelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = rightPanelRef.current;
    const setPad = () => {
      const w = el ? Math.ceil(el.getBoundingClientRect().width) : 0;
      try { document.documentElement.style.setProperty('--right-overlay-padding', w > 0 ? `${w}px` : '0px'); } catch {}
    };
    if (!isOpen) {
      try { document.documentElement.style.setProperty('--right-overlay-padding', '0px'); } catch {}
      return;
    }
    setPad();
    let ro: ResizeObserver | null = null;
    try {
      if (el && typeof ResizeObserver !== 'undefined') {
        // @ts-ignore
        ro = new ResizeObserver(() => setPad());
        // @ts-ignore
        ro.observe(el);
      }
    } catch {}
    const onResize = () => setPad();
    window.addEventListener('resize', onResize);
    return () => {
      try { document.documentElement.style.setProperty('--right-overlay-padding', '0px'); } catch {}
      window.removeEventListener('resize', onResize);
      if (ro) try { ro.disconnect(); } catch {}
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div ref={rightPanelRef} className="right-panel flex flex-col h-full">
      {/* Header with Tabs */}
      <div className="flow-header">
        <div className="flow-title">
          <span className="text-base">💡</span>
          <span>{isMinimal ? 'Ask AI' : 'Nodebench AI'}</span>
          {/* Tabs: Chat / Flow (hidden in minimal) */}
          {!isMinimal && (
            <div className="ml-3 inline-flex rounded-md border border-[var(--border-color)] overflow-hidden">
              <button
                onClick={() => setActiveTab('chat')}
                className={`px-3 py-1.5 text-xs ${activeTab === 'chat' ? 'bg-[var(--accent-primary)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
              >
                Chat
              </button>
              <button
                onClick={() => setActiveTab('flow')}
                className={`px-3 py-1.5 text-xs ${activeTab === 'flow' ? 'bg-[var(--accent-primary)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
              >
                Flow
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isMinimal && (
            <>
              {/* Auto-save toggle */}
              <button
                onClick={() => setAutoSaveChat(v => !v)}
                className={`p-2 rounded transition-colors ${autoSaveChat ? 'bg-[var(--accent-primary)] text-white' : 'hover:bg-[var(--bg-hover)]'}`}
                title={autoSaveChat ? 'Auto-save chat: On' : 'Auto-save chat: Off'}
              >
                <Save className="h-4 w-4" />
              </button>
              {/* Manual Save */}
              <button
                onClick={() => void handleManualSaveChat()}
                className="p-2 hover:bg-[var(--bg-hover)] rounded transition-colors"
                title="Save chat to a thread document"
              >
                <FileText className="h-4 w-4 text-[var(--text-secondary)]" />
              </button>
              {threadDocumentId && (
                <button
                  onClick={() => _onDocumentSelect(threadDocumentId)}
                  className="p-2 hover:bg-[var(--bg-hover)] rounded transition-colors"
                  title="Open Chat Thread Document"
                >
                  <FileText className="h-4 w-4 text-[var(--text-secondary)]" />
                </button>
              )}
              <button
                onClick={handleClearMessages}
                className="p-2 hover:bg-[var(--bg-hover)] rounded transition-colors"
                title="Clear Messages"
              >
                <Trash2 className="h-4 w-4 text-[var(--text-secondary)]" />
              </button>
              <button
                onClick={handleResetWorkflow}
                className="p-2 hover:bg-[var(--bg-hover)] rounded transition-colors"
                title="Reset Workflow"
              >
                <RotateCcw className="h-4 w-4 text-[var(--text-secondary)]" />
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--bg-hover)] rounded transition-colors"
          >
            <X className="h-4 w-4 text-[var(--text-secondary)]" />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {errorBanner && errorBanner.errors.length > 0 && (
        <div className="mx-3 mb-2 rounded border border-red-200 bg-red-50 text-red-800">
          <div className="flex items-start gap-2 p-2">
            <AlertCircle className="h-4 w-4 mt-0.5 text-red-600" />
            <div className="flex-1">
              <div className="text-sm font-medium">Some AI tools failed</div>
              {!errorBanner.expanded ? (
                <div className="text-xs">{errorBanner.errors.map((e) => e.tool).join(', ')}</div>
              ) : (
                <ul className="mt-1 space-y-1 text-xs">
                  {errorBanner.errors.map((e, i) => (
                    <li key={i} className="p-2 bg-white/70 rounded border border-red-200">
                      <div className="font-medium">{e.tool}</div>
                      <div className="text-red-700 break-words">{e.message}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setErrorBanner((prev) => (prev ? { ...prev, expanded: !prev.expanded } : prev))}
                className="px-2 py-1 text-xs rounded hover:bg-red-100 text-red-700"
              >
                {errorBanner.expanded ? 'Hide' : 'Details'}
              </button>
              <button
                onClick={() => {
                  const prompt = lastPromptRef.current || input;
                  if (prompt && !isLoading) {
                    void handleSendMessage(prompt);
                  }
                }}
                className="px-2 py-1 text-xs rounded bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-hover)]"
                title="Retry the last request"
              >
                Retry
              </button>

              <button
                onClick={() => setErrorBanner(null)}
                className="p-1 rounded hover:bg-red-100"
                aria-label="Dismiss error banner"
                title="Dismiss"
              >
                <X className="h-4 w-4 text-red-600" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Flow Canvas (Flow tab only) */}
      <div className={`${(activeTab === 'flow' && !isMinimal) ? 'flex-1 p-3' : 'hidden'} overflow-hidden`}>
        <div className="flow-canvas" ref={flowContainerRef} style={{ minHeight: 320, height: '100%', position: 'relative' }}>
          {flowReady ? (

          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={handleNodeClick}
            onSelectionChange={(params) => {
              const first = params?.nodes && params.nodes.length > 0 ? params.nodes[0] : null;
              setSelectedFlowNode(first ? first.id : null);
            }}
            onInit={(instance) => {
              reactFlowInstanceRef.current = instance;
              // Ensure the initial view fits content
              setTimeout(() => instance.fitView({ padding: 0.2 }), 0);
            }}
            defaultEdgeOptions={{
              style: { strokeWidth: 2, stroke: '#94a3b8' },
              markerEnd: { type: MarkerType.ArrowClosed },
            }}
            fitView
            fitViewOptions={{ padding: 0.1 }}
            defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
            <Controls position="bottom-right" />
          </ReactFlow>
          ) : (
            <div className="w-full h-[320px] flex items-center justify-center text-[var(--text-secondary)] text-xs border border-[var(--border-color)] rounded bg-[var(--bg-tertiary)]">
              Flow view will appear here
            </div>
          )}
          {/* Turn Details Overlay */}
          {renderTurnDetails()}
        </div>
      </div>

      {/* Quick Actions (Chat tab only) */}
      <div className={`p-3 border-b border-[var(--border-color)] ${(activeTab === 'chat' && !isMinimal) ? '' : 'hidden'}`}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-[var(--text-primary)]">Quick Actions {selectedDocumentId && <span className="text-[var(--accent-green)]">(for current doc)</span>}</p>
          <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
            {selectedModel === "openai" ? (
              <><Sparkles className="h-3 w-3" />Precise & Structured</>
            ) : (
              <><Zap className="h-3 w-3" />Creative & Conversational</>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {selectedDocumentId ? (
            <>
              <button onClick={() => handleQuickAction("Add a new section about")} className="w-full flex items-center justify-center gap-1.5 p-2 text-xs bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] rounded-md transition-colors"><Plus className="h-3 w-3" />Add Section</button>
              <button onClick={() => handleQuickAction("Create an outline with key points")} className="w-full flex items-center justify-center gap-1.5 p-2 text-xs bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] rounded-md transition-colors"><FileText className="h-3 w-3" />Add Outline</button>
              <button onClick={() => handleQuickAction("Add a code example for")} className="w-full flex items-center justify-center gap-1.5 p-2 text-xs bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] rounded-md transition-colors"><Edit3 className="h-3 w-3" />Add Code</button>
              <button
                onClick={async () => {
                  try {
                    const targetTitle = 'Note 9/1/2025';
                    let target = (availableDocuments || []).find((d: any) => (d.title || '').toLowerCase().includes(targetTitle.toLowerCase()));
                    if (!target) {
                      const createdId = await _createDocument({ title: targetTitle });
                      target = { _id: createdId, title: targetTitle } as any;
                    }
                    const targetId = (target as any)._id as Id<'documents'>;
                    try { _onDocumentSelect(targetId); } catch {}
                    setSelectedContextDocumentIds((prev) => (prev.includes(targetId) ? prev : prev.concat(targetId)));

                    const sections: string[] = [];
                    const p = (s: string) => sections.push(s);
                    p('# Python AI/ML Interview Cheatsheet');
                    p('- Focus: syntax basics, common patterns, and key AI/ML libraries');
                    p('## 1) Core Syntax');
                    p('```python\n# types\nx=3; y=3.14; ok=True; s="hi"; n=None\narr=[1,2,3]; tup=(1,2); d={"a":1}; st={1,2,3}\n# f-strings\nprint(f"a={x}")\n```');
                    p('## 2) Control Flow & Fns');
                    p('```python\nfor i in range(3):\n    pass\n\ndef add(a:int,b:int=0)->int: return a+b\n```');
                    p('## 3) NumPy / Pandas / sklearn / Torch / TF');
                    p('```python\nimport numpy as np, pandas as pd\nfrom sklearn.linear_model import LogisticRegression\nimport torch, torch.nn as nn\n```');
                    p('## 4) Patterns & Best Practices');
                    p('- Avoid mutable defaults; type hints; tests; seeds; vectorize.');

                    const cheatsheet = sections.join("\n\n");
                    proposeOrApply([{ type: 'updateDocument', markdown: cheatsheet }], 'Insert Python AI/ML Cheatsheet');
                    try { toast.success('Cheatsheet inserted into "Note 9/1/2025"'); } catch {}
                  } catch (e) {
                    console.warn('Failed to insert cheatsheet', e);
                    try { toast.error('Failed to insert cheatsheet'); } catch {}
                  }
                }}
                className="w-full flex items-center justify-center gap-1.5 p-2 text-xs bg-[var(--accent-primary)]/10 hover:bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] rounded-md transition-colors"
                title="Insert a Python AI/ML interview cheatsheet into 'Note 9/1/2025'"
              >
                <FileText className="h-3 w-3" /> Python AI/ML Cheatsheet
              </button>

          {/* Raw Preview Modal */}
          {rawPreviewModal && (
            <>
              <div className="fixed inset-0 bg-black/30 z-[60]" onClick={() => setRawPreviewModal(null)} />
              <div className="fixed inset-0 z-[61] flex items-center justify-center">
                <div className="bg-white w-[80vw] max-w-3xl max-h-[80vh] rounded shadow-lg border border-[var(--border-color)] flex flex-col">
                  <div className="p-2 border-b flex items-center justify-between">
                    <div className="text-sm font-medium text-[var(--text-primary)]">{rawPreviewModal.title}</div>
                    <button
                      className="px-2 py-1 text-xs rounded border border-[var(--border-color)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
                      onClick={() => setRawPreviewModal(null)}
                    >
                      Close
                    </button>
                  </div>
                  <div className="p-3 overflow-auto text-xs whitespace-pre-wrap text-[var(--text-primary)]">
                    {rawPreviewModal.text}
                  </div>
                </div>
              </div>
            </>
          )}

              <button onClick={() => handleQuickAction("Add a checklist for")} className="w-full flex items-center justify-center gap-1.5 p-2 text-xs bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] rounded-md transition-colors"><CheckCircle className="h-3 w-3" />Add Checklist</button>
            </>
          ) : (
            <>
              <button onClick={() => handleQuickAction("Create a new document about")} className="w-full flex items-center justify-center gap-1.5 p-2 text-xs bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] rounded-md transition-colors"><Plus className="h-3 w-3" />New Doc</button>
              <button onClick={() => handleQuickAction("Find documents about")} className="w-full flex items-center justify-center gap-1.5 p-2 text-xs bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] rounded-md transition-colors"><Search className="h-3 w-3" />Find Docs</button>
              <button onClick={() => handleQuickAction("Create a project plan")} className="w-full flex items-center justify-center gap-1.5 p-2 text-xs bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] rounded-md transition-colors"><FileText className="h-3 w-3" />Project Plan</button>
              <button onClick={() => handleQuickAction("Create meeting notes")} className="w-full flex items-center justify-center gap-1.5 p-2 text-xs bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] rounded-md transition-colors"><Edit3 className="h-3 w-3" />Meeting Notes</button>
            </>
          )}
        </div>
        {selectedNodeId && <div className="mt-2 p-2 bg-[var(--accent-secondary)] rounded-md"><p className="text-xs text-[var(--accent-primary)]"><strong>Block selected:</strong> You can ask me to update or expand this specific section</p></div>}

        {/* Divider between Quick Actions and Context (removed top context UI; unified at bottom) */}
        <div className="border-t border-[var(--border-color)] my-3"></div>
      </div>

      {/* Chat transcript (Chat tab only) */}
      <div className={`${activeTab === 'chat' ? '' : 'hidden'} flex-1 overflow-y-auto p-4 space-y-4`}>
        {messages.map((message, index) => (
          <div
            key={message.id}
            className={`group flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} relative`}
            onMouseEnter={() => setHoveredMessageId(message.id)}
            onMouseLeave={() => setHoveredMessageId(null)}
          >
            <div className={`max-w-[90%] rounded-lg px-3 py-2 relative ${message.type === 'user' ? 'bg-[var(--accent-primary)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'}`}>
              {/* Message Content or Edit Input */}
              {editingMessageId === message.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    className="w-full p-2 text-sm bg-[var(--bg-primary)] border border-[var(--border-color)] rounded resize-none focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                    rows={3}
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => void handleSaveEdit()}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-[var(--accent-primary)] text-white rounded hover:bg-[var(--accent-primary)]/80 transition-colors"
                    >
                      <Check className="h-3 w-3" />
                      Save & Rerun
                    </button>
                    <button onClick={handleCancelEdit} className="flex items-center gap-1 px-2 py-1 text-xs bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded hover:bg-[var(--bg-hover)] transition-colors">
                      <X className="h-3 w-3" />
                      Cancel
                    </button>

                  {/* Intent Classification */}
                  {message.type === 'assistant' && (message.planExplain || (message.plan && (message.plan.intent || message.plan.explain))) && (
                    <div className="mt-2">
                      <button onClick={() => setExpandedIntent(prev => { const s = new Set(prev); s.has(message.id) ? s.delete(message.id) : s.add(message.id); return s; })} className="flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                        {expandedIntent.has(message.id) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        Intent classification
                      </button>
                      {expandedIntent.has(message.id) && (
                        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
                          {message.plan && message.plan.intent && (
                            <div className="mb-1"><span className="font-medium text-amber-800">Intent:</span> <span className="text-amber-900">{String(message.plan.intent)}</span></div>
                          )}
                          {(message.planExplain || (message.plan && message.plan.explain)) && (
                            <div className="whitespace-pre-wrap text-amber-900">{message.planExplain || message.plan.explain}</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sequenced Plan (Groups) */}
                  {message.type === 'assistant' && message.plan && Array.isArray(message.plan.groups) && message.plan.groups.length > 0 && (
                    <div className="mt-2">
                      <button onClick={() => setExpandedPlan(prev => { const s = new Set(prev); s.has(message.id) ? s.delete(message.id) : s.add(message.id); return s; })} className="flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                        {expandedPlan.has(message.id) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        Sequenced plan (groups)
                      </button>
                      {expandedPlan.has(message.id) && (
                        <div className="mt-2 space-y-2">
                          {message.plan.groups.map((group: any[], gi: number) => (
                            <div key={gi} className="p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                              <div className="font-medium text-blue-700">Group {gi + 1} (parallel)</div>
                              <ul className="list-disc ml-4 mt-1 space-y-1">
                                {group.map((step: any, si: number) => (
                                  <li key={si} className="text-blue-900">
                                    <span className="font-medium">{String(step.kind)}</span>
                                    {step.label ? <span>  b7 {String(step.label)}</span> : null}
                                    {step.args ? (
                                      <div className="mt-1 p-1 bg-white/60 border border-blue-100 rounded overflow-x-auto">
                                        <code className="text-[10px]">
                                          {(() => { try { return JSON.stringify(step.args, null, 2).slice(0, 400); } catch { return String(step.args); } })()}
                                        </code>
                                      </div>
                                    ) : null}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                  {/* Proposal UI is handled by the Editor overlay; no inline chat panel */}


                      {/* Live Execution Progress (Streaming) */}
                      {message.type === 'assistant' && (message as any).runId && (
                        <AgentRunStream runId={(message as any).runId} />
                      )}

                      {message.type === 'assistant' && (message as any).timelineId && (
                        <div className="mt-2">
                          <button
                            className="text-xs text-[var(--accent-primary)] hover:underline"
                            onClick={() => {
                              try {
                                const tl = (message as any).timelineId as string | undefined;
                                if (tl && tl.length > 0) {
                                  const hash = `#calendar/agents?timeline=${encodeURIComponent(tl)}`;
                                  window.location.hash = hash;
                                  window.dispatchEvent(new CustomEvent('agents:openTimeline', { detail: { timelineId: tl } }));
                                } else {
                                  window.location.hash = '#calendar/agents';
                                  window.dispatchEvent(new CustomEvent('navigate:calendar'));
                                }
                              } catch {}
                            }}
                          >
                            View in Agents Timeline
                          </button>
                        </div>
                      )}

                  {/* Thinking Steps */}
                  {message.type === 'assistant' && message.thinkingSteps && message.thinkingSteps.length > 0 && (
                    <div className="mt-2">
                      <button onClick={() => toggleThinking(message.id)} className="flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                        {expandedThinking.has(message.id) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        <Brain className="h-3 w-3" />Show thinking ({message.thinkingSteps.length} steps)
                      </button>
                      {expandedThinking.has(message.id) && <div className="mt-2 space-y-2">{message.thinkingSteps.map((step, index) => renderThinkingStep(step, index))}</div>}
                    </div>
                  )}

                  {/* Candidate Documents from RAG */}
                  {message.type === 'assistant' && Array.isArray(message.candidateDocs) && message.candidateDocs.length > 0 && (
                    <div className="mt-2 p-2 bg-[var(--bg-tertiary)] rounded border border-[var(--border-color)]">
                      <div className="flex items-center gap-2 text-xs text-[var(--accent-primary)]">
                        <Search className="h-3 w-3" />
                        <span>Candidate documents ({message.candidateDocs.length})</span>
                      </div>
                      <ul className="mt-1 space-y-2 max-h-48 overflow-auto">
                        {message.candidateDocs.slice(0, 5).map((c: any, i: number) => (
                          <li key={i} className="text-xs">
                            <div className="flex items-center gap-2">
                              <div className="relative">
                                <button
                                  className="text-[var(--accent-primary)] hover:underline"
                                  title={c.title || String(c.documentId)}
                                  onMouseEnter={async () => {
                                    try {
                                      const idStr = String(c.documentId);
                                      if (!candidatePreview[idStr]) {
                                        const nodes = await convex.query(api.nodes.by_document, { docId: c.documentId as any });
                                        const txt = Array.isArray(nodes)
                                          ? nodes.map((n: any) => (typeof n?.text === 'string' ? n.text : '')).filter(Boolean).join('\n\n').slice(0, 400)
                                          : '';
                                        setCandidatePreview(prev => ({ ...prev, [idStr]: txt || undefined }));
                                      }
                                    } catch {
                                      // ignore
                                    }
                                  }}
                                  onClick={() => {
                                    try {
                                      _onDocumentSelect(c.documentId as Id<'documents'>);
                                    } catch (e) {
                                      console.warn('Failed to open candidate doc', e);
                                    }
                                  }}
                                >
                                  {c.title || String(c.documentId)}
                                </button>
                                {candidatePreview[String(c.documentId)] && (
                                  <div className="absolute left-0 top-full mt-1 z-20 max-w-[60vw] sm:max-w-[40vw] p-2 bg-[var(--bg-primary)] border border-[var(--border-color)] shadow rounded text-[11px] text-[var(--text-secondary)] whitespace-pre-wrap">
                                    {candidatePreview[String(c.documentId)]}
                                  </div>
                                )}
                              </div>
                              <span className="text-[var(--text-secondary)]">
                                {typeof c.score === 'number' ? `score ${c.score.toFixed(2)}` : ''}
                                {c.source ? ` • ${c.source}` : ''}
                              </span>
                            </div>
                            {c.snippet && (
                              <div className="mt-0.5 text-[var(--text-secondary)] line-clamp-3">
                                {c.snippet}
                              </div>
                            )}
                          </li>
                        ))}
                        {message.candidateDocs.length > 5 && (
                          <li className="text-[10px] text-[var(--text-secondary)]">+{message.candidateDocs.length - 5} more</li>
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Document Created */}
                  {message.documentCreated && (
                    <div className="mt-2 p-2 bg-[var(--bg-tertiary)] rounded border border-[var(--border-color)]">
                      <div className="flex items-center gap-2 text-xs text-[var(--accent-primary)]"><FileText className="h-3 w-3" /><span>Created: {message.documentCreated.title}</span></div>
                    </div>
                  )}

                  {/* Message Footer */}
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs opacity-70">{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    {message.isProcessing && <Loader2 className="h-3 w-3 animate-spin opacity-70" />}
                  </div>
                </>
              )}
            </div>

            {/* ChatGPT-like Message Actions */}
            {hoveredMessageId === message.id && editingMessageId !== message.id && (
              <div className={`absolute -top-2 ${message.type === 'user' ? 'right-0' : 'left-0'} -translate-y-full flex items-center gap-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg shadow-lg px-2 py-1 whitespace-nowrap max-w-[70vw] sm:max-w-[50vw] overflow-hidden text-ellipsis z-10`}>
                {message.type === 'user' && (
                  <>
                    <button
                      onClick={() => handleEditMessage(message.id, message.content)}
                      className="p-1 hover:bg-[var(--bg-hover)] rounded transition-colors"
                      title="Edit message"
                    >
                      <Edit2 className="h-3 w-3 text-[var(--text-secondary)]" />
                    </button>
                    <button
                      onClick={() => void handleRerunFromMessage(message.id)}
                      className="p-1 hover:bg-[var(--bg-hover)] rounded transition-colors"
                      title="Rerun from here"
                    >
                      <RotateCcw className="h-3 w-3 text-[var(--text-secondary)]" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => handleRollbackToMessage(message.id)}
                  className="p-1 hover:bg-[var(--bg-hover)] rounded transition-colors"
                  title="Rollback to here"
                >
                  <ArrowUp className="h-3 w-3 text-[var(--text-secondary)]" />
                </button>
                {message.type === 'assistant' && index === messages.length - 1 && (
                  <button
                    onClick={handleUndoLastResponse}
                    className="p-1 hover:bg-[var(--bg-hover)] rounded transition-colors"
                    title="Undo this response"
                  >
                    <Undo2 className="h-3 w-3 text-[var(--text-secondary)]" />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
        {isLoading && !messages.some(m => m.isProcessing) && (
          <div className="flex justify-start">
            <div className="bg-[var(--bg-secondary)] rounded-lg px-3 py-2 flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span className="text-sm text-[var(--text-secondary)]">Thinking  {fmt(thinkingElapsed)}</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>



      <div className="p-4 border-t border-[var(--border-color)] sticky bottom-0 bg-[var(--bg-primary)] z-10">
        {/* Proposal UI is handled entirely by the Editor overlay; removed chat-level proposal panel */}
        {/* Model Selection and API Key Configuration */}
        {!isMinimal && (
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
              <label className="ml-2 flex items-center gap-1 px-2 py-1 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={useOrchestrator}
                  onChange={(e) => {
                    const v = e.currentTarget.checked;
                    setUseOrchestrator(v);
                    try { window.localStorage.setItem('aiChat.useOrchestrator', v ? '1' : '0'); } catch {}
                  }}
                />
                <span>Orchestrator</span>
              </label>
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
        )}

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
              <span className="text-[var(--text-primary)] font-medium">Context</span>
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
                      {!isMinimal && (
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
                      )}
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
                {!isMinimal && uiInfo?.summary && (
                  <ContextPill
                    key="ui-info"
                    id="ui-info"
                    title="Interface"
                    type="document"
                    metadata={{}}
                    details={uiInfo.summary}
                    onRemove={() => setUiInfo({ summary: '' })}
                  />
                )}
                {/* Clear All Button */}
                {!isMinimal && (selectedContextDocumentIds.length > 0 || selectedContextFileIds.length > 0) && (
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
              {!isMinimal && !currentUser && selectedContextFileIds.length > 0 && (
                <div className="text-[11px] text-gray-500 italic">
                  Limited file details shown. Sign in to view full metadata.
                </div>
              )}

              {/* Contextual Actions based on selections */}
              {!isMinimal && (selectedContextDocumentIds.length > 0 || selectedContextFileIds.length > 0) && (
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
              {!isMinimal && <div className="border-t border-[var(--border-color)]" />}

              {/* Quick Select: Documents */}
              {!isMinimal && availableDocuments && availableDocuments.length > 0 && (
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
              {!isMinimal && availableDocuments && availableDocuments.length > 0 && availableFiles && availableFiles.length > 0 && (
                <div className="border-t border-[var(--border-color)]" />
              )}

              {/* Quick Select: Files */}
              {!isMinimal && availableFiles && availableFiles.length > 0 && (
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
              {!isMinimal && <ContextPills inline />}
            </div>
          )}
        </div>

        {/* MCP Integration Panel (Chat tab only) */}
        {activeTab === 'chat' && showMcpPanel && !isMinimal && (
          <div className="border border-[var(--border-color)] rounded-md p-2 mb-2 bg-[var(--bg-secondary)]/30">
            <EnhancedMcpPanel onClose={() => onToggleMcpPanel?.()} />
          </div>
        )}

        {/* Chat Input with Model-Aware Upload Support (Chat tab only) */}
        <div className={`${activeTab === 'chat' ? '' : 'hidden'} space-y-2`}>
          {/* Minimal input */}
          {isMinimal && (
            <>
              <div className="p-2 border border-[var(--border-color)] bg-[var(--bg-secondary)]/30 rounded">
                <div className="text-[11px] text-[var(--text-secondary)]">
                  Hint: {activeDocTitle ? `You can ask to summarize or edit “${activeDocTitle}”.` : 'Try quick prompts below.'} Click a chip to fill the box, then edit before sending.
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {activeDocTitle ? (
                    <>
                      <button className="px-2 py-0.5 text-[11px] border rounded hover:bg-[var(--bg-hover)]" onClick={() => handleQuickAction('Summarize this doc')}>Summarize</button>
                      <button className="px-2 py-0.5 text-[11px] border rounded hover:bg-[var(--bg-hover)]" onClick={() => handleQuickAction('Create an outline with key points')}>Outline</button>
                      <button className="px-2 py-0.5 text-[11px] border rounded hover:bg-[var(--bg-hover)]" onClick={() => handleQuickAction('Rewrite the selected text for clarity')}>Rewrite selection</button>
                      <button className="px-2 py-0.5 text-[11px] border rounded hover:bg-[var(--bg-hover)]" onClick={() => handleQuickAction('Find action items in this doc')}>Action items</button>
                    </>
                  ) : (
                    <>
                      <button className="px-2 py-0.5 text-[11px] border rounded hover:bg-[var(--bg-hover)]" onClick={() => handleQuickAction('Find documents about ')}>Find docs…</button>
                      <button className="px-2 py-0.5 text-[11px] border rounded hover:bg-[var(--bg-hover)]" onClick={() => handleQuickAction('Create a new document about ')}>New doc…</button>
                      <button className="px-2 py-0.5 text-[11px] border rounded hover:bg-[var(--bg-hover)]" onClick={() => handleQuickAction('Plan tasks for ')}>Plan tasks…</button>
                      <button className="px-2 py-0.5 text-[11px] border rounded hover:bg-[var(--bg-hover)]" onClick={() => handleQuickAction('Search web for ')}>Search web…</button>
                    </>
                  )}
                </div>
              </div>
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
            </>
          )}

          {!isMinimal && pmOpsPreview && pmOpsPreview.length > 0 && (
            <div className="p-2 border border-[var(--accent-secondary)]/40 bg-[var(--accent-secondary)]/10 rounded">
              <div className="flex items-center justify-between">
                <div className="text-xs text-[var(--text-secondary)]">AI proposed <span className="font-semibold text-[var(--text-primary)]">{pmOpsPreview.length}</span> edit operation{pmOpsPreview.length > 1 ? 's' : ''}.</div>
                <div className="flex gap-2">
                  <button className="px-2 py-1 text-xs rounded" onClick={() => setShowOpsDetails(s => !s)}>{showOpsDetails ? 'Hide details' : 'Details'}</button>
                  {/* Try prev/next occurrence for anchoredReplace ops */}
                  {pmOpsPreview?.some((op: any) => op?.type === 'anchoredReplace') && (
                    <>
                      <button
                        className="px-2 py-1 text-xs rounded border border-[var(--border-color)] hover:bg-[var(--bg-secondary)]"
                        title="Apply using the previous matching anchor occurrence"
                        onClick={() => {
                          try {
                            window.dispatchEvent(new CustomEvent('nodebench:ai:applyPmOperations', {
                              detail: { operations: pmOpsPreview, documentId: selectedDocumentId || undefined, anchorOccurrenceStrategy: 'prev' }
                            }));
                          } catch {}
                        }}
                      >
                        Prev occurrence
                      </button>
                      <button
                        className="px-2 py-1 text-xs rounded border border-[var(--border-color)] hover:bg-[var(--bg-secondary)]"
                        title="Apply using the next matching anchor occurrence"
                        onClick={() => {
                          try {
                            window.dispatchEvent(new CustomEvent('nodebench:ai:applyPmOperations', {
                              detail: { operations: pmOpsPreview, documentId: selectedDocumentId || undefined, anchorOccurrenceStrategy: 'next' }
                            }));
                          } catch {}
                        }}
                      >
                        Next occurrence
                      </button>
                    </>
                  )}

          {/* Hints and quick prompts (Full mode) */}
          {!isMinimal && (
            <div className="p-2 border border-[var(--border-color)] bg-[var(--bg-secondary)]/30 rounded">
              <div className="text-[11px] text-[var(--text-secondary)]">
                Hint: {activeDocTitle ? `You can ask to summarize or edit ${activeDocTitle}.` : 'Try quick prompts below.'} Click a chip to fill the box, then edit before sending.
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {activeDocTitle ? (
                  <>
                    <button className="px-2 py-0.5 text-[11px] border rounded hover:bg-[var(--bg-hover)]" onClick={() => handleQuickAction('Summarize this doc')}>Summarize</button>
                    <button className="px-2 py-0.5 text-[11px] border rounded hover:bg-[var(--bg-hover)]" onClick={() => handleQuickAction('Create an outline with key points')}>Outline</button>
                    <button className="px-2 py-0.5 text-[11px] border rounded hover:bg-[var(--bg-hover)]" onClick={() => handleQuickAction('Rewrite the selected text for clarity')}>Rewrite selection</button>
                    <button className="px-2 py-0.5 text-[11px] border rounded hover:bg-[var(--bg-hover)]" onClick={() => handleQuickAction('Find action items in this doc')}>Action items</button>
                  </>
                ) : (
                  <>
                    <button className="px-2 py-0.5 text-[11px] border rounded hover:bg-[var(--bg-hover)]" onClick={() => handleQuickAction('Find documents about ')}>Find docs</button>
                    <button className="px-2 py-0.5 text-[11px] border rounded hover:bg-[var(--bg-hover)]" onClick={() => handleQuickAction('Create a new document about ')}>New doc</button>
                    <button className="px-2 py-0.5 text-[11px] border rounded hover:bg-[var(--bg-hover)]" onClick={() => handleQuickAction('Plan tasks for ')}>Plan tasks</button>
                    <button className="px-2 py-0.5 text-[11px] border rounded hover:bg-[var(--bg-hover)]" onClick={() => handleQuickAction('Search web for ')}>Search web</button>
                  </>
                )}
              </div>
            </div>
          )}

                  <button className="px-2 py-1 text-xs rounded bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-hover)]" onClick={applyPmOpsPreview}>Apply</button>
                  <button className="px-2 py-1 text-xs rounded border border-[var(--border-color)] hover:bg-[var(--bg-secondary)]" onClick={discardPmOpsPreview}>Discard</button>
                </div>
              </div>
              {showOpsDetails && (
                <div className="mt-2 max-h-40 overflow-auto text-xs bg-white/50 border border-[var(--border-color)] rounded p-2">
                  <ul className="list-disc ml-4 space-y-1">
                    {pmOpsPreview.map((op: any, idx: number) => (
                      <li key={idx} className="text-[var(--text-secondary)]">
                        <span className="text-[var(--text-primary)] font-medium">{op.type}</span>
                        {op.anchor ? <span>  anchor: "{String(op.anchor).slice(0, 64)}"</span> : null}
                        {typeof op.delete === 'string' && op.delete.length > 0 ? <span>  delete: {op.delete.length} chars</span> : null}
                        {typeof op.insert === 'string' && op.insert.length > 0 ? <span>  insert: {op.insert.length} chars</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Tool activity strip */}
          {!isMinimal && lastToolCall && (
            <div className="p-2 border border-[var(--border-color)] bg-[var(--bg-secondary)] rounded text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[var(--text-secondary)]">Last tool:</span>
                <span className="font-medium text-[var(--text-primary)]">{lastToolCall.toolName || lastToolCall.name}</span>
              </div>
              <div className="text-[var(--text-secondary)]">
                {lastToolCall.success === false || lastToolCall.error ? (
                  <span className="text-red-600">Failed</span>
                ) : (
                  <span className="text-green-600">Success</span>
                )}
              </div>
            </div>
          )}

          {/* Text Input Row - Full Width */}
          {!isMinimal && (
          <div className="flex gap-2">
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
          </div>
          )}

          {/* Controls Row - Below Input */}
          {!isMinimal && (
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

            {/* Animated MCP Server Square Icons */}
            <div className="flex items-center gap-1 animate-in fade-in-0 scale-in-95 duration-200">
              {/* No MCP Option */}
              <button
                onClick={() => selectServer(null)}
                className={`group relative w-6 h-6 rounded border-2 transition-all duration-200 hover:scale-105 ${
                  !mcpSessionId
                    ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] shadow-sm scale-105'
                    : 'bg-[var(--bg-secondary)] border-[var(--border-color)] hover:border-[var(--accent-primary)] hover:bg-[var(--bg-hover)]'
                }`}
                title="No MCP - Use standard AI without MCP context"
              >
                <X className={`transition-all duration-200 ${
                  !mcpSessionId
                    ? 'h-3 w-3 text-white m-auto'
                    : 'h-2.5 w-2.5 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] m-auto'
                }`} />

                {/* Selection indicator dot */}
                {!mcpSessionId && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-in zoom-in-0 duration-200" />
                )}
              </button>

              {/* MCP Server Icons */}
              {servers.map((server, index) => {
                const isSelected = mcpSessionId === server._id;
                return (
                  <button
                    key={server._id}
                    onClick={() => selectServer(server._id)}
                    className={`group relative w-6 h-6 rounded border-2 transition-all duration-200 hover:scale-105 animate-in fade-in-0 scale-in-95 ${
                      isSelected
                        ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] shadow-sm scale-105'
                        : 'bg-[var(--bg-secondary)] border-[var(--border-color)] hover:border-[var(--accent-primary)] hover:bg-[var(--bg-hover)]'
                    }`}
                    style={{ animationDelay: `${index * 50}ms` }}
                    title={`${server.name}${server.description ? ` - ${server.description}` : ''} - Click to ${isSelected ? 'deselect' : 'select'}`}
                  >
                    <ServerIcon className={`transition-all duration-200 ${
                      isSelected
                        ? 'h-3 w-3 text-white m-auto'
                        : 'h-2.5 w-2.5 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] m-auto'
                    }`} />

                    {/* Selection indicator dot */}
                    {isSelected && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-in zoom-in-0 duration-200" />
                    )}
                  </button>
                );
              })}

              {/* Show label when servers are available */}
              {servers.length > 0 && (
                <span className="text-xs text-[var(--text-muted)] ml-1 animate-in fade-in-0 slide-in-from-left-2 duration-300">
                  MCP
                </span>
              )}
            </div>

            {/* MCP Panel Toggle (moved from MainLayout) */}
            <button
              onClick={() => onToggleMcpPanel?.()}
              className={`ml-2 px-2 py-1 text-xs rounded border transition-colors ${
                showMcpPanel
                  ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)]'
                  : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
              }`}
              title={`${showMcpPanel ? 'Hide MCP panel' : 'Show MCP panel'}${
                mcpServersList.length ? ` • ${mcpServersList.length} server${mcpServersList.length !== 1 ? 's' : ''}, ${tools?.length ?? 0} tool${(tools?.length ?? 0) !== 1 ? 's' : ''}` : ''
              }`}
              disabled={isLoading}
            >
              <span className="inline-flex items-center gap-1">
                <ServerIcon className="h-3 w-3" />
                <span>MCP Panel</span>
                {(tools?.length ?? 0) > 0 && (
                  <span className="inline-flex items-center justify-center rounded-full bg-[var(--bg-hover)] text-[var(--text-secondary)] px-1 py-[1px] text-[10px] leading-4">
                    {tools?.length}
                  </span>
                )}
              </span>
            </button>

            {/* Mocks (compact, organized) */}
            <details className="ml-2">
              <summary className="px-2 py-1 text-xs border border-[var(--border-color)] rounded cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]">
                Mocks
              </summary>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    const actions = [
                      {
                        type: 'updateNode',
                        nodeId: (selectedNodeId as any) || undefined,
                        markdown: 'This proposal REPLACES the current block with this content.\n\n- old line\n+ new line',
                      },
                    ];
                    const message = 'Test: Replace current block';
                    try {
                      window.dispatchEvent(new CustomEvent('nodebench:aiProposal', { detail: { actions, message } }));
                    } catch (e) {
                      console.warn('Failed to dispatch test replace-block proposal', e);
                    }
                  }}
                  className="px-2 py-1 text-xs border border-[var(--border-color)] rounded hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  title="Replace the current editor block (place your caret in a block before clicking)"
                  disabled={isLoading}
                >
                  Replace Block
                </button>

                <button
                  onClick={() => {
                    const actions = [
                      { type: 'createNode', markdown: '## Inserted Section (Test)\nThis content was inserted below the current block.' },
                    ];
                    const message = 'Test: Insert below current block';
                    try {
                      window.dispatchEvent(new CustomEvent('nodebench:aiProposal', { detail: { actions, message } }));
                    } catch (e) {
                      console.warn('Failed to dispatch test insert proposal', e);
                    }
                  }}
                  className="px-2 py-1 text-xs border border-[var(--border-color)] rounded hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  title="Insert a new section below the current block"
                  disabled={isLoading}
                >
                  Insert Below
                </button>

                <button
                  onClick={() => {
                    if (selectedDocumentId) {
                      try { _onDocumentSelect(selectedDocumentId); } catch {}
                      setTimeout(() => {
                        const actions = [
                          { type: 'updateNode', nodeId: (selectedNodeId as any) || undefined, markdown: 'Open & Diff (Test)\n\n- old\n+ updated' },
                        ];
                        const message = 'Test: Open doc and show diff';
                        try {
                          window.dispatchEvent(new CustomEvent('nodebench:aiProposal', { detail: { actions, message } }));
                        } catch (e) {
                          console.warn('Failed to dispatch test open+diff proposal', e);
                        }
                      }, 200);
                    } else {
                      try { console.warn('No selected document for Open & Diff test.'); } catch {}
                    }
                  }}
                  className="px-2 py-1 text-xs border border-[var(--border-color)] rounded hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  title="Open the selected document and show a diff (replace current block)"
                  disabled={isLoading}
                >
                  Open & Diff
                </button>

                <button
                  onClick={() => {
                    // List reorder mock (will visualize as "moved" in list-aware diff)
                    const before = '- Alpha\n- Beta\n- Gamma';
                    const after = '- Beta\n- Alpha\n- Gamma';
                    const actions = [
                      { type: 'updateNode', nodeId: (selectedNodeId as any) || undefined, markdown: `List reorder (Test)\n\n${after}` },
                    ];
                    const message = 'Test: List reorder';
                    try {
                      window.dispatchEvent(new CustomEvent('nodebench:aiProposal', { detail: { actions, message } }));
                    } catch (e) {
                      console.warn('Failed to dispatch list reorder mock', e);
                    }
                  }}
                  className="px-2 py-1 text-xs border border-[var(--border-color)] rounded hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  title="Simulate list item reordering"
                  disabled={isLoading}
                >
                  List Reorder
                </button>

                <button
                  onClick={() => {
                    // Code changes mock (Prism highlighting + intraline markers)
                    const code = '```ts\nexport function add(a: number, b: number) {\n  return a + b;\n}\n```';
                    const code2 = '```ts\nexport function add(a: number, b: number, c = 0) {\n  return a + b + c;\n}\n```';
                    const actions = [
                      { type: 'updateNode', nodeId: (selectedNodeId as any) || undefined, markdown: `Code change (Test)\n\n${code2}` },
                    ];
                    const message = 'Test: Code changes';
                    try {
                      window.dispatchEvent(new CustomEvent('nodebench:aiProposal', { detail: { actions, message } }));
                    } catch (e) {
                      console.warn('Failed to dispatch code change mock', e);
                    }
                  }}
                  className="px-2 py-1 text-xs border border-[var(--border-color)] rounded hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  title="Simulate code edits"
                  disabled={isLoading}
                >
                  Code Changes
                </button>

                <button
                  onClick={() => {
                    try {
                      const id = generateUniqueId('assistant');
                      const thinkingSteps: ThinkingStep[] = [
                        { type: 'thinking', content: 'Analyzing the request and available context…', timestamp: new Date() },
                        { type: 'tool_call', content: 'Calling proposeNode to draft a new section', timestamp: new Date(), toolCall: { name: 'proposeNode', args: { topic: 'Sample' } } },
                        { type: 'result', content: 'Drafted a new section mock result', timestamp: new Date() },
                      ];
                      setMessages((prev) => prev.concat({ id, type: 'assistant', content: 'Here is my thinking process (mock).', timestamp: new Date(), thinkingSteps, isThinking: false }));
                    } catch (e) {
                      console.warn('Failed to append mock thinking message', e);
                    }
                  }}
                  className="px-2 py-1 text-xs border border-[var(--border-color)] rounded hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  title="Append a mock assistant message with thinking steps"
                  disabled={isLoading}
                >
                  Thinking Msg
                </button>

                <button
                  onClick={() => {
                    try {
                      const id = generateUniqueId('assistant');
                      const candidateDocs = [
                        { documentId: 'mock-doc-1' as any, title: 'Mock Doc Alpha', score: 0.92, snippet: 'Alpha summary snippet lorem ipsum…', source: 'RAG' },
                        { documentId: 'mock-doc-2' as any, title: 'Mock Doc Beta', score: 0.87, snippet: 'Beta summary snippet dolor sit…', source: 'RAG' },
                      ];
                      setMessages((prev) => prev.concat({ id, type: 'assistant', content: 'I found these related documents (mock).', timestamp: new Date(), candidateDocs }));
                    } catch (e) {
                      console.warn('Failed to append mock candidate docs message', e);
                    }
                  }}
                  className="px-2 py-1 text-xs border border-[var(--border-color)] rounded hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  title="Append a mock assistant message with candidate documents"
                  disabled={isLoading}
                >
                  RAG Msg
                </button>
              </div>
            </details>
          </div>
          )}
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