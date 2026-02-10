import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    FileText,
    CheckSquare,
    Calendar,
    Zap,
    Settings,
    Home,
    Users,
    Clock,
    TrendingUp,
    Archive,
    Trash2,
    Edit,
    Plus,
    X,
    Command,
    ArrowRight,
    Hash,
    Sparkles,
    FileSearch,
    BarChart2
} from 'lucide-react';
// import { useQuery, useMutation } from 'convex/react';
// import { api } from '../../convex/_generated/api';

export interface CommandAction {
    id: string;
    label: string;
    description?: string;
    icon: React.ReactNode;
    keywords: string[];
    section: 'navigation' | 'create' | 'search' | 'ai' | 'recent' | 'settings';
    shortcut?: string;
    action: () => void;
}

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate?: (view: string) => void;
    onCreateDocument?: () => void;
    onCreateTask?: () => void;
    onOpenSettings?: () => void;
}

export function CommandPalette({
    isOpen,
    onClose,
    onNavigate,
    onCreateDocument,
    onCreateTask,
    onOpenSettings
}: CommandPaletteProps) {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // TODO: Fetch recent documents and tasks once the queries are available
    // const recentDocs = useQuery(api.domains.documents.documents.listDocuments, { limit: 5 });
    // const recentTasks = useQuery(api.domains.tasks.tasks.listTasks, { limit: 5 });
    const recentDocs = null;
    const recentTasks = null;

    // Define all available commands
    const allCommands = useMemo<CommandAction[]>(() => {
        const commands: CommandAction[] = [
            // Navigation
            {
                id: 'nav-home',
                label: 'Go to Home',
                description: 'Return to the main dashboard',
                icon: <Home className="w-4 h-4" />,
                keywords: ['home', 'dashboard', 'main'],
                section: 'navigation',
                action: () => {
                    onNavigate?.('research');
                    onClose();
                }
            },
            {
                id: 'nav-documents',
                label: 'Go to Documents',
                description: 'View and manage your documents',
                icon: <FileText className="w-4 h-4" />,
                keywords: ['documents', 'files', 'workspace'],
                section: 'navigation',
                action: () => {
                    onNavigate?.('documents');
                    onClose();
                }
            },
            {
                id: 'nav-calendar',
                label: 'Go to Calendar',
                description: 'View your schedule and events',
                icon: <Calendar className="w-4 h-4" />,
                keywords: ['calendar', 'schedule', 'events', 'meetings'],
                section: 'navigation',
                action: () => {
                    onNavigate?.('calendar');
                    onClose();
                }
            },
            {
                id: 'nav-agents',
                label: 'Go to Agents',
                description: 'Manage your AI agents',
                icon: <Zap className="w-4 h-4" />,
                keywords: ['agents', 'ai', 'automation'],
                section: 'navigation',
                action: () => {
                    onNavigate?.('agents');
                    onClose();
                }
            },
            {
                id: 'nav-analytics',
                label: 'Go to Analytics',
                description: 'View your productivity analytics',
                icon: <BarChart2 className="w-4 h-4" />,
                keywords: ['analytics', 'stats', 'productivity', 'insights'],
                section: 'navigation',
                action: () => {
                    onNavigate?.('analytics');
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
                label: 'Create New Event',
                description: 'Schedule a new calendar event',
                icon: <Calendar className="w-4 h-4" />,
                keywords: ['new', 'create', 'event', 'meeting', 'appointment'],
                section: 'create',
                action: () => {
                    // Navigate to calendar with create modal
                    onNavigate?.('calendar');
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
                    // Trigger AI summarization
                    console.log('AI Summarize');
                    onClose();
                }
            },
            {
                id: 'ai-insights',
                label: 'Get Productivity Insights',
                description: 'AI-powered productivity recommendations',
                icon: <TrendingUp className="w-4 h-4" />,
                keywords: ['ai', 'insights', 'productivity', 'recommendations'],
                section: 'ai',
                action: () => {
                    onNavigate?.('analytics');
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
                    label: doc.title || 'Untitled Document',
                    description: `Open recent document`,
                    icon: <FileText className="w-4 h-4" />,
                    keywords: ['recent', 'document', doc.title?.toLowerCase() || ''],
                    section: 'recent',
                    action: () => {
                        // Open document
                        console.log('Open document:', doc._id);
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
                        // Open task
                        console.log('Open task:', task._id);
                        onClose();
                    }
                });
            });
        }

        return commands;
    }, [recentDocs, recentTasks, onNavigate, onCreateDocument, onCreateTask, onOpenSettings, onClose]);

    // Filter commands based on query
    const filteredCommands = useMemo(() => {
        if (!query.trim()) {
            // Show recent items and common actions when no query
            return allCommands.filter(cmd =>
                cmd.section === 'navigation' ||
                cmd.section === 'create' ||
                cmd.section === 'recent'
            );
        }

        const searchTerm = query.toLowerCase().trim();
        return allCommands.filter(cmd => {
            const matchesLabel = cmd.label.toLowerCase().includes(searchTerm);
            const matchesDescription = cmd.description?.toLowerCase().includes(searchTerm);
            const matchesKeywords = cmd.keywords.some(kw => kw.includes(searchTerm));

            return matchesLabel || matchesDescription || matchesKeywords;
        });
    }, [query, allCommands]);

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

    const sectionLabels: Record<string, string> = {
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
                    selectedCommand.action();
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, filteredCommands, selectedIndex, onClose]);

    // Auto-focus input when opened
    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 100);
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
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                />

                {/* Command Palette */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -20 }}
                    transition={{ type: 'spring', duration: 0.3 }}
                    className="relative w-full max-w-2xl bg-white dark:bg-[#09090B] rounded-xl shadow-2xl dark:shadow-black/40 overflow-hidden border border-gray-200 dark:border-white/[0.06]"
                >
                    {/* Search Input */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-white/[0.06]">
                        <Search className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Type a command or search..."
                            className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm"
                        />
                        <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-white/[0.06] rounded text-[10px] font-mono dark:text-gray-400">ESC</kbd>
                            <span>to close</span>
                        </div>
                    </div>

                    {/* Commands List */}
                    <div
                        ref={listRef}
                        className="max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent"
                    >
                        {filteredCommands.length === 0 ? (
                            <div className="py-12 text-center text-gray-400 dark:text-gray-500 text-sm">
                                <FileSearch className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p>No commands found</p>
                                <p className="text-xs mt-1">Try a different search term</p>
                            </div>
                        ) : (
                            Object.entries(groupedCommands).map(([section, commands]) => (
                                <div key={section} className="py-2">
                                    <div className="px-4 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        {sectionLabels[section] || section}
                                    </div>
                                    {commands.map((cmd) => {
                                        const currentIndex = commandIndex++;
                                        const isSelected = currentIndex === selectedIndex;

                                        return (
                                            <motion.button
                                                key={cmd.id}
                                                data-index={currentIndex}
                                                onClick={() => cmd.action()}
                                                onMouseEnter={() => setSelectedIndex(currentIndex)}
                                                className={`
                                                    w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors
                                                    ${isSelected
                                                        ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-900 dark:text-blue-300'
                                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.04]'
                                                    }
                                                `}
                                                whileHover={{ x: 4 }}
                                            >
                                                <div className={`
                                                    flex items-center justify-center w-8 h-8 rounded-lg
                                                    ${isSelected ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400' : 'bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-400'}
                                                `}>
                                                    {cmd.icon}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-sm truncate">{cmd.label}</div>
                                                    {cmd.description && (
                                                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{cmd.description}</div>
                                                    )}
                                                </div>
                                                {cmd.shortcut ? (
                                                    <kbd className="hidden sm:block px-2 py-1 bg-gray-100 dark:bg-white/[0.06] rounded text-xs font-mono text-gray-600 dark:text-gray-400">
                                                        {cmd.shortcut}
                                                    </kbd>
                                                ) : isSelected ? (
                                                    <ArrowRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                ) : null}
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer Hints */}
                    <div className="px-4 py-2 border-t border-gray-100 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.02] flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1">
                                <kbd className="px-1 py-0.5 bg-white dark:bg-white/[0.06] rounded text-[10px] font-mono border border-gray-200 dark:border-white/[0.06] dark:text-gray-400">↑↓</kbd>
                                Navigate
                            </span>
                            <span className="flex items-center gap-1">
                                <kbd className="px-1 py-0.5 bg-white dark:bg-white/[0.06] rounded text-[10px] font-mono border border-gray-200 dark:border-white/[0.06] dark:text-gray-400">↵</kbd>
                                Select
                            </span>
                        </div>
                        <span className="flex items-center gap-1">
                            <Command className="w-3 h-3" />
                            <span>Command Palette</span>
                        </span>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
