import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id, Doc } from "../../convex/_generated/dataModel";
import { 
  Search, 
  Plus, 
  FileText, 
  Trash2,
  Globe,
  Bot,
  ChevronLeft,
  Trash,
  Undo2,
  MessageSquare,
  BookUser,
  Mail,
  Inbox,
  Hash,
  Gamepad2,
  Server,
  Webhook,
  Phone,
  Zap,
  Home,
  Star,
  Tag,
  Calendar,
  Settings,
  X,
  ChevronDown,
  ChevronRight,
  FileCheck,
  Upload,
  Loader2,
  Lightbulb,
  Wrench,
  Share2,
  Move,
  CheckSquare,
  Play,
  Clock,
} from "lucide-react";
import { SignOutButton } from "../SignOutButton";
// Removed SearchCommand overlay in favor of inline search/filter panel
import { EnhancedMcpPanel } from "./EnhancedMcpPanel";
import { toast } from "sonner";
import { createCalendarDocument } from "../lib/calendarHelpers";
import { FileTypeIcon } from "./FileTypeIcon";
import { inferFileType, type FileType } from "../lib/fileTypes";
import TaskEditorPanel from "./TaskEditorPanel";
import { SortableList } from "./SortableList";

// Unified item rendering
import { UnifiedRow } from "@/components/unified/UnifiedRow";
import type { UnifiedItem } from "@/types/unified";

/* 
  CSS Classes used in this component (add to your global CSS or CSS modules):
  
  .tree-item-icon {
    width: 14px;
    height: 14px;
    opacity: 0.7;
  }

// Compact per-tool history list used in Tools Panel
function McpToolHistoryList({ toolId, onRun }: { toolId: Id<'mcpTools'>; onRun?: (h: any) => void }) {
  const history = useQuery(api.mcp.listToolHistory, toolId ? { toolId, limit: 5 } : 'skip') as any[] | undefined;
  if (!history || history.length === 0) return null;
  return (
    <ul className="space-y-0.5">
      {history.map((h) => (
        <li key={h._id}>
          <button
            type="button"
            onClick={() => onRun?.(h)}
            className="w-full relative overflow-hidden pl-1.5 py-0.5 pr-1 rounded-sm border border-[var(--border-color)] bg-[var(--bg-secondary)] cursor-pointer hover:bg-[var(--bg-hover)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)] transition-colors"
            title={h.naturalLanguageQuery}
          >
            <div className="min-w-0 flex flex-col gap-0.5">
              <div className="flex items-center gap-2 min-w-0">
                <Play className="inline-block h-3 w-3 text-[var(--text-secondary)]" />
                <span className="truncate text-[var(--text-primary)] text-[11px] leading-4">{h.naturalLanguageQuery}</span>
                <span className="ml-auto inline-flex items-center gap-1 px-1 py-[1px] rounded-sm border border-[var(--border-color)] bg-[var(--bg-hover)] text-[9px] text-[var(--text-secondary)]">
                  <Clock className="h-3 w-3" />
                  {new Date(h.createdAt).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
  .tree-item-self.selected .tree-item-icon {
    opacity: 1;
  }

  .tree-item-title {
    line-height: 1.2;
  }

  .group/doc:hover .tree-item-icon {
    opacity: 1;
  }

  .tree-item-self {
    min-height: 32px;
    transform-origin: center;
  }
  
  .message-item,
  .group/pub,
  .group/trash {
    transform-origin: center;
  }

  @keyframes pulse-blue {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.1); }
  }

  .w-1\\.5.h-1\\.5.bg-blue-500 {
    animation: pulse-blue 2s infinite;
  }
*/

interface SidebarProps {
  onDocumentSelect: (documentId: Id<"documents"> | null) => void;
  selectedDocumentId: Id<"documents"> | null;
  currentView: 'documents' | 'public';
  onViewChange: (view: 'documents' | 'public') => void;
  showAIChat: boolean;
  onToggleAIChat: () => void;
  onSmsReceived?: (from: string, message: string) => void;
  openDocumentIds?: Id<"documents">[];
  isGridMode?: boolean;
  selectedFileIds?: Id<"files">[];
  onFileSelectionChange?: (selectedFileIds: Id<"files">[]) => void;
  onOpenSettings?: (
    tab?: 'profile' | 'account' | 'usage' | 'integrations' | 'billing' | 'reminders'
  ) => void;
}

