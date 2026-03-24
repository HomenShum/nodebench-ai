import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DialogOverlay } from "@/shared/components/DialogOverlay";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
    Search,
    FileText,
    CheckSquare,
    Zap,
    Settings,
    Home,
    TrendingUp,
    Plus,
    Command,
    ArrowRight,
    Sparkles,
    FileSearch,
    Globe,
    Orbit,
    HeartPulse,
    FlaskConical,
    Activity,
} from 'lucide-react';
import { sanitizeDocumentTitle } from "@/lib/displayText";
import { rankCommandPaletteCommands } from "./commandPaletteUtils";
import type { MainView } from "@/lib/registry/viewRegistry";

export interface CommandAction {
    id: string;
    label: string;
    description?: string;
    icon: ReactNode;
    keywords: string[];
    section: 'navigation' | 'create' | 'search' | 'ai' | 'recent' | 'settings' | 'mode';
    shortcut?: string;
    action: () => void;
}

export interface ExecutedCommand {
    id: string;
    label: string;
    section: CommandAction['section'];
}

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate?: (view: MainView) => void;
    onCreateDocument?: () => void;
    onCreateTask?: () => void;
    onOpenSettings?: () => void;
    onCommandExecuted?: (command: ExecutedCommand) => void;
    /** Extra actions injected by the host (e.g. cockpit mode switches) */
    additionalActions?: CommandAction[];
}

