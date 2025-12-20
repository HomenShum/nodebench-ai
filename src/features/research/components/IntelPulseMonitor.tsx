import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, Activity, Server, Database } from 'lucide-react';

interface IntelPulseMonitorProps {
    taskResults: any[];
}

export function IntelPulseMonitor({ taskResults }: IntelPulseMonitorProps) {
    if (!taskResults || taskResults.length === 0) return null;

    // Take last 5 results for the stream
    const activeResults = [...taskResults].reverse().slice(0, 5);

    return (
        <div className="fixed bottom-0 left-0 right-0 h-10 bg-white/80 backdrop-blur-md border-t border-stone-200 z-[60] flex items-center px-12 overflow-hidden pointer-events-none">
            <div className="flex items-center gap-4 shrink-0 pr-8 border-r border-stone-200 mr-8">
                <Activity className="w-3 h-3 text-emerald-600" />
                <span className="text-[9px] font-black text-stone-900 uppercase tracking-[0.3em]">Live Intelligence Flow</span>
            </div>

            <div className="flex-1 flex items-center gap-12 overflow-hidden whitespace-nowrap">
                {activeResults.map((res: any, idx: number) => (
                    <motion.div
                        key={res._id || idx}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3"
                    >
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-mono text-stone-400 uppercase tracking-widest">
                            {res.taskName || 'Analysis Event'}
                        </span>
                        <span className="text-[10px] font-mono text-emerald-900 font-bold">
                            {res.status?.toUpperCase() || 'SUCCESS'}
                        </span>
                        <span className="text-[10px] font-serif italic text-stone-300">
                            {res.output?.slice(0, 40)}...
                        </span>
                    </motion.div>
                ))}
            </div>

            <div className="flex items-center gap-6 shrink-0 pl-8 border-l border-stone-200 ml-8 text-[9px] font-mono text-stone-400">
                <span>Nodes: 142</span>
                <span>Sec: E2EE</span>
                <div className="flex items-center gap-2">
                    <Server className="w-3 h-3" />
                    <span>VAULT_01</span>
                </div>
            </div>
        </div>
    );
}