export function Sidebar({ 
  onDocumentSelect, 
  selectedDocumentId,
  currentView,
  onViewChange,
  showAIChat,
  onToggleAIChat,
  onSmsReceived,
  onOpenSettings
}: SidebarProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  // Data queries
  const userPreferences = useQuery(api.userPreferences.getUserPreferences);
  const updateUserPrefs = useMutation(api.userPreferences.updateUserPreferences);
  
  // Folder organization state
  const [selectedDocuments, setSelectedDocuments] = useState<Set<Id<"documents">>>(new Set());
  // Bulk action modals state
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [targetFolderId, setTargetFolderId] = useState<Id<"folders"> | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [sharePublic, setSharePublic] = useState(true);
  
  // Document title editing state
  const [editingDocumentId, setEditingDocumentId] = useState<Id<"documents"> | null>(null);
  const [editingDocumentTitle, setEditingDocumentTitle] = useState('');
  const editingTitleInputRef = useRef<HTMLInputElement>(null);
  
  // Quick actions menu state
  const [quickActionsFor, setQuickActionsFor] = useState<Id<"documents"> | null>(null);
  
  // Auto-refresh timer tick (force rerender of relative timestamps)
  const [nowTick, setNowTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setNowTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // (moved handlers below hooks)

  // Hooks needed by task helpers (must be declared before use)
  const user = useQuery(api.auth.loggedInUser);
  const createTaskMutation = useMutation(api.tasks.createTask);
  const updateTaskMutation = useMutation(api.tasks.updateTask);

  // Tasks helpers
  const _openTaskEditor = useCallback((taskId: Id<"tasks">) => {
    setTaskPanelTaskId(taskId);
  }, []);

  const _handleCreateTask = useCallback(async () => {
    try {
      if (!user) {
        toast.error("Please sign in to create tasks");
        return;
      }
      const newId = await createTaskMutation({ title: "New Task" });
      setTaskPanelTaskId(newId);
    } catch (e) {
      console.error(e);
      toast.error("Failed to create task");
    }
  }, [createTaskMutation, user]);
 
  
  // Trash state
  const [isTrashOpen, setIsTrashOpen] = useState(false);

  // SMS state
  const [showSmsPanel, setShowSmsPanel] = useState(false);
  const [smsTo, setSmsTo] = useState("+1-555-MOCK-AI");
  const [smsMessage, setSmsMessage] = useState("");
  const [_isSmsSending, _setIsSmsSending] = useState(false);
  
  // Email state
  const [showEmailPanel, setShowEmailPanel] = useState(false);
  const [emailTo, setEmailTo] = useState("ai@example.com");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  
  // Gmail state
  const [showGmailPanel, setShowGmailPanel] = useState(false);
  const gmailConnection = useQuery(api.gmail.getConnection);
  const fetchGmailInbox = useAction(api.gmail.fetchInbox);
  const [gmailLoading, setGmailLoading] = useState(false);
  const [gmailMessages, setGmailMessages] = useState<Array<{
    id: string;
    threadId?: string;
    snippet?: string;
    subject?: string;
    from?: string;
    date?: string;
  }>>([]);
  
  // Additional communication channels state
  const [showSlackPanel, setShowSlackPanel] = useState(false);
  const [slackChannel, setSlackChannel] = useState("#ai-chat");
  const [slackMessage, setSlackMessage] = useState("");
  const [showDiscordPanel, setShowDiscordPanel] = useState(false);
  const [discordChannel, setDiscordChannel] = useState("#general");
  const [discordMessage, setDiscordMessage] = useState("");
  const [showMcpManager, setShowMcpManager] = useState(false);
  
  // MCP UI state
  const [showMcpPanel, setShowMcpPanel] = useState(false);
  // Tools panel state
  const [showToolsPanel, setShowToolsPanel] = useState(false);
  // Inline URL analysis panel state
  const [showUrlPanel, setShowUrlPanel] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  
  // Flow Panel state
  const [showFlowPanel, setShowFlowPanel] = useState(false);
  const [flowCommand, setFlowCommand] = useState("");
  const [activeFlows, setActiveFlows] = useState<Array<{
    id: string;
    command: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    createdAt: number;
    designDocId?: Id<"documents">;
  }>>([]);
  const [isFlowRunning, setIsFlowRunning] = useState(false);
  
  // Tab state for Communication Hub
  type CommunicationTab = 'documents' | 'messages' | 'reports';
  const [activeTab, setActiveTab] = useState<CommunicationTab>('documents');
  
  // Context selection state
  const [selectedContextDocumentIds, setSelectedContextDocumentIds] = useState<Id<"documents">[]>([]);
  const [selectedContextFileIds, setSelectedContextFileIds] = useState<Id<"files">[]>([]);
  const [showContext, setShowContext] = useState(false);
  const [contextViewMode, setContextViewMode] = useState<'flat' | 'hierarchical'>('flat');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['documents', 'dataFiles', 'mediaFiles', 'codeFiles']));
  // Task editor panel state
  const [taskPanelTaskId, setTaskPanelTaskId] = useState<Id<"tasks"> | null>(null);
  // Tasks sorting/filter
  const [tasksSortBy, setTasksSortBy] = useState<"updated" | "due" | "priority" | "title">("updated");
  const [tasksSortOrder, setTasksSortOrder] = useState<"asc" | "desc">("desc");
  const [tasksFilter, setTasksFilter] = useState<"all" | "open" | "completed">("all");
  
  // Separate collapse state for Documents/Tasks subgroups
  const [collapsedDocGroups, setCollapsedDocGroups] = useState<Set<string>>(new Set());
  const [collapsedTaskGroups, setCollapsedTaskGroups] = useState<Set<string>>(new Set());
  // Multi-select state for documents
  const [docSelectionAnchor, setDocSelectionAnchor] = useState<{ group: string; id: Id<"documents"> } | null>(null);
  const docsKeyboardScopeRef = useRef<HTMLDivElement | null>(null);
  
  // Drag-and-drop ordering for document cards (per group)
  const [docOrderByGroup, setDocOrderByGroup] = useState<Record<string, Array<Id<"documents">>>>({});
  const groupDocsRef = useRef<Record<string, Array<Id<"documents">>>>({});
  // Debounced save of document order to preferences
  const saveOrderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const schedulePersistDocOrder = useCallback((newMap: Record<string, Array<Id<"documents">>>) => {
    if (saveOrderTimer.current) clearTimeout(saveOrderTimer.current);
    saveOrderTimer.current = setTimeout(() => {
      updateUserPrefs({ docOrderByGroup: newMap }).catch((err: any) => {
        console.error("Failed to save document order", err);
        toast.error("Failed to save document order");
      });
    }, 400);
  }, [updateUserPrefs]);
  useEffect(() => {
    return () => {
      if (saveOrderTimer.current) {
        clearTimeout(saveOrderTimer.current);
      }
    };
  }, []);
  
  // Drag state for Integrate section icons (dnd-kit)
  const [_isReordering, setIsReordering] = useState(false);
  const [hasBeenDragged, setHasBeenDragged] = useState(false);
  
  const [iconOrder, setIconOrder] = useState([
    // Prioritized icons in requested order
    'flow', 'tools', 'mcp', 'sms', 'email', 'gmail', 'phone',
    // Remaining icons preserve previous relative order
    'slack', 'discord', 'webhook', 'zapier'
  ]);

  // Initialize icon order from backend preferences once loaded
  useEffect(() => {
    const incoming = userPreferences?.iconOrder;
    if (Array.isArray(incoming) && incoming.length > 0) {
      setIconOrder(incoming);
    }
  }, [userPreferences]);
  // Initialize document order from backend preferences once loaded/updated
  useEffect(() => {
    const incoming = userPreferences?.docOrderByGroup;
    if (incoming && typeof incoming === "object") {
      setDocOrderByGroup((prev) => ({ ...prev, ...incoming }));
    }
  }, [userPreferences]);
  
  // Document sorting and filtering state
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'title'>('updated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterText, setFilterText] = useState('');
  
  // Unified work items hook removed; explicit Documents/Tasks sections are used.
  
  // File upload state
  const [_isFileUploading, setIsFileUploading] = useState(false);
  const [_uploadProgress, setUploadProgress] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const documents = useQuery(api.documents.getSidebarWithOptions, { 
    sortBy, 
    sortOrder
  });
  const publicDocuments = useQuery(api.documents.getPublic);
  const trash = useQuery(api.documents.getTrash);
  
  const toolsList = useQuery(api.aiAgents.listAgentTools);
  // MCP tools (to map Agent Tool names to MCP tools when possible)
  const mcpToolsAll = useQuery(api.mcp.getMcpTools, {}) || [];
  const callMcpTool = useAction(api.mcpClient.callMcpTool);
  // All user files (for mapping names when analyzing selected files)
  const userFilesAll = useQuery(api.files.getUserFiles, { limit: 200 });
  // Tasks
  const recentTasks = useQuery(api.tasks.listTasksByUpdatedDesc, { limit: 20 });
  const createDocument = useMutation(api.documents.create);
  const createWithSnapshot = useMutation(api.prosemirror.createDocumentWithInitialSnapshot);
  const updateDocument = useMutation(api.documents.update);
  const archiveDocument = useMutation(api.documents.archive);
  const restoreDocument = useMutation(api.documents.restore);
  const removeDocument = useMutation(api.documents.remove);
  const clearTrash = useMutation(api.documents.clearTrash);
  const toggleFavorite = useMutation(api.documents.toggleFavorite);
  const toggleTaskFavorite = useMutation(api.tasks.toggleFavorite);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const createFile = useMutation(api.files.createFile);
  // Folders & Tags
  const userFolders = useQuery(api.folders.getUserFolders);
  const addDocumentToFolder = useMutation(api.folders.addDocumentToFolder);
  const addTagsToDocument = useMutation(api.tags.addTagsToDocument);
  const analyzeFileWithGenAI = useAction(api.fileAnalysis.analyzeFileWithGenAI);
  // Compute sorted/filtered tasks for sidebar display
  const sortedTasks = useMemo(() => {
    if (!recentTasks) return undefined;
    const text = (filterText || "").toLowerCase();
    const filtered = recentTasks.filter((t: any) => {
      const textOk = text ? (t.title || "").toLowerCase().includes(text) : true;
      const statusOk = tasksFilter === "all" ? true : (tasksFilter === "completed" ? t.status === "done" : t.status !== "done");
      return textOk && statusOk;
    });
    const factor = tasksSortOrder === "asc" ? 1 : -1;
    return [...filtered].sort((a: any, b: any) => {
      if (tasksSortBy === "updated") {
        const av = a.updatedAt ?? a._creationTime ?? 0;
        const bv = b.updatedAt ?? b._creationTime ?? 0;
        return (av - bv) * factor;
      } else if (tasksSortBy === "due") {
        const av = typeof a.dueDate === "number" ? a.dueDate : Number.MAX_SAFE_INTEGER;
        const bv = typeof b.dueDate === "number" ? b.dueDate : Number.MAX_SAFE_INTEGER;
        if (av !== bv) return (av - bv) * factor;
        const au = a.updatedAt ?? 0, bu = b.updatedAt ?? 0;
        return (au - bu) * factor;
      } else if (tasksSortBy === "priority") {
        const rank: Record<string, number> = { low: 1, medium: 2, high: 3, urgent: 4 };
        const av = rank[a.priority || "low"] || 0;
        const bv = rank[b.priority || "low"] || 0;
        if (av !== bv) return (av - bv) * factor;
        return ((a.updatedAt ?? 0) - (b.updatedAt ?? 0)) * factor;
      } else {
        const at = (a.title || "").toLowerCase();
        const bt = (b.title || "").toLowerCase();
        if (at < bt) return -1 * factor;
        if (at > bt) return 1 * factor;
        return 0;
      }
    });
  }, [recentTasks, filterText, tasksFilter, tasksSortBy, tasksSortOrder]);

  // Filtered documents for grouping (search bar applies to documents)
  const filteredDocuments = useMemo(() => {
    if (!documents) return undefined;
    const text = (filterText || "").toLowerCase();
    return documents.filter((d) => (text ? (d.title || "").toLowerCase().includes(text) : true));
  }, [documents, filterText]);

  // Map helpers to reuse UnifiedRow
  const toUnifiedFromDoc = useCallback((doc: Doc<"documents">): UnifiedItem => {
    const lastModified: number = doc.lastModified ?? doc._creationTime;
    return {
      id: String(doc._id),
      type: "doc",
      title: doc.title,
      isFavorite: !!doc.isFavorite,
      updatedAt: lastModified,
      createdAt: doc._creationTime,
    };
  }, []);

  const toUnifiedFromTask = useCallback((t: any): UnifiedItem => {
    return {
      id: String(t._id),
      type: "task",
      title: t.title || "(untitled)",
      isFavorite: !!t.isFavorite,
      status: t.status,
      priority: t.priority,
      dueDate: typeof t.dueDate === "number" ? t.dueDate : null,
      updatedAt: t.updatedAt ?? t._creationTime ?? Date.now(),
      createdAt: t._creationTime ?? Date.now(),
      sourceDocId: t.sourceDocId || null,
      sourceBlockId: t.sourceBlockId || null,
    };
  }, []);

  // Group documents into Pinned / Recent / This Week / Older
  const docGroupsComputed = useMemo(() => {
    const groups: Record<string, any[]> = { Pinned: [], Recent: [], "This Week": [], Older: [] };
    if (!filteredDocuments) return groups;
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const sevenDays = 7 * oneDay;
    for (const d of filteredDocuments) {
      const lastModified: number = (d as any)?.lastModified ?? d._creationTime;
      if (d.isFavorite) {
        groups["Pinned"].push(d);
        continue;
      }
      const age = now - lastModified;
      if (age <= oneDay) groups["Recent"].push(d);
      else if (age <= sevenDays) groups["This Week"].push(d);
      else groups["Older"].push(d);
    }
    return groups;
  }, [filteredDocuments]);

  // Group tasks into Overdue / Today / This Week / Upcoming / No Due Date
  const taskGroupsComputed = useMemo(() => {
    const groups: Record<string, any[]> = { Overdue: [], Today: [], "This Week": [], Upcoming: [], "No Due Date": [] };
    if (!sortedTasks) return groups;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfToday = startOfToday + 24 * 60 * 60 * 1000 - 1;
    const endOfWeek = startOfToday + 7 * 24 * 60 * 60 * 1000 - 1;
    for (const t of sortedTasks) {
      const due: number | null = typeof t.dueDate === "number" ? t.dueDate : null;
      if (!due) {
        groups["No Due Date"].push(t);
        continue;
      }
      if (t.status !== "done" && due < startOfToday) groups["Overdue"].push(t);
      else if (due >= startOfToday && due <= endOfToday) groups["Today"].push(t);
      else if (due > endOfToday && due <= endOfWeek) groups["This Week"].push(t);
      else groups["Upcoming"].push(t);
    }
    return groups;
  }, [sortedTasks]);

  // Unified Work Item handlers
  const openWorkItem = useCallback((item: UnifiedItem) => {
    if (item.type === "doc") {
      onDocumentSelect(item.id as any);
    } else {
      setTaskPanelTaskId(item.id as any);
    }
  }, [onDocumentSelect, setTaskPanelTaskId]);

  const toggleFavoriteUnified = useCallback(async (item: UnifiedItem) => {
    try {
      if (item.type === "doc") {
        await toggleFavorite({ id: item.id as any });
      } else {
        await toggleTaskFavorite({ taskId: item.id as any });
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to update favorite status");
    }
  }, [toggleFavorite, toggleTaskFavorite]);

  const toggleDoneUnified = useCallback(async (item: UnifiedItem) => {
    if (item.type !== "task") return;
    try {
      const next = item.status === "done" ? "todo" : "done";
      await updateTaskMutation({ taskId: item.id as any, status: next });
      toast.success(next === "done" ? "Marked as done" : "Reopened task");
    } catch (e) {
      console.error(e);
      toast.error("Failed to update status");
    }
  }, [updateTaskMutation]);

  // Void-returning wrappers for UnifiedRow props
  const onToggleFavoriteVoid = useCallback((item: UnifiedItem) => {
    void toggleFavoriteUnified(item);
  }, [toggleFavoriteUnified]);

  const onToggleDoneVoid = useCallback((item: UnifiedItem) => {
    void toggleDoneUnified(item);
  }, [toggleDoneUnified]);

  // Removed: toggleWorkGroup for unified items

  const toggleDocGroup = useCallback((groupName: string) => {
    setCollapsedDocGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupName)) next.delete(groupName); else next.add(groupName);
      return next;
    });
  }, []);

  const toggleTaskGroup = useCallback((groupName: string) => {
    setCollapsedTaskGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupName)) next.delete(groupName); else next.add(groupName);
      return next;
    });
  }, []);

  // Helpers for document selection
  const isAnyDocSelected = selectedDocuments.size > 0;
  const clearDocSelection = useCallback(() => {
    setSelectedDocuments(new Set<Id<"documents">>());
    setDocSelectionAnchor(null);
  }, []);

  const toggleDocSelection = useCallback((id: Id<"documents">) => {
    setSelectedDocuments((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const selectRangeInGroup = useCallback((groupDocs: Array<{ _id: Id<"documents"> }>, fromId: Id<"documents">, toId: Id<"documents">) => {
    const ids = groupDocs.map((d) => d._id);
    const start = ids.indexOf(fromId);
    const end = ids.indexOf(toId);
    if (start === -1 || end === -1) return;
    const [lo, hi] = start <= end ? [start, end] : [end, start];
    setSelectedDocuments((prev) => {
      const next = new Set(prev);
      for (let i = lo; i <= hi; i++) next.add(ids[i]);
      return next;
    });
  }, []);

  const selectAllVisibleDocs = useCallback(() => {
    if (!filteredDocuments) return;
    const all = new Set<Id<"documents">>(filteredDocuments.map((d) => d._id as Id<"documents">));
    setSelectedDocuments(all);
  }, [filteredDocuments]);

  // Folder queries/mutations for document organization (declared below alongside other folder queries)
  
  // Auto-pinning disabled:
  // Previously, this component would auto-pin the current month calendar document
  // by detecting titles like "📅 March 2024" and calling `toggleFavorite`.
  // This behavior has been intentionally removed to prevent automatic favorites.
  // Real email sender (Resend-backed Convex action)
  const sendEmail = useAction(api.email.sendEmail);
  
  // Calendar creation state
  const [isCreatingCalendar, setIsCreatingCalendar] = useState(false);
  const [customCalendarSuffix, setCustomCalendarSuffix] = useState('');
  
  // Handler to create new prepopulated calendar documents
  const handleCreateCalendar = async () => {
    setIsCreatingCalendar(true);
    try {
      const suffix = customCalendarSuffix.trim() || undefined;
      const docId = await createCalendarDocument(createWithSnapshot, suffix);
      
      // Auto-pin the newly created calendar document once upon creation
      let pinned = false;
      try {
        await toggleFavorite({ id: docId });
        pinned = true;
      } catch (e) {
        console.warn("Failed to auto-pin new calendar doc", e);
      }

      onDocumentSelect(docId);
      setCustomCalendarSuffix('');
      toast.success(`Calendar created successfully${suffix ? ` - ${suffix}` : ''}!${pinned ? ' (Pinned)' : ''}`);
      
    } catch (error) {
      console.error('Failed to create calendar:', error);
      toast.error('Failed to create calendar document');
    } finally {
      setIsCreatingCalendar(false);
    }
  };

  // Helper functions
  const formatTimeAgo = useCallback((timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(diff / (1000 * 60 * 60 * 24 * 7));
    
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return `${weeks}w`;
  }, []);

  // Format a due timestamp relative to now with direction.
  // Examples: "in 55m" for future times, "55m ago" for past due.
  const formatDue = useCallback((timestamp: number) => {
    const now = Date.now();
    const diff = timestamp - now; // positive => in future, negative => past
    const abs = Math.abs(diff);

    // Avoid showing 0m; round up to 1m for < 60s
    if (abs < 60_000) return diff > 0 ? "in 1m" : "1m ago";

    const minutes = Math.floor(abs / (1000 * 60));
    const hours = Math.floor(abs / (1000 * 60 * 60));
    const days = Math.floor(abs / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(abs / (1000 * 60 * 60 * 24 * 7));

    let val: string;
    if (minutes < 60) val = `${minutes}m`;
    else if (hours < 24) val = `${hours}h`;
    else if (days < 7) val = `${days}d`;
    else val = `${weeks}w`;

    return diff > 0 ? `in ${val}` : `${val} ago`;
  }, []);

  const getFileTypeFromDocument = useCallback((doc: any): FileType => {
    // Treat non-file or text docs as Nodebench docs (nbdoc)
    const isNodebenchDoc = !doc.documentType || doc.documentType === 'text';
    return inferFileType({ name: doc.title, mimeType: doc?.mimeType, isNodebenchDoc });
  }, []);

  // === ensureMimeType (ADDED) ===
  function ensureMimeType(file: File): string {
    if (file.type && file.type !== "application/octet-stream") return file.type;
    const ext = file.name.toLowerCase().split(".").pop() || "";
    const byExt: Record<string, string> = {
      pdf: "application/pdf",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      csv: "text/csv",
      txt: "text/plain",
      md: "text/markdown",
      json: "application/json",
      jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif",
      mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm",
      mp3: "audio/mpeg", wav: "audio/wav", aac: "audio/aac", ogg: "audio/ogg",
    };
    return byExt[ext] || "application/octet-stream";
  }

  const toggleDocumentInContext = useCallback((documentId: Id<"documents">) => {
    setSelectedContextDocumentIds(prev => 
      prev.includes(documentId) 
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    );
  }, []);

  const toggleFileInContext = useCallback((fileId: Id<"files">) => {
    setSelectedContextFileIds(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  }, []);

  const getGroupInfo = useCallback((groupKey: string) => {
    const groupMap: Record<string, { name: string; icon: any; color: string }> = {
      documents: { name: 'Documents', icon: FileText, color: 'text-[var(--folder-icon)]' },
      dataFiles: { name: 'Data Files', icon: FileCheck, color: 'text-[var(--folder-icon)]' },
      mediaFiles: { name: 'Media Files', icon: Upload, color: 'text-[var(--folder-icon)]' },
      codeFiles: { name: 'Code Files', icon: Settings, color: 'text-[var(--folder-icon)]' }
    };
    return groupMap[groupKey] || { name: 'Other', icon: FileText, color: 'text-[var(--folder-icon)]' };
  }, []);

  const renderFlatContextView = useCallback((selectedDocuments: any[], selectedFiles: any[]) => {
    return (
      <div className="p-3 space-y-2">
        {selectedDocuments.map(doc => {
          const fileType = getFileTypeFromDocument(doc);
          return (
            <div key={doc._id} className="flex items-center gap-2 p-2 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-hover)] transition-colors">
              <FileTypeIcon type={fileType} className="h-4 w-4" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[var(--text-primary)] truncate">{doc.title}</div>
                <div className="text-xs text-[var(--text-secondary)]">{formatTimeAgo(doc._creationTime)}</div>
              </div>
              <button
                onClick={() => toggleDocumentInContext(doc._id)}
                className="p-1 hover:bg-[var(--bg-hover)] rounded-md transition-colors"
                title="Remove from context"
              >
                <X className="h-3 w-3 text-[var(--text-secondary)]" />
              </button>
            </div>
          );
        })}
        {selectedFiles.map(file => (
          <div key={file._id} className="flex items-center gap-2 p-2 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-hover)] transition-colors">
            <FileTypeIcon type={inferFileType({ name: file.fileName, mimeType: file?.mimeType })} className="h-4 w-4" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[var(--text-primary)] truncate">{file.fileName}</div>
              <div className="text-xs text-[var(--text-secondary)]">{formatTimeAgo(file._creationTime)}</div>
            </div>
            <button
              onClick={() => toggleFileInContext(file._id)}
              className="p-1 hover:bg-[var(--bg-hover)] rounded-md transition-colors"
              title="Remove from context"
            >
              <X className="h-3 w-3 text-[var(--text-secondary)]" />
            </button>
          </div>
        ))}
      </div>
    );
  }, [getFileTypeFromDocument, formatTimeAgo, toggleDocumentInContext, toggleFileInContext]);

  const renderHierarchicalContextView = useCallback((selectedDocuments: any[], selectedFiles: any[]) => {
    const groups = {
      documents: selectedDocuments,
      dataFiles: selectedFiles.filter(f => ['csv', 'excel', 'json'].includes(f.fileType)),
      mediaFiles: selectedFiles.filter(f => ['image', 'video', 'audio'].includes(f.fileType)),
      codeFiles: selectedFiles.filter(f => ['code', 'text'].includes(f.fileType))
    };

    return (
      <div className="p-3 space-y-3">
        {Object.entries(groups).map(([groupKey, items]) => {
          if (items.length === 0) return null;
          const isExpanded = expandedGroups.has(groupKey);
          const groupInfo = getGroupInfo(groupKey);
          const GroupIcon = groupInfo.icon;

          return (
            <div key={groupKey}>
              <button
                onClick={() => {
                  const newExpanded = new Set(expandedGroups);
                  if (isExpanded) {
                    newExpanded.delete(groupKey);
                  } else {
                    newExpanded.add(groupKey);
                  }
                  setExpandedGroups(newExpanded);
                }}
                className="flex items-center gap-2 w-full p-2 text-left transition-colors"
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <GroupIcon className={`h-4 w-4 ${groupInfo.color}`} />
                <span className="text-sm font-medium text-[var(--text-primary)]">{groupInfo.name}</span>
                <span className="ml-auto text-xs text-[var(--text-secondary)]">{items.length}</span>
              </button>
              
              {isExpanded && (
                <div className="ml-6 mt-2 space-y-1 pl-3">
                  {items.map((item: any) => {
                    const isDocument = 'title' in item;
                    const fileType: FileType = isDocument
                      ? getFileTypeFromDocument(item)
                      : inferFileType({ name: item.fileName, mimeType: item?.mimeType });
                     
                    return (
                      <div key={item._id} className="flex items-center gap-2 p-2 transition-colors">
                        <FileTypeIcon type={fileType} className="h-3 w-3" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-[var(--text-primary)] truncate">
                            {isDocument ? item.title : item.fileName}
                          </div>
                          <div className="text-xs text-[var(--text-secondary)]">{formatTimeAgo(item._creationTime)}</div>
                        </div>
                        <button
                          onClick={() => isDocument ? toggleDocumentInContext(item._id) : toggleFileInContext(item._id)}
                          className="p-1 transition-colors"
                          title="Remove from context"
                        >
                          <X className="h-3 w-3 text-red-500" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }, [expandedGroups, setExpandedGroups, getGroupInfo, getFileTypeFromDocument, formatTimeAgo, toggleDocumentInContext, toggleFileInContext]);

  const renderContextSection = useCallback(() => {
    if (!showContext) return null;
    
    const availableFiles: any[] = [];
    const selectedDocuments = documents?.filter(doc => selectedContextDocumentIds.includes(doc._id)) || [];
    const selectedFiles = availableFiles.filter(file => selectedContextFileIds.includes(file._id)) || [];
    
    if (selectedDocuments.length === 0 && selectedFiles.length === 0) {
      return (
        <div className="border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] overflow-hidden mb-4">
          <div className="flex items-center justify-between p-3 border-b border-[var(--border-color)]">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-[var(--text-secondary)]" />
              <span className="text-sm font-medium text-[var(--text-primary)]">AI Context (0)</span>
            </div>
            <button
              onClick={() => setShowContext(false)}
              className="p-1 hover:bg-[var(--bg-hover)] rounded-md transition-colors"
              title="Hide context panel"
            >
              <X className="h-3 w-3 text-[var(--text-secondary)]" />
            </button>
          </div>
          <div className="p-3 text-center text-sm text-[var(--text-secondary)]">
            <FileText className="h-4 w-4 mx-auto mb-2 opacity-50" />
            <p>No context selected</p>
            <p className="text-xs mt-1">Add documents or files to provide context for AI responses</p>
          </div>
        </div>
      );
    }

    const contextHeader = (
      <div className="flex items-center justify-between p-3 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-[var(--text-secondary)]" />
          <span className="text-sm font-medium text-[var(--text-primary)]">
            AI Context ({selectedDocuments.length + selectedFiles.length})
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[var(--bg-secondary)] rounded p-1 border border-[var(--border-color)]">
            <button
              onClick={() => setContextViewMode('flat')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                contextViewMode === 'flat'
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
              }`}
              title="Flat view"
            >
              Flat
            </button>
            <button
              onClick={() => setContextViewMode('hierarchical')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                contextViewMode === 'hierarchical'
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
              }`}
              title="Hierarchical view"
            >
              Tree
            </button>
          </div>
          <button
            onClick={() => setShowContext(false)}
            className="p-1 hover:bg-[var(--bg-hover)] rounded-md transition-colors"
            title="Hide context panel"
          >
            <X className="h-3 w-3 text-[var(--text-secondary)]" />
          </button>
        </div>
      </div>
    );

    return (
      <div className="border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] overflow-hidden mb-4">
        {contextHeader}
        <div>
          {contextViewMode === 'flat' 
            ? renderFlatContextView(selectedDocuments, selectedFiles)
            : renderHierarchicalContextView(selectedDocuments, selectedFiles)
          }
        </div>
      </div>
    );
  }, [showContext, documents, selectedContextDocumentIds, selectedContextFileIds, contextViewMode, setShowContext, setContextViewMode, renderFlatContextView, renderHierarchicalContextView]);

  const getFileType = useCallback((file: File): string => {
    const type = file.type.toLowerCase();
    if (type.startsWith('video/')) return 'video';
    if (type.startsWith('image/')) return 'image';
    if (type.startsWith('audio/')) return 'audio';
    if (type.includes('pdf') || type.includes('document') || type.includes('text')) return 'document';
    return 'unknown';
  }, []);

  const getAnalysisType = useCallback((file: File): string => {
    const type = getFileType(file);
    if (type === 'video') return 'highlights';
    if (type === 'image') return 'object-detection';
    if (file.name.endsWith('.csv')) return 'csv';
    return type;
  }, [getFileType]);

  const handleFileUpload = useCallback(async (file: File) => {
    setIsFileUploading(true);
    setUploadProgress(`Uploading ${file.name}...`);
    
    try {
      const uploadUrl = await generateUploadUrl();
      
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }
      
      const { storageId } = await response.json();
      
      const fileId = await createFile({
        storageId,
        fileName: file.name,
        fileType: getFileType(file),
        mimeType: ensureMimeType(file),
        fileSize: file.size,
      });
      
      // Prompt user to analyze now (manual trigger)
      const shouldAnalyze = window.confirm(`File "${file.name}" uploaded. Analyze it now?`);
      if (shouldAnalyze) {
        setUploadProgress(`Analyzing ${file.name}...`);
        const result = await analyzeFileWithGenAI({
          fileId,
          analysisPrompt: "Provide a comprehensive analysis of this file, including key insights and summary.",
          analysisType: getAnalysisType(file),
        });
        
        if (result.success) {
          toast.success(`Analysis complete for ${file.name}`);
          if (onSmsReceived) {
            onSmsReceived("File Analysis", result.analysis);
          }
          // Create an Editor-compatible document using blocks (heading/paragraph with text fields)
          const docId = await createWithSnapshot({
            title: `Analysis: ${file.name}`,
            initialContent: [
              { type: 'heading', level: 2, text: `Analysis for ${file.name}` },
              { type: 'paragraph', text: result.analysis }
            ]
          } as any);
          onDocumentSelect(docId);
        }
      } else {
        toast(`Upload complete for ${file.name}`, {
          description: 'You can analyze it later from the Tools panel or context.',
        } as any);
      }
      
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(`Failed to upload ${file.name}`);
    } finally {
      setIsFileUploading(false);
      setUploadProgress("");
    }
  }, [generateUploadUrl, createFile, analyzeFileWithGenAI, getFileType, getAnalysisType, onSmsReceived, createDocument, onDocumentSelect]);

  // React-dropzone setup (matches DocumentsHomeHub UX)
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (!acceptedFiles?.length) return;
    // Start async processing without returning a Promise from this handler
    void (async () => {
      for (const f of acceptedFiles) {
        await handleFileUpload(f);
      }
    })();
  }, [handleFileUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    multiple: true,
  });

  const handleUrlAnalysis = useCallback(async (url: string) => {
    setIsFileUploading(true);
    setUploadProgress(`Analyzing URL...`);
    
    try {
      // Prompt user before running analysis
      const shouldAnalyze = window.confirm(`Analyze this URL now?\n\n${url}`);
      if (!shouldAnalyze) {
        setIsFileUploading(false);
        setUploadProgress("");
        return;
      }

      const result = await analyzeFileWithGenAI({
        url,
        analysisPrompt: "Analyze the content at this URL and provide key insights.",
      });
      
      if (result.success) {
        toast.success("URL analysis complete");
        if (onSmsReceived) {
          onSmsReceived("URL Analysis", result.analysis);
        }
        // Create a document to persist the URL analysis (parity with file flow)
        const host = (() => {
          try {
            return new URL(url).host;
          } catch {
            const stripped = url.replace(/^https?:\/\//, "");
            return stripped.split("/")[0] || url.slice(0, 50);
          }
        })();

        const docId = await createWithSnapshot({
          title: `Analysis: ${host}`,
          initialContent: [
            { type: 'heading', level: 2, text: `Analysis for ${host}` },
            { type: 'paragraph', text: result.analysis }
          ]
        } as any);
        onDocumentSelect(docId);
      }
    } catch (error) {
      console.error("URL analysis error:", error);
      toast.error("Failed to analyze URL");
    } finally {
      setIsFileUploading(false);
      setUploadProgress("");
    }
  }, [analyzeFileWithGenAI, onSmsReceived, createDocument, onDocumentSelect]);

  const handleIconClick = (e: React.MouseEvent, config: any) => {
    if (!hasBeenDragged) {
      config.onClick();
    }
    setTimeout(() => setHasBeenDragged(false), 100);
  };

  // dnd-kit handlers for icon grid clicks
  const onIconsDragStart = useCallback(() => {
    setIsReordering(true);
    setHasBeenDragged(true);
  }, []);
  const onIconsDragEnd = useCallback(() => {
    setTimeout(() => setHasBeenDragged(false), 100);
    setIsReordering(false);
  }, []);

  const getIconConfig = (iconId: string) => {
    const configs = {
      flow: {
        icon: Lightbulb,
        label: 'Flow',
        isActive: showFlowPanel,
        onClick: () => setShowFlowPanel(!showFlowPanel),
        title: 'Action Flows'
      },
      tools: {
        icon: Wrench,
        label: 'Tools',
        isActive: showToolsPanel,
        onClick: () => setShowToolsPanel(!showToolsPanel),
        title: 'Agent Tools'
      },
      sms: {
        icon: MessageSquare,
        label: 'SMS',
        isActive: showSmsPanel,
        onClick: () => setShowSmsPanel(!showSmsPanel),
        title: 'Send SMS'
      },
      email: {
        icon: Mail,
        label: 'Email',
        isActive: showEmailPanel,
        onClick: () => setShowEmailPanel(!showEmailPanel),
        title: 'Send Email'
      },
      gmail: {
        icon: Inbox,
        label: 'Gmail',
        isActive: showGmailPanel,
        onClick: () => setShowGmailPanel(!showGmailPanel),
        title: 'Gmail Inbox'
      },
      slack: {
        icon: Hash,
        label: 'Slack',
        isActive: showSlackPanel,
        onClick: () => setShowSlackPanel(!showSlackPanel),
        title: 'Send to Slack'
      },
      discord: {
        icon: Gamepad2,
        label: 'Discord',
        isActive: showDiscordPanel,
        onClick: () => setShowDiscordPanel(!showDiscordPanel),
        title: 'Send to Discord'
      },
      mcp: {
        icon: Server,
        label: 'MCP',
        isActive: showMcpPanel,
        onClick: () => setShowMcpPanel(!showMcpPanel),
        title: 'MCP Server Integration'
      },
      webhook: {
        icon: Webhook,
        label: 'Webhook',
        isActive: false,
        onClick: () => {
          const webhookUrl = "https://api.example.com/webhook";
          const payload = "Quick webhook test";
          const promise = mockSendWebhook(webhookUrl, payload);
          toast.promise(promise, {
            loading: "Sending webhook...",
            success: "Webhook sent! (Mock)",
            error: "Failed to send webhook"
          });
        },
        title: 'Send Webhook'
      },
      phone: {
        icon: Phone,
        label: 'Call',
        isActive: false,
        onClick: () => {
          const phoneNumber = "+1-555-AI-CALL";
          const message = "Voice call to AI";
          const promise = mockSendSms(phoneNumber, message);
          toast.promise(promise, {
            loading: "Calling...",
            success: "Call connected! (Mock)",
            error: "Failed to connect call"
          });
        },
        title: 'Voice Call'
      },
      zapier: {
        icon: Zap,
        label: 'Zapier',
        isActive: false,
        onClick: () => {
          const zapierTrigger = "AI instruction received";
          const promise = mockSendWebhook("https://hooks.zapier.com/mock", zapierTrigger);
          toast.promise(promise, {
            loading: "Triggering Zapier...",
            success: "Zapier triggered! (Mock)",
            error: "Failed to trigger Zapier"
          });
        },
        title: 'Trigger Zapier'
      }
    };
    return configs[iconId as keyof typeof configs];
  };

  const onArchive = (documentId: Id<"documents">) => {
    const promise = archiveDocument({ id: documentId });
    toast.promise(promise, {
      loading: "Moving to trash...",
      success: "Note moved to trash!",
      error: "Failed to move to trash."
    });
  };

  const onRestore = (documentId: Id<"documents">) => {
    const promise = restoreDocument({ id: documentId });
    toast.promise(promise, {
      loading: "Restoring note...",
      success: "Note restored!",
      error: "Failed to restore note."
    });
  };

  const onRemove = (documentId: Id<"documents">) => {
    const promise = removeDocument({ id: documentId });
    toast.promise(promise, {
      loading: "Deleting note forever...",
      success: "Note deleted!",
      error: "Failed to delete note."
    });
  };

  const onClearTrash = () => {
    const promise = clearTrash();
    toast.promise(promise, {
      loading: "Emptying trash...",
      success: "Trash emptied!",
      error: "Failed to empty trash."
    });
  };

  // Inline rename handlers
  const startRename = (doc: { _id: Id<"documents">; title?: string }) => {
    setEditingDocumentId(doc._id);
    setEditingDocumentTitle(doc.title || '');
    setQuickActionsFor(null);
    // Focus input on next tick
    setTimeout(() => editingTitleInputRef.current?.focus(), 0);
  };

  // Kebab menu actions for document rows (defined after hooks to avoid TDZ)
  const handleDocRename = useCallback((item: UnifiedItem) => {
    try {
      // Reuse existing inline title editing UX; avoid reading `documents` here.
      startRename({ _id: item.id as any, title: item.title });
    } catch (e) {
      console.error(e);
      toast.error('Failed to start rename');
    }
  }, []);

  const handleDocArchive = useCallback((item: UnifiedItem) => {
    const promise = archiveDocument({ id: item.id as any });
    toast.promise(promise, {
      loading: 'Moving to trash...',
      success: 'Note moved to trash!',
      error: 'Failed to move to trash.'
    });
  }, [archiveDocument]);

  const handleDocShare = useCallback(async (item: UnifiedItem) => {
    try {
      // Ensure it's public, then copy link. This is idempotent.
      await updateDocument({ id: item.id as any, isPublic: true });
      const url = `${window.location.origin}/documents/${String(item.id)}`;
      await navigator.clipboard.writeText(url);
      toast.success('Public link copied');
    } catch (e) {
      console.error(e);
      toast.error('Failed to share');
    }
  }, [updateDocument]);

  const handleCreateDocument = async (defaultTitle?: string) => {
    try {
      const title = defaultTitle || "Untitled Document";
      const documentId: Id<"documents"> = await createWithSnapshot({
        title,
        initialContent: { type: "doc", content: [] },
      } as any);
      onDocumentSelect(documentId);
      toast.success(`Created: ${title}`);
    } catch (error) {
      console.error("Failed to create document:", error);
      toast.error("Failed to create document");
    }
  };

  const executeFlow = async (command: string) => {
    if (!command.trim()) return;
    
    setIsFlowRunning(true);
    const flowId = `flow_${Date.now()}`;
    
    try {
      const newFlow = {
        id: flowId,
        command,
        status: 'running' as const,
        createdAt: Date.now()
      };
      setActiveFlows(prev => [newFlow, ...prev]);
      
      const designDocContent = generateFlowDesignDoc(command, flowId);
      const designDocId = await createWithSnapshot({
        title: `Flow Design: ${command.substring(0, 50)}...`,
        initialContent: designDocContent
      } as any);
      
      setActiveFlows(prev => prev.map(f => 
        f.id === flowId ? { ...f, designDocId, status: 'completed' } : f
      ));
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success(`Flow executed: ${command.substring(0, 30)}...`);
      setFlowCommand("");
      
    } catch (error) {
      console.error('Flow execution error:', error);
      setActiveFlows(prev => prev.map(f => 
        f.id === flowId ? { ...f, status: 'failed' } : f
      ));
      toast.error('Failed to execute flow');
    } finally {
      setIsFlowRunning(false);
    }
  };

  const generateFlowDesignDoc = (command: string, flowId: string) => {
    const now = new Date();
    const timestamp = now.toISOString();
    
    return [
      {
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: '🔄 Flow Design Document' }]
      },
      {
        type: 'paragraph',
        attrs: {},
        content: [
          { type: 'text', text: 'Flow ID: ', marks: [{ type: 'bold' }] },
          { type: 'text', text: flowId }
        ]
      },
      {
        type: 'paragraph',
        attrs: {},
        content: [
          { type: 'text', text: 'Created: ', marks: [{ type: 'bold' }] },
          { type: 'text', text: timestamp }
        ]
      },
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: '📋 Command' }]
      },
      {
        type: 'codeBlock',
        attrs: { language: 'text' },
        content: [{ type: 'text', text: command }]
      },
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: '🎯 Workflow Steps' }]
      },
      ...parseCommandToSteps(command).map(step => ({
        type: 'checkListItem',
        attrs: { checked: false },
        content: [{ type: 'text', text: step }]
      })),
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: '📊 Execution Log' }]
      },
      {
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [
              { type: 'tableHeader', content: [{ type: 'text', text: 'Timestamp' }] },
              { type: 'tableHeader', content: [{ type: 'text', text: 'Action' }] },
              { type: 'tableHeader', content: [{ type: 'text', text: 'Status' }] }
            ]
          },
          {
            type: 'tableRow',
            content: [
              { type: 'tableCell', content: [{ type: 'text', text: timestamp }] },
              { type: 'tableCell', content: [{ type: 'text', text: 'Flow initiated' }] },
              { type: 'tableCell', content: [{ type: 'text', text: '✅ Success' }] }
            ]
          }
        ]
      }
    ];
  };

  const parseCommandToSteps = (command: string): string[] => {
    const steps = [];
    
    if (command.includes('csv') || command.includes('CSV')) {
      steps.push('Parse and validate CSV file');
      steps.push('Extract data schema and columns');
    }
    
    if (command.includes('scoring') || command.includes('framework')) {
      steps.push('Analyze scoring framework');
      steps.push('Define scoring criteria and weights');
    }
    
    if (command.includes('scraping') || command.includes('workflow')) {
      steps.push('Configure scraping parameters');
      steps.push('Set up scheduling (daily basis)');
      steps.push('Implement deduplication logic');
    }
    
    if (command.includes('daily')) {
      steps.push('Configure cron job for daily execution');
    }
    
    if (command.includes('not repeat') || command.includes('duplicate')) {
      steps.push('Set up result caching');
      steps.push('Implement duplicate detection');
    }
    
    if (steps.length === 0) {
      steps.push('Parse command intent');
      steps.push('Execute primary action');
      steps.push('Validate results');
      steps.push('Generate report');
    }
    
    return steps;
  };

  const FlowPanel = () => (
    <div className="mt-3 p-3 bg-[var(--bg-secondary)] rounded-md border border-[var(--border-color)]">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-medium text-[var(--text-primary)]">Action Flows</h4>
        <button
          onClick={() => setShowFlowPanel(false)}
          className="p-1 hover:bg-[var(--bg-hover)] rounded transition-colors"
        >
          <X className="h-3 w-3 text-[var(--text-secondary)]" />
        </button>
      </div>
      
      <textarea
        placeholder="Enter flow command (e.g., 'review ABC_prospect.csv, create daily scraping workflow')"
        value={flowCommand}
        onChange={(e) => setFlowCommand(e.target.value)}
        rows={4}
        className="w-full px-2 py-1 text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-[var(--text-primary)] placeholder-[var(--text-secondary)] mb-2 resize-none"
      />
      
      <button
        onClick={() => void executeFlow(flowCommand)}
        disabled={!flowCommand.trim() || isFlowRunning}
        className="w-full px-2 py-1 text-xs rounded border border-[var(--border-color)]/60 bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40"
      >
        {isFlowRunning ? 'Executing Flow...' : 'Execute Flow'}
      </button>
      
      {activeFlows.length > 0 && (
        <div className="mt-3 space-y-1">
          <div className="text-xs font-medium text-[var(--text-secondary)] mb-1">Recent Flows</div>
          {activeFlows.slice(0, 3).map(flow => (
            <div
              key={flow.id}
              className="flex items-center gap-2 p-2 bg-[var(--bg-primary)] rounded text-xs cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
              onClick={() => flow.designDocId && onDocumentSelect(flow.designDocId)}
            >
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                flow.status === 'completed' ? 'bg-green-500' :
                flow.status === 'running' ? 'bg-yellow-500 animate-pulse' :
                flow.status === 'failed' ? 'bg-red-500' : 'bg-gray-500'
              }`} />
              <span className="truncate flex-1">{flow.command}</span>
              <span className="text-[var(--text-secondary)]">
                {formatTimeAgo(flow.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const mockMessages = [
    {
      id: '1',
      type: 'sms' as const,
      preview: 'Hey, can we schedule a meeting for next week to discuss the project updates?',
      recipient: '+1-555-0123',
      time: '2:30 PM'
    },
    {
      id: '2', 
      type: 'email' as const,
      preview: 'Quarterly report analysis shows 15% growth in user engagement metrics...',
      recipient: 'team@company.com',
      time: '1:45 PM'
    }
  ];

  const mockSendSms = async (to: string, message: string) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`[MOCK SMS] To: ${to}, Message: ${message}`);
    
    if (onSmsReceived) {
      setTimeout(() => {
        onSmsReceived(to, `SMS: ${message}`);
      }, 1800);
    }
    
    return { success: true, messageId: `mock_sms_${Date.now()}` };
  };

  const mockSendSlack = async (channel: string, message: string) => {
    await new Promise(resolve => setTimeout(resolve, 1200));
    console.log(`[MOCK SLACK] Channel: ${channel}, Message: ${message}`);
    
    if (onSmsReceived) {
      setTimeout(() => {
        onSmsReceived(channel, `Slack: ${message}`);
      }, 2000);
    }
    
    return { success: true, messageId: `mock_slack_${Date.now()}` };
  };

  const mockSendDiscord = async (channel: string, message: string) => {
    await new Promise(resolve => setTimeout(resolve, 1400));
    console.log(`[MOCK DISCORD] Channel: ${channel}, Message: ${message}`);
    
    if (onSmsReceived) {
      setTimeout(() => {
        onSmsReceived(channel, `Discord: ${message}`);
      }, 2200);
    }
    
    return { success: true, messageId: `mock_discord_${Date.now()}` };
  };

  const mockSendWebhook = async (url: string, payload: string) => {
    await new Promise(resolve => setTimeout(resolve, 1600));
    console.log(`[MOCK WEBHOOK] URL: ${url}, Payload: ${payload}`);
    
    if (onSmsReceived) {
      setTimeout(() => {
        onSmsReceived(url, `Webhook: ${payload}`);
      }, 2400);
    }
    
    return { success: true, messageId: `mock_webhook_${Date.now()}` };
  };

  return (
    <div {...getRootProps({ className: "left-panel w-full h-full min-h-0 bg-[var(--bg-primary)] text-[var(--text-primary)] border-r border-[var(--border-color)] flex flex-col z-10 relative" })}>
      <input {...getInputProps()} />
      {isDragActive && (
        <div className="absolute inset-0 z-20 rounded-none border-2 border-dashed border-[var(--accent-primary)]/60 bg-[var(--bg-primary)]/80 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center text-[var(--text-secondary)]">
            <p className="font-semibold text-[var(--text-primary)]">Drop files to upload</p>
            <p className="text-xs mt-1">They will be uploaded and analyzed automatically</p>
          </div>
        </div>
      )}
      {/* Panel Header */}
      <div className="panel-header px-4 py-3 bg-[var(--bg-tertiary)]">
        {/* Row 1: Icon + Title */}
        <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--text-primary)]">
          <span>💡</span>
          <span>Nodebench AI</span>
        </div>

        {/* Row 2: User controls (avatar + name) */}
        <div className="mt-2 flex items-center gap-2">
          {/* Avatar */}
          {(() => {
            const displayName = (user?.name ?? user?.email ?? "Guest");
            const initial = (displayName || "U").trim().charAt(0).toUpperCase();
            const rawImage = (user as any)?.image;
            const imgSrc = typeof rawImage === "string" ? rawImage : undefined;
            return imgSrc ? (
              <img
                src={imgSrc}
                alt={displayName + " avatar"}
                title={displayName}
                className="h-6 w-6 rounded-full border border-[var(--border-color)] object-cover"
              />
            ) : (
              <div
                className="h-6 w-6 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center justify-center text-[10px]"
                aria-label={displayName + " avatar"}
              >
                {initial}
              </div>
            );
          })()}
          {/* Name / Email */}
          <span className="text-xs text-[var(--text-primary)] truncate max-w-[9rem]">
            {user?.name ?? user?.email ?? "User"}
          </span>
          <button
            onClick={() => onOpenSettings?.('reminders')}
            className="p-1 rounded-md hover:bg-[var(--bg-hover)]"
            title="Settings"
            aria-label="Open Settings"
          >
            <Settings className="h-3.5 w-3.5 text-[var(--text-secondary)]/60" aria-hidden="true" />
          </button>
          <SignOutButton />
        </div>
        
        {/* Home Page Button */}
        <div className="mt-2 pt-2 border-t border-[var(--border-color)]/30">
          <button
            onClick={() => onDocumentSelect(null)}
            className={`w-full flex items-center justify-center gap-2.5 px-3 py-2 mb-2 text-xs font-semibold rounded-lg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40 ${
              selectedDocumentId === null
                ? "bg-[var(--bg-active)] text-[var(--text-primary)] border border-[var(--border-color)]"
                : "text-[var(--text-secondary)] border border-[var(--border-color)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            }`}
            title="Navigate to Home Page"
          >
            <Home className="h-4 w-4" />
            <span>Home Page</span>
          </button>
        </div>

        {/* Integrate Section */}
        <div className="mt-3 pt-2">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] font-medium text-[var(--text-secondary)]/70">Integration Panel</div>
          </div>
          
          {/* AI Chat Toggle Button */}
          <button
            onClick={() => onToggleAIChat && onToggleAIChat()}
            className={`w-full flex items-center justify-center gap-2.5 px-3 py-2 mb-2 text-xs font-semibold rounded-lg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40 ${
              showAIChat
                ? "bg-[var(--bg-active)] text-[var(--text-primary)] border border-[var(--border-color)]"
                : "text-[var(--text-secondary)] border border-[var(--border-color)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            }`}
            title="Toggle AI Chat Assistant"
          >
            <Bot className="h-4 w-4" />
            <span>AI Chat Assistant</span>
            {showAIChat && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-primary)]/40"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent-primary)]"></span>
              </span>
            )}
          </button>
          
          <SortableList
            items={iconOrder}
            orientation="horizontal"
            isGrid
            activateOnInteractive
            containerClassName="grid grid-cols-4 gap-1 items-start justify-start"
            onDragStart={() => onIconsDragStart()}
            onDragEnd={() => onIconsDragEnd()}
            onReorder={(newOrder) => {
              setIconOrder(newOrder);
              try {
                void updateUserPrefs({ iconOrder: newOrder });
              } catch (err) {
                console.error('Failed to save icon order', err);
                toast.error('Failed to save icon order');
              }
            }}
            renderItem={(iconId, _index, isDragging) => {
              const config = getIconConfig(iconId);
              if (!config) return null;
              const IconComponent = config.icon;
              return (
                <button
                  onClick={(e) => handleIconClick(e, config)}
                  className={`flex flex-col items-center gap-1 px-1 py-1 text-xs rounded-md transition-colors duration-150 cursor-pointer min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 ${
                    config.isActive
                      ? "text-[var(--text-primary)] bg-[var(--bg-active)] border border-[var(--border-color)]"
                      : "text-[var(--text-secondary)] bg-transparent border border-[var(--border-color)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                  } ${
                    isDragging
                      ? "opacity-70 text-[var(--accent-primary)] bg-[var(--bg-active)] border border-[var(--accent-primary)]/40"
                      : ""
                  }`}
                  title={config.title}
                  aria-label={config.title || config.label}
                  aria-pressed={config.isActive}
                  aria-describedby={`icon-label-${iconId}`}
                >
                  <IconComponent className="h-4 w-4 flex-shrink-0" strokeWidth={1.75} aria-hidden="true" />
                  <span id={`icon-label-${iconId}`} className="text-[10px] font-medium leading-tight text-center whitespace-nowrap overflow-hidden text-ellipsis w-full">
                    {config.label}
                  </span>
                </button>
              );
            }}
          />

          {/* Flow Panel */}
          {showFlowPanel && <FlowPanel />}

          {/* Tools Panel */}
          {showToolsPanel && (
            <div className="mt-3 p-3 bg-[var(--bg-secondary)] rounded-md border border-[var(--border-color)]">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-medium text-[var(--text-primary)]">Agent Tools</h4>
                <button
                  onClick={() => setShowToolsPanel(false)}
                  className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)] transition-colors"
                  aria-label="Close Agent Tools"
                  title="Close"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              {/* Analyze Selected Files quick action */}
              <div className="mb-3 p-2 rounded border border-[var(--border-color)] bg-[var(--bg-primary)]">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] text-[var(--text-secondary)]">
                    {selectedContextFileIds.length > 0
                      ? `${selectedContextFileIds.length} file(s) selected for analysis`
                      : 'No files selected in AI Context'}
                  </div>
                  <button
                    onClick={() => {
                      void (async () => {
                        if (selectedContextFileIds.length === 0) {
                          toast.error('Select files in AI Context first');
                          return;
                        }
                        const proceed = window.confirm(`Analyze ${selectedContextFileIds.length} selected file(s) now?`);
                        if (!proceed) return;

                        const run = async () => {
                          let success = 0;
                          for (const fid of selectedContextFileIds) {
                            try {
                              const res = await analyzeFileWithGenAI({
                                fileId: fid,
                                analysisPrompt: 'Provide a comprehensive analysis of this file, including key insights and summary.',
                              });
                              if (res?.success) {
                                success++;
                                // Find a friendly name for the file
                                const f = (userFilesAll ?? []).find((x: any) => String(x._id) === String(fid));
                                const fileName = f?.fileName || String(fid);
                                const docId = await createWithSnapshot({
                                  title: `Analysis: ${fileName}`,
                                  initialContent: [
                                    { type: 'heading', level: 2, text: `Analysis for ${fileName}` },
                                    { type: 'paragraph', text: res.analysis }
                                  ]
                                } as any);
                                // Optionally open the latest created doc
                                try { onDocumentSelect(docId); } catch { /* noop */ }
                              }
                            } catch (e: any) {
                              console.warn('Analyze selected file failed', fid, e);
                            }
                          }
                          return success;
                        };

                        await toast.promise(run(), {
                          loading: 'Analyzing selected files…',
                          success: (s) => `${s} file(s) analyzed` ,
                          error: 'Failed to analyze selected files',
                        });
                      })();
                    }}
                    disabled={selectedContextFileIds.length === 0}
                    className="px-2 py-1 text-[11px] rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-50"
                    title="Analyze selected files"
                  >
                    Analyze selected files
                  </button>
                </div>
              </div>
              {!toolsList && (
                <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
                  <Loader2 className="h-3 w-3 animate-spin" /> Loading tools...
                </div>
              )}
              {toolsList && toolsList.length === 0 && (
                <div className="text-[11px] text-[var(--text-secondary)]">No tools available.</div>
              )}
              {toolsList && toolsList.length > 0 && (
                <div className="space-y-2 pr-1">
                  {toolsList.map((t) => {
                    const matchingMcp = mcpToolsAll.find((mt: any) => mt.name === t.name);
                    return (
                      <div key={t.name} className="p-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded">
                        <div className="text-[12px] font-semibold text-[var(--text-primary)] truncate">{t.name}</div>
                        <div className="text-[11px] text-[var(--text-secondary)] line-clamp-2">{t.description}</div>
                        {t.argNames && t.argNames.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {t.argNames.map((arg: string) => (
                              <span key={arg} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-secondary)]">
                                {arg}
                              </span>
                            ))}
                          </div>
                        )}
                        {/* Recent usage (if there is a matching MCP tool with the same name) */}
                        {matchingMcp && (
                          <div className="mt-2">
                            <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] mb-1">Recent usage</div>
                            <McpToolHistoryList
                              toolId={matchingMcp._id as Id<'mcpTools'>}
                              onRun={(h) => {
                                const p = callMcpTool({ serverId: h.serverId, toolName: matchingMcp.name, parameters: h.parameters });
                                toast.promise(p, {
                                  loading: "Running…",
                                  success: "Completed",
                                  error: (err) => (err instanceof Error ? err.message : "Failed"),
                                });
                              }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        
          {/* SMS Panel */}
          {showSmsPanel && (
            <div className="mt-3 p-3 bg-[var(--bg-secondary)] rounded-md border border-[var(--border-color)]">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-medium text-[var(--text-primary)]">Send SMS</h4>
                <button
                  onClick={() => setShowSmsPanel(false)}
                  className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)] transition-colors"
                  aria-label="Close SMS Panel"
                  title="Close"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <input
                type="text"
                placeholder="Phone number"
                value={smsTo}
                onChange={(e) => setSmsTo(e.target.value)}
                className="w-full px-2 py-1 text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-[var(--text-primary)] placeholder-[var(--text-secondary)] mb-2"
              />
              <textarea
                placeholder="Message"
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                rows={3}
                className="w-full px-2 py-1 text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-[var(--text-primary)] placeholder-[var(--text-secondary)] mb-2 resize-none"
              />
              <button
                onClick={() => {
                  if (smsTo && smsMessage) {
                    const promise = mockSendSms(smsTo, smsMessage);
                    toast.promise(promise, {
                      loading: "Sending SMS...",
                      success: "SMS sent successfully! (Mock)",
                      error: "Failed to send SMS"
                    });
                    void promise.then(() => setSmsMessage(""));
                  }
                }}
                disabled={!smsTo || !smsMessage}
                className="w-full px-2 py-1 text-xs rounded border border-[var(--border-color)]/60 bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40"
              >
                Send SMS
              </button>
            </div>
          )}

          {/* Email Panel */}
          {showEmailPanel && (
            <div className="mt-3 p-3 bg-[var(--bg-secondary)] rounded-md border border-[var(--border-color)]">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-medium text-[var(--text-primary)]">Send Email</h4>
                <button
                  onClick={() => setShowEmailPanel(false)}
                  className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)] transition-colors"
                  aria-label="Close Email Panel"
                  title="Close"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <input
                type="email"
                placeholder="Email address"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                className="w-full px-2 py-1 text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-[var(--text-primary)] placeholder-[var(--text-secondary)] mb-2"
              />
              <input
                type="text"
                placeholder="Subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full px-2 py-1 text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-[var(--text-primary)] placeholder-[var(--text-secondary)] mb-2"
              />
              <textarea
                placeholder="Message"
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={4}
                className="w-full px-2 py-1 text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-[var(--text-primary)] placeholder-[var(--text-secondary)] mb-2 resize-none"
              />
              <button
                onClick={() => {
                  if (emailTo && emailSubject && emailBody) {
                    const promise = sendEmail({ to: emailTo, subject: emailSubject, body: emailBody })
                      .then((res) => {
                        if (!res?.success) {
                          throw new Error(res?.error || "Failed to send email");
                        }
                        return res;
                      });
                    toast.promise(promise, {
                      loading: "Sending Email...",
                      success: "Email sent successfully!",
                      error: (err) => (err instanceof Error ? err.message : "Failed to send Email"),
                    });
                    void promise.then(() => {
                      setEmailSubject("");
                      setEmailBody("");
                    });
                  }
                }}
                disabled={!emailTo || !emailSubject || !emailBody}
                className="w-full px-2 py-1 text-xs rounded border border-[var(--border-color)]/60 bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40"
              >
                Send Email
              </button>
            </div>
          )}

          {/* Gmail Panel */}
          {showGmailPanel && (
            <div className="mt-3 p-3 bg-[var(--bg-secondary)] rounded-md border border-[var(--border-color)]">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-medium text-[var(--text-primary)]">Gmail Inbox</h4>
                <button
                  onClick={() => setShowGmailPanel(false)}
                  className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)] transition-colors"
                  aria-label="Close Gmail Panel"
                  title="Close"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>

              {!gmailConnection?.connected && (
                <div>
                  <p className="text-[11px] text-[var(--text-secondary)] mb-2">
                    Connect your Google account to view your Gmail inbox.
                  </p>
                  <button
                    onClick={() => {
                      window.location.href = "/api/google/oauth/start";
                    }}
                    className="w-full px-2 py-1 text-xs rounded border border-[var(--border-color)]/60 bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40"
                  >
                    Connect Google
                  </button>
                </div>
              )}

              {gmailConnection?.connected && (
                <div>
                  <div className="flex items-center justify-between mb-2 text-[11px] text-[var(--text-secondary)]">
                    <div>
                      Connected{gmailConnection.email ? ` as ${gmailConnection.email}` : ''}
                      {gmailConnection.expiryDate ? ` · token expires ${new Date(gmailConnection.expiryDate).toLocaleTimeString()}` : ''}
                    </div>
                    <button
                      onClick={() => {
                        void (async () => {
                          try {
                            setGmailLoading(true);
                            const res = await fetchGmailInbox({ maxResults: 15 });
                            if (!res.success) throw new Error(res.error || "Failed to fetch inbox");
                            setGmailMessages(res.messages || []);
                          } catch (e: any) {
                            toast.error(e?.message || "Failed to fetch inbox");
                          } finally {
                            setGmailLoading(false);
                          }
                        })();
                      }}
                      className="px-2 py-1 text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded hover:bg-[var(--bg-hover)]"
                    >
                      {gmailLoading ? 'Loading…' : 'Refresh'}
                    </button>
                  </div>

                  {gmailMessages.length === 0 && (
                    <div className="text-[11px] text-[var(--text-secondary)]">No messages loaded. Click Refresh.</div>
                  )}

                  {gmailMessages.length > 0 && (
                    <div className="space-y-2 pr-1">
                      {gmailMessages.map((m) => (
                        <div key={m.id} className="p-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded">
                          <div className="text-[12px] font-semibold text-[var(--text-primary)] truncate">{m.subject || '(No subject)'}</div>
                          <div className="text-[11px] text-[var(--text-secondary)] truncate">{m.from}</div>
                          <div className="text-[11px] text-[var(--text-secondary)] mt-1 truncate">{m.snippet}</div>
                          <div className="text-[10px] text-[var(--text-secondary)] mt-1">{m.date}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Slack Panel */}
          {showSlackPanel && (
            <div className="mt-3 p-3 bg-[var(--bg-secondary)] rounded-md border border-[var(--border-color)]">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-medium text-[var(--text-primary)]">Send to Slack</h4>
                <button
                  onClick={() => setShowSlackPanel(false)}
                  className="p-1 hover:bg-[var(--bg-hover)] rounded transition-colors"
                >
                  <X className="h-3 w-3 text-[var(--text-secondary)]" />
                </button>
              </div>
              <input
                type="text"
                placeholder="Channel (e.g., #ai-chat)"
                value={slackChannel}
                onChange={(e) => setSlackChannel(e.target.value)}
                className="w-full px-2 py-1 text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-[var(--text-primary)] placeholder-[var(--text-secondary)] mb-2"
              />
              <textarea
                placeholder="Message"
                value={slackMessage}
                onChange={(e) => setSlackMessage(e.target.value)}
                rows={3}
                className="w-full px-2 py-1 text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-[var(--text-primary)] placeholder-[var(--text-secondary)] mb-2 resize-none"
              />
              <button
                onClick={() => {
                  if (slackChannel && slackMessage) {
                    const promise = mockSendSlack(slackChannel, slackMessage);
                    toast.promise(promise, {
                      loading: "Sending to Slack...",
                      success: "Slack message sent! (Mock)",
                      error: "Failed to send to Slack"
                    });
                    void promise.then(() => setSlackMessage(""));
                  }
                }}
                disabled={!slackChannel || !slackMessage}
                className="w-full px-2 py-1 text-xs rounded border border-[var(--border-color)]/60 bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40"
              >
                Send to Slack
              </button>
            </div>
          )}

          {/* Discord Panel */}
          {showDiscordPanel && (
            <div className="mt-3 p-3 bg-[var(--bg-secondary)] rounded-md border border-[var(--border-color)]">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-medium text-[var(--text-primary)]">Send to Discord</h4>
                <button
                  onClick={() => setShowDiscordPanel(false)}
                  className="p-1 hover:bg-[var(--bg-hover)] rounded transition-colors"
                >
                  <X className="h-3 w-3 text-[var(--text-secondary)]" />
                </button>
              </div>
              <input
                type="text"
                placeholder="Channel (e.g., #general)"
                value={discordChannel}
                onChange={(e) => setDiscordChannel(e.target.value)}
                className="w-full px-2 py-1 text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-[var(--text-primary)] placeholder-[var(--text-secondary)] mb-2"
              />
              <textarea
                placeholder="Message"
                value={discordMessage}
                onChange={(e) => setDiscordMessage(e.target.value)}
                rows={3}
                className="w-full px-2 py-1 text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-[var(--text-primary)] placeholder-[var(--text-secondary)] mb-2 resize-none"
              />
              <button
                onClick={() => {
                  if (discordChannel && discordMessage) {
                    const promise = mockSendDiscord(discordChannel, discordMessage);
                    toast.promise(promise, {
                      loading: "Sending to Discord...",
                      success: "Discord message sent! (Mock)",
                      error: "Failed to send to Discord"
                    });
                    void promise.then(() => setDiscordMessage(""));
                  }
                }}
                disabled={!discordChannel || !discordMessage}
                className="w-full px-2 py-1 text-xs rounded border border-[var(--border-color)]/60 bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40"
              >
                Send to Discord
              </button>
            </div>
          )}

          {/* Enhanced MCP Integration Panel */}
          {showMcpPanel && (
            <EnhancedMcpPanel 
              onClose={() => setShowMcpPanel(false)}
            />
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="panel-tabs flex gap-1 px-2 py-2 bg-[var(--bg-secondary)] border-b border-[var(--border-color)]">
        {(['documents', 'messages', 'reports'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`
              panel-tab flex-1 min-w-0 px-2 py-1.5 text-xs font-semibold rounded-md
              cursor-pointer transition-colors duration-150
              whitespace-nowrap overflow-hidden text-ellipsis
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40
              ${activeTab === tab
                ? 'text-[var(--accent-primary)] bg-[var(--bg-primary)] border border-[var(--accent-primary)]/30 hover:bg-[var(--bg-hover)]'
                : 'text-[var(--text-secondary)] bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] border border-[var(--border-color)]'
              }
            `}
          >
            <span className="hidden min-[360px]:inline">{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
            <span className="min-[360px]:hidden">
              {tab === 'documents' ? 'Docs' : tab === 'messages' ? 'Msgs' : 'Rpts'}
            </span>
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="panel-content flex-1 min-h-0 overflow-y-auto">
        {activeTab === 'messages' && (
          <div className="p-3">
            {mockMessages.map((message) => {
              const typeConfig = {
                sms: { icon: '💬', bg: 'rgba(82, 156, 202, 0.2)', color: 'var(--accent-blue)' },
                email: { icon: '📧', bg: 'rgba(77, 171, 154, 0.2)', color: 'var(--accent-green)' }
              };
              const config = typeConfig[message.type];
              
              return (
                <div 
                  key={message.id}
                  className="message-item bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg p-3 mb-3 cursor-pointer transition-colors duration-150 hover:bg-[var(--bg-hover)] hover:border-[var(--border-color-light)]"
                  onClick={() => {
                    if (message.type === 'sms' && onSmsReceived) {
                      onSmsReceived(message.recipient, message.preview);
                    }
                  }}
                >
                  <div className="message-header flex justify-between items-center mb-2">
                    <div 
                      className="message-type flex items-center gap-1.5 px-2 py-1 rounded text-xs font-semibold"
                      style={{ backgroundColor: config.bg, color: config.color }}
                    >
                      <span>{config.icon}</span>
                      <span>{message.type.toUpperCase()}</span>
                    </div>
                    <div className="message-time text-xs text-[var(--text-secondary)]">
                      {message.time}
                    </div>
                  </div>
                  <div className="message-preview text-sm text-[var(--text-secondary)] leading-relaxed">
                    {message.preview}
                  </div>
                  <div className="message-recipient text-xs text-[var(--text-secondary)] mt-1.5">
                    {message.recipient}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {activeTab === 'reports' && (
          <div className="text-center py-8">
            <BookUser className="h-12 w-12 text-[var(--text-secondary)] mx-auto mb-3" />
            <p className="text-sm text-[var(--text-secondary)]">No reports available</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Reports will appear here when generated</p>
          </div>
        )}
        
        {activeTab === 'documents' && (
          <div>
            {isTrashOpen ? (
              <div className="p-3">
                <div className="flex items-center justify-between mb-4">
                  <button 
                    onClick={() => setIsTrashOpen(false)} 
                    className="flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </button>
                  {trash && trash.length > 0 && (
                    <button
                      onClick={onClearTrash}
                      className="text-xs text-red-500 hover:text-red-700 transition-colors"
                    >
                      Clear Trash
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {trash?.length === 0 && (
                    <div className="text-center py-8">
                      <Trash2 className="h-12 w-12 text-[var(--text-secondary)] mx-auto mb-3" />
                      <p className="text-sm text-[var(--text-secondary)]">Trash is empty</p>
                    </div>
                  )}
                  {trash?.map((doc) => {
                    const deletedDate = formatTimeAgo(doc._creationTime);
                    const fileType = getFileTypeFromDocument(doc);
                    
                    return (
                      <div
                        key={doc._id}
                        className="group/trash message-item bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg p-3 cursor-pointer 
                          transition-colors duration-150 hover:bg-[var(--bg-hover)] hover:border-[var(--border-color-light)]"
                        onClick={() => onDocumentSelect(doc._id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <FileTypeIcon type={fileType} className="h-4 w-4 text-red-400 flex-shrink-0" />
                            
                            <div className="flex-1 min-w-0">
                              <div className="message-preview text-sm text-[var(--text-secondary)] truncate font-medium">
                                {doc.title}
                              </div>
                              
                              <div className="message-recipient text-xs text-[var(--text-secondary)] mt-1 flex items-center gap-2">
                                <span>Deleted {deletedDate} ago</span>
                                <span className="w-1 h-1 bg-[var(--text-secondary)] rounded-full opacity-50"></span>
                                <span>{new Date(doc._creationTime).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1 opacity-0 group-hover/trash:opacity-100 transition-all duration-200">
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                onRestore(doc._id); 
                              }} 
                              className="p-1.5 hover:bg-green-100 hover:text-green-600 rounded-md transition-colors duration-150" 
                              title="Restore document"
                            >
                              <Undo2 className="h-3 w-3" />
                            </button>
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                onRemove(doc._id); 
                              }} 
                              className="p-1.5 hover:bg-red-100 hover:text-red-600 rounded-md transition-colors duration-150" 
                              title="Delete forever"
                            >
                              <Trash className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col">
                {/* Three-Row Header Layout */}
                <div className="px-3 py-2.5 bg-[var(--bg-secondary)] border-b border-[var(--border-color)]">
                  {/* Row 1: My Docs/Public Toggle */}
                  <div className="mb-2">
                    <div className="flex items-center gap-0.5 bg-[var(--bg-primary)]/80 p-0.5 rounded-md border border-[var(--border-color)]">
                      <button
                        onClick={() => onViewChange('documents')}
                        className={`flex-1 px-2 py-1 text-xs font-medium transition-colors duration-150 rounded-sm whitespace-nowrap ${
                          currentView === 'documents'
                            ? "bg-[var(--bg-active)] text-[var(--text-primary)] border border-[var(--border-color)]"
                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]/60"
                        }`}
                      >
                        My Docs
                      </button>
                      <button
                        onClick={() => onViewChange('public')}
                        className={`flex-1 px-2 py-1 text-xs font-medium transition-colors duration-150 rounded-sm whitespace-nowrap ${
                          currentView === 'public'
                            ? "bg-[var(--bg-active)] text-[var(--text-primary)] border border-[var(--border-color)]"
                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]/60"
                        }`}
                      >
                        Public
                      </button>
                    </div>
                  </div>

                  {/* Row 2: Action Buttons */}
                  <div className="mb-2">
                    <div className="flex flex-wrap gap-1">
                      <button 
                        onClick={() => setIsSearchOpen(true)}
                        className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-md transition-colors duration-150 border border-[var(--border-color)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40"
                        title="Search"
                      >
                        <Search className="h-3.5 w-3.5" />
                      </button>
                      <button 
                        onClick={() => void handleCreateDocument('New Page')}
                        className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-md transition-colors duration-150 border border-[var(--border-color)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40"
                        title="Add New Page"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--accent-secondary)] hover:bg-[var(--bg-hover)] rounded-md transition-colors duration-150 border border-[var(--border-color)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40"
                        title="Upload File"
                      >
                        <Upload className="h-3.5 w-3.5" />
                      </button>
                      <button 
                        onClick={() => setShowUrlPanel((v) => !v)}
                        className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--accent-secondary)] hover:bg-[var(--bg-hover)] rounded-md transition-colors duration-150 border border-[var(--border-color)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40"
                        title="Analyze URL"
                      >
                        <Globe className="h-3.5 w-3.5" />
                      </button>
                      <button 
                        onClick={() => void handleCreateCalendar()}
                        disabled={isCreatingCalendar}
                        className="p-1.5 text-[var(--text-secondary)] hover:text-blue-600 hover:bg-[var(--bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors duration-150 border border-[var(--border-color)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40"
                        title={isCreatingCalendar ? "Creating calendar..." : "Create new prepopulated calendar"}
                      >
                        {isCreatingCalendar ? (
                          <div className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Calendar className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Row 3: Sort Controls */}
                  <div className="flex items-center justify-end">
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as 'updated' | 'created' | 'title')}
                        className="text-xs text-[var(--text-secondary)] bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1 focus:outline-none focus:border-[var(--accent-primary)] transition-colors min-w-0"
                      >
                        <option value="updated">Recent</option>
                        <option value="created">Created</option>
                        <option value="title">Title</option>
                      </select>
                      <button
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        className="text-[var(--text-secondary)] p-1 rounded border border-[var(--border-color)]/60 hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40"
                        title={`Sort ${sortOrder === 'desc' ? 'ascending' : 'descending'}`}
                      >
                        <ChevronDown className={`h-3 w-3 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Search/Filter Bar */}
                {(filterText.length > 0 || isSearchOpen) && (
                  <div className="px-3 py-2 bg-[var(--bg-secondary)]/50">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-secondary)]" />
                      <input
                        type="text"
                        placeholder="Search documents..."
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        className="w-full pl-8 pr-8 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg focus:ring-1 focus:ring-[var(--accent-primary)]/20 focus:border-[var(--accent-primary)] outline-none transition-all"
                        autoFocus={isSearchOpen}
                      />
                      {filterText.length > 0 && (
                        <button
                          onClick={() => setFilterText('')}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-[var(--text-secondary)] border border-[var(--border-color)]/60 hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] rounded transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Analyze URL Inline Panel */}
                {showUrlPanel && (
                  <div className="px-3 py-2 bg-[var(--bg-secondary)]/50">
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-secondary)]" />
                      <input
                        type="url"
                        placeholder="Enter URL to analyze..."
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && urlInput.trim()) {
                            e.preventDefault();
                            void handleUrlAnalysis(urlInput.trim()).then(() => {
                              setUrlInput("");
                              setShowUrlPanel(false);
                            });
                          } else if (e.key === 'Escape') {
                            setShowUrlPanel(false);
                          }
                        }}
                        className="w-full pl-8 pr-8 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg focus:ring-1 focus:ring-[var(--accent-primary)]/20 focus:border-[var(--accent-primary)] outline-none transition-all"
                        autoFocus
                      />
                      {urlInput.length > 0 && (
                        <button
                          onClick={() => setUrlInput("")}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-[var(--text-secondary)] border border-[var(--border-color)]/60 hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] rounded transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40"
                          title="Clear URL"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Content (single scroll parent: panel-content) */}
                <div className="flex-1 px-3 py-2">
                  {renderContextSection()}
                  
                  {/* Documents and Tasks sections */}
                  {currentView === 'documents' && (
                    <div className="mb-3 space-y-3">
                      {/* Documents Section (sticky header) */}
                      <div className="sticky top-0 z-10">
                        <div className="sidebar-section-header bg-[var(--bg-secondary)]/80 backdrop-blur">
                          <FileText className="h-3 w-3" />
                          <span>Documents</span>
                          <span className="text-[10px]">{filteredDocuments ? filteredDocuments.length : 0}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {filteredDocuments === undefined ? (
                          <div className="space-y-1 px-1 py-1">
                            <div className="h-8 bg-[var(--bg-secondary)] rounded animate-pulse" />
                            <div className="h-8 bg-[var(--bg-secondary)] rounded animate-pulse w-5/6" />
                          </div>
                        ) : filteredDocuments.length === 0 ? (
                          <div className="text-center text-xs text-[var(--text-secondary)] py-3">No documents found</div>
                        ) : (
                          ["Pinned", "Recent", "This Week", "Older"].map((groupName) => {
                            const docsInGroup = (docGroupsComputed as any)[groupName] as any[];
                            if (!docsInGroup || docsInGroup.length === 0) return null;
                            const isCollapsed = collapsedDocGroups.has(groupName);
                            return (
                              <div key={`docs-${groupName}`}>
                                <button onClick={() => toggleDocGroup(groupName)} className="sidebar-section-header w-full">
                                  <span className="flex-1 text-left truncate">{groupName}</span>
                                  <span className="text-[10px]">{docsInGroup.length}</span>
                                  <ChevronDown className={`ml-auto h-3 w-3 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                                </button>
                                {!isCollapsed && (
                                  <div
                                    className="space-y-1"
                                    ref={docsKeyboardScopeRef}
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                      // Only handle when Documents view is active
                                      if (currentView !== 'documents') return;
                                      if (e.key === 'Escape') {
                                        if (isAnyDocSelected) {
                                          e.preventDefault();
                                          clearDocSelection();
                                        }
                                      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
                                        e.preventDefault();
                                        selectAllVisibleDocs();
                                      } else if (e.key === 'Delete') {
                                        if (selectedDocuments.size > 0) {
                                          e.preventDefault();
                                          const ids = Array.from(selectedDocuments);
                                          Promise.all(ids.map((id) => archiveDocument({ id })))
                                            .then(() => {
                                              toast.success(`Moved ${ids.length} document${ids.length > 1 ? 's' : ''} to Trash`);
                                              clearDocSelection();
                                            })
                                            .catch((err) => {
                                              console.error(err);
                                              toast.error('Failed to move selected to Trash');
                                            });
                                        }
                                      }
                                    }}
                                  >
                                    {/* Bulk actions bar */}
                                    {isAnyDocSelected && (
                                      <div className="flex items-center gap-1.5 px-2 py-0.5 text-[11px] bg-[var(--bg-secondary)]/80 backdrop-blur border border-[var(--border-color)]/60 rounded-md sticky top-0 z-10">
                                        <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--bg-tertiary)] px-1 text-[9px] border border-[var(--border-color)]/50 text-[var(--text-secondary)]">
                                          {selectedDocuments.size}
                                        </span>
                                        <button
                                          className="p-1 rounded border border-[var(--border-color)]/50 hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                                          aria-label="Toggle favorite"
                                          title="Toggle favorite"
                                          onClick={() => {
                                            const ids = Array.from(selectedDocuments);
                                            Promise.all(ids.map((id) => toggleFavorite({ id })))
                                              .then(() => toast.success('Toggled favorite'))
                                              .catch(() => toast.error('Failed to toggle favorite'));
                                          }}
                                        >
                                          <Star className="h-4 w-4" />
                                        </button>
                                        <button
                                          className="p-1 rounded border border-[var(--border-color)]/50 hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                                          aria-label="Tag selected"
                                          title="Tag selected"
                                          onClick={() => {
                                            setIsTagModalOpen(true);
                                          }}
                                        >
                                          <Tag className="h-4 w-4" />
                                        </button>
                                        <button
                                          className="p-1 rounded border border-[var(--border-color)]/50 hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                                          aria-label="Move selected"
                                          title="Move selected"
                                          onClick={() => {
                                            setIsMoveModalOpen(true);
                                            // Default target folder to first available
                                            if (!targetFolderId && userFolders && userFolders.length > 0) {
                                              setTargetFolderId(userFolders[0]._id);
                                            }
                                          }}
                                        >
                                          <Move className="h-4 w-4" />
                                        </button>
                                        <button
                                          className="p-1 rounded border border-[var(--border-color)]/50 hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                                          aria-label="Share selected"
                                          title="Share selected"
                                          onClick={() => {
                                            setSharePublic(true);
                                            setIsShareModalOpen(true);
                                          }}
                                        >
                                          <Share2 className="h-4 w-4" />
                                        </button>
                                        <button
                                          className="p-1 rounded border border-[var(--border-color)]/50 hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-red-600 transition-colors"
                                          aria-label="Move to Trash"
                                          title="Move to Trash"
                                          onClick={() => {
                                            const ids = Array.from(selectedDocuments);
                                            Promise.all(ids.map((id) => archiveDocument({ id })))
                                              .then(() => {
                                                toast.success(`Moved ${ids.length} to Trash`);
                                                clearDocSelection();
                                              })
                                              .catch(() => toast.error('Failed to move to Trash'));
                                          }}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                        <button
                                          className="ml-auto p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] opacity-80 hover:opacity-100 transition-colors"
                                          aria-label="Clear selection"
                                          title="Clear selection"
                                          onClick={() => clearDocSelection()}
                                        >
                                          <X className="h-4 w-4" />
                                        </button>
                                      </div>
                                    )}

                                    {docsInGroup.map((doc: any) => (
                                      <UnifiedRow
                                        key={`doc:${String(doc._id)}`}
                                        item={toUnifiedFromDoc(doc)}
                                        isSelected={selectedDocuments.has(doc._id) || selectedDocumentId === doc._id}
                                        ariaSelected={selectedDocuments.has(doc._id)}
                                        onOpen={(item, e) => {
                                          const id = doc._id as Id<"documents">;
                                          const hasCtrl = e?.ctrlKey || e?.metaKey;
                                          const hasShift = e?.shiftKey;
                                          if (hasCtrl) {
                                            toggleDocSelection(id);
                                            setDocSelectionAnchor({ group: groupName, id });
                                            return;
                                          }
                                          if (hasShift && docSelectionAnchor && docSelectionAnchor.group === groupName) {
                                            selectRangeInGroup(docsInGroup, docSelectionAnchor.id, id);
                                            return;
                                          }
                                          if (isAnyDocSelected) {
                                            // Clear selection then open
                                            clearDocSelection();
                                          }
                                          openWorkItem(item);
                                        }}
                                        onToggleFavorite={onToggleFavoriteVoid}
                                        onToggleDone={onToggleDoneVoid}
                                        formatTimeAgo={formatTimeAgo}
                                        formatDue={formatDue}
                                        onRename={handleDocRename}
                                        onArchive={handleDocArchive}
                                        onShare={(item) => { void handleDocShare(item); }}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Tasks Section (sticky header) */}
                      <div className="sticky top-0 z-10">
                        <div className="sidebar-section-header bg-[var(--bg-secondary)]/80 backdrop-blur">
                          <CheckSquare className="h-3 w-3" />
                          <span>Tasks</span>
                          <span className="text-[10px]">{sortedTasks ? sortedTasks.length : 0}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {sortedTasks === undefined ? (
                          <div className="space-y-1 px-1 py-1">
                            <div className="h-8 bg-[var(--bg-secondary)] rounded animate-pulse" />
                            <div className="h-8 bg-[var(--bg-secondary)] rounded animate-pulse w-5/6" />
                          </div>
                        ) : sortedTasks.length === 0 ? (
                          <div className="text-center text-xs text-[var(--text-secondary)] py-3">No tasks yet</div>
                        ) : (
                          ["Overdue", "Today", "This Week", "Upcoming", "No Due Date"].map((groupName) => {
                            const tasksInGroup = (taskGroupsComputed as any)[groupName] as any[];
                            if (!tasksInGroup || tasksInGroup.length === 0) return null;
                            const isCollapsed = collapsedTaskGroups.has(groupName);
                            return (
                              <div key={`tasks-${groupName}`}>
                                <button onClick={() => toggleTaskGroup(groupName)} className="sidebar-section-header w-full">
                                  <span className="flex-1 text-left truncate">{groupName}</span>
                                  <span className="text-[10px]">{tasksInGroup.length}</span>
                                  <ChevronDown className={`ml-auto h-3 w-3 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                                </button>
                                {!isCollapsed && (
                                  <div className="space-y-1">
                                    {tasksInGroup.map((t: any) => (
                                      <UnifiedRow
                                        key={`task:${String(t._id)}`}
                                        item={toUnifiedFromTask(t)}
                                        isSelected={taskPanelTaskId === t._id}
                                        onOpen={openWorkItem}
                                        onToggleFavorite={onToggleFavoriteVoid}
                                        onToggleDone={onToggleDoneVoid}
                                        formatTimeAgo={formatTimeAgo}
                                        formatDue={formatDue}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {/* Public View */}
                  {currentView === 'public' && (
                    <>
                      {publicDocuments?.length === 0 ? (
                        <div className="text-center py-8">
                          <Globe className="h-12 w-12 text-[var(--text-secondary)] mx-auto mb-3" />
                          <p className="text-sm text-[var(--text-secondary)]">No public documents yet</p>
                          <p className="text-xs text-[var(--text-secondary)] mt-1">Be the first to share a document with the community!</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {publicDocuments?.map((doc) => {
                            const lastModified = (doc as any).lastModified || doc._creationTime;
                            const timeAgo = formatTimeAgo(lastModified);
                            const isRecent = Date.now() - lastModified < 24 * 60 * 60 * 1000;
                            const fileType = getFileTypeFromDocument(doc);
                            
                            return (
                              <div 
                                key={doc._id}
                                className={`group/pub flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-md cursor-pointer 
                                  transition-colors duration-150 hover:bg-[var(--bg-hover)]
                                  ${selectedDocumentId === doc._id 
                                    ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30' 
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                  }`}
                                onClick={() => onDocumentSelect(doc._id)}
                                title={`${doc.title} • ${lastModified !== doc._creationTime ? 'Updated' : 'Created'} ${new Date(lastModified).toLocaleDateString()}`}
                              >
                                <FileTypeIcon type={fileType} className="h-3.5 w-3.5 flex-shrink-0" />
                                
                                <span className="font-medium truncate flex-1 min-w-0">{doc.title}</span>
                                
                                {isRecent && (
                                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" title="Recently updated" />
                                )}
                                
                                <span 
                                  className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium transition-colors duration-150
                                    ${selectedDocumentId === doc._id
                                      ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]'
                                      : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] group-hover/pub:bg-[var(--bg-tertiary)] group-hover/pub:text-[var(--text-primary)]'
                                    }`}
                                  title={`Last modified: ${new Date(lastModified).toLocaleDateString()} ${new Date(lastModified).toLocaleTimeString()}`}
                                >
                                  {timeAgo}
                                </span>
                                
                                {user?.name && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onArchive(doc._id);
                                    }}
                                    className={`p-1 rounded-md flex-shrink-0 transition-colors duration-150 opacity-0 group-hover/pub:opacity-100
                                      hover:bg-[var(--bg-hover)] hover:text-red-600 text-[var(--text-secondary)]
                                    `}
                                    title="Move to trash"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
                
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="video/*,audio/*,image/*,.pdf,.doc,.docx,.csv,.txt,.md"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleFileUpload(file);
                  }}
                />
              </div>
            )}
          </div>
       )}
      </div>

      {/* Footer (Trash button) */}
      <div className="border-t border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
        <button
          onClick={() => setIsTrashOpen(true)}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
        >
          <Trash2 className="h-4 w-4" />
          <span>Trash</span>
          {trash && trash.length > 0 && (
            <span className="ml-auto text-xs bg-[var(--bg-hover)] text-[var(--text-secondary)] px-1.5 py-0.5 rounded">
              {trash.length}
            </span>
          )}
        </button>
      </div>

      {/* Removed SearchCommand overlay modal; inline search panel is used instead */}

      {taskPanelTaskId && (
        <TaskEditorPanel
          taskId={taskPanelTaskId}
          onClose={() => setTaskPanelTaskId(null)}
        />
      )}

      {/* Tag Picker Modal */}
      {isTagModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setIsTagModalOpen(false)} />
          <div role="dialog" aria-modal="true" className="relative w-[92%] max-w-sm rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-3 shadow-lg">
            <div className="text-[13px] font-semibold mb-2">Add tags to {selectedDocuments.size} item{selectedDocuments.size !== 1 ? 's' : ''}</div>
            <label className="block text-[11px] text-[var(--text-secondary)] mb-1">Tags (comma-separated)</label>
            <input
              autoFocus
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="e.g. planning, frontend, Q3"
              className="w-full px-2 py-1 text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-[var(--text-primary)] placeholder-[var(--text-secondary)] mb-3"
            />
            <div className="flex items-center justify-end gap-2 text-xs">
              <button onClick={() => setIsTagModalOpen(false)} className="px-2 py-1 rounded border border-[var(--border-color)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]">Cancel</button>
              <button
                onClick={() => {
                  const raw = tagInput.split(',').map(t => t.trim()).filter(Boolean);
                  const uniq = Array.from(new Set(raw));
                  if (uniq.length === 0) {
                    toast.error('Enter at least one tag');
                    return;
                  }
                  const ids = Array.from(selectedDocuments);
                  const tags = uniq.map((name) => ({ name }));
                  const promise = Promise.all(ids.map((id) => addTagsToDocument({ documentId: id, tags })));
                  toast.promise(promise, {
                    loading: 'Adding tags…',
                    success: () => {
                      setIsTagModalOpen(false);
                      setTagInput('');
                      return `Tagged ${ids.length} document${ids.length > 1 ? 's' : ''}`;
                    },
                    error: 'Failed to add tags',
                  });
                }}
                className="px-2 py-1 rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)]"
              >
                Add Tags
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move to Folder Modal */}
      {isMoveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setIsMoveModalOpen(false)} />
          <div role="dialog" aria-modal="true" className="relative w-[92%] max-w-sm rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-3 shadow-lg">
            <div className="text-[13px] font-semibold mb-2">Move {selectedDocuments.size} item{selectedDocuments.size !== 1 ? 's' : ''} to folder</div>
            <label className="block text-[11px] text-[var(--text-secondary)] mb-1">Select folder</label>
            <select
              value={targetFolderId ?? ''}
              onChange={(e) => {
                const nextId: Id<"folders"> | null = e.target.value
                  ? (e.target.value as unknown as Id<"folders">)
                  : null;
                setTargetFolderId(nextId);
              }}
              className="w-full px-2 py-1 text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-[var(--text-primary)] mb-3"
            >
              <option value="" disabled>
                {userFolders && userFolders.length > 0 ? 'Choose a folder' : 'No folders available'}
              </option>
              {userFolders?.map((f: any) => (
                <option key={String(f._id)} value={String(f._id)}>{f.name || 'Untitled Folder'}</option>
              ))}
            </select>
            <div className="flex items-center justify-end gap-2 text-xs">
              <button onClick={() => setIsMoveModalOpen(false)} className="px-2 py-1 rounded border border-[var(--border-color)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]">Cancel</button>
              <button
                disabled={!targetFolderId}
                onClick={() => {
                  if (!targetFolderId) return;
                  const ids = Array.from(selectedDocuments);
                  const promise = Promise.all(ids.map((id) => addDocumentToFolder({ documentId: id, folderId: targetFolderId })));
                  toast.promise(promise, {
                    loading: 'Moving…',
                    success: () => {
                      setIsMoveModalOpen(false);
                      return `Moved ${ids.length} document${ids.length > 1 ? 's' : ''}`;
                    },
                    error: 'Failed to move documents',
                  });
                }}
                className="px-2 py-1 rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Move
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setIsShareModalOpen(false)} />
          <div role="dialog" aria-modal="true" className="relative w-[92%] max-w-sm rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-3 shadow-lg">
            <div className="text-[13px] font-semibold mb-2">Share settings</div>
            <label className="inline-flex items-center gap-2 text-[12px]">
              <input
                type="checkbox"
                checked={sharePublic}
                onChange={(e) => setSharePublic(e.target.checked)}
              />
              <span>Make selected document(s) public</span>
            </label>
            <div className="mt-3 flex items-center justify-end gap-2 text-xs">
              <button onClick={() => setIsShareModalOpen(false)} className="px-2 py-1 rounded border border-[var(--border-color)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]">Cancel</button>
              <button
                onClick={() => {
                  const ids = Array.from(selectedDocuments);
                  const promise = Promise.all(ids.map((id) => updateDocument({ id, isPublic: sharePublic })));
                  toast.promise(promise, {
                    loading: sharePublic ? 'Making public…' : 'Making private…',
                    success: () => {
                      setIsShareModalOpen(false);
                      return `Updated ${ids.length} document${ids.length > 1 ? 's' : ''}`;
                    },
                    error: 'Failed to update sharing',
                  });
                }}
                className="px-2 py-1 rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)]"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}