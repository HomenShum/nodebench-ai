import { useQuery } from "convex/react";
import { DeepAgentProgress } from "./DeepAgentProgress";
import { api } from "../../../convex/_generated/api";
import { useUIMessages } from "@convex-dev/agent/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useEffect, useRef, useMemo, useState } from "react";
import { Sparkles, TrendingUp, Users, Briefcase, FileText, Lightbulb, ChevronRight, Loader2, Radio, Activity } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";
import { toolPartsToTimelineSteps, type TimelineStep } from "../FastAgentPanel/StepTimeline";

const truncateText = (text: string, max = 160) => {
    if (!text) return "";
    return text.length > max ? `${text.slice(0, max)}...` : text;
};

// QuickActionButton Component - Refined Look
interface QuickActionButtonProps {
    icon: React.ReactNode;
    label: string;
    query: string;
    onClick: (query: string) => void;
}

function QuickActionButton({ icon, label, query, onClick }: QuickActionButtonProps) {
    return (
        <button
            onClick={() => onClick(query)}
            className="group flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:border-purple-300 hover:bg-purple-50/50 text-gray-700 hover:text-purple-900 rounded-xl font-medium text-sm shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 text-left w-full"
        >
            <span className="flex-shrink-0 p-1.5 bg-gray-50 group-hover:bg-purple-100 rounded-lg text-gray-500 group-hover:text-purple-600 transition-colors">
                {icon}
            </span>
            <span className="flex-1">{label}</span>
            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-purple-400 opacity-0 group-hover:opacity-100 transition-all -ml-1" />
        </button>
    );
}

// SuggestedFollowUps Component
interface SuggestedFollowUpsProps {
    onSelectFollowUp: (query: string) => void;
    contentContext?: string;
}

function SuggestedFollowUps({ onSelectFollowUp, contentContext = "" }: SuggestedFollowUpsProps) {
    // Detect context from content
    const isCompany = /\b(LLC|Inc|Corporation|Company|startup|business)\b/i.test(contentContext);
    const isPerson = /\b(founder|CEO|CTO|executive|director)\b/i.test(contentContext);

    // Extract entity name from content (simple heuristic)
    const entityMatch = contentContext.match(/(?:^|\n)(?:First — to make sure.*?— )?(?:\*\*)?([A-Z][a-zA-Z0-9\s&]+(?:LLC|Inc|Corporation)?)/);
    const entityName = entityMatch ? entityMatch[1].trim() : "";

    // Generate contextual follow-ups
    const followUps = useMemo(() => {
        if (isCompany && entityName) {
            return [
                { icon: <TrendingUp className="w-4 h-4" />, label: "Full Enrichment Dossier", query: `Run the full enrichment dossier for ${entityName} including founders, investors, corporate details, and competitive analysis.` },
                { icon: <Users className="w-4 h-4" />, label: "Founder Deep Dive", query: `Tell me about the founders of ${entityName} - their backgrounds, education, previous ventures, and expertise.` },
                { icon: <Briefcase className="w-4 h-4" />, label: "Client & Partner Analysis", query: `Who are the major clients and partners of ${entityName}? Include case studies if available.` },
                { icon: <FileText className="w-4 h-4" />, label: "IP & Patents", query: `What intellectual property, patents, and proprietary technology does ${entityName} have?` },
            ];
        } else if (isPerson && entityName) {
            return [
                { icon: <Users className="w-4 h-4" />, label: "Professional Background", query: `Tell me about ${entityName}'s professional background and career history.` },
                { icon: <Briefcase className="w-4 h-4" />, label: "Previous Ventures", query: `What companies or ventures has ${entityName} founded or been involved with?` },
                { icon: <FileText className="w-4 h-4" />, label: "Education & Expertise", query: `What is ${entityName}'s education background and areas of expertise?` },
            ];
        } else {
            return [
                { icon: <Lightbulb className="w-4 h-4" />, label: "More Details", query: `Provide more detailed information and context.` },
                { icon: <TrendingUp className="w-4 h-4" />, label: "Related Topics", query: `What are related topics and areas I should explore?` },
                { icon: <FileText className="w-4 h-4" />, label: "Recent News", query: `What is the latest news and recent developments?` },
            ];
        }
    }, [isCompany, isPerson, entityName]);

    return (
        <div className="mt-12 mb-8 p-6 bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-xl border border-gray-200/60">
            <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-gray-900" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900">
                    💡 Suggested Next Steps
                </h3>
            </div>
            <div className="flex items-center gap-2 mb-3 text-xs text-gray-700 flex-wrap">
                <span>Runs a focused follow-up and appends results to this live dossier.</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-900 text-white rounded-full border border-gray-900">
                    <span className="h-2 w-2 rounded-full bg-white"></span>
                    No refresh
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {followUps.map((followUp, idx) => (
                    <QuickActionButton
                        key={idx}
                        icon={followUp.icon}
                        label={followUp.label}
                        query={followUp.query}
                        onClick={onSelectFollowUp}
                    />
                ))}
            </div>
        </div>
    );
}

