import React, { useState, useMemo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
    ArrowRight,
    Sparkles,
    Upload,
    Send,
    Shield,
} from 'lucide-react';
import { useConvexAuth, useQuery } from 'convex/react';
import { prefersReducedMotion } from '../../../utils/a11y';
import { api } from '../../../../convex/_generated/api';

interface CinematicHomeProps {
    onEnterHub: (tab?: "overview" | "signals" | "briefing" | "forecasts") => void;
    onEnterWorkspace: () => void;
    onOpenFastAgent: () => void;
    onOpenWorkbench?: () => void;
    onOpenAgents?: () => void;
}

export default function CinematicHome({ onEnterHub, onEnterWorkspace, onOpenFastAgent, onOpenWorkbench, onOpenAgents }: CinematicHomeProps) {
    const [inputValue, setInputValue] = useState('');
    const [isDragOver, setIsDragOver] = useState(false);
    const reduceMotion = useMemo(() => prefersReducedMotion(), []);
    const inputRef = useRef<HTMLInputElement>(null);

    const userStats = useQuery(api.domains.auth.userStats.getUserActivitySummary);
    const greeting = useQuery(api.domains.auth.userStats.getGreetingMessage);
    const insights = useQuery(api.domains.auth.userStats.getProductivityInsights);

    const { isAuthenticated } = useConvexAuth();

    // hasActivity check removed — stat boxes removed (vanity metrics)

    const handleSubmit = useCallback(() => {
        // Open the agent panel — the input value will be picked up by the panel
        onOpenFastAgent();
    }, [onOpenFastAgent]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    }, [handleSubmit]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        // Open agent panel for file processing
        onOpenFastAgent();
    }, [onOpenFastAgent]);

    return (
        <div className="nb-page-shell">
            <div className="nb-page-inner flex items-center justify-center">
                {/* Main Content — Centered */}
                <div className="nb-page-frame-narrow relative z-10 flex flex-col items-center w-full max-w-3xl">

                {/* Greeting */}
                <motion.div
                    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.15 }}
                    className="text-center mb-8"
                >
                    <h1 className="type-page-title md:text-3xl text-content">
                        {greeting?.greeting || "Welcome"}{userStats?.userName ? `, ${userStats.userName}` : ""}
                    </h1>
                    <p className="mt-3 text-sm text-content-secondary">
                        Your AI research workspace — signals, briefs, and agents in one place.
                    </p>
                </motion.div>

                {/* Hero Input — The ONE action */}
                <motion.div
                    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 }}
                    className="w-full relative z-10"
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <div className={`
                        relative flex items-center gap-3 px-5 py-4 rounded-lg border transition-all duration-200
                        bg-surface shadow-sm
                        focus-within:border-[var(--accent-primary)] focus-within:ring-2 focus-within:ring-[var(--accent-primary)]/10
                        ${isDragOver
                            ? 'border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)]/10'
                            : 'border-edge hover:border-content-muted/30 hover:shadow-md'
                        }
                    `}>
                        {isDragOver ? (
                            <div className="flex items-center gap-3 w-full py-1">
                                <Upload className="w-5 h-5 text-[var(--accent-primary)] motion-safe:animate-bounce" />
                                <span className="text-[var(--accent-primary)] font-medium">Drop your file here...</span>
                            </div>
                        ) : (
                            <>
                                <Sparkles className="w-5 h-5 text-content-muted flex-shrink-0" />
                                <label htmlFor="cinematic-home-input" className="sr-only">Ask anything or upload a file</label>
                                <input
                                    id="cinematic-home-input"
                                    ref={inputRef}
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask anything or upload a file..."
                                    className="flex-1 bg-transparent text-base text-content placeholder:text-content-muted outline-none"
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    className="flex-shrink-0 p-2 rounded-lg bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-hover)] transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2"
                                    aria-label="Send"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </>
                        )}
                    </div>
                </motion.div>

                {/* Subtle navigation link */}
                <motion.div
                    initial={reduceMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.45 }}
                    className="mt-4 flex items-center gap-4 text-sm text-content-muted"
                >
                    <button
                        type="button"
                        onClick={() => onEnterHub()}
                        className="hover:text-[var(--accent-primary)] transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 rounded-sm px-1"
                    >
                        Browse What's New <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-content-muted/40">|</span>
                    <button
                        type="button"
                        onClick={onEnterWorkspace}
                        className="hover:text-[var(--accent-primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 rounded-sm px-1"
                    >
                        Your Workspace
                    </button>
                </motion.div>

                {/* Quick Start blocks — guides first-time users (Vercel-style) */}
                <motion.div
                    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.5 }}
                    className="w-full mt-8"
                >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <QuickStartCard
                            title="Run a benchmark"
                            desc="Compare models on real app tasks."
                            icon={<Sparkles className="w-4 h-4" />}
                            onClick={() => (onOpenWorkbench ? onOpenWorkbench() : onEnterHub())}
                        />
                        <QuickStartCard
                            title="Create an assistant"
                            desc="Kick off a workflow with tools."
                            icon={<Shield className="w-4 h-4" />}
                            onClick={() => (onOpenAgents ? onOpenAgents() : onOpenFastAgent())}
                        />
                        <QuickStartCard
                            title="View latest briefing"
                            desc="Signals, sources, and actions."
                            icon={<ArrowRight className="w-4 h-4" />}
                            onClick={() => onEnterHub("briefing")}
                        />
                    </div>
                </motion.div>

                {/* Single insight hint — max 1, subtle */}
                {insights && insights.length > 0 && (
                    <motion.p
                        initial={reduceMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3, delay: 0.55 }}
                        className="mt-6 text-sm text-content-muted text-center max-w-md"
                    >
                        {insights[0].icon} {insights[0].message}
                    </motion.p>
                )}

                {/* Stat boxes removed — vanity metrics that don't drive action. Single insight hint above is sufficient. */}

                {/* Discovery Cards — renamed to plain language */}
                <motion.div
                    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.55 }}
                    className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 mt-10"
                >
                    <DiscoveryCard
                        title="What's New"
                        desc="See today's signals, briefings, and trends."
                        btnText="Open"
                        onClick={() => onEnterHub()}
                        variant="dark"
                        icon={<Sparkles className="w-5 h-5" />}
                    />
                    <DiscoveryCard
                        title="Your Workspace"
                        desc="Documents, tasks, and reports."
                        btnText="Open"
                        onClick={onEnterWorkspace}
                        variant="light"
                        icon={<Shield className="w-5 h-5" />}
                    />
                </motion.div>
                </div>
            </div>
        </div>
    );
}

