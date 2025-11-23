import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useUIMessages } from "@convex-dev/agent/react";
import ReactMarkdown from "react-markdown";
import { useEffect, useRef, useMemo } from "react";
import { Sparkles, TrendingUp, Users, Briefcase, FileText, Lightbulb, ChevronRight } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";

// QuickActionButton Component
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
            className="group flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-full font-medium text-sm shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5"
        >
            <span className="flex-shrink-0">{icon}</span>
            <span>{label}</span>
            <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity -ml-1" />
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
            <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700">
                    💡 Suggested Next Steps
                </h3>
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

    const latestAssistantMessage = useMemo(() => {
        try {
            if (!uiMessages || uiMessages.length === 0) return null;

            // Optimized: Use reverse loop instead of array copy
            for (let i = uiMessages.length - 1; i >= 0; i--) {
                const m = uiMessages[i];
                if (!m) continue; // Defensive null check

                const isAssistant = (m.role ?? m?.message?.role) === "assistant";
                if (!isAssistant) continue;

                // Safe text check with null guards
                const hasText = (typeof m.text === "string" && m.text.trim().length > 0) ||
                    (Array.isArray(m.content) && m.content.some((c: any) => c?.text?.trim?.()));

                if (hasText) return m;
            }
            return null;
        } catch (error) {
            console.error("Error finding latest assistant message:", error);
            return null;
        }
    }, [uiMessages]);

    const content = useMemo(() => {
        const latest = latestAssistantMessage as any;
        if (!latest) return "";
        if (typeof latest.text === "string" && latest.text.trim()) return latest.text;
        if (Array.isArray(latest.content)) {
            const textParts = latest.content
                .filter((c: any) => typeof c?.text === "string")
                .map((c: any) => c.text)
                .join("\n\n");
            if (textParts.trim()) return textParts;
        }
        if (typeof latest.message?.text === "string") return latest.message.text;
        return "";
    }, [latestAssistantMessage]);

    const hasContent = content.length > 0;
    const isStreaming = (latestAssistantMessage as any)?.status === "streaming" || (latestAssistantMessage as any)?.message?.status === "streaming";

    // Auto-scroll logic
    const bottomRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (isStreaming) {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [content, isStreaming]);

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

                {/* Content Area - Tuned Typography */}
                <div className="prose prose-base max-w-none 
          prose-headings:font-sans prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-gray-900
          prose-p:font-serif prose-p:text-[1.05rem] prose-p:leading-[1.75] prose-p:text-gray-800
          prose-strong:font-sans prose-strong:font-bold prose-strong:text-gray-900
          prose-li:font-serif prose-li:text-gray-800
          prose-blockquote:border-l-2 prose-blockquote:border-purple-500 prose-blockquote:bg-purple-50/50 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:not-italic prose-blockquote:text-gray-700
        ">
                    <ReactMarkdown
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
                            )
                        }}
                    >
                        {content}
                    </ReactMarkdown>

                    {/* The Blinking Cursor (Only when streaming) */}
                    {isStreaming && (
                        <span className="inline-block w-2 h-5 bg-purple-500 ml-1 animate-pulse align-middle rounded-sm"></span>
                    )}
                </div>

                {/* Suggested Follow-ups Section - Only show when content is ready and callback provided */}
                {hasContent && !isStreaming && onRunFollowUp && (
                    <SuggestedFollowUps
                        onSelectFollowUp={onRunFollowUp}
                        contentContext={content}
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
