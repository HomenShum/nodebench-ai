import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Zap,
    ChevronRight,
    Activity,
    Globe,
    Shield,
    Cpu,
    Terminal,
    ArrowRight,
    Sparkles,
    FileText,
    CheckCircle2,
    TrendingUp,
    Plus,
    Clock,
    Bell
} from 'lucide-react';
import NumberFlow from '@number-flow/react';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { toast } from 'sonner';

interface CinematicHomeProps {
    onEnterHub: (tab?: "overview" | "signals" | "briefing" | "deals" | "changes" | "changelog") => void;
    onEnterWorkspace: () => void;
    onOpenFastAgent: () => void;
}

export default function CinematicHome({ onEnterHub, onEnterWorkspace, onOpenFastAgent }: CinematicHomeProps) {
    const [isHovered, setIsHovered] = useState(false);

    // Fetch user activity stats
    const userStats = useQuery(api.domains.auth.userStats.getUserActivitySummary);
    const greeting = useQuery(api.domains.auth.userStats.getGreetingMessage);
    const insights = useQuery(api.domains.auth.userStats.getProductivityInsights);

    const { isAuthenticated } = useConvexAuth();
    const createDossier = useMutation(api.domains.documents.documents.createDossier);

    const handleCreateDossier = async () => {
        if (!isAuthenticated) {
            toast.info("Sign in to create a dossier.");
            return;
        }

        try {
            const documentId = await createDossier({ title: "New Dossier" });
            window.dispatchEvent(new CustomEvent('nodebench:openDocument', { detail: { documentId } }));
        } catch (err: any) {
            console.error("[CinematicHome] Failed to create dossier:", err);
            toast.error(err?.message || "Failed to create dossier");
        }
    };

    return (
        <div className="min-h-full bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">

            {/* Background Atmosphere */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-100/20 dark:bg-indigo-500/[0.06] rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-100/20 dark:bg-indigo-500/[0.06] rounded-full blur-[120px]" />
            </div>

            {/* Welcome Banner */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="absolute top-6 left-6 right-6 flex justify-between items-start z-10"
            >
                <div className="flex items-center gap-3">
                    <span className="text-3xl">{greeting?.emoji || "👋"}</span>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-950 dark:text-gray-50">
                            {greeting?.greeting || "Welcome"}{userStats?.userName ? `, ${userStats.userName}` : ""}
                        </h1>
                        <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                            <Clock className="w-3.5 h-3.5" />
                            {userStats?.lastActivityTime ? (
                                <span>Last active {new Date(userStats.lastActivityTime).toLocaleDateString()}</span>
                            ) : (
                                <span>Start your journey today</span>
                            )}
                            {userStats && userStats.streakDays > 0 && (
                                <>
                                    <span className="mx-2">•</span>
                                    <span className="flex items-center gap-1">
                                        <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                                        {userStats.streakDays} day streak
                                    </span>
                                </>
                            )}
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            <StartHereButton
                                icon={<Zap className="w-3.5 h-3.5" />}
                                label="Open Fast Agent"
                                onClick={onOpenFastAgent}
                            />
                            <StartHereButton
                                icon={<FileText className="w-3.5 h-3.5" />}
                                label="Create Dossier"
                                onClick={handleCreateDossier}
                            />
                            <StartHereButton
                                icon={<Bell className="w-3.5 h-3.5" />}
                                label="View What Changed"
                                onClick={() => onEnterHub("changes")}
                            />
                        </div>
                    </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex gap-2">
                    <QuickActionButton
                        icon={<Plus className="w-4 h-4" />}
                        label="New Document"
                        onClick={onEnterWorkspace}
                        variant="secondary"
                    />
                    <QuickActionButton
                        icon={<Sparkles className="w-4 h-4" />}
                        label="Research Hub"
                        onClick={() => onEnterHub()}
                        badge={userStats?.unreadBriefings}
                        variant="primary"
                    />
                </div>
            </motion.div>

            {/* Productivity Insights Banner */}
            {insights && insights.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="absolute top-24 right-6 max-w-sm space-y-2 z-10"
                >
                    {insights.slice(0, 3).map((insight, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 + idx * 0.1 }}
                            className={`
                                p-3 rounded-lg border backdrop-blur-md text-sm flex items-start gap-2
                                ${insight.priority === 'high'
                                    ? 'bg-red-50/80 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-900 dark:text-red-300'
                                    : insight.priority === 'medium'
                                        ? 'bg-amber-50/80 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-900 dark:text-amber-300'
                                        : 'bg-indigo-50/80 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20 text-gray-900 dark:text-gray-200'
                                }
                            `}
                        >
                            <span className="text-lg">{insight.icon}</span>
                            <span className="flex-1">{insight.message}</span>
                        </motion.div>
                    ))}
                </motion.div>
            )}

            {/* 1. THE NEURAL ORB (Centerpiece) */}
            <div className="relative mb-10 group cursor-pointer" onClick={() => onEnterHub()}>
                {/* Container for the orb - fixed size */}
                <div className="w-80 h-80 relative flex items-center justify-center">
                    {/* Rotating outer rings only - CSS animation for better performance */}
                    <div className="absolute inset-0 animate-spin-slow will-change-transform">
                        {/* Subtle Outer Rings */}
                        <div className="absolute inset-0 rounded-full border border-gray-200/60 dark:border-white/[0.06] scale-110" />
                        <div className="absolute inset-0 rounded-full border border-gray-200/30 dark:border-white/[0.04] scale-125" />
                    </div>

                    {/* Pulsing Core - CSS animation for smoother performance */}
                    <div className="w-64 h-64 rounded-full bg-white dark:bg-[#18181B] shadow-[0_0_80px_rgba(0,0,0,0.05)] dark:shadow-[0_0_80px_rgba(99,102,241,0.06)] border border-gray-100 dark:border-white/[0.06] flex items-center justify-center relative overflow-hidden animate-pulse-subtle">
                        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-50/50 via-white to-indigo-50/50 dark:from-indigo-500/[0.06] dark:via-transparent dark:to-indigo-500/[0.06] opacity-40" />

                        {/* Inner Glowing Content - Static */}
                        <div className="z-10 flex flex-col items-center text-center">
                            <Zap className="w-12 h-12 text-gray-950 dark:text-gray-100 mb-4 animate-pulse" />
                            <div className="text-[10px] font-black text-gray-900/40 dark:text-gray-500 uppercase tracking-[0.4em] mb-1">System Core</div>
                            <div className="text-2xl font-bold text-gray-950 dark:text-gray-100">Active</div>
                        </div>

                        {/* Scanning Effect */}
                        <motion.div
                            animate={{ y: [-150, 300] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                            className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent"
                        />
                    </div>
                </div>

            </div>

            {/* 2. PERSONALIZED STATS HORIZON */}
            <div className="w-full max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
                <StatusBox
                    icon={<FileText className="w-4 h-4" />}
                    label="Documents This Week"
                    value={userStats?.documentsThisWeek || 0}
                    suffix="created"
                    color="text-gray-900 dark:text-gray-100"
                />
                <StatusBox
                    icon={<CheckCircle2 className="w-4 h-4" />}
                    label="Tasks Completed"
                    value={userStats?.completedTasksThisWeek || 0}
                    suffix="this week"
                    color="text-gray-900 dark:text-gray-100"
                />
                <StatusBox
                    icon={<Activity className="w-4 h-4" />}
                    label="Active Tasks"
                    value={userStats?.activeTasks || 0}
                    suffix="pending"
                    color="text-gray-900 dark:text-gray-100"
                />
                <StatusBox
                    icon={<Globe className="w-4 h-4" />}
                    label="Total Knowledge"
                    value={userStats?.totalDocuments || 0}
                    suffix="documents"
                    color="text-gray-900 dark:text-gray-100"
                />
            </div>

            {/* 3. DISCOVERY CARDS */}
            <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10">

                {/* RESEARCH HUB CARD */}
                <DiscoveryCard
                    title="The Research Hub"
                    desc="Access the full editorial dossier. Deep-dive into Act-based narratives, market signals, and live telemetry."
                    btnText="Open Research Hub"
                    onClick={() => onEnterHub()}
                    variant="dark"
                    icon={<Sparkles className="w-5 h-5" />}
                />

                {/* WORKSPACE CARD */}
                <DiscoveryCard
                    title="Strategic Workspace"
                    desc="Interface with your personal library. Organize documents, track tasks, and manage institutional agents."
                    btnText="Open Workspace"
                    onClick={onEnterWorkspace}
                    variant="light"
                    icon={<Shield className="w-5 h-5" />}
                />

            </div>



        </div>
    );
}

// --- SUB-COMPONENTS ---

function MetricTag({ label, value, color, className }: { label: string, value: string, color: string, className: string }) {
    return (
        <div className={`absolute p-2 bg-white/40 backdrop-blur-md border border-white/60 shadow-sm flex flex-col animate-in fade-in zoom-in duration-1000 ${className}`}>
            <span className="text-[7px] font-black text-gray-400 tracking-[0.2em] mb-0.5">{label}</span>
            <span className={`text-[10px] font-mono font-bold ${color}`}>{value}</span>
        </div>
    );
}

function StatusBox({ icon, label, value, suffix, color = "text-gray-950" }: {
    icon: React.ReactNode,
    label: string,
    value: number,
    suffix: string,
    color?: string
}) {
    return (
        <motion.div 
            whileHover={{ y: -2 }}
            transition={{ type: "tween", duration: 0.15 }}
            className="flex flex-col items-center text-center group p-4 rounded-xl bg-white/60 dark:bg-white/[0.04] backdrop-blur-sm border border-gray-200/50 dark:border-white/[0.06] shadow-sm hover:shadow-md dark:hover:shadow-none dark:hover:border-white/[0.1] transition-all will-change-transform"
        >
            <div className={`p-2.5 bg-gray-50 dark:bg-white/[0.06] rounded-xl mb-3 border border-gray-200/30 dark:border-white/[0.04] text-gray-500 dark:text-gray-400`}>
                {icon}
            </div>
            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-2">{label}</div>
            <div className="flex items-baseline gap-1.5 overflow-hidden">
                <NumberFlow value={value} className={`text-2xl font-bold ${color}`} />
                <span className="text-[10px] font-medium text-gray-400">{suffix}</span>
            </div>
        </motion.div>
    );
}

function QuickActionButton({
    icon,
    label,
    onClick,
    badge,
    variant = "default"
}: {
    icon: React.ReactNode,
    label: string,
    onClick: () => void,
    badge?: number,
    variant?: "default" | "primary" | "secondary"
}) {
    const isPrimary = variant === "primary";
    const isSecondary = variant === "secondary";

    return (
        <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "tween", duration: 0.12 }}
            onClick={onClick}
            title={label}
            className={`relative flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all duration-200 text-[13px] font-semibold ${isPrimary
                ? "bg-gradient-to-r from-gray-700 to-gray-800 text-white border-gray-700 hover:from-indigo-600 hover:to-gray-700 shadow-md hover:shadow-lg shadow-gray-900/20"
                : isSecondary
                    ? "px-3 bg-white/60 dark:bg-white/[0.04] backdrop-blur-sm border-gray-200/80 dark:border-white/[0.06] text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-white/[0.08] hover:text-gray-900 dark:hover:text-gray-100 hover:border-gray-300 dark:hover:border-white/[0.1] shadow-sm"
                    : "bg-white/90 dark:bg-white/[0.04] backdrop-blur-md border-gray-200 dark:border-white/[0.06] text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-white/[0.08] hover:shadow-md dark:hover:shadow-none hover:text-gray-950 dark:hover:text-gray-100"
                }`}
        >
            {icon}
            <span className={isSecondary ? "hidden" : ""}>{label}</span>
            {badge !== undefined && badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gradient-to-br from-red-500 to-rose-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold shadow-sm">
                    {badge > 9 ? '9+' : badge}
                </span>
            )}
        </motion.button>
    );
}

