import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import type { TabType } from "../types";

/**
 * Custom hook to manage all Sidebar state
 * Centralizes ~50+ useState calls from the original component
 */
export function useSidebarState() {
    // UI State
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isSourcesOpen, setIsSourcesOpen] = useState(true);
    const [isTrashOpen, setIsTrashOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('documents');

    // Bulk Actions State
    const [selectedDocuments, setSelectedDocuments] = useState<Set<Id<"documents">>>(new Set());
    const [isTagModalOpen, setIsTagModalOpen] = useState(false);
    const [tagInput, setTagInput] = useState("");
    const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
    const [targetFolderId, setTargetFolderId] = useState<Id<"folders"> | null>(null);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [sharePublic, setSharePublic] = useState(true);

    // Document Editing State
    const [editingDocumentId, setEditingDocumentId] = useState<Id<"documents"> | null>(null);
    const [editingDocumentTitle, setEditingDocumentTitle] = useState('');
    const editingTitleInputRef = useRef<HTMLInputElement>(null);
    const [quickActionsFor, setQuickActionsFor] = useState<Id<"documents"> | null>(null);

    // Timestamp Refresh
    const [nowTick, setNowTick] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setNowTick((t) => t + 1), 60_000);
        return () => clearInterval(id);
    }, []);

    // Communication Panels State
    const [showSmsPanel, setShowSmsPanel] = useState(false);
    const [smsTo, setSmsTo] = useState("+1-555-MOCK-AI");
    const [smsMessage, setSmsMessage] = useState("");
    const [showEmailPanel, setShowEmailPanel] = useState(false);
    const [emailTo, setEmailTo] = useState("ai@example.com");
    const [emailSubject, setEmailSubject] = useState("");
    const [emailBody, setEmailBody] = useState("");
    const [showGmailPanel, setShowGmailPanel] = useState(false);
    const [gmailLoading, setGmailLoading] = useState(false);
    const [gmailMessages, setGmailMessages] = useState<Array<{
        id: string;
        threadId?: string;
        snippet?: string;
        subject?: string;
        from?: string;
        date?: string;
    }>>([]);
    const [showSlackPanel, setShowSlackPanel] = useState(false);
    const [slackChannel, setSlackChannel] = useState("#ai-chat");
    const [slackMessage, setSlackMessage] = useState("");
    const [showDiscordPanel, setShowDiscordPanel] = useState(false);
    const [discordChannel, setDiscordChannel] = useState("#general");
    const [discordMessage, setDiscordMessage] = useState("");

    // MCP & Tools State
    const [showMcpManager, setShowMcpManager] = useState(false);
    const [showMcpPanel, setShowMcpPanel] = useState(false);
    const [showToolsPanel, setShowToolsPanel] = useState(false);
    const [showUrlPanel, setShowUrlPanel] = useState(false);
    const [urlInput, setUrlInput] = useState("");
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

    // Context Selection State
    const [selectedContextDocumentIds, setSelectedContextDocumentIds] = useState<Id<"documents">[]>([]);
    const [selectedContextFileIds, setSelectedContextFileIds] = useState<Id<"files">[]>([]);
    const [showContext, setShowContext] = useState(false);
    const [contextViewMode, setContextViewMode] = useState<'flat' | 'hierarchical'>('flat');
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
        new Set(['documents', 'dataFiles', 'mediaFiles', 'codeFiles'])
    );

    // Task State
    const [taskPanelTaskId, setTaskPanelTaskId] = useState<Id<"tasks"> | null>(null);
    const [tasksSortBy, setTasksSortBy] = useState<"updated" | "due" | "priority" | "title">("updated");
    const [tasksSortOrder, setTasksSortOrder] = useState<"asc" | "desc">("desc");
    const [tasksFilter, setTasksFilter] = useState<"all" | "open" | "completed">("all");

    // Collapse State
    const [collapsedDocGroups, setCollapsedDocGroups] = useState<Set<string>>(new Set());
    const [collapsedTaskGroups, setCollapsedTaskGroups] = useState<Set<string>>(new Set());

    // Multi-select State
    const [docSelectionAnchor, setDocSelectionAnchor] = useState<{ group: string; id: Id<"documents"> } | null>(null);
    const docsKeyboardScopeRef = useRef<HTMLDivElement | null>(null);

    // Document Ordering State
    const [docOrderByGroup, setDocOrderByGroup] = useState<Record<string, Array<Id<"documents">>>>({});
    const groupDocsRef = useRef<Record<string, Array<Id<"documents">>>>({});
    const saveOrderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Drag State
    const [_isReordering, setIsReordering] = useState(false);
    const [hasBeenDragged, setHasBeenDragged] = useState(false);
    const [iconOrder, setIconOrder] = useState([
        'flow', 'tools', 'mcp', 'sms', 'email', 'gmail', 'phone',
        'slack', 'discord', 'webhook', 'zapier'
    ]);

    // Sorting & Filtering State
    const [sortBy, setSortBy] = useState<'updated' | 'created' | 'title'>('updated');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [filterText, setFilterText] = useState('');

    // File Upload State
    const [_isFileUploading, setIsFileUploading] = useState(false);
    const [_uploadProgress, setUploadProgress] = useState<string>("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // User Preferences
    const userPreferences = useQuery(api.domains.auth.userPreferences.getUserPreferences);
    const updateUserPrefs = useMutation(api.domains.auth.userPreferences.updateUserPreferences);

    // Initialize icon order from preferences
    useEffect(() => {
        const incoming = userPreferences?.iconOrder;
        if (Array.isArray(incoming) && incoming.length > 0) {
            setIconOrder(incoming);
        }
    }, [userPreferences]);

    // Initialize document order from preferences
    useEffect(() => {
        const incoming = userPreferences?.docOrderByGroup;
        if (incoming && typeof incoming === "object") {
            setDocOrderByGroup((prev) => ({ ...prev, ...incoming }));
        }
    }, [userPreferences]);

    // Persist document order with debounce
    const schedulePersistDocOrder = useCallback((newMap: Record<string, Array<Id<"documents">>>) => {
        if (saveOrderTimer.current) clearTimeout(saveOrderTimer.current);
        saveOrderTimer.current = setTimeout(() => {
            updateUserPrefs({ docOrderByGroup: newMap }).catch((err: any) => {
                console.error("Failed to save document order", err);
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

    return {
        // UI State
        isSearchOpen, setIsSearchOpen,
        isSourcesOpen, setIsSourcesOpen,
        isTrashOpen, setIsTrashOpen,
        activeTab, setActiveTab,

        // Bulk Actions
        selectedDocuments, setSelectedDocuments,
        isTagModalOpen, setIsTagModalOpen,
        tagInput, setTagInput,
        isMoveModalOpen, setIsMoveModalOpen,
        targetFolderId, setTargetFolderId,
        isShareModalOpen, setIsShareModalOpen,
        sharePublic, setSharePublic,

        // Document Editing
        editingDocumentId, setEditingDocumentId,
        editingDocumentTitle, setEditingDocumentTitle,
        editingTitleInputRef,
        quickActionsFor, setQuickActionsFor,

        // Panels
        showSmsPanel, setShowSmsPanel,
        smsTo, setSmsTo,
        smsMessage, setSmsMessage,
        showEmailPanel, setShowEmailPanel,
        emailTo, setEmailTo,
        emailSubject, setEmailSubject,
        emailBody, setEmailBody,
        showGmailPanel, setShowGmailPanel,
        gmailLoading, setGmailLoading,
        gmailMessages, setGmailMessages,
        showSlackPanel, setShowSlackPanel,
        slackChannel, setSlackChannel,
        slackMessage, setSlackMessage,
        showDiscordPanel, setShowDiscordPanel,
        discordChannel, setDiscordChannel,
        discordMessage, setDiscordMessage,

        // MCP & Tools
        showMcpManager, setShowMcpManager,
        showMcpPanel, setShowMcpPanel,
        showToolsPanel, setShowToolsPanel,
        showUrlPanel, setShowUrlPanel,
        urlInput, setUrlInput,
        showFlowPanel, setShowFlowPanel,
        flowCommand, setFlowCommand,
        activeFlows, setActiveFlows,
        isFlowRunning, setIsFlowRunning,

        // Context
        selectedContextDocumentIds, setSelectedContextDocumentIds,
        selectedContextFileIds, setSelectedContextFileIds,
        showContext, setShowContext,
        contextViewMode, setContextViewMode,
        expandedGroups, setExpandedGroups,

        // Tasks
        taskPanelTaskId, setTaskPanelTaskId,
        tasksSortBy, setTasksSortBy,
        tasksSortOrder, setTasksSortOrder,
        tasksFilter, setTasksFilter,

        // Collapse
        collapsedDocGroups, setCollapsedDocGroups,
        collapsedTaskGroups, setCollapsedTaskGroups,

        // Multi-select
        docSelectionAnchor, setDocSelectionAnchor,
        docsKeyboardScopeRef,

        // Ordering
        docOrderByGroup, setDocOrderByGroup,
        groupDocsRef,
        schedulePersistDocOrder,

        // Drag
        _isReordering, setIsReordering,
        hasBeenDragged, setHasBeenDragged,
        iconOrder, setIconOrder,

        // Sorting & Filtering
        sortBy, setSortBy,
        sortOrder, setSortOrder,
        filterText, setFilterText,

        // File Upload
        _isFileUploading, setIsFileUploading,
        _uploadProgress, setUploadProgress,
        fileInputRef,

        // Preferences
        userPreferences,
        updateUserPrefs,

        // Other
        nowTick,
    };
}
