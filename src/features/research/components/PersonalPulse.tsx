import React from 'react';
import { motion } from 'framer-motion';
import {
    CheckCircle2,
    Clock,
    FileText,
    Tag,
    Calendar,
    ChevronRight,
    ArrowRight,
    Sparkles
} from 'lucide-react';

interface PersonalPulseProps {
    personalizedContext: any;
    tasksToday: any[];
    recentDocs: any[];
    onDocumentSelect?: (id: string) => void;
}

export function PersonalPulse({ personalizedContext, tasksToday, recentDocs, onDocumentSelect }: PersonalPulseProps) {
    const passingFeatures = personalizedContext?.passingFeatures || [];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8">

            {/* 1. PERSONAL INTELLIGENCE OVERLAY */}
            <div className="space-y-8">
                <div className="flex items-center gap-3">
                    <Sparkles className="w-4 h-4 text-emerald-900" />
                    <h4 className="text-[10px] font-black text-emerald-900 uppercase tracking-[0.3em]">Personal Intelligence Overlay</h4>
                </div>

                {(() => {
                    // Use sample features if none exist
                    const displayFeatures = passingFeatures.length > 0 ? passingFeatures : [
                        {
                            id: 'R1',
                            name: 'Agent Reliability Trends',
                            resultMarkdown: 'Long-horizon agent benchmarks show significant improvements in task completion rates. Claude Opus 4.5 demonstrates 50% success rate on tasks requiring nearly 5 hours of sustained execution.',
                        },
                        {
                            id: 'P1',
                            name: 'Research Paper Highlights',
                            resultMarkdown: 'Universal Reasoning Models achieve new benchmarks on ARC-AGI through recurrent computation patterns. This suggests a path toward more sample-efficient reasoning systems.',
                        },
                        {
                            id: 'D1',
                            name: 'Your Document Connections',
                            resultMarkdown: 'Track hashtags like #ai-agents, #reasoning, or #multimodal to receive personalized intelligence overlays connecting your documents to daily signals.',
                        },
                    ];
                    const isUsingSample = passingFeatures.length === 0;

                    return (
                        <div className="space-y-6">
                            {isUsingSample && (
                                <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                                    <p className="text-[10px] font-medium text-amber-700">
                                        <Sparkles className="w-3 h-3 inline mr-1" />
                                        Sample overlay — track hashtags to personalize
                                    </p>
                                </div>
                            )}
                            {displayFeatures.slice(0, 3).map((feature: any, idx: number) => (
                                <motion.div
                                    key={feature.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="p-6 bg-white border border-stone-200 shadow-sm relative overflow-hidden group hover:border-emerald-900/40 transition-colors"
                                >
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50/30 rounded-full blur-2xl -mr-8 -mt-8 opacity-0 group-hover:opacity-100 transition-opacity" />

                                    <div className="flex items-start gap-4">
                                        <div className="mt-1 w-6 h-6 shrink-0 flex items-center justify-center bg-stone-100 text-stone-500 rounded-none text-[10px] font-bold">
                                            {feature.id}
                                        </div>
                                        <div className="space-y-2">
                                            <div className="text-[11px] font-black text-stone-400 uppercase tracking-widest leading-tight">
                                                {feature.name}
                                            </div>
                                            <div className="text-sm font-serif leading-relaxed text-stone-800 line-clamp-3">
                                                {feature.resultMarkdown?.replace(/#+ /g, '') || "Analyzing relevance..."}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    );
                })()}
            </div>

            {/* 2. WORKSPACE CONTEXT (Tasks & Docs) */}
            <div className="space-y-8">
                <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-emerald-900" />
                    <h4 className="text-[10px] font-black text-emerald-900 uppercase tracking-[0.3em]">Institutional Agenda</h4>
                </div>

                <div className="space-y-6">
                    {/* Recent Tasks */}
                    <div className="space-y-3">
                        <div className="text-[9px] font-black text-stone-400 uppercase tracking-[0.2em] mb-4">Today's Deliverables</div>
                        {tasksToday && tasksToday.length > 0 ? (
                            tasksToday.slice(0, 3).map((task: any) => (
                                <div key={task._id} className="flex items-center justify-between p-3 bg-stone-100/50 border border-transparent hover:border-stone-200 transition-colors cursor-pointer group">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${task.status === 'done' ? 'bg-emerald-500' : 'bg-stone-300'}`} />
                                        <span className="text-xs font-serif font-medium text-stone-700">{task.title}</span>
                                    </div>
                                    <ChevronRight className="w-3 h-3 text-stone-300 group-hover:text-stone-500 transition-colors" />
                                </div>
                            ))
                        ) : (
                            <div className="text-[10px] font-serif italic text-stone-400">No immediate actions tracked for today.</div>
                        )}
                    </div>

                    {/* Recent Documents */}
                    <div className="space-y-3 pt-4">
                        <div className="text-[9px] font-black text-stone-400 uppercase tracking-[0.2em] mb-4">Recent From Library</div>
                        {recentDocs && recentDocs.length > 0 ? (
                            recentDocs.slice(0, 3).map((doc: any) => (
                                <div
                                    key={doc._id}
                                    onClick={() => onDocumentSelect?.(doc._id)}
                                    className="flex items-center gap-4 p-3 hover:bg-stone-100 transition-colors cursor-pointer group"
                                >
                                    <FileText className="w-4 h-4 text-stone-400 group-hover:text-emerald-900 transition-colors" />
                                    <div className="flex flex-col">
                                        <span className="text-xs font-serif font-bold text-stone-800">{doc.title}</span>
                                        <span className="text-[9px] font-mono text-stone-400 uppercase tracking-tighter">
                                            Updated {doc.updatedAt && !isNaN(new Date(doc.updatedAt).getTime())
                                                ? new Date(doc.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                : 'recently'}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-[10px] font-serif italic text-stone-400">Quiet in the workspace recently.</div>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
}