export default function LiveDossierDocument({
    threadId,
    isLoading = false,
    onRunFollowUp
}: {
    threadId: string | null;
    isLoading?: boolean;
    onRunFollowUp?: (query: string) => void;
}) {
    // 1. Subscribe to the Agent's Output
    const streamingThread = useQuery(
        api.fastAgentPanelStreaming.getThreadByStreamId,
        threadId ? { threadId: threadId as Id<"chatThreadsStream"> } : "skip"
    );

    const agentThreadId = streamingThread?.agentThreadId;

    const { results: uiMessages } = useUIMessages(
        api.fastAgentPanelStreaming.getThreadMessagesWithStreaming,
        agentThreadId ? { threadId: agentThreadId as Id<"chatThreadsStream"> } : "skip",
        { initialNumItems: 50, stream: true }
    );

    const extractMessageText = (message: any) => {
        if (typeof message?.text === "string" && message.text.trim()) return message.text;
        if (Array.isArray(message?.content)) {
            const parts = message.content
                .filter((c: any) => typeof c?.text === "string")
                .map((c: any) => c.text)
                .join("\n\n");
            if (parts.trim()) return parts;
        }
        if (typeof message?.message?.text === "string") return message.message.text;
        // Tool-result fallback so we render appended outputs even if the agent didn't emit a final assistant message
        if (message?.type === "tool-result" || message?.kind === "tool-result") {
            const toolOutput = message?.output?.value ?? message?.output ?? message?.result;
            if (typeof toolOutput === "string" && toolOutput.trim()) return toolOutput;
        }
        return "";
    };

    // Filter out planner-only JSON artifacts that shouldn't render in the dossier
    const isPlannerArtifact = (text: string) => {
        const trimmed = text.trim();
        if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) return false;
        return /\"queryClassification\"|\"query_classification\"|\"mode\"\\s*:\\s*\"(simple|complex)\"/i.test(trimmed);
    };

    const [appendTriggered, setAppendTriggered] = useState(false);
    const [isAppending, setIsAppending] = useState(false);
    const [justAppended, setJustAppended] = useState(false);

    const assistantMessages = useMemo(() => {
        if (!uiMessages || uiMessages.length === 0) return [] as { raw: any; text: string }[];
        return uiMessages
            .filter((m: any) => {
                const role = m.role ?? m?.message?.role;
                return role === "assistant" || m?.type === "tool-result" || m?.kind === "tool-result";
            })
            .map((m: any) => ({ raw: m, text: extractMessageText(m) }))
            .filter(({ text }) => Boolean(text && text.trim()) && !isPlannerArtifact(text));
    }, [uiMessages]);


    const combinedContent = useMemo(() => {
        if (!assistantMessages.length) return "";
        return assistantMessages.map(({ text }) => text).join("\n\n---\n\n");
    }, [assistantMessages]);

    const latestAssistantMessage = assistantMessages.length ? assistantMessages[assistantMessages.length - 1].raw : null;
    const hasContent = combinedContent.length > 0;
    const isStreaming = (latestAssistantMessage as any)?.status === "streaming" || (latestAssistantMessage as any)?.message?.status === "streaming";

    const latestUserMessage = useMemo(() => {
        if (!uiMessages || uiMessages.length === 0) return null;
        for (let i = uiMessages.length - 1; i >= 0; i--) {
            const msg = uiMessages[i] as any;
            const role = msg.role ?? msg?.message?.role;
            if (role === "user") return msg;
        }
        return null;
    }, [uiMessages]);

    const latestRequestText = useMemo(() => latestUserMessage ? extractMessageText(latestUserMessage) : "", [latestUserMessage]);

    const latestToolParts = useMemo(() => {
        const raw = latestAssistantMessage as any;
        const parts = raw?.parts || raw?.message?.parts;
        if (Array.isArray(parts)) {
            return parts.filter((p: any) => typeof p?.type === "string" && p.type.startsWith("tool-"));
        }
        return [] as any[];
    }, [latestAssistantMessage]);

    const timelineSteps = useMemo(() => toolPartsToTimelineSteps(latestToolParts).slice(-8), [latestToolParts]);

    const observationStep = useMemo(() => {
        for (let i = timelineSteps.length - 1; i >= 0; i--) {
            const step = timelineSteps[i];
            if (step.status === "error" || step.result || step.description) return step;
        }
        return null;
    }, [timelineSteps]);

    const agentStatuses = useMemo(() => {
        const statusMap = new Map<string, TimelineStep["status"]>();
        const inferRoleFromName = (name: string | undefined) => {
            const normalized = (name || "").toLowerCase();
            if (normalized.includes("document")) return "documentAgent";
            if (normalized.includes("media")) return "mediaAgent";
            if (normalized.includes("sec")) return "secAgent";
            if (normalized.includes("web")) return "webAgent";
            if (normalized.includes("delegate") || normalized.includes("coordinate")) return "coordinator";
            return undefined;
        };

        timelineSteps.forEach((step) => {
            const role = (step.agentRole || inferRoleFromName(step.toolName || step.title)) as string | undefined;
            if (!role) return;
            const current = statusMap.get(role);
            if (!current || current === "pending") {
                statusMap.set(role, step.status);
                return;
            }
            if (step.status === "error" || step.status === "running" || (step.status === "complete" && current !== "error")) {
                statusMap.set(role, step.status);
            }
        });

        return Array.from(statusMap.entries()).map(([role, status]) => ({ role: role as TimelineStep["agentRole"], status }));
    }, [timelineSteps]);

    const liveOutputPreview = useMemo(() => {
        return latestAssistantMessage ? extractMessageText(latestAssistantMessage as any) : "";
    }, [latestAssistantMessage]);

    const visibleSteps = (isAppending && !isStreaming) ? [] : timelineSteps;
    const visibleAgentStatuses = (isAppending && !isStreaming) ? [] : agentStatuses;
    const visibleObservation = (isAppending && !isStreaming) ? null : observationStep;
    const visibleLiveOutput = (isAppending && !isStreaming) ? "" : liveOutputPreview;

    // Track which follow-up is currently running
    const [currentFollowUpLabel, setCurrentFollowUpLabel] = useState<string>("");

    // Follow-up status handling
    const prevAppendingRef = useRef(false);
    const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
    const prevMessageCountRef = useRef(0);

    useEffect(() => {
        // Clear appending flags if streaming started (detected by new messages)
        if (appendTriggered && isStreaming) {
            setAppendTriggered(false);
        }

        // Clear loading state if NOT streaming and NOT in the triggered phase
        if (!isStreaming && !appendTriggered) {
            setIsAppending(false);
            setCurrentFollowUpLabel("");
        }

        // Detect NEW content arrival (message count increased)
        if (assistantMessages.length > prevMessageCountRef.current) {
            if (isAppending) {
                // New content arrived! Clear the loading state
                setIsAppending(false);
                setCurrentFollowUpLabel("");
                // Highlight the newest section
                setHighlightedIndex(assistantMessages.length - 1);
                setTimeout(() => {
                    setHighlightedIndex(-1);
                }, 3000);
            }
            prevMessageCountRef.current = assistantMessages.length;
        }

        // Store previous state for transition detection
        prevAppendingRef.current = isAppending;
    }, [appendTriggered, isStreaming, isAppending, assistantMessages.length]);

    const handleFollowUp = async (query: string) => {
        if (!onRunFollowUp) return;

        // Extract label from query for display
        const label = query.includes("full enrichment") ? "Full Enrichment Dossier" :
            query.includes("Synthesize") ? "Synthesizing Final Report" :
                query.includes("founders") ? "Founder Deep Dive" :
                    query.includes("clients") || query.includes("partners") ? "Client & Partner Analysis" :
                        query.includes("intellectual property") || query.includes("patents") ? "IP & Patents" :
                            "Follow-up Research";

        setCurrentFollowUpLabel(label);
        setAppendTriggered(true);
        setIsAppending(true);
        let cleared = false;
        const clearFlags = () => {
            if (cleared) return;
            cleared = true;
            setAppendTriggered(false);
            setIsAppending(false);
            setCurrentFollowUpLabel("");
        };
        const timeoutId = setTimeout(clearFlags, 5000); // safety net if streaming never starts
        try {
            const result = onRunFollowUp(query);
            if (result && typeof (result as Promise<any>).then === "function") {
                await result;
            }
            // If streaming didn't kick in quickly, fall back to clearing flags
            if (!isStreaming) {
                setAppendTriggered(false);
                setIsAppending(false);
                setCurrentFollowUpLabel("");
            }
        } catch (error) {
            console.error("[LiveDossierDocument] Follow-up failed", error);
            clearFlags();
        } finally {
            clearTimeout(timeoutId);
        }
    };

    // Auto-scroll logic
    const bottomRef = useRef<HTMLDivElement>(null);
    const latestSectionRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isStreaming) {
            latestSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
    }, [combinedContent, isStreaming]);

    // 2. The "Skeleton" Loader (Prevents Visual Jump on Start)
    // Show loading skeleton only when explicitly loading AND no content yet
    if (isLoading && !hasContent) {
        return (
            <div className="max-w-3xl mx-auto mt-10 space-y-8 animate-pulse p-12 bg-white shadow-sm border border-gray-100">
                <div className="h-4 bg-gray-200 rounded w-1/3 mx-auto mb-8"></div> {/* Date */}
                <div className="h-12 bg-gray-200 rounded w-3/4 mx-auto mb-12"></div> {/* Title */}
                <div className="space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                </div>
            </div>
        );
    }

    if (!threadId) return <EmptyState />;

    return (
        <div className="bg-white min-h-[900px] shadow-[0_2px_40px_-12px_rgba(0,0,0,0.1)] mx-auto max-w-4xl relative animate-in fade-in duration-700">

            {/* Decorative Top Bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900"></div>

            <div className="p-12 md:p-16">
                {/* Newspaper Header */}
                <header className="text-center border-b border-gray-200 pb-8 mb-10">
                    <h1 className="font-serif text-5xl md:text-6xl font-black tracking-tight mb-4 text-gray-900 uppercase">
                        The Daily Dossier
                    </h1>
                    <div className="flex justify-between items-center text-[10px] md:text-xs font-mono font-semibold uppercase tracking-[0.2em] text-gray-500 pt-2">
                        <span>Vol. 24, No. 142</span>
                        <span className="flex items-center gap-1 text-purple-600">
                            <Sparkles className="w-3 h-3" /> Live Intelligence
                        </span>
                        <span>Confidential</span>
                    </div>
                </header>

                {(isAppending || isStreaming) && (
                    <LiveAgentTicker
                        isActive={isAppending || isStreaming}
                        followUpLabel={currentFollowUpLabel}
                        requestPreview={latestRequestText}
                        liveOutput={visibleLiveOutput}
                        agentStatuses={visibleAgentStatuses}
                        observationStep={visibleObservation}
                        steps={visibleSteps}
                    />
                )}

                {/* Content Area - Render each message as a separate section but visually seamless */}
                {assistantMessages.map((msgObj, idx) => {
                    const isFirstMessage = idx === 0;
                    const isLatest = idx === assistantMessages.length - 1;
                    const isHighlighted = highlightedIndex === idx;

                    return (
                        <div
                            key={idx}
                            ref={isLatest ? latestSectionRef : null}
                            className={`transition-all duration-500 ${
                                // Subtle spacing instead of harsh borders
                                !isFirstMessage ? 'mt-8' : 'mb-8'
                                } ${isHighlighted ? 'animate-in fade-in duration-700' : ''
                                }`}
                        >
                            {/* Subtle "New" Indicator for the latest appended content */}
                            {!isFirstMessage && isHighlighted && (
                                <div className="flex items-center gap-2 mb-4 text-blue-600 animate-pulse">
                                    <Sparkles className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase tracking-wider">
                                        New Information Added
                                    </span>
                                </div>
                            )}

                            {/* Message Content */}
                            <div className="prose prose-base max-w-none 
                                prose-headings:font-sans prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-gray-900
                                prose-p:font-serif prose-p:text-[1.05rem] prose-p:leading-[1.75] prose-p:text-gray-800
                                prose-strong:font-sans prose-strong:font-bold prose-strong:text-gray-900
                                prose-li:font-serif prose-li:text-gray-800
                                prose-blockquote:border-l-2 prose-blockquote:border-purple-500 prose-blockquote:bg-purple-50/50 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:not-italic prose-blockquote:text-gray-700
                            ">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        // Custom "Entity Chip" for bold text (High-End Look)
                                        strong: ({ node, ...props }) => (
                                            <span className="font-semibold text-gray-900 bg-gray-100/80 px-1 py-0.5 rounded border border-gray-200/50 text-[0.95em]">
                                                {props.children}
                                            </span>
                                        ),
                                        // Cleaner Headers
                                        h3: ({ node, ...props }) => (
                                            <div className="mt-10 mb-4 pb-2 border-b border-gray-100">
                                                <h3 className="text-lg uppercase tracking-wider font-bold text-gray-900 m-0">{props.children}</h3>
                                            </div>
                                        ),
                                        // Remove default bullets, use custom ones
                                        ul: ({ node, ...props }) => <ul className="space-y-2 my-6 list-none pl-0">{props.children}</ul>,
                                        li: ({ node, ...props }) => (
                                            <li className="flex gap-3 items-start">
                                                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-purple-500 shrink-0"></span>
                                                <span>{props.children}</span>
                                            </li>
                                        ),
                                        table: ({ node, ...props }) => (
                                            <div className="overflow-x-auto overflow-y-auto max-h-96 my-6 rounded-lg border border-gray-200 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-400">
                                                <table className="min-w-full border-collapse text-sm">{props.children}</table>
                                            </div>
                                        ),
                                        thead: ({ node, ...props }) => (
                                            <thead className="bg-gray-50 text-left text-gray-700 font-semibold border-b border-gray-200 sticky top-0">{props.children}</thead>
                                        ),
                                        tbody: ({ node, ...props }) => <tbody className="divide-y divide-gray-100">{props.children}</tbody>,
                                        tr: ({ node, ...props }) => <tr className="align-top">{props.children}</tr>,
                                        th: ({ node, ...props }) => <th className="px-3 py-2 border-r border-gray-200 last:border-r-0 whitespace-nowrap">{props.children}</th>,
                                        td: ({ node, ...props }) => <td className="px-3 py-2 border-r border-gray-200 last:border-r-0 align-top">{props.children}</td>
                                    }}
                                >
                                    {msgObj.text}
                                </ReactMarkdown>

                                {/* The Blinking Cursor (Only when streaming on latest message) */}
                                {isStreaming && isLatest && (
                                    <span className="inline-block w-2 h-5 bg-purple-500 ml-1 animate-pulse align-middle rounded-sm"></span>
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* Deep Agent Progress - Rendered at the bottom if active */}
                {streamingThread?.workflowProgress && (
                    <div className="mb-12 border-t-2 border-gray-200 pt-8 animate-in fade-in duration-500">
                        <DeepAgentProgress steps={streamingThread.workflowProgress.steps} />
                    </div>
                )}

                {/* Final Synthesis Action - Refined */}
                {hasContent && onRunFollowUp && !isStreaming && (
                    <div className="mb-12 flex justify-center">
                        <button
                            onClick={() => handleFollowUp("Synthesize all the above information into a single, comprehensive, and well-structured final report. Remove redundancies and organize logically.")}
                            disabled={isAppending}
                            className={`group flex items-center gap-3 px-8 py-4 bg-gray-900 text-white rounded-full font-medium shadow-xl hover:bg-gray-800 hover:scale-105 transition-all duration-200 ${isAppending ? 'opacity-80 cursor-not-allowed scale-100' : ''}`}
                        >
                            {isAppending ? (
                                <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                            ) : (
                                <Sparkles className="w-5 h-5 text-purple-400 group-hover:animate-pulse" />
                            )}
                            <span className="tracking-wide">
                                {isAppending ? 'Synthesizing Report...' : 'Synthesize Final Report'}
                            </span>
                        </button>
                    </div>
                )}

                {/* Suggested Follow-ups Section - Only show when content is ready and callback provided */}
                {hasContent && onRunFollowUp && (
                    <SuggestedFollowUps
                        onSelectFollowUp={handleFollowUp}
                        contentContext={combinedContent}
                    />
                )}

                <div ref={bottomRef} />
            </div>

            {/* Footer Watermark */}
            <div className="absolute bottom-0 w-full p-4 border-t border-gray-50 bg-gray-50/30">
                <p className="font-mono text-[10px] text-center text-gray-400 uppercase tracking-widest">
                    Generated via Nodebench AI • {new Date().toLocaleTimeString()}
                </p>
            </div>
        </div>
    );
}

function EmptyState() {
    return null; // Handle empty state in parent to prevent flash
}

interface LiveAgentTickerProps {
    isActive: boolean;
    followUpLabel?: string;
    requestPreview?: string;
    liveOutput?: string;
    agentStatuses: { role: TimelineStep["agentRole"]; status: TimelineStep["status"] }[];
    observationStep: TimelineStep | null;
    steps: TimelineStep[];
}

function LiveAgentTicker({
    isActive,
    followUpLabel,
    requestPreview,
    liveOutput,
    agentStatuses,
    observationStep,
    steps
}: LiveAgentTickerProps) {
    const [showDetails, setShowDetails] = useState(true);

    const roleLabels: Record<string, string> = {
        coordinator: "Coordinator",
        documentAgent: "Document Agent",
        mediaAgent: "Media Agent",
        secAgent: "SEC Agent",
        webAgent: "Web Agent"
    };

    const statusStyles: Record<TimelineStep["status"], string> = {
        pending: "bg-white/10 text-white border-white/10",
        running: "bg-blue-500/20 text-blue-100 border-blue-300/40",
        complete: "bg-green-500/20 text-green-100 border-green-300/40",
        error: "bg-red-500/20 text-red-100 border-red-300/40"
    };

    const recentSteps = (steps || []).slice(-4);

    const observationText = observationStep
        ? (() => {
            if (observationStep.error) return observationStep.error;
            if (typeof observationStep.result === "string") return observationStep.result;
            if (observationStep.result) return JSON.stringify(observationStep.result, null, 2);
            return observationStep.description || "";
        })()
        : "";

    const renderAgentChips = () => {
        if (!agentStatuses.length) {
            return <p className="text-xs text-gray-200">Spinning up specialists...</p>;
        }

        return (
            <div className="flex flex-wrap gap-2">
                {agentStatuses.map(({ role, status }, idx) => (
                    <span
                        key={`${role}-${idx}`}
                        className={`px-3 py-1 rounded-full text-[11px] font-semibold border ${statusStyles[status] || statusStyles.pending}`}
                    >
                        {roleLabels[role || "coordinator"] || "Agent"} • {status.replace("_", " ")}
                    </span>
                ))}
            </div>
        );
    };

    return (
        <div className="sticky top-24 z-30 mb-8 pointer-events-none">
            <div className="pointer-events-auto relative overflow-hidden bg-gradient-to-r from-gray-900 via-gray-900/95 to-gray-900 text-white rounded-2xl shadow-2xl border border-gray-800/60 p-5 md:p-6">
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5 opacity-60 pointer-events-none" />
                <div className={`absolute top-0 left-0 right-0 h-1 ${isActive ? "animate-pulse" : ""} bg-gradient-to-r from-purple-500/60 via-purple-300/40 to-purple-500/60`} />
                <div className="flex flex-wrap items-center gap-3 justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl bg-white/10 border ${isActive ? "border-purple-300/50 shadow-lg shadow-purple-500/20" : "border-white/10"} flex items-center justify-center`}>
                            <Radio className="w-5 h-5 text-purple-200" />
                        </div>
                        <div>
                            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-purple-200">
                                Live Multi-Agent Stream
                            </div>
                            <div className="text-sm text-gray-100">See who is working on what while the dossier builds.</div>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${isActive ? "bg-green-500/20 text-green-100 border-green-300/40" : "bg-white/10 text-gray-100 border-white/10"}`}>
                            {isActive ? "Streaming" : "Idle"}
                        </span>
                        {followUpLabel && (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-white/10 text-white border-white/10">
                                {followUpLabel}
                            </span>
                        )}
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-3 mt-4 text-gray-100">
                    <InfoTile label="Request Context" body={requestPreview ? truncateText(requestPreview, 150) : "Awaiting prompt..."} />
                    <InfoTile label="Active Agents" body={renderAgentChips()} />
                    <InfoTile
                        label="Live Output"
                        body={
                            liveOutput
                                ? truncateText(liveOutput, 150)
                                : observationText
                                    ? truncateText(observationText, 150)
                                    : "Waiting for first tokens..."
                        }
                    />
                </div>

                {recentSteps.length > 0 && (
                    <div className="mt-5 pt-4 border-t border-white/10">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-purple-100 mb-3">
                            <Activity className="w-4 h-4" />
                            Active tools & delegates
                            <button
                                onClick={() => setShowDetails((prev) => !prev)}
                                className="ml-auto text-[11px] px-3 py-1 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                            >
                                {showDetails ? "Hide detail" : "Show detail"}
                            </button>
                        </div>
                        <div className="grid md:grid-cols-2 gap-3">
                            {showDetails && recentSteps.map((step) => (
                                <div key={step.id} className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2 shadow-inner shadow-black/10">
                                    <div className="flex items-start gap-2">
                                        <span className={`mt-1 h-2 w-2 rounded-full ${step.status === "complete" ? "bg-green-400" : step.status === "error" ? "bg-red-400" : step.status === "running" ? "bg-blue-400 animate-pulse" : "bg-gray-400"}`} />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold text-white">{step.title || "Agent action"}</span>
                                                {step.agentRole && (
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 border border-white/5 text-purple-100">
                                                        {roleLabels[step.agentRole]}
                                                    </span>
                                                )}
                                            </div>
                                            {(step.toolName || step.description) && (
                                                <div className="text-[11px] text-gray-300">
                                                    {step.toolName ? `Tool: ${step.toolName}` : step.description}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {step.description && (
                                        <p className="text-xs text-gray-200">
                                            {truncateText(step.description, 140)}
                                        </p>
                                    )}
                                    {step.result && typeof step.result === "string" && (
                                        <p className="text-xs text-gray-100 bg-black/30 rounded-lg p-2">
                                            {truncateText(step.result, 170)}
                                        </p>
                                    )}
                                    {step.error && (
                                        <p className="text-xs text-red-200">
                                            {truncateText(step.error, 170)}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function InfoTile({ label, body }: { label: string; body: React.ReactNode }) {
    return (
        <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <div className="text-[11px] uppercase tracking-[0.15em] text-purple-100 mb-1">{label}</div>
            <div className="text-sm text-gray-100 leading-relaxed">{body}</div>
        </div>
    );
}
