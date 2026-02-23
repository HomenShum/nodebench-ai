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
        <div className="min-h-full bg-surface flex flex-col items-center justify-center p-6 relative overflow-hidden">

            {/* Background Atmosphere */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-100/20 dark:bg-indigo-500/[0.06] rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-100/20 dark:bg-indigo-500/[0.06] rounded-full blur-[120px]" />
            </div>

            {/* Main Content — Centered */}
            <div className="relative z-10 flex flex-col items-center w-full max-w-2xl">

                {/* Greeting */}
                <motion.div
                    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.15 }}
                    className="text-center mb-6"
                >
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-950 dark:text-gray-50 tracking-tight">
                        {greeting?.greeting || "Welcome"}{userStats?.userName ? `, ${userStats.userName}` : ""}
                    </h1>
                    <p className="mt-2 text-sm text-content-secondary">
                        Your AI research workspace — signals, briefs, and agents in one place.
                    </p>
                </motion.div>

                {/* Signature Orb — The visual identity, prominent above the input */}
                <motion.div
                    initial={reduceMotion ? false : { opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
                    className="relative mb-8 flex items-center justify-center"
                >
                    <div className="w-44 h-44 md:w-56 md:h-56 relative flex items-center justify-center">
                        {/* Rotating outer rings — reduced from 4 to 2 for lower motion budget */}
                        <div className={`absolute inset-0 will-change-transform ${reduceMotion ? '' : 'motion-safe:animate-spin-slow'}`}>
                            <div className="absolute inset-0 rounded-full border border-gray-300/80 dark:border-white/[0.1] scale-100" />
                            <div className="absolute inset-0 rounded-full border border-indigo-300/30 dark:border-indigo-500/[0.1] scale-[1.3]" />
                        </div>
                        {/* Glow halo */}
                        <div className="absolute inset-0 rounded-full bg-indigo-200/20 dark:bg-indigo-500/[0.08] blur-2xl scale-[1.3]" />
                        {/* Pulsing core */}
                        <div className={`relative w-32 h-32 md:w-40 md:h-40 rounded-full bg-white dark:bg-[#1a1a1f] shadow-[0_0_80px_rgba(99,102,241,0.15)] dark:shadow-[0_0_80px_rgba(99,102,241,0.12)] border border-gray-200/80 dark:border-white/[0.08] overflow-hidden ${reduceMotion ? '' : 'motion-safe:animate-pulse-subtle'}`}>
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-100/60 via-white to-violet-100/40 dark:from-indigo-500/[0.12] dark:via-transparent dark:to-violet-500/[0.08] rounded-full" />
                            {/* Inner dot — brand mark */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-3 h-3 rounded-full bg-indigo-500/60 dark:bg-indigo-400/50 shadow-[0_0_20px_rgba(99,102,241,0.4)]" />
                            </div>
                            {/* Scanning line removed — decoration without meaning */}
                        </div>
                    </div>
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
                        relative flex items-center gap-3 px-5 py-4 rounded-lg border-2 transition-all duration-200
                        bg-white/90 dark:bg-white/[0.06] backdrop-blur-xl shadow-lg dark:shadow-none
                        focus-within:border-indigo-400 dark:focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-100 dark:focus-within:ring-indigo-500/10
                        ${isDragOver
                            ? 'border-indigo-400 dark:border-indigo-500 shadow-indigo-100 dark:shadow-none ring-4 ring-indigo-100 dark:ring-indigo-500/10'
                            : 'border-edge hover:border-gray-300 dark:hover:border-white/[0.12] hover:shadow-xl'
                        }
                    `}>
                        {isDragOver ? (
                            <div className="flex items-center gap-3 w-full py-1">
                                <Upload className="w-5 h-5 text-indigo-500 motion-safe:animate-bounce" />
                                <span className="text-indigo-600 dark:text-indigo-400 font-medium">Drop your file here...</span>
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
                                    className="flex-1 bg-transparent text-base text-content placeholder:text-content-muted dark:placeholder-gray-500 outline-none"
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    className="flex-shrink-0 p-2 rounded-lg bg-gray-900 dark:bg-indigo-600 text-white hover:bg-gray-800 dark:hover:bg-indigo-500 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#1a1a1f]"
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
                        className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 rounded-sm px-1"
                    >
                        Browse What's New <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-gray-300 dark:text-content-secondary">|</span>
                    <button
                        type="button"
                        onClick={onEnterWorkspace}
                        className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 rounded-sm px-1"
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
                group w-full text-left rounded-lg border border-edge
                bg-white/70 dark:bg-white/[0.04] backdrop-blur-sm
                px-4 py-3 transition-all duration-200 
                hover:bg-white dark:hover:bg-white/[0.06] hover:border-indigo-200 dark:hover:border-indigo-500/30
                active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50
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
                group relative p-6 text-left cursor-pointer overflow-hidden border rounded-lg transition-all duration-300
                active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50
                ${isDark
                    ? 'bg-gradient-to-br from-gray-900 to-gray-950 border-gray-800 text-white hover:from-black hover:to-gray-900 shadow-lg hover:shadow-xl'
                    : 'bg-white/80 dark:bg-white/[0.04] backdrop-blur-sm border-edge text-content hover:bg-white dark:hover:bg-white/[0.06] hover:border-indigo-200 dark:hover:border-indigo-500/30 dark:hover:shadow-none'
                }
            `}
        >
            <div className="relative z-10 flex flex-col h-full">
                <div className={`w-9 h-9 mb-4 flex items-center justify-center rounded-lg border
                    ${isDark ? 'bg-white/10 border-white/10 text-indigo-400' : 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-800/30 text-indigo-600 dark:text-indigo-400'}
                `}>
                    {icon}
                </div>

                <h3 className="text-lg font-bold mb-1.5 tracking-tight">{title}</h3>
                <p className={`text-sm leading-relaxed mb-5
                    ${isDark ? 'text-content-muted' : 'text-content-secondary'}
                `}>
                    {desc}
                </p>

                <div className="mt-auto flex items-center gap-2">
                    <span className={`text-sm font-semibold transition-all duration-200
                        ${isDark ? 'text-white' : 'text-content'}
                    `}>
                        {btnText}
                    </span>
                    <ArrowRight className={`w-4 h-4 transition-transform duration-200 group-hover:translate-x-1
                        ${isDark ? 'text-indigo-400' : 'text-indigo-600 dark:text-indigo-400'}
                    `} />
                </div>
            </div>
        </button>
    );
}