function StartHereButton({
    icon,
    label,
    onClick,
}: {
    icon: React.ReactNode,
    label: string,
    onClick: () => void,
}) {
    return (
        <motion.button
            type="button"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "tween", duration: 0.1 }}
            onClick={onClick}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200/80 dark:border-white/[0.06] bg-white/70 dark:bg-white/[0.04] backdrop-blur-md text-[12px] font-semibold text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-white/[0.08] hover:text-gray-800 dark:hover:text-gray-200 hover:border-indigo-200 dark:hover:border-indigo-500/30 hover:shadow-sm dark:hover:shadow-none transition-all duration-200 group"
        >
            <span className="text-gray-400 group-hover:text-indigo-600 transition-colors">{icon}</span>
            <span className="whitespace-nowrap">{label}</span>
        </motion.button>
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
        <div
            onClick={onClick}
            className={`
        group relative p-6 md:p-8 cursor-pointer overflow-hidden border rounded-2xl transition-all duration-500
        ${isDark
                    ? 'bg-gradient-to-br from-gray-900 to-gray-950 border-gray-800 text-white hover:from-black hover:to-gray-900 shadow-lg hover:shadow-xl'
                    : 'bg-white/80 dark:bg-white/[0.04] backdrop-blur-sm border-gray-200/60 dark:border-white/[0.06] text-gray-900 dark:text-gray-100 hover:bg-white dark:hover:bg-white/[0.06] hover:border-gray-300 dark:hover:border-white/[0.1] shadow-sm hover:shadow-lg dark:hover:shadow-none'
                }
      `}
        >
            {/* Hover Background Accent */}
            <div className={`absolute top-0 right-0 w-32 h-32 blur-[80px] transition-opacity duration-700 opacity-20 group-hover:opacity-40 pointer-events-none
        ${isDark ? 'bg-indigo-400' : 'bg-indigo-400'}
      `} />

            <div className="relative z-10 flex flex-col h-full">
                <div className={`w-10 h-10 mb-5 flex items-center justify-center rounded-xl border
          ${isDark ? 'bg-white/10 border-white/10 text-indigo-400' : 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-100 text-indigo-600'}
        `}>
                    {icon}
                </div>

                <h3 className="text-xl font-bold mb-3 tracking-tight">{title}</h3>
                <p className={`text-sm leading-relaxed mb-8
          ${isDark ? 'text-gray-400' : 'text-gray-500'}
        `}>
                    {desc}
                </p>

                <div className="mt-auto flex items-center gap-3">
                    <span className={`text-[11px] font-black uppercase tracking-[0.3em] transition-all duration-300 group-hover:tracking-[0.4em]
            ${isDark ? 'text-white' : 'text-gray-900'}
          `}>
                        {btnText}
                    </span>
                    <ArrowRight className={`w-4 h-4 transition-transform duration-300 group-hover:translate-x-2
            ${isDark ? 'text-indigo-400' : 'text-indigo-600'}
          `} />
                </div>
            </div>
        </div>
    );
}
