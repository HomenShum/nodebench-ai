import { Id, Doc } from "../../../convex/_generated/dataModel";

// Main Sidebar Props
export interface SidebarProps {
    onDocumentSelect: (documentId: Id<"documents"> | null) => void;
    selectedDocumentId: Id<"documents"> | null;
    currentView: 'documents' | 'public';
    onViewChange: (view: 'documents' | 'public') => void;
    onSmsReceived?: (from: string, message: string) => void;
    openDocumentIds?: Id<"documents">[];
    isGridMode?: boolean;
    selectedFileIds?: Id<"files">[];
    onFileSelectionChange?: (selectedFileIds: Id<"files">[]) => void;
    onOpenSettings?: (
        tab?: 'profile' | 'account' | 'usage' | 'integrations' | 'billing' | 'reminders'
    ) => void;
    appMode: 'workspace' | 'fast-agent' | 'deep-agent' | 'dossier';
    onModeChange: (mode: 'workspace' | 'fast-agent' | 'deep-agent' | 'dossier') => void;
    activeSources: string[];
    onToggleSource: (sourceId: string) => void;
    onGoHome?: () => void;
}

// App Mode Type
export type AppMode = 'workspace' | 'fast-agent' | 'deep-agent' | 'dossier';

// View Type
export type ViewType = 'documents' | 'public';

// Tab Type
export type TabType = 'documents' | 'messages' | 'reports';

// Message Type for mock data
export interface Message {
    id: string;
    type: 'sms' | 'email';
    recipient: string;
    preview: string;
    time: string;
}

// Icon Configuration
export interface IconConfig {
    id: string;
    icon: any; // Lucide React component
    label: string;
    badge?: number;
    onClick?: () => void;
}

// Folder Tree Node
export interface FolderNode {
    _id: Id<"folders">;
    name: string;
    parentId?: Id<"folders"> | null;
    children?: FolderNode[];
    documents?: Doc<"documents">[];
}

// Task Group
export interface TaskGroup {
    name: string;
    tasks: Doc<"tasks">[];
}

// Source Category Map
export type SourceCategoryMap = Record<string, string[]>;
