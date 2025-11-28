import { useQuery } from "convex/react";
import { DeepAgentProgress } from "./DeepAgentProgress";
import { TaskPlanPanel, workflowProgressToTaskSteps } from "./TaskPlanPanel";
import { InlineMetrics, type WorkflowMetrics } from "./WorkflowMetricsBar";
import { api } from "../../../convex/_generated/api";
import { useUIMessages } from "@convex-dev/agent/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useEffect, useRef, useMemo, useState } from "react";
import { Sparkles, TrendingUp, Users, Briefcase, FileText, Lightbulb, ChevronRight, Loader2, Radio, Activity, Bot, Globe, Database, Zap, CheckCircle2, AlertCircle, Link2 } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";
import { toolPartsToTimelineSteps, type TimelineStep } from "../FastAgentPanel/StepTimeline";

// Artifact streaming integration
import { ArtifactStoreProvider, useAllArtifacts, useSectionArtifacts } from "../../hooks/useArtifactStore";
import { useArtifactStreamConsumer } from "../../hooks/useArtifactStreamConsumer";
import { SourcesLibrary, MediaRail } from "../artifacts";
import { EvidenceChips } from "../artifacts/EvidenceChips";
import { FACT_ANCHOR_REGEX, matchSectionKey, generateSectionId } from "../../../shared/sectionIds";

// ═══════════════════════════════════════════════════════════════════════════
// FACT ANCHOR PROCESSING
// ═══════════════════════════════════════════════════════════════════════════

interface MarkdownPart {
    type: "text" | "fact";
    content: string; // For text: the markdown, for fact: the factId
}

/**
 * Split markdown into text blocks and fact anchor tokens.
 * {{fact:abc123}} becomes a separate "fact" part.
 */
function splitByFactAnchors(markdown: string): MarkdownPart[] {
    const parts: MarkdownPart[] = [];
    let lastIndex = 0;
    
    // Reset regex index
    FACT_ANCHOR_REGEX.lastIndex = 0;
    
    let match;
    while ((match = FACT_ANCHOR_REGEX.exec(markdown)) !== null) {
        // Add text before the match
        if (match.index > lastIndex) {
            parts.push({ type: "text", content: markdown.slice(lastIndex, match.index) });
        }
        // Add the fact anchor
        parts.push({ type: "fact", content: match[1] }); // match[1] is the factId
        lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < markdown.length) {
        parts.push({ type: "text", content: markdown.slice(lastIndex) });
    }
    
    return parts;
}

/**
 * Extract all h3 headings and their positions from markdown.
 * Returns sections with their content and derived sectionKey.
 */
interface MarkdownSection {
    heading: string;
    sectionKey: string;
    content: string;
    startIndex: number;
}

function extractSections(markdown: string): MarkdownSection[] {
    const sections: MarkdownSection[] = [];
    const h3Regex = /^###\s+(.+)$/gm;
    let match;
    const matches: Array<{ heading: string; index: number }> = [];
    
    while ((match = h3Regex.exec(markdown)) !== null) {
        matches.push({ heading: match[1], index: match.index });
    }
    
    for (let i = 0; i < matches.length; i++) {
        const current = matches[i];
        const nextIndex = i < matches.length - 1 ? matches[i + 1].index : markdown.length;
        const content = markdown.slice(current.index, nextIndex);
        
        sections.push({
            heading: current.heading,
            sectionKey: matchSectionKey(current.heading),
            content,
            startIndex: current.index,
        });
    }
    
    return sections;
}

const truncateText = (text: string, max = 160) => {
    if (!text) return "";
    return text.length > max ? `${text.slice(0, max)}...` : text;
};

// ═══════════════════════════════════════════════════════════════════════════
// SECTION MEDIA RAIL (conditional rendering)
// ═══════════════════════════════════════════════════════════════════════════

interface SectionMediaRailProps {
    runId: string;
    sectionId: string;
}

/**
 * Renders MediaRail for a section only if it has artifacts.
 */
