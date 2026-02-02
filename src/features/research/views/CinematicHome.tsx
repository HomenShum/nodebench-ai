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
        <div className="min-h-full bg-canvas-warm flex flex-col items-center justify-center p-8 relative overflow-hidden">

            {/* Background Atmosphere */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-100/30 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-100/30 rounded-full blur-[120px]" />
            </div>

            {/* Welcome Banner */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="absolute top-8 left-8 right-8 flex justify-between items-start z-10"
            >
                <div className="flex items-center gap-3">
                    <span className="text-3xl">{greeting?.emoji || "👋"}</span>
                    <div>
                        <h1 className="text-2xl font-serif font-bold text-emerald-950">
                            {greeting?.greeting || "Welcome"}{userStats?.userName ? `, ${userStats.userName}` : ""}
                        </h1>
                        <div className="flex items-center gap-2 text-sm text-stone-500 mt-1">
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
                                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
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
                    className="absolute top-24 right-8 max-w-sm space-y-2 z-10"
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
                                    ? 'bg-red-50/80 border-red-200 text-red-900'
                                    : insight.priority === 'medium'
                                        ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                                        : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
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
            <div className="relative mb-16 group cursor-pointer" onClick={() => onEnterHub()}>
                {/* Container for the orb - fixed size */}
                <div className="w-80 h-80 relative flex items-center justify-center">
                    {/* Rotating outer rings only - CSS animation for better performance */}
                    <div className="absolute inset-0 animate-spin-slow will-change-transform">
                        {/* Subtle Outer Rings */}
                        <div className="absolute inset-0 rounded-full border border-stone-200/60 scale-110" />
                        <div className="absolute inset-0 rounded-full border border-stone-200/30 scale-125" />
                    </div>

                    {/* Pulsing Core - CSS animation for smoother performance */}
                    <div className="w-64 h-64 rounded-full bg-white shadow-[0_0_80px_rgba(0,0,0,0.05)] border border-stone-100 flex items-center justify-center relative overflow-hidden animate-pulse-subtle">
                        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-50/50 via-white to-indigo-50/50 opacity-40" />

                        {/* Inner Glowing Content - Static */}
                        <div className="z-10 flex flex-col items-center text-center">
                            <Zap className="w-12 h-12 text-emerald-950 mb-4 animate-pulse" />
                            <div className="text-[10px] font-black text-emerald-900/40 uppercase tracking-[0.4em] mb-1">System Core</div>
                            <div className="text-2xl font-serif italic font-bold text-emerald-950">Active</div>
                        </div>

                        {/* Scanning Effect */}
                        <motion.div
                            animate={{ y: [-150, 300] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                            className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent"
                        />
                    </div>
                </div>

            </div>

            {/* 2. PERSONALIZED STATS HORIZON */}
            <div className="w-full max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
                <StatusBox
                    icon={<FileText className="w-4 h-4" />}
                    label="Documents This Week"
                    value={userStats?.documentsThisWeek || 0}
                    suffix="created"
                    color="text-blue-600"
                />
                <StatusBox
                    icon={<CheckCircle2 className="w-4 h-4" />}
                    label="Tasks Completed"
                    value={userStats?.completedTasksThisWeek || 0}
                    suffix="this week"
                    color="text-green-600"
                />
                <StatusBox
                    icon={<Activity className="w-4 h-4" />}
                    label="Active Tasks"
                    value={userStats?.activeTasks || 0}
                    suffix="pending"
                    color="text-orange-600"
                />
                <StatusBox
                    icon={<Globe className="w-4 h-4" />}
                    label="Total Knowledge"
                    value={userStats?.totalDocuments || 0}
                    suffix="documents"
                    color="text-purple-600"
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
            <span className="text-[7px] font-black text-stone-400 tracking-[0.2em] mb-0.5">{label}</span>
            <span className={`text-[10px] font-mono font-bold ${color}`}>{value}</span>
        </div>
    );
}

function StatusBox({ icon, label, value, suffix, color = "text-emerald-950" }: {
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
            className="flex flex-col items-center text-center group p-4 rounded-xl bg-white/60 backdrop-blur-sm border border-stone-200/50 shadow-sm hover:shadow-md transition-shadow will-change-transform"
        >
            <div className={`p-2.5 bg-gradient-to-br from-stone-50 to-stone-100 rounded-xl mb-3 border border-stone-200/30 ${color}`}>
                {icon}
            </div>
            <div className="text-[9px] font-bold text-stone-400 uppercase tracking-[0.15em] mb-2">{label}</div>
            <div className="flex items-baseline gap-1.5 overflow-hidden">
                <NumberFlow value={value} className={`text-2xl md:text-3xl font-serif font-bold ${color}`} />
                <span className="text-[10px] font-medium text-stone-400">{suffix}</span>
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
                ? "bg-gradient-to-r from-emerald-700 to-emerald-800 text-white border-emerald-700 hover:from-emerald-600 hover:to-emerald-700 shadow-md hover:shadow-lg shadow-emerald-900/20"
                : isSecondary
                    ? "px-3 bg-white/60 backdrop-blur-sm border-stone-200/80 text-stone-600 hover:bg-white hover:text-stone-900 hover:border-stone-300 shadow-sm"
                    : "bg-white/90 backdrop-blur-md border-stone-200 text-stone-700 hover:bg-white hover:shadow-md hover:text-emerald-950"
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
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-stone-200/80 bg-white/70 backdrop-blur-md text-[12px] font-semibold text-stone-600 hover:bg-white hover:text-emerald-800 hover:border-emerald-200 hover:shadow-sm transition-all duration-200 group"
        >
            <span className="text-stone-400 group-hover:text-emerald-600 transition-colors">{icon}</span>
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
        group relative p-8 md:p-10 cursor-pointer overflow-hidden border rounded-2xl transition-all duration-500
        ${isDark
                    ? 'bg-gradient-to-br from-gray-900 to-gray-950 border-gray-800 text-white hover:from-black hover:to-gray-900 shadow-lg hover:shadow-xl'
                    : 'bg-white/80 backdrop-blur-sm border-stone-200/60 text-stone-900 hover:bg-white hover:border-stone-300 shadow-sm hover:shadow-lg'
                }
      `}
        >
            {/* Hover Background Accent */}
            <div className={`absolute top-0 right-0 w-32 h-32 blur-[80px] transition-opacity duration-700 opacity-20 group-hover:opacity-40 pointer-events-none
        ${isDark ? 'bg-emerald-400' : 'bg-indigo-400'}
      `} />

            <div className="relative z-10 flex flex-col h-full">
                <div className={`w-11 h-11 mb-6 flex items-center justify-center rounded-xl border
          ${isDark ? 'bg-white/10 border-white/10 text-emerald-400' : 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-100 text-indigo-600'}
        `}>
                    {icon}
                </div>

                <h3 className="text-2xl font-serif font-bold italic mb-4 tracking-tight">{title}</h3>
                <p className={`text-sm font-serif leading-relaxed mb-10
          ${isDark ? 'text-stone-400' : 'text-stone-500'}
        `}>
                    {desc}
                </p>

                <div className="mt-auto flex items-center gap-3">
                    <span className={`text-[11px] font-black uppercase tracking-[0.3em] transition-all duration-300 group-hover:tracking-[0.4em]
            ${isDark ? 'text-white' : 'text-stone-900'}
          `}>
                        {btnText}
                    </span>
                    <ArrowRight className={`w-4 h-4 transition-transform duration-300 group-hover:translate-x-2
            ${isDark ? 'text-emerald-400' : 'text-indigo-600'}
          `} />
                </div>
            </div>
        </div>
    );
}
