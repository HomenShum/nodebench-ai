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
    Clock
} from 'lucide-react';
import NumberFlow from '@number-flow/react';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';

interface CinematicHomeProps {
    onEnterHub: () => void;
    onEnterWorkspace: () => void;
}

export default function CinematicHome({ onEnterHub, onEnterWorkspace }: CinematicHomeProps) {
    const [isHovered, setIsHovered] = useState(false);

    // Fetch user activity stats
    const userStats = useQuery(api.domains.auth.userStats.getUserActivitySummary);
    const greeting = useQuery(api.domains.auth.userStats.getGreetingMessage);
    const insights = useQuery(api.domains.auth.userStats.getProductivityInsights);

    return (
        <div className="min-h-full bg-[#faf9f6] flex flex-col items-center justify-center p-8 relative overflow-hidden">

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
                    </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex gap-2">
                    <QuickActionButton
                        icon={<Plus className="w-4 h-4" />}
                        label="New Document"
                        onClick={onEnterWorkspace}
                    />
                    <QuickActionButton
                        icon={<Sparkles className="w-4 h-4" />}
                        label="Research Hub"
                        onClick={onEnterHub}
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
            <div className="relative mb-16 group cursor-pointer" onClick={onEnterHub}>
                <motion.div
                    animate={{
                        scale: [1, 1.05, 1],
                        rotate: [0, 90, 180, 270, 360],
                    }}
                    transition={{
                        duration: 20,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                    className="w-80 h-80 relative flex items-center justify-center"
                >
                    {/* Subtle Outer Rings */}
                    <div className="absolute inset-0 rounded-full border border-stone-200/60 scale-110" />
                    <div className="absolute inset-0 rounded-full border border-stone-200/30 scale-125" />

                    {/* Pulsing Core */}
                    <div className="w-64 h-64 rounded-full bg-white shadow-[0_0_80px_rgba(0,0,0,0.05)] border border-stone-100 flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-50/50 via-white to-indigo-50/50 opacity-40" />

                        {/* Inner Glowing Content */}
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
                </motion.div>

                {/* Floating Metrics around Orb */}
                <MetricTag label="GLOBAL_SENTIMENT" value="0.72" color="text-emerald-700" className="top-0 -right-12" />
                <MetricTag label="TEMPORAL_DRIFT" value="+0.04" color="text-indigo-600" className="bottom-8 -left-16" />
            </div>

            {/* 2. PERSONALIZED STATS HORIZON */}
            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-4 gap-6 mb-20">
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
            <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">

                {/* RESEARCH HUB CARD */}
                <DiscoveryCard
                    title="The Research Hub"
                    desc="Access the full editorial dossier. Deep-dive into Act-based narratives, market signals, and live telemetry."
                    btnText="Open Research Hub"
                    onClick={onEnterHub}
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

            {/* Live Terminal Crawl (Footer) */}
            <div className="absolute bottom-6 left-8 right-8 flex justify-between items-center text-[9px] font-mono text-stone-400 uppercase tracking-widest">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live_Sync_Active
                    </span>
                    <span>Buffer: 98%</span>
                </div>
                <div className="flex items-center gap-6">
                    <span>{new Date().toLocaleTimeString()}</span>
                    <span>Lat_0.02ms</span>
                    <span>Secure_Auth_v2.1</span>
                </div>
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
        <div className="flex flex-col items-center text-center group">
            <motion.div
                key={value}
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 0.5 }}
                className={`p-2 bg-stone-100/50 rounded-lg mb-3 border border-stone-200/20 ${color}`}
            >
                {icon}
            </motion.div>
            <div className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-1">{label}</div>
            <div className="flex items-baseline gap-1.5 overflow-hidden">
                <NumberFlow value={value} className={`text-3xl font-serif font-bold ${color}`} />
                <span className="text-[10px] font-serif italic text-stone-400">{suffix}</span>
            </div>
        </div>
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
    variant?: "default" | "primary"
}) {
    const isPrimary = variant === "primary";

    return (
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-lg border transition-all text-sm font-medium ${
                isPrimary
                    ? "bg-emerald-900 text-white border-emerald-900 hover:bg-emerald-800 hover:shadow-lg"
                    : "bg-white/80 backdrop-blur-md border-stone-200 text-stone-700 hover:bg-white hover:shadow-md hover:text-emerald-950"
            }`}
        >
            {icon}
            <span>{label}</span>
            {badge !== undefined && badge > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {badge > 9 ? '9+' : badge}
                </span>
            )}
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
        group relative p-10 cursor-pointer overflow-hidden border transition-all duration-500
        ${isDark
                    ? 'bg-gray-900 border-gray-800 text-white hover:bg-black'
                    : 'bg-white border-stone-200 text-stone-900 hover:bg-[#faf9f6]'
                }
      `}
        >
            {/* Hover Background Accent */}
            <div className={`absolute top-0 right-0 w-32 h-32 blur-[80px] transition-opacity duration-700 opacity-20 group-hover:opacity-40 pointer-events-none
        ${isDark ? 'bg-emerald-400' : 'bg-indigo-400'}
      `} />

            <div className="relative z-10 flex flex-col h-full">
                <div className={`w-10 h-10 mb-6 flex items-center justify-center rounded-none border
          ${isDark ? 'bg-white/5 border-white/10 text-emerald-400' : 'bg-black/5 border-black/10 text-indigo-600'}
        `}>
                    {icon}
                </div>

                <h3 className="text-2xl font-serif font-bold italic mb-4 tracking-tight">{title}</h3>
                <p className={`text-sm font-serif leading-relaxed mb-10
          ${isDark ? 'text-gray-400' : 'text-stone-500'}
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