export function CommandPalette({
    isOpen,
    onClose,
    onNavigate,
    onCreateDocument,
    onCreateTask,
    onOpenSettings,
    onCommandExecuted,
    additionalActions,
}: CommandPaletteProps) {
    const [query, setQuery] = useState('');
    const deferredQuery = useDeferredValue(query);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const recentDocs = useQuery(api.domains.documents.documents.getSidebar);
    const recentTasks = null;

    // Define all available commands
    const allCommands = useMemo<CommandAction[]>(() => {
        const commands: CommandAction[] = [
            // Navigation
            {
                id: 'nav-home',
                label: 'Go to NodeBench Home',
                description: 'Open the operating intelligence dashboard',
                icon: <Home className="w-4 h-4" />,
                keywords: ['home', 'control plane', 'receipts', 'main', 'deeptrace'],
                section: 'navigation',
                action: () => {
                    onNavigate?.('control-plane');
                    onClose();
                }
            },
            {
                id: 'nav-receipts',
                label: 'Go to Receipts',
                description: 'Inspect denied, approval-gated, and reversible agent actions',
                icon: <Orbit className="w-4 h-4" />,
                keywords: ['receipts', 'actions', 'trust', 'review', 'approval'],
                section: 'navigation',
                action: () => {
                    onNavigate?.('receipts');
                    onClose();
                }
            },
            {
                id: 'nav-delegation',
                label: 'Go to Passport',
                description: 'Review scoped permissions, denied tools, and approval gates',
                icon: <CheckSquare className="w-4 h-4" />,
                keywords: ['passport', 'delegation', 'scope', 'permissions', 'approve', 'policy'],
                section: 'navigation',
                action: () => {
                    onNavigate?.('delegation');
                    onClose();
                }
            },
            {
                id: 'nav-investigation',
                label: 'Go to Investigation',
                description: 'Trace from action to evidence to approval',
                icon: <TrendingUp className="w-4 h-4" />,
                keywords: ['investigation', 'evidence', 'trace', 'replay', 'prove'],
                section: 'navigation',
                action: () => {
                    onNavigate?.('investigation');
                    onClose();
                }
            },
            {
                id: 'nav-documents',
                label: 'Go to Workspace',
                description: 'View documents, notes, and active work',
                icon: <FileText className="w-4 h-4" />,
                keywords: ['documents', 'files', 'workspace'],
                section: 'navigation',
                action: () => {
                    onNavigate?.('documents');
                    onClose();
                }
            },
            {
                id: 'nav-research',
                label: 'Go to Research Hub',
                description: 'Open live signals, briefs, and timelines',
                icon: <Sparkles className="w-4 h-4" />,
                keywords: ['research', 'signals', 'briefing', 'hub'],
                section: 'navigation',
                action: () => {
                    onNavigate?.('research');
                    onClose();
                }
            },
            {
                id: 'nav-product-direction',
                label: 'Open Product Direction Memo',
                description: 'Review the evidence-bounded in-house product recommendation workflow',
                icon: <FileSearch className="w-4 h-4" />,
                keywords: ['strategy', 'product direction', 'memo', 'evidence', 'recommendation'],
                section: 'ai',
                action: () => {
                    onNavigate?.('product-direction');
                    onClose();
                }
            },
            {
                id: 'nav-execution-trace',
                label: 'Open Execution Trace',
                description: 'Inspect a traceable search, edit, verify, and export workflow',
                icon: <FileSearch className="w-4 h-4" />,
                keywords: ['execution trace', 'workflow trace', 'spreadsheet', 'verify', 'export', 'audit'],
                section: 'ai',
                action: () => {
                    onNavigate?.('execution-trace');
                    onClose();
                }
            },
            {
                id: 'nav-world-monitor',
                label: 'Open World Monitor',
                description: 'Review world events, geography clusters, and causal impact candidates',
                icon: <Globe className="w-4 h-4" />,
                keywords: ['world monitor', 'events', 'geopolitics', 'map', 'causal'],
                section: 'ai',
                action: () => {
                    onNavigate?.('world-monitor');
                    onClose();
                }
            },
            {
                id: 'nav-watchlists',
                label: 'Open Watchlists',
                description: 'Inspect active monitors for companies, sectors, regions, and themes',
                icon: <Activity className="w-4 h-4" />,
                keywords: ['watchlists', 'alerts', 'monitoring', 'deeptrace', 'theme'],
                section: 'ai',
                action: () => {
                    onNavigate?.('watchlists');
                    onClose();
                }
            },
            {
                id: 'nav-benchmarks',
                label: 'Open Benchmark Workbench',
                description: 'Inspect internal benchmark receipts, replay, and published proof',
                icon: <FlaskConical className="w-4 h-4" />,
                keywords: ['benchmarks', 'eval', 'receipts', 'proof', 'replay'],
                section: 'ai',
                action: () => {
                    onNavigate?.('benchmarks');
                    onClose();
                }
            },
            {
                id: 'nav-agents',
                label: 'Go to Agent Workflows',
                description: 'Open active threads, runs, and task sessions',
                icon: <Zap className="w-4 h-4" />,
                keywords: ['agents', 'workflows', 'automation', 'tasks'],
                section: 'navigation',
                action: () => {
                    onNavigate?.('agents');
                    onClose();
                }
            },
            {
                id: 'nav-health',
                label: 'Open System Health',
                description: 'Check observability, maintenance, and recovery loops',
                icon: <HeartPulse className="w-4 h-4" />,
                keywords: ['health', 'observability', 'maintenance', 'alerts'],
                section: 'settings',
                action: () => {
                    onNavigate?.('observability');
                    onClose();
                }
            },
            {
                id: 'nav-tool-activity',
                label: 'Open Tool Activity',
                description: 'Review action receipts and auditable tool calls',
                icon: <Activity className="w-4 h-4" />,
                keywords: ['tools', 'activity', 'ledger', 'receipt', 'trace', 'mcp'],
                section: 'settings',
                action: () => {
                    onNavigate?.('mcp-ledger');
                    onClose();
                }
            },

            // Create Actions
            {
                id: 'create-document',
                label: 'Create New Document',
                description: 'Start a fresh document',
                icon: <Plus className="w-4 h-4" />,
                keywords: ['new', 'create', 'document', 'file', 'note'],
                section: 'create',
                shortcut: 'Ctrl+N',
                action: () => {
                    onCreateDocument?.();
                    onClose();
                }
            },
            {
                id: 'create-task',
                label: 'Create New Task',
                description: 'Add a task to your to-do list',
                icon: <CheckSquare className="w-4 h-4" />,
                keywords: ['new', 'create', 'task', 'todo', 'checklist'],
                section: 'create',
                shortcut: 'Ctrl+T',
                action: () => {
                    onCreateTask?.();
                    onClose();
                }
            },
            {
                id: 'create-event',
                label: 'Open Receipts Review',
                description: 'Jump into the receipts stream and inspect the current run',
                icon: <Orbit className="w-4 h-4" />,
                keywords: ['receipts', 'review', 'control plane', 'investigation'],
                section: 'create',
                action: () => {
                    onNavigate?.('receipts');
                    onClose();
                }
            },

            // AI Actions
            {
                id: 'ai-summarize',
                label: 'Summarize Current View',
                description: 'Get an AI summary of what you\'re viewing',
                icon: <Sparkles className="w-4 h-4" />,
                keywords: ['ai', 'summarize', 'summary', 'brief'],
                section: 'ai',
                action: () => {
                    onClose();
                }
            },
            {
                id: 'ai-insights',
                label: 'Open Investigation Trail',
                description: 'Trace from receipts to evidence, approval, and replay',
                icon: <TrendingUp className="w-4 h-4" />,
                keywords: ['investigation', 'evidence', 'trace', 'approval', 'replay'],
                section: 'ai',
                action: () => {
                    onNavigate?.('investigation');
                    onClose();
                }
            },

            // WebMCP
            {
                id: 'ai-webmcp-scan',
                label: 'Scan for browser tools',
                description: 'Discover tools from a connected website',
                icon: <Globe className="w-4 h-4" />,
                keywords: ['webmcp', 'mcp', 'scan', 'discover', 'tools', 'origin', 'website'],
                section: 'ai',
                action: () => {
                    onOpenSettings?.();
                    onClose();
                }
            },
            {
                id: 'ai-webmcp-manage',
                label: 'Manage browser tool sites',
                description: 'View and manage approved connected sites',
                icon: <Globe className="w-4 h-4" />,
                keywords: ['webmcp', 'mcp', 'origins', 'manage', 'settings', 'approve'],
                section: 'ai',
                action: () => {
                    onOpenSettings?.();
                    onClose();
                }
            },

            // Settings
            {
                id: 'settings-open',
                label: 'Open Settings',
                description: 'Configure your preferences',
                icon: <Settings className="w-4 h-4" />,
                keywords: ['settings', 'preferences', 'config', 'options'],
                section: 'settings',
                shortcut: 'Ctrl+,',
                action: () => {
                    onOpenSettings?.();
                    onClose();
                }
            },
        ];

        // Add recent documents
        if (recentDocs && recentDocs.length > 0) {
            recentDocs.forEach((doc: any) => {
                commands.push({
                    id: `doc-${doc._id}`,
                    label: sanitizeDocumentTitle(doc.title, 'Untitled Document'),
                    description: `Open recent document`,
                    icon: <FileText className="w-4 h-4" />,
                    keywords: ['recent', 'document', sanitizeDocumentTitle(doc.title, 'Untitled Document').toLowerCase()],
                    section: 'recent',
                    action: () => {
                        onClose();
                    }
                });
            });
        }

        // Add recent tasks
        if (recentTasks && recentTasks.length > 0) {
            recentTasks.forEach((task: any) => {
                commands.push({
                    id: `task-${task._id}`,
                    label: task.title || 'Untitled Task',
                    description: `Open recent task`,
                    icon: <CheckSquare className="w-4 h-4" />,
                    keywords: ['recent', 'task', task.title?.toLowerCase() || ''],
                    section: 'recent',
                    action: () => {
                        onClose();
                    }
                });
            });
        }

        return [...(additionalActions ?? []), ...commands];
    }, [additionalActions, recentDocs, recentTasks, onNavigate, onCreateDocument, onCreateTask, onOpenSettings, onClose]);

    // Lightweight fuzzy scorer: returns 0 (no match) or positive score (higher = better)
    const fuzzyScore = useCallback((text: string, term: string): number => {
        const t = text.toLowerCase();
        const q = term.toLowerCase();
        // Exact prefix match = highest
        if (t.startsWith(q)) return 100;
        // Contains substring = high
        if (t.includes(q)) return 60;
        // Fuzzy: all query chars appear in order
        let ti = 0;
        let consecutive = 0;
        let maxConsecutive = 0;
        for (let qi = 0; qi < q.length; qi++) {
            const found = t.indexOf(q[qi], ti);
            if (found === -1) return 0;
            if (found === ti) { consecutive++; maxConsecutive = Math.max(maxConsecutive, consecutive); }
            else { consecutive = 1; }
            ti = found + 1;
        }
        return 10 + maxConsecutive * 5;
    }, []);

    // Filter and rank commands with fuzzy search (deferred so typing stays responsive)
    const filteredCommands = useMemo(() => {
        if (!deferredQuery.trim()) {
            return rankCommandPaletteCommands(allCommands.filter(cmd =>
                cmd.section === 'mode' ||
                cmd.section === 'navigation' ||
                cmd.section === 'create' ||
                cmd.section === 'recent'
            ), deferredQuery);
        }

        const searchTerm = deferredQuery.trim();
        const scored = allCommands
            .map(cmd => {
                const labelScore = fuzzyScore(cmd.label, searchTerm);
                const descScore = cmd.description ? fuzzyScore(cmd.description, searchTerm) * 0.6 : 0;
                const kwScore = Math.max(0, ...cmd.keywords.map(kw => fuzzyScore(kw, searchTerm) * 0.8));
                const best = Math.max(labelScore, descScore, kwScore);
                return { cmd, score: best };
            })
            .filter(({ score }) => score > 0)
            .sort((a, b) => b.score - a.score);

        return scored.map(({ cmd }) => cmd);
    }, [deferredQuery, allCommands, fuzzyScore]);

    // Group commands by section
    const groupedCommands = useMemo(() => {
        const groups: Record<string, CommandAction[]> = {};

        filteredCommands.forEach(cmd => {
            if (!groups[cmd.section]) {
                groups[cmd.section] = [];
            }
            groups[cmd.section].push(cmd);
        });

        return groups;
    }, [filteredCommands]);

    const executeCommand = useCallback((command: CommandAction) => {
        onCommandExecuted?.({
            id: command.id,
            label: command.label,
            section: command.section,
        });
        command.action();
    }, [onCommandExecuted]);

    const sectionLabels: Record<string, string> = {
        mode: 'Switch Mode',
        navigation: 'Navigate',
        create: 'Create New',
        search: 'Search Results',
        ai: 'AI Actions',
        recent: 'Recent',
        settings: 'Settings'
    };

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => Math.max(prev - 1, 0));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const selectedCommand = filteredCommands[selectedIndex];
                if (selectedCommand) {
                    executeCommand(selectedCommand);
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, filteredCommands, selectedIndex, onClose, executeCommand]);

    // Auto-focus input when opened
    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            requestAnimationFrame(() => inputRef.current?.focus());
        }
    }, [isOpen]);

    // Scroll selected item into view
    useEffect(() => {
        if (listRef.current && isOpen) {
            const selectedElement = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
            selectedElement?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, [selectedIndex, isOpen]);

    if (!isOpen) return null;

    let commandIndex = 0;

    return (
        <DialogOverlay
            isOpen={isOpen}
            onClose={onClose}
            ariaLabel="Command palette"
            positionClassName="items-start justify-center pt-[15vh] px-4"
            backdropClassName="bg-black/50 backdrop-blur-sm"
            contentClassName="w-full max-w-2xl bg-surface rounded-lg shadow-2xl dark:shadow-black/40 overflow-hidden border border-edge"
        >
            {/* Palette Header */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
                <div className="flex items-center gap-2">
                    <Command className="w-4 h-4 text-content-muted" />
                    <span className="text-xs font-semibold text-content-secondary">Command Palette</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-content-muted">
                    <kbd className="px-1.5 py-0.5 bg-surface-secondary rounded text-xs font-mono">ESC</kbd>
                    <span>to close</span>
                </div>
            </div>

            {/* Search Input */}
            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-edge">
                <Search className="w-5 h-5 text-content-muted flex-shrink-0" />
                <label htmlFor="command-palette-input" className="sr-only">Search commands</label>
                <input
                    id="command-palette-input"
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search commands or navigate…"
                    className="flex-1 bg-transparent border-none outline-none text-content placeholder:text-content-muted dark:placeholder-gray-500 text-sm"
                    data-agent-id="cmd:search"
                    data-agent-action="search"
                    data-agent-label="Search commands"
                />
            </div>

            {/* Commands List */}
            <div
                ref={listRef}
                className="max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent"
            >
                {filteredCommands.length === 0 ? (
                    <div className="py-12 text-center text-content-muted text-sm">
                        <FileSearch className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No commands found</p>
                        <p className="text-xs mt-1">Try a different search term</p>
                    </div>
                ) : (
                    Object.entries(groupedCommands).map(([section, commands]) => (
                        <div key={section} className="py-2">
                            <div className="px-4 py-1.5 text-xs font-semibold text-content-secondary">
                                {sectionLabels[section] || section}
                            </div>
                            {commands.map((cmd) => {
                                const currentIndex = commandIndex++;
                                const isSelected = currentIndex === selectedIndex;

                                return (
                                    <button
                                        key={cmd.id}
                                        data-index={currentIndex}
                                        data-agent-id={`cmd:${cmd.id}`}
                                        data-agent-action="navigate"
                                        data-agent-label={cmd.label}
                                        onClick={() => executeCommand(cmd)}
                                        onMouseEnter={() => setSelectedIndex(currentIndex)}
                                        className={`
                                                    w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors border-l-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring
                                                    ${isSelected
                                                ? 'bg-surface-secondary text-content border-l-[rgb(79, 70, 229)]'
                                                : 'text-content-secondary hover:bg-surface-hover border-l-transparent'
                                            }
                                                `}
                                    >
                                        <div className={`
                                                    flex items-center justify-center w-8 h-8 rounded-lg
                                                    ${isSelected ? 'bg-surface text-content' : 'bg-surface-secondary text-content-muted'}
                                                `}>
                                            {cmd.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm truncate">{cmd.label}</div>
                                            {cmd.description && (
                                                <div className="text-xs text-content-secondary truncate">{cmd.description}</div>
                                            )}
                                        </div>
                                        {cmd.shortcut ? (
                                            <kbd className="hidden sm:block px-2 py-1 bg-surface-secondary rounded text-xs font-mono text-content-secondary">
                                                {cmd.shortcut}
                                            </kbd>
                                        ) : isSelected ? (
                                            <ArrowRight className="w-4 h-4 text-content-muted" />
                                        ) : null}
                                    </button>
                                );
                            })}
                        </div>
                    ))
                )}
            </div>

            {/* Footer Hints */}
            <div className="px-4 py-2 border-t border-edge bg-surface-secondary flex items-center justify-between text-xs text-content-secondary">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                        <kbd className="px-1 py-0.5 bg-surface rounded text-xs font-mono border border-edge dark:text-content-muted">↑↓</kbd>
                        Navigate
                    </span>
                    <span className="flex items-center gap-1">
                        <kbd className="px-1 py-0.5 bg-surface rounded text-xs font-mono border border-edge dark:text-content-muted">↵</kbd>
                        Select
                    </span>
                </div>
                <span className="flex items-center gap-1">
                    <Command className="w-3 h-3" />
                    <span>Command Palette</span>
                </span>
            </div>
        </DialogOverlay>
    );
}
