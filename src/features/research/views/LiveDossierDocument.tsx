import { useQuery } from "convex/react";
import { DeepAgentProgress } from "@/features/agents/views/DeepAgentProgress";
import { TaskPlanPanel, workflowProgressToTaskSteps } from "@/features/agents/views/TaskPlanPanel";
import { InlineMetrics, type WorkflowMetrics } from "@/features/agents/views/WorkflowMetricsBar";
import { api } from "../../../../convex/_generated/api";
import { useUIMessages } from "@convex-dev/agent/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useEffect, useRef, useMemo, useState } from "react";
import { Sparkles, TrendingUp, Users, Briefcase, FileText, Lightbulb, ChevronRight, Loader2, Radio, Activity, Bot, Globe, Database, Zap, CheckCircle2, AlertCircle, Link2, ExternalLink, Calendar, Youtube, FileSearch, Copy, Check } from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";
import { toolPartsToTimelineSteps, type TimelineStep } from "@features/agents/components/FastAgentPanel/StepTimeline";

// Artifact streaming integration
import { ArtifactStoreProvider } from "@/hooks/useArtifactStore";
import { useArtifactStreamConsumer } from "@/hooks/useArtifactStreamConsumer";
import { EvidenceDrawer, WhatChangedStrip, type EvidenceSource } from "@/features/research/components/newsletter";
import { useInlineCitations, useSourcesList } from "@/hooks/useInlineCitations";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