function SectionMediaRail({ runId, sectionId }: SectionMediaRailProps) {
    const artifacts = useSectionArtifacts(sectionId);
    
    if (artifacts.length === 0) {
        return null;
    }
    
    return (
        <div className="mt-4 mb-6">
            <MediaRail sectionId={sectionId} maxVisible={6} compact />
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// MARKDOWN WITH FACT ANCHORS
// ═══════════════════════════════════════════════════════════════════════════

interface MarkdownWithFactsProps {
    markdown: string;
    runId: string;
    isStreaming?: boolean;
    markdownComponents: any;
}

/**
 * Renders markdown content with fact anchor chips and section MediaRails.
 * - Fact anchors {{fact:xxx}} become EvidenceChips
 * - After each h3 section, MediaRail is rendered (if it has artifacts)
 */
function MarkdownWithFacts({ markdown, runId, isStreaming, markdownComponents }: MarkdownWithFactsProps) {
    // Extract sections for MediaRail injection
    const sections = useMemo(() => extractSections(markdown), [markdown]);
    
    // If no sections detected, render as single block
    if (sections.length === 0) {
        const parts = splitByFactAnchors(markdown);
        return (
            <>
                {parts.map((part, idx) => {
                    if (part.type === "fact") {
                        return <EvidenceChips key={idx} factId={part.content} />;
                    }
                    return (
                        <ReactMarkdown key={idx} remarkPlugins={[remarkGfm]} components={markdownComponents}>
                            {part.content}
                        </ReactMarkdown>
                    );
                })}
            </>
        );
    }
    
    // Render content before first section
    const contentBeforeFirst = sections[0].startIndex > 0 
        ? markdown.slice(0, sections[0].startIndex) 
        : "";
    
    return (
        <>
            {/* Content before first h3 */}
            {contentBeforeFirst && (
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {contentBeforeFirst}
                </ReactMarkdown>
            )}
            
            {/* Each section with MediaRail */}
            {sections.map((section, idx) => {
                const sectionId = generateSectionId(runId, section.sectionKey);
                const parts = splitByFactAnchors(section.content);
                
                return (
                    <div key={idx}>
                        {/* Section content with fact anchors */}
                        {parts.map((part, partIdx) => {
                            if (part.type === "fact") {
                                return <EvidenceChips key={partIdx} factId={part.content} />;
                            }
                            return (
                                <ReactMarkdown key={partIdx} remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                    {part.content}
                                </ReactMarkdown>
                            );
                        })}
                        
                        {/* MediaRail after section (conditional) */}
                        <SectionMediaRail runId={runId} sectionId={sectionId} />
                    </div>
                );
            })}
        </>
    );
}

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

// Wrapper component with ArtifactStoreProvider
export default function LiveDossierDocument(props: {
    threadId: string | null;
    isLoading?: boolean;
    onRunFollowUp?: (query: string) => void;
}) {
    return (
        <ArtifactStoreProvider>
            <LiveDossierDocumentInner {...props} />
        </ArtifactStoreProvider>
    );
}

// Inner component with all the logic
function LiveDossierDocumentInner({
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

        // Must start with JSON brackets
        if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) return false;

        // Check for common planner/metadata JSON patterns that shouldn't be shown to users
        const plannerPatterns = [
            /"queryClassification"|"query_classification"/i,
            /"mode"\s*:\s*"(simple|complex)"/i,
            /"currentIntent"|"activeTheme"|"researchPlan"/i,
            /"delegationStrategy"|"agentAssignments"/i,
            /"workflowPhase"|"executionPlan"/i,
            /"toolSequence"|"nextSteps"/i,
            // Additional patterns for compiled/verified JSON blocks
            /"Compiled and Verified"|"Primary Agents"|"secundary"/i,
            /"InvestorSignals"|"AnnouncementMentions"/i,
            /"Late stage"|"completedTPC"|"memoryUpdated"/i,
            /"sectionConfidence"|"CrossSourceAlignment"/i,
            /"FundingRaiserVerification"|"SECAndRegulatoryVerification"/i,
            /"verifiedSources"|"summaryInsights"|"MarketSentiment"/i,
            /"RegulatoryFootprint"|"entityName"\s*:\s*".*funding.*week/i,
        ];

        // Check if matches any planner pattern
        if (plannerPatterns.some(pattern => pattern.test(trimmed))) return true;

        // Also filter large JSON blocks (>300 chars) that don't contain prose paragraphs
        if (trimmed.length > 300 && /{[\s\S]*"[^"]+"\s*:/.test(trimmed)) {
            // Check if it's mostly JSON (no prose paragraphs - sentences with 20+ consecutive letters)
            const withoutJsonStrings = trimmed.replace(/"[^"]*"/g, '');
            const hasProse = /[a-z]{20,}/i.test(withoutJsonStrings);
            if (!hasProse) return true;
        }

        return false;
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

    // Artifact streaming - consume artifacts from reactive query (server persists, client hydrates)
    const { artifacts: allArtifacts, count: artifactCount } = useArtifactStreamConsumer({
        runId: agentThreadId || null,
        debug: false,
    });

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

                            {/* Message Content with fact anchors and per-section MediaRails */}
                            <div className="prose prose-base max-w-none 
                                prose-headings:font-sans prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-gray-900
                                prose-p:font-serif prose-p:text-[1.05rem] prose-p:leading-[1.75] prose-p:text-gray-800
                                prose-strong:font-sans prose-strong:font-bold prose-strong:text-gray-900
                                prose-li:font-serif prose-li:text-gray-800
                                prose-blockquote:border-l-2 prose-blockquote:border-purple-500 prose-blockquote:bg-purple-50/50 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:not-italic prose-blockquote:text-gray-700
                            ">
                                {agentThreadId ? (
                                    <MarkdownWithFacts
                                        markdown={msgObj.text}
                                        runId={agentThreadId}
                                        isStreaming={isStreaming && isLatest}
                                        markdownComponents={{
                                            // Custom "Entity Chip" for bold text (High-End Look)
                                            strong: ({ node, ...props }: any) => (
                                                <span className="font-semibold text-gray-900 bg-gray-100/80 px-1 py-0.5 rounded border border-gray-200/50 text-[0.95em]">
                                                    {props.children}
                                                </span>
                                            ),
                                            // Cleaner Headers
                                            h3: ({ node, ...props }: any) => (
                                                <div className="mt-10 mb-4 pb-2 border-b border-gray-100">
                                                    <h3 className="text-lg uppercase tracking-wider font-bold text-gray-900 m-0">{props.children}</h3>
                                                </div>
                                            ),
                                            // Remove default bullets, use custom ones
                                            ul: ({ node, ...props }: any) => <ul className="space-y-2 my-6 list-none pl-0">{props.children}</ul>,
                                            li: ({ node, ...props }: any) => (
                                                <li className="flex gap-3 items-start">
                                                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-purple-500 shrink-0"></span>
                                                    <span>{props.children}</span>
                                                </li>
                                            ),
                                            table: ({ node, ...props }: any) => (
                                                <div className="overflow-x-auto overflow-y-auto max-h-96 my-6 rounded-lg border border-gray-200 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-400">
                                                    <table className="min-w-full border-collapse text-sm">{props.children}</table>
                                                </div>
                                            ),
                                            thead: ({ node, ...props }: any) => (
                                                <thead className="bg-gray-50 text-left text-gray-700 font-semibold border-b border-gray-200 sticky top-0">{props.children}</thead>
                                            ),
                                            tbody: ({ node, ...props }: any) => <tbody className="divide-y divide-gray-100">{props.children}</tbody>,
                                            tr: ({ node, ...props }: any) => <tr className="align-top">{props.children}</tr>,
                                            th: ({ node, ...props }: any) => <th className="px-3 py-2 border-r border-gray-200 last:border-r-0 whitespace-nowrap">{props.children}</th>,
                                            td: ({ node, ...props }: any) => <td className="px-3 py-2 border-r border-gray-200 last:border-r-0 align-top">{props.children}</td>
                                        }}
                                    />
                                ) : (
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {msgObj.text}
                                    </ReactMarkdown>
                                )}

                                {/* The Blinking Cursor (Only when streaming on latest message) */}
                                {isStreaming && isLatest && (
                                    <span className="inline-block w-2 h-5 bg-purple-500 ml-1 animate-pulse align-middle rounded-sm"></span>
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* Deep Agent Progress - Task Plan Panel with Metrics */}
                {streamingThread?.workflowProgress && (
                    <div className="mb-12 border-t-2 border-gray-200 pt-8 animate-in fade-in duration-500">
                        <TaskPlanPanel
                            steps={workflowProgressToTaskSteps(streamingThread.workflowProgress)}
                            metrics={streamingThread.workflowProgress.metrics as WorkflowMetrics}
                            isRunning={isStreaming || isAppending}
                            title="Research Progress"
                        />
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

                {/* Sources Library - Shows all extracted artifacts */}
                {hasContent && allArtifacts.length > 0 && (
                    <SourcesLibrary 
                        title="Research Sources"
                        defaultCollapsed={false}
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

// Progress Ring Component
function ProgressRing({ progress, size = 48, strokeWidth = 3 }: { progress: number; size?: number; strokeWidth?: number }) {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg className="transform -rotate-90" width={size} height={size}>
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                {/* Progress circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="url(#progressGradient)"
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    className="transition-all duration-500 ease-out"
                />
                <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-white">{Math.round(progress)}%</span>
            </div>
        </div>
    );
}

// Agent Icon Component
function AgentIcon({ role, status }: { role: string; status: TimelineStep["status"] }) {
    const icons: Record<string, React.ReactNode> = {
        coordinator: <Users className="w-3.5 h-3.5" />,
        documentAgent: <FileText className="w-3.5 h-3.5" />,
        mediaAgent: <Database className="w-3.5 h-3.5" />,
        secAgent: <Briefcase className="w-3.5 h-3.5" />,
        webAgent: <Globe className="w-3.5 h-3.5" />,
    };

    const statusColors = {
        pending: "bg-gray-500/20 text-gray-400 border-gray-500/30",
        running: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        complete: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        error: "bg-red-500/20 text-red-400 border-red-500/30",
    };

    return (
        <div className={`relative w-8 h-8 rounded-lg border flex items-center justify-center transition-all duration-300 ${statusColors[status]}`}>
            {icons[role] || <Bot className="w-3.5 h-3.5" />}
            {status === "running" && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-400 rounded-full live-dot" />
            )}
        </div>
    );
}

// Tool Chip Component
function ToolChip({ step, index }: { step: TimelineStep; index: number }) {
    const statusIcons = {
        pending: <Loader2 className="w-3 h-3 text-gray-400" />,
        running: <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />,
        complete: <CheckCircle2 className="w-3 h-3 text-emerald-400" />,
        error: <AlertCircle className="w-3 h-3 text-red-400" />,
    };

    const statusBg = {
        pending: "bg-gray-500/10 border-gray-500/20",
        running: "bg-blue-500/10 border-blue-500/20",
        complete: "bg-emerald-500/10 border-emerald-500/20",
        error: "bg-red-500/10 border-red-500/20",
    };

    return (
        <div
            className={`tool-chip flex items-center gap-2 px-3 py-1.5 rounded-lg border ${statusBg[step.status]} transition-all duration-300 hover:scale-[1.02]`}
            style={{ "--index": index } as React.CSSProperties}
        >
            {statusIcons[step.status]}
            <span className="text-xs font-medium text-white/90 whitespace-nowrap">
                {step.toolName || step.title || "Processing"}
            </span>
        </div>
    );
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
    const roleLabels: Record<string, string> = {
        coordinator: "Coordinator",
        documentAgent: "Documents",
        mediaAgent: "Media",
        secAgent: "SEC",
        webAgent: "Web"
    };

    const recentSteps = (steps || []).slice(-6);

    // Calculate progress based on steps
    const completedSteps = steps.filter(s => s.status === "complete").length;
    const totalSteps = Math.max(steps.length, 1);
    const progress = Math.min((completedSteps / totalSteps) * 100, 95); // Cap at 95% until truly done

    // Get the current action text
    const currentAction = useMemo(() => {
        const runningStep = steps.find(s => s.status === "running");
        if (runningStep) {
            return runningStep.toolName || runningStep.title || "Processing...";
        }
        if (observationStep?.description) {
            return truncateText(observationStep.description, 60);
        }
        return "Analyzing data...";
    }, [steps, observationStep]);

    return (
        <div className="sticky top-20 z-30 mb-8 pointer-events-none">
            <div className={`pointer-events-auto relative overflow-hidden rounded-2xl transition-all duration-500 ${isActive ? 'active-glow' : ''}`}>
                {/* Animated gradient border */}
                {isActive && (
                    <div className="absolute inset-0 rounded-2xl gradient-border" />
                )}

                {/* Glass container */}
                <div className="relative glass-container rounded-2xl p-5 md:p-6 flowing-gradient">
                    {/* Shimmer overlay when active */}
                    {isActive && (
                        <div className="absolute inset-0 shimmer-bg pointer-events-none rounded-2xl" />
                    )}

                    {/* Header Row */}
                    <div className="relative flex items-center gap-4">
                        {/* Progress Ring */}
                        <ProgressRing progress={isActive ? progress : 100} />

                        {/* Title & Status */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className="text-white font-semibold text-sm">
                                    Multi-Agent Research
                                </h3>
                                {isActive && (
                                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full live-dot" />
                                        <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Live</span>
                                    </span>
                                )}
                                {followUpLabel && (
                                    <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-[10px] font-medium text-purple-300">
                                        {followUpLabel}
                                    </span>
                                )}
                            </div>
                            <p className="text-white/60 text-xs mt-0.5 truncate">
                                {isActive ? currentAction : "Research complete"}
                            </p>
                        </div>

                        {/* Active Agents */}
                        <div className="hidden md:flex items-center gap-1.5">
                            {agentStatuses.length > 0 ? (
                                agentStatuses.slice(0, 4).map(({ role, status }, idx) => (
                                    <div key={`${role}-${idx}`} className="group relative">
                                        <AgentIcon role={role || "coordinator"} status={status} />
                                        {/* Tooltip */}
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 rounded text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                            {roleLabels[role || "coordinator"]} • {status}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex items-center gap-1.5 text-white/40 text-xs">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Initializing...</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tool Timeline - Horizontal Scroll */}
                    {recentSteps.length > 0 && (
                        <div className="relative mt-4 pt-4 border-t border-white/5">
                            <div className="flex items-center gap-2 mb-3">
                                <Activity className="w-3.5 h-3.5 text-purple-400" />
                                <span className="text-[10px] font-semibold text-purple-300 uppercase tracking-wider">
                                    Tool Activity
                                </span>
                                <span className="text-[10px] text-white/40">
                                    {recentSteps.length} recent
                                </span>
                            </div>
                            <div className="flex gap-2 overflow-x-auto timeline-scroll pb-1 stagger-children">
                                {recentSteps.map((step, idx) => (
                                    <ToolChip key={step.id} step={step} index={idx} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Live Output Preview */}
                    {isActive && liveOutput && (
                        <div className="mt-4 pt-4 border-t border-white/5">
                            <div className="flex items-center gap-2 mb-2">
                                <Zap className="w-3.5 h-3.5 text-amber-400" />
                                <span className="text-[10px] font-semibold text-amber-300 uppercase tracking-wider">
                                    Live Output
                                </span>
                            </div>
                            <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                                <p className="text-xs text-white/80 font-mono leading-relaxed">
                                    {truncateText(liveOutput, 200)}
                                    <span className="typewriter-cursor text-purple-400" />
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