// --- SUB-COMPONENTS ---

function QuickStartCard({ title, desc, icon, onClick }: {
    title: string;
    desc: string;
    icon: React.ReactNode;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="
                group nb-surface-card w-full text-left
                px-4 py-3 transition-all duration-200
                hover:bg-surface-hover hover:border-edge
                active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50
            "
        >
            <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg border border-edge bg-surface-secondary flex items-center justify-center text-content-secondary transition-transform duration-200 group-hover:scale-[1.02]">
                    {icon}
                </div>
                <div className="min-w-0">
                    <div className="text-sm font-semibold text-content leading-tight">{title}</div>
                    <div className="text-xs text-content-muted mt-0.5">{desc}</div>
                </div>
            </div>
        </button>
    );
}

function DiscoveryCard({ title, desc, btnText, onClick, variant, icon }: {
    title: string,
    desc: string,
    btnText: string,
    onClick: () => void,
    variant: 'dark' | 'light',
    icon: React.ReactNode
}) {
    const isDark = variant === 'dark';

    return (
        <button
            type="button"
            onClick={onClick}
            className={`
                group relative p-6 text-left cursor-pointer overflow-hidden border rounded-xl transition-all duration-200
                active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50
                ${isDark
                    ? 'bg-surface-secondary border-edge text-content hover:bg-surface-hover shadow-sm'
                    : 'bg-surface border-edge text-content hover:bg-surface-hover shadow-sm'
                }
            `}
        >
            <div className="relative z-10 flex flex-col h-full">
                <div className={`w-9 h-9 mb-4 flex items-center justify-center rounded-lg border
                    ${isDark ? 'bg-surface border-edge text-[var(--accent-primary)]' : 'bg-[var(--accent-primary-bg)] border-[var(--accent-primary)]/15 text-[var(--accent-primary)]'}
                `}>
                    {icon}
                </div>

                <h3 className="text-lg font-semibold mb-1.5 tracking-tight">{title}</h3>
                <p className={`text-sm leading-relaxed mb-5
                    ${isDark ? 'text-content-muted' : 'text-content-secondary'}
                `}>
                    {desc}
                </p>

                <div className="mt-auto flex items-center gap-2">
                    <span className="text-sm font-semibold transition-all duration-200 text-content">
                        {btnText}
                    </span>
                    <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1 text-[var(--accent-primary)]" />
                </div>
            </div>
        </button>
    );
}