// ═══════════════════════════════════════════════════════════════════════════
// HELPER UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

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
        api.domains.agents.fastAgentPanelStreaming.getThreadByStreamId,
        threadId ? { threadId: threadId as Id<"chatThreadsStream"> } : "skip"
    );

    const agentThreadId = streamingThread?.agentThreadId;

    const { results: uiMessages } = useUIMessages(
        api.domains.agents.fastAgentPanelStreaming.getThreadMessagesWithStreaming,
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

    // Citation sanitization schema - allows our injected sup/a elements
    const citationSchema = useMemo(() => ({
        ...defaultSchema,
        tagNames: [...(defaultSchema.tagNames ?? []), "sup"],
        attributes: {
            ...(defaultSchema.attributes ?? {}),
            a: ["href", "data-artifact-id", "className"],
            sup: ["className", "aria-label"],
        },
        protocols: {
            ...(defaultSchema.protocols ?? {}),
            href: ["#", "http", "https"],
        },
    }), []);

    // Evidence drawer state
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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

    // Process inline citations for newsletter-style footnotes
    const { injectedMarkdown, numToArtifactId, artifactIdToNum } = useInlineCitations(combinedContent);
    const sourcesList = useSourcesList(numToArtifactId);

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

    // Convert artifacts to EvidenceSource format for drawer
    const evidenceSources: EvidenceSource[] = useMemo(() => {
        return allArtifacts.map(a => ({
            id: a.id,
            title: a.title || 'Untitled',
            url: a.url || '',
            domain: a.domain || '',
            type: a.url?.includes('youtube') ? 'youtube' as const :
                  a.url?.includes('sec.gov') ? 'sec' as const :
                  a.url?.endsWith('.pdf') ? 'pdf' as const : 'web' as const,
            snippet: a.snippet,
            verified: a.flags?.isCited ?? false,
            discoveredAt: a.discoveredAt,
        }));
    }, [allArtifacts]);

    // Extract entity name from first heading in content
    const entityName = useMemo(() => {
        const match = combinedContent.match(/^#\s+(.+?)(?:\n|$)/m) || 
                      combinedContent.match(/^##\s+(.+?)(?:\n|$)/m);
        return match ? match[1].trim() : 'Research Dossier';
    }, [combinedContent]);

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

    // Click handler for citation links
    const handleCitationClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const link = target.closest('a[data-artifact-id]') as HTMLAnchorElement | null;
        if (!link) return;
        
        const artifactId = link.getAttribute('data-artifact-id');
        if (artifactId) {
            e.preventDefault();
            // Open the evidence drawer with the artifact highlighted
            setIsDrawerOpen(true);
        }
    };

    return (
        <div className="w-full animate-in fade-in duration-700">
            {/* Newsletter Container - Max width for readability */}
            <div className="mx-auto max-w-[720px] px-5 sm:px-6 lg:px-8 py-10 sm:py-12">
                
                {/* Clean Newsletter Masthead */}
                <header className="mb-8 pb-6 border-b border-border/50">
                    {/* Date line */}
                    <div className="text-xs text-muted-foreground mb-3">
                        {new Date().toLocaleDateString('en-US', { 
                            weekday: 'long',
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                        })}
                        {isStreaming && (
                            <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-[10px] font-medium">
                                <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
                                Live
                            </span>
                        )}
                    </div>

                    {/* Title */}
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                        The Daily Dossier
                    </h1>

                    {/* Subtitle: Entity • Source count */}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{entityName}</span>
                        {allArtifacts.length > 0 && (
                            <>
                                <span className="opacity-40">•</span>
                                <button 
                                    onClick={() => setIsDrawerOpen(true)}
                                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                                >
                                    <Link2 className="w-3 h-3" />
                                    {allArtifacts.length} sources
                                </button>
                            </>
                        )}
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

                {/* What Changed Strip - Show when there are new sources */}
                {hasContent && allArtifacts.length > 0 && (
                    <WhatChangedStrip
                        newSources={allArtifacts.filter(a => a.discoveredAt && Date.now() - a.discoveredAt < 60000).length}
                        updates={0}
                        contradictions={0}
                        lastUpdated={new Date()}
                        onViewDiff={() => setIsDrawerOpen(true)}
                        className="mb-6"
                    />
                )}

                {/* Main Content - Clean prose aligned with BlockNote typography */}
                <article 
                    className="prose prose-neutral dark:prose-invert max-w-none
                        prose-p:leading-relaxed prose-p:text-base prose-p:text-foreground
                        prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                        prose-headings:text-foreground prose-headings:font-semibold
                        prose-h1:text-2xl prose-h1:mt-8 prose-h1:mb-4
                        prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-3
                        prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-2
                        prose-ul:my-3 prose-ol:my-3 prose-li:my-0.5
                        prose-blockquote:border-l-2 prose-blockquote:border-muted-foreground/30 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground
                        prose-hr:my-8 prose-hr:border-border
                        prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
                        prose-table:text-sm
                        [&_.nb-cite]:align-super [&_.nb-cite]:text-[0.7em] [&_.nb-cite]:font-medium
                        [&_.nb-cite-link]:text-primary [&_.nb-cite-link]:no-underline [&_.nb-cite-link:hover]:underline"
                    onClick={handleCitationClick}
                    ref={latestSectionRef}
                >
                    <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw, [rehypeSanitize, citationSchema]]}
                    >
                        {injectedMarkdown}
                    </ReactMarkdown>
                    
                    {/* Streaming cursor */}
                    {isStreaming && (
                        <span className="inline-block w-2 h-5 bg-purple-500 ml-1 animate-pulse align-middle rounded-sm"></span>
                    )}
                </article>

                {/* Sources Section */}
                {hasContent && sourcesList.length > 0 && (
                    <section id="sources" className="mt-10 pt-6 border-t border-border scroll-mt-24">
                        <h3 className="text-sm font-semibold text-foreground mb-4">Sources</h3>
                        <div className="space-y-2">
                            {sourcesList.map((source) => {
                                // Determine source type icon
                                const isVideo = source.domain?.includes('youtube') || source.domain?.includes('vimeo');
                                const isPdf = source.url?.endsWith('.pdf') || source.kind === 'file';
                                const isSec = source.domain?.includes('sec.gov');
                                
                                const SourceIcon = isVideo ? Youtube : 
                                                   isPdf ? FileText : 
                                                   isSec ? FileSearch : 
                                                   Globe;
                                
                                return (
                                    <div 
                                        key={source.artifactId} 
                                        id={`source-${source.num}`} 
                                        className="flex items-center gap-2 text-sm group"
                                    >
                                        <span className="w-5 text-muted-foreground font-mono text-xs text-right shrink-0">
                                            {source.num}
                                        </span>
                                        <SourceIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                        <button
                                            className="text-left truncate hover:text-primary transition-colors flex-1"
                                            onClick={() => source.url && window.open(source.url, '_blank')}
                                        >
                                            <span className="text-foreground">{source.title}</span>
                                            <span className="text-muted-foreground text-xs ml-2">{source.domain}</span>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

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

                <div ref={bottomRef} />

                {/* Footer */}
                <footer className="mt-12 pt-4 border-t border-border text-center">
                    <p className="text-xs text-muted-foreground">
                        NodeBench AI • {new Date().toLocaleTimeString()}
                    </p>
                </footer>
            </div>

            {/* Evidence Drawer - Right sidebar (for deep dive) */}
            <EvidenceDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                sources={evidenceSources}
                onSourceClick={(source) => {
                    if (source.url) window.open(source.url, '_blank');
                }}
            />
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
