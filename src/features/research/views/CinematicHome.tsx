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
    Sparkles
} from 'lucide-react';
import NumberFlow from '@number-flow/react';

interface CinematicHomeProps {
    onEnterHub: () => void;
    onEnterWorkspace: () => void;
}

export default function CinematicHome({ onEnterHub, onEnterWorkspace }: CinematicHomeProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [systemEntropy, setSystemEntropy] = useState(14.2);
    const [narrativeVelocity, setNarrativeVelocity] = useState(142);

    // Mock "live" updates for atmosphere
    useEffect(() => {
        const interval = setInterval(() => {
            setSystemEntropy(prev => +(prev + (Math.random() * 0.4 - 0.2)).toFixed(1));
            setNarrativeVelocity(prev => Math.floor(prev + (Math.random() * 10 - 5)));
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-full bg-[#faf9f6] flex flex-col items-center justify-center p-8 relative overflow-hidden">

            {/* Background Atmosphere */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-100/30 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-100/30 rounded-full blur-[120px]" />
            </div>

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

            {/* 2. SYSTEM STATUS HORIZON */}
            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
                <StatusBox
                    icon={<Terminal className="w-4 h-4" />}
                    label="Narrative Velocity"
                    value={narrativeVelocity}
                    suffix="nodes/min"
                />
                <StatusBox
                    icon={<Activity className="w-4 h-4" />}
                    label="Entropy Level"
                    value={systemEntropy}
                    suffix="%"
                />
                <StatusBox
                    icon={<Globe className="w-4 h-4" />}
                    label="Knowledge Depth"
                    value={4.2}
                    suffix="M points"
                />
            </div>

            {/* 3. DISCOVERY CARDS */}
            <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">

                {/* RESEARCH HUB CARD */}
                <DiscoveryCard
                    title="The Research Hub"
                    desc="Access the full editorial dossier. Deep-dive into Act-based narratives, market signals, and live telemetry."
                    btnText="Enter Archive"
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

function StatusBox({ icon, label, value, suffix }: { icon: React.ReactNode, label: string, value: number, suffix: string }) {
    return (
        <div className="flex flex-col items-center text-center">
            <div className="p-2 bg-stone-100/50 rounded-lg text-stone-400 mb-3 border border-stone-200/20">
                {icon}
            </div>
            <div className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-1">{label}</div>
            <div className="flex items-baseline gap-1.5">
                <NumberFlow value={value} className="text-3xl font-serif font-bold text-emerald-950" />
                <span className="text-[10px] font-serif italic text-stone-400">{suffix}</span>
            </div>
        </div>
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
