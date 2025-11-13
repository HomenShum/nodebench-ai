import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Bot, Briefcase, Landmark, Microscope, LineChart, Megaphone, Stethoscope, Send, Loader2, Sparkles, Calendar } from "lucide-react";
import type { Id } from "../../../convex/_generated/dataModel";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useUIMessages, useSmoothText } from "@convex-dev/agent/react";
import { InlineDossierDisplay } from "./InlineDossierDisplay";
import { toast } from "sonner";
import { StepTimeline, toolPartsToTimelineSteps } from "../FastAgentPanel/StepTimeline";
import { RichMediaSection } from "../FastAgentPanel/RichMediaSection";
import { extractMediaFromText, removeMediaMarkersFromText } from "../FastAgentPanel/utils/mediaExtractor";
import type { ToolUIPart } from "@convex-dev/agent/react";
import ReactMarkdown from 'react-markdown';
import { ExternalLink } from 'lucide-react';

interface WelcomeLandingProps {
  onDocumentSelect?: (id: Id<"documents">) => void;
}

export function WelcomeLanding({ onDocumentSelect }: WelcomeLandingProps) {
  const { signIn } = useAuthActions();
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, []);
  const user = useQuery(api.auth.loggedInUser);
  const [guestActive, setGuestActive] = useState(false);

  // Agent execution state
  const [inputValue, setInputValue] = useState("");
  const [isResearching, setIsResearching] = useState(false);
  const [agentThreadId, setAgentThreadId] = useState<string | null>(null);
  const [streamThreadId, setStreamThreadId] = useState<Id<"chatThreadsStream"> | null>(null);


  // Agent mutations and queries
  const createStreamingThread = useAction(api.fastAgentPanelStreaming.createThread);
  const sendStreamingMessage = useMutation(api.fastAgentPanelStreaming.initiateAsyncStreaming);
  const createDocument = useMutation(api.documents.create);
  const sendEmail = useAction(api.email.sendEmail);

  // Get streaming thread data
  const streamingThread = useQuery(
    api.fastAgentPanelStreaming.getThread,
    streamThreadId ? { threadId: streamThreadId } : "skip"
  );

  // Update agentThreadId when streamingThread is available
  useEffect(() => {
    if (streamingThread?.agentThreadId && !agentThreadId) {
      console.log('[WelcomeLanding] Setting agentThreadId:', streamingThread.agentThreadId);
      setAgentThreadId(streamingThread.agentThreadId);
    }
  }, [streamingThread, agentThreadId]);

  // Get UI messages for the agent thread
  const { results: uiMessages } = useUIMessages(
    api.fastAgentPanelStreaming.getThreadMessagesWithStreaming,
    agentThreadId ? { threadId: agentThreadId } : "skip",
    { initialNumItems: 100, stream: true }
  );

  // Extract agent response content
  const agentResponse = uiMessages && uiMessages.length > 0
    ? uiMessages[uiMessages.length - 1]
    : null;

  const isStreamingActive = agentResponse?.status === "streaming";
  const responseContent = agentResponse?.role === "assistant" && agentResponse.content
    ? agentResponse.content.filter((part: any) => part.type === "text").map((part: any) => part.text).join("\n")
    : "";

  const currentAssistantMessage = uiMessages?.slice().reverse().find((m: any) => m.role === "assistant");
  const [visibleText] = useSmoothText(currentAssistantMessage?.text ?? "", {
    startStreaming: currentAssistantMessage?.status === "streaming",
  });
  const contentToShow = (visibleText && visibleText.trim().length > 0) ? visibleText : responseContent;

  // Extract tool parts for timeline display
  const toolParts = useMemo(() => {
    if (!agentResponse?.parts) return [];
    return agentResponse.parts.filter((p: any): p is ToolUIPart =>
      p.type.startsWith('tool-')
    );
  }, [agentResponse?.parts]);

  // Extract media from both tool results and final text
  const extractedMedia = useMemo(() => {
    // Extract from tool results
    const toolMedia = extractMediaFromText(
      toolParts.map((p: any) => p.output || '').join('\n')
    );

    // Extract from final text
    const textMedia = extractMediaFromText(contentToShow);

    return { toolMedia, textMedia };
  }, [toolParts, contentToShow]);

  // Clean text for display (remove media markers)
  const cleanedText = useMemo(() => {
    return removeMediaMarkersFromText(contentToShow);
  }, [contentToShow]);

  // Keep latest user in a ref for stable event handler
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  // Parallax effect for collage cards
  const collageRef = useRef<HTMLDivElement>(null);
  const handleCollageMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!collageRef.current) return;
    const rect = collageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const tx = ((x / rect.width) - 0.5) * 20;
    const ty = ((y / rect.height) - 0.5) * 20;
    collageRef.current.style.setProperty('--tx', `${tx}px`);
    collageRef.current.style.setProperty('--ty', `${ty}px`);
  }, []);

  const handleCollageLeave = useCallback(() => {
    if (!collageRef.current) return;
    collageRef.current.style.setProperty('--tx', '0px');
    collageRef.current.style.setProperty('--ty', '0px');
  }, []);

  // Seamless: pre-authenticate as anonymous on mount if no user
  useEffect(() => {
    if (user === null) {
      void signIn('anonymous').then(() => setGuestActive(true)).catch(() => {});
    }
  }, [user, signIn]);

  // Handle query submission
  const handleSubmit = useCallback(async (query: string) => {
    if (!query.trim() || isResearching) return;

    // Ensure user is authenticated
    if (!user) {
      try {
        await signIn('anonymous');
        setGuestActive(true);
      } catch (err) {
        toast.error('Please sign in to continue');
        return;
      }
    }

    setIsResearching(true);
    setInputValue("");

    try {
      // Create or reuse thread
      let threadId = streamThreadId;
      if (!threadId) {
        const newThreadId = await createStreamingThread({
          title: query.slice(0, 50),
          model: "gpt-5-chat-latest",
        });
        threadId = newThreadId;
        setStreamThreadId(newThreadId);
      }

      // Send message with coordinator agent for intelligent delegation
      // The agentThreadId will be available in the thread after creation
      await sendStreamingMessage({
        threadId: threadId,
        prompt: query,
        model: "gpt-5-chat-latest",
        useCoordinator: true, // Use coordinator for multi-agent orchestration
      });

      toast.success('Research started');

    } catch (error: any) {
      console.error('[WelcomeLanding] Research failed:', error);
      toast.error(error.message || 'Failed to start research');
      setIsResearching(false);
    }
  }, [user, isResearching, streamThreadId, createStreamingThread, sendStreamingMessage, signIn]);

  // Update researching state based on streaming status
  useEffect(() => {
    if (isResearching && !isStreamingActive && contentToShow) {
      console.log('[WelcomeLanding] Research complete, stopping loading state');
      setIsResearching(false);
    }
  }, [isResearching, isStreamingActive, responseContent]);

  // Do not auto-abort long-running research; keep spinner until stream completes
  useEffect(() => {
    if (!isResearching) return;
    const warn = setTimeout(() => {
      console.warn('[WelcomeLanding] Research still running after 5 minutes');
      toast.info('Still working... This query is taking longer than usual but is still processing.');
    }, 300000); // 5 minutes
    return () => clearTimeout(warn);
  }, [isResearching]);

  // Handle save as dossier
  const handleSaveAsDossier = useCallback(async () => {
    if (!responseContent || !user) return;

    try {
      const title = `Funding Digest - ${new Date().toLocaleDateString()}`;
      const docId = await createDocument({
        title,
        content: responseContent,
        type: "dossier",
        folderId: undefined,
      });

      toast.success('Saved as dossier document');

      // Navigate to the document if callback provided
      if (onDocumentSelect) {
        onDocumentSelect(docId);
      }
    } catch (error: any) {
      console.error('[WelcomeLanding] Save failed:', error);
      toast.error(error.message || 'Failed to save dossier');
    }
  }, [responseContent, user, createDocument, onDocumentSelect]);

  // Handle email digest
  const handleEmailDigest = useCallback(async () => {
    if (!responseContent || !user) return;

    try {
      // For now, just show a toast - full email implementation would need user email
      toast.info('Email digest feature coming soon!');

      // Future implementation:
      // await sendEmail({
      //   to: user.email,
      //   subject: `Funding Digest - ${new Date().toLocaleDateString()}`,
      //   html: convertMarkdownToHTML(responseContent),
      // });
    } catch (error: any) {
      console.error('[WelcomeLanding] Email failed:', error);
      toast.error(error.message || 'Failed to send email');
    }
  }, [responseContent, user]);

  const benefitCards = [
    { icon: <Briefcase className='h-3.5 w-3.5' />, title: 'Investors', prompt: 'Summarize today\'s seed and Series A funding in healthcare, life sciences, and tech. Include sources.' },
    { icon: <Landmark className='h-3.5 w-3.5' />, title: 'Bankers', prompt: 'Fetch notable SEC 8-K and 10-K updates for major biotech tickers and summarize key changes.' },
    { icon: <Megaphone className='h-3.5 w-3.5' />, title: 'Marketing', prompt: 'Compile competitor news and social signals for ACME Corp and 3 top peers. Include links.' },
    { icon: <Microscope className='h-3.5 w-3.5' />, title: 'Researchers', prompt: 'List new arXiv papers on retrieval-augmented generation (RAG) this week with short abstracts.' },
    { icon: <Stethoscope className='h-3.5 w-3.5' />, title: 'Healthcare', prompt: 'Summarize new FDA approvals and device clearances in diabetes tech; add sources.' },
    { icon: <LineChart className='h-3.5 w-3.5' />, title: 'Founders', prompt: 'Create a dossier of recent PR, job postings, and product announcements for ACME Corp.' },
  ];

  const titleA = ["Your", "AI", "research", "assistant"];
  const titleB = ["for", "dossiers", "&", "newsletters"];

  // Show results if we have content OR if agent is actively working
  // This ensures we show the timeline/progress even before text appears
  const showResults = Boolean(contentToShow) || Boolean(agentResponse) || isResearching;

  // Debug logging for messages
  useEffect(() => {
    if (agentThreadId) {
      console.log('[WelcomeLanding] Listening to agentThreadId:', agentThreadId);
      console.log('[WelcomeLanding] UI Messages count:', uiMessages?.length || 0);
      if (uiMessages && uiMessages.length > 0) {
        console.log('[WelcomeLanding] Latest message:', uiMessages[uiMessages.length - 1]);
      }
    }
  }, [agentThreadId, uiMessages]);

  // Debug logging for display state
  useEffect(() => {
    console.log('[WelcomeLanding] Display state:', {
      showResults,
      isStreamingActive,
      hasAgentResponse: Boolean(agentResponse),
      isResearching,
      contentLength: contentToShow?.length || 0,
      toolPartsCount: toolParts.length,
      hasToolMedia: Boolean(extractedMedia.toolMedia),
      hasTextMedia: Boolean(extractedMedia.textMedia),
    });
  }, [showResults, isStreamingActive, agentResponse, isResearching, contentToShow, toolParts, extractedMedia]);

  return (
    <div className="h-[100svh] landing-gradient-bg grid grid-rows-[auto,1fr,auto] overflow-hidden relative">


      {/* Hero Section - Centered, minimal, animated */}
      <div className="relative max-w-5xl mx-auto w-full px-4 sm:px-6 pt-6 sm:pt-10 pb-3 sm:pb-4 pointer-events-none">
        {/* Subtle radial gradient backdrop inspired by Vercel/Stripe */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(600px_280px_at_50%_0%,rgba(26,115,232,0.18)_0%,rgba(26,115,232,0)_70%)]" />
        <div className="text-center space-y-4 sm:space-y-6 pointer-events-none">
          {/* Icon with subtle animation */}
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-[var(--accent-primary)]/5 rounded-2xl transition-transform hover:scale-105 duration-300 opacity-0 animate-[scaleIn_0.8s_ease-out_forwards] reveal-visible">
            <Bot className="h-7 w-7 sm:h-8 sm:w-8 text-[var(--accent-primary)]" />
          </div>

          {/* Hero headline - word-by-word reveal with gradient text */}
          <div className="space-y-3 sm:space-y-4">
            <h1 className="text-4xl sm:text-5xl md:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--text-primary)] leading-[1.1]">
              {titleA.map((w, i) => (
                <span key={`t1-${i}`} className={`hero-word wdelay-${i} mr-2 inline-block`}>{w}</span>
              ))}
              <br />
              <span className="gradient-text text-glow accent-shimmer">
                {titleB.map((w, i) => (
                  <span key={`t2-${i}`} className={`hero-word wdelay-${i + titleA.length} mr-2 inline-block`}>{w}</span>
                ))}
              </span>
            </h1>
            <p className="text-base sm:text-lg md:text-lg text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed opacity-0 animate-[fadeUp_0.8s_ease-out_0.8s_forwards] reveal-visible">
              Capture notes, search knowledge, and curate personalized digests.
              <br className="hidden sm:block" />
              No sign-in required to start.
            </p>
          </div>

          {/* CTA Button - Clean, prominent with glow effect */}
          <div className="flex flex-col items-center justify-center gap-2 opacity-0 animate-[fadeUp_0.8s_ease-out_0.4s_forwards] reveal-visible pointer-events-auto">
            <button
              type="button"
              onClick={() => void signIn("google", { redirectTo: typeof window !== 'undefined' ? window.location.href : '/' })}
              className="px-6 py-2.5 rounded-full bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary)]/90 transition-all duration-200 text-sm sm:text-base font-medium shadow-sm hover:shadow-md hover:scale-[1.02] pressable focus-bloom glow-accent"
            >
              Continue with Google
            </button>
            <div className="text-xs text-[var(--text-muted)]">
              or try as guest — no account needed
            </div>
          </div>

          {/* Who benefits - Pill-style tags */}
          <div className="pt-2 sm:pt-3 opacity-0 animate-[fadeUp_0.8s_ease-out_0.6s_forwards] reveal-visible pointer-events-auto">
            <p className="text-xs sm:text-sm font-medium text-[var(--text-secondary)] mb-3 sm:mb-4">
              Built for
            </p>
            <div className="flex flex-wrap items-center justify-center gap-1.5 reveal-children-visible">
              {benefitCards.map((c, idx) => (
                <button
                  key={c.title}
                  type="button"
                  onClick={async () => {
                    if (!user) {
                      await signIn('anonymous');
                      setGuestActive(true);
                    }
                    setInputValue(c.prompt);
                  }}
                  className={`group px-3.5 py-1.5 rounded-full bg-[var(--bg-secondary)]/60 hover:bg-[var(--accent-primary)]/10 border border-[var(--border-color)]/50 hover:border-[var(--accent-primary)]/30 transition-all duration-200 cursor-pointer opacity-0 animate-[fadeIn_0.5s_ease-out_forwards] anim-delay-${Math.min(idx, 9)} magnet-hover pressable`}
                  title="Click to try this prompt"
                >
                  <div className="flex items-center gap-2 text-[var(--text-secondary)] group-hover:text-[var(--accent-primary)] transition-colors">
                    <span className="opacity-60 group-hover:opacity-100 transition-opacity">{c.icon}</span>
                    <span className="text-xs sm:text-sm font-medium">{c.title}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Collage + Chat Section - resides in 1fr row */}
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 pb-4 sm:pb-6 opacity-0 animate-[fadeUp_0.8s_ease-out_1s_forwards] min-h-0 h-full flex flex-col gap-2 md:gap-3 reveal-visible pointer-events-auto">
        {/* Simple collage preview (click to prefill prompt) */}
        <div
          ref={collageRef}
          onMouseMove={handleCollageMove}
          onMouseLeave={handleCollageLeave}
          className="hidden md:grid grid-cols-3 gap-2 md:gap-3 h-24 md:h-28 lg:h-32 parallax-container"
        >
          {/* Dossier Preview */}
          <button
            type="button"
            onClick={async () => {
              if (!user) {
                await signIn('anonymous');
                setGuestActive(true);
              }
              setInputValue('Create a dossier for ACME Corp: product, team, funding, and the latest news with sources.');
            }}
            className="group relative rounded-xl border border-[var(--border-color)]/40 overflow-hidden parallax-card pressable focus-bloom parallax-d-06 collage-card-dossier"
            title="Prefill a dossier prompt"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-black/50 to-black/30" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative p-3 flex items-end h-full">
              <p className="text-xs font-medium text-white">Dossier Preview</p>
            </div>
          </button>

          {/* Newsletter Digest */}
          <button
            type="button"
            onClick={async () => {
              if (!user) {
                await signIn('anonymous');
                setGuestActive(true);
              }
              setInputValue('Draft a weekly digest on AI news: top stories, notable papers, and key links.');
            }}
            className="group relative rounded-xl border border-[var(--border-color)]/40 overflow-hidden parallax-card pressable focus-bloom parallax-d-10 collage-card-newsletter"
            title="Prefill a newsletter prompt"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-black/50 to-black/30" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative p-3 flex items-end h-full">
              <p className="text-xs font-medium text-white">Newsletter Digest</p>
            </div>
          </button>

          {/* Media Collage */}
          <button
            type="button"
            onClick={async () => {
              if (!user) {
                await signIn('anonymous');
                setGuestActive(true);
              }
              setInputValue('Find and summarize 3 recent images/videos on Retrieval-Augmented Generation. Include source URLs.');
            }}
            className="group relative rounded-xl border border-[var(--border-color)]/40 overflow-hidden parallax-card pressable focus-bloom parallax-d-08 collage-card-media"
            title="Prefill a media prompt"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-black/50 to-black/30" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative p-3 flex items-end h-full">
              <p className="text-xs font-medium text-white">Media Collage</p>
            </div>
          </button>
        </div>

        {/* Input Panel or Results Display */}
        <div className="flex-1 min-h-0 bg-[var(--bg-secondary)]/30 rounded-2xl shadow-sm backdrop-blur-sm overflow-hidden border border-[var(--border-color)]/30">
          {!showResults ? (
            /* Input Section */
            <div className="h-full flex flex-col items-center justify-center p-6">
              <div className="w-full max-w-3xl space-y-6">
                {/* Prompt Examples */}
                <div className="text-center space-y-3">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20">
                    <Sparkles className="h-4 w-4 text-[var(--accent-primary)]" />
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      Ask me anything about funding, companies, or research
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 justify-center">
                    {benefitCards.slice(0, 3).map((card, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => { setInputValue(card.prompt); }}
                        disabled={isResearching}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] hover:border-[var(--accent-primary)] transition-all text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {card.icon}
                        {card.title}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input Box */}
                <div className="relative">
                  <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(inputValue);
                      }
                    }}
                    placeholder="Summarize today's seed and Series A funding in healthcare, life sciences, and tech. Include sources."
                    disabled={isResearching}
                    className="w-full min-h-[120px] p-4 pr-12 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/20 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] resize-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  />

                  <button
                    type="button"
                    onClick={() => handleSubmit(inputValue)}
                    disabled={!inputValue.trim() || isResearching}
                    className="absolute bottom-4 right-4 p-2 rounded-lg bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {isResearching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {isResearching && (
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <Loader2 className="h-4 w-4 animate-spin text-[var(--accent-primary)]" />
                      <span>Researching across multiple sources...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Results Display with Live Agent Progress */
            <div className="h-full overflow-y-auto">
              <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 animate-[fadeIn_0.6s_ease-out]">
                {/* Newspaper-style header */}
                <div className="mb-6 sm:mb-8 pb-4 sm:pb-6 border-b-2 border-[var(--border-color)]">
                  <div className="flex items-center gap-2 sm:gap-3 mb-2">
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-[var(--accent-primary)]" />
                    <span className="text-xs sm:text-sm font-medium text-[var(--text-tertiary)]">
                      {new Date().toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-1 sm:mb-2">
                    Research Results
                  </h1>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                    AI-powered research across multiple sources
                  </p>
                </div>

                {/* Live Agent Progress Timeline */}
                {toolParts.length > 0 && (
                  <div className="mb-6 sm:mb-8">
                    <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-[var(--accent-primary)]" />
                      Agent Progress
                    </h2>
                    <div className="bg-gradient-to-br from-blue-50/50 to-purple-50/50 border border-blue-200/60 rounded-xl p-4 shadow-sm">
                      <StepTimeline
                        steps={toolPartsToTimelineSteps(toolParts)}
                        isStreaming={isStreamingActive}
                      />
                    </div>
                  </div>
                )}

                {/* Rich Media Section - Show all media found */}
                {(extractedMedia.toolMedia || extractedMedia.textMedia) && (
                  <div className="mb-6 sm:mb-8">
                    <RichMediaSection
                      media={extractedMedia}
                      showCitations={true}
                    />
                  </div>
                )}

                {/* Main Content - Markdown with custom styling */}
                {cleanedText && cleanedText.trim().length > 0 ? (
                  <div className="mb-6 sm:mb-8">
                    <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                      <Bot className="h-4 w-4 text-[var(--accent-primary)]" />
                      Analysis & Findings
                    </h2>
                    <div className="prose prose-sm dark:prose-invert max-w-none bg-white rounded-xl border border-[var(--border-color)] p-4 sm:p-6 shadow-sm">
                      <ReactMarkdown
                        components={{
                          h1: ({ children }) => (
                            <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mb-3 sm:mb-4 mt-6 first:mt-0 pb-2 border-b-2 border-[var(--accent-primary)]/20">
                              {children}
                            </h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="text-lg sm:text-xl font-semibold text-[var(--text-primary)] mb-2 sm:mb-3 mt-5 sm:mt-6 pb-2 border-b border-[var(--border-color)]">
                              {children}
                            </h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="text-base sm:text-lg font-semibold text-[var(--text-primary)] mb-2 mt-4">
                              {children}
                            </h3>
                          ),
                          p: ({ children }) => (
                            <p className="text-sm sm:text-base text-[var(--text-secondary)] mb-3 leading-relaxed">
                              {children}
                            </p>
                          ),
                          ul: ({ children }) => (
                            <ul className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4 ml-1">
                              {children}
                            </ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4 ml-1 list-decimal list-inside">
                              {children}
                            </ol>
                          ),
                          li: ({ children }) => (
                            <li className="text-sm sm:text-base text-[var(--text-secondary)] flex items-start gap-2 pl-1">
                              <span className="text-[var(--accent-primary)] mt-1 flex-shrink-0">•</span>
                              <span className="flex-1">{children}</span>
                            </li>
                          ),
                          a: ({ href, children }) => (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[var(--accent-primary)] hover:underline inline-flex items-center gap-1 break-words"
                            >
                              {children}
                              <ExternalLink className="h-3 w-3 inline flex-shrink-0" />
                            </a>
                          ),
                          strong: ({ children }) => (
                            <strong className="font-semibold text-[var(--text-primary)]">
                              {children}
                            </strong>
                          ),
                          code: ({ children }) => (
                            <code className="px-1.5 py-0.5 rounded bg-gray-100 text-[var(--accent-primary)] text-xs sm:text-sm font-mono">
                              {children}
                            </code>
                          ),
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-4 border-[var(--accent-primary)] pl-4 italic text-[var(--text-secondary)] my-4">
                              {children}
                            </blockquote>
                          ),
                        }}
                      >
                        {cleanedText}
                      </ReactMarkdown>
                    </div>
                  </div>
                ) : isStreamingActive ? (
                  /* Show placeholder while waiting for first text */
                  <div className="text-center py-12 sm:py-16">
                    <div className="inline-flex flex-col items-center gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-primary)]" />
                      <span className="text-sm text-[var(--text-secondary)]">Agent is analyzing and generating response...</span>
                    </div>
                  </div>
                ) : null}

                {/* Loading state - show at bottom if we have content */}
                {isStreamingActive && cleanedText && cleanedText.trim().length > 0 && (
                  <div className="text-center py-4 sm:py-6 border-t border-[var(--border-color)] mt-6 sm:mt-8">
                    <div className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <Loader2 className="h-4 w-4 animate-spin text-[var(--accent-primary)]" />
                      <span>Still generating...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Bar - Sticky at bottom */}
              <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)]/98 to-transparent backdrop-blur-md border-t border-[var(--border-color)]/50 p-3 sm:p-4 shadow-lg">
                <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setAgentThreadId(null);
                      setStreamThreadId(null);
                      setInputValue("");
                    }}
                    className="px-4 py-2.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-[var(--accent-primary)] hover:shadow-md text-sm font-medium text-[var(--text-primary)] transition-all flex items-center justify-center gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    New Search
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveAsDossier}
                      disabled={!user}
                      className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-[var(--accent-primary)] hover:shadow-md text-sm font-medium text-[var(--text-primary)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Briefcase className="h-4 w-4" />
                      Save as Dossier
                    </button>
                    <button
                      type="button"
                      onClick={handleEmailDigest}
                      disabled={!user}
                      className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary)]/90 hover:shadow-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Send className="h-4 w-4" />
                      Email Digest
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Trust indicators - Subtle, bottom */}
      <div className="hidden md:block max-w-5xl mx-auto w-full px-4 sm:px-6 py-2 sm:py-3 opacity-0 animate-[fadeIn_0.8s_ease-out_1.4s_forwards] reveal-visible">
        <div
          className="relative overflow-hidden marquee-container marquee-32s"
        >
          <p className="text-xs text-[var(--text-muted)] mb-2 text-center">Trusted by professionals at</p>
          {/* Edge fade masks */}
          <div className="marquee-fade-left" aria-hidden="true" />
          <div className="marquee-fade-right" aria-hidden="true" />
          {/* Animated logo/name row */}
          <div className="animate-marquee opacity-50 hover:opacity-70 transition-opacity">
            {(["Mercor", "Cognition", "SevenAI", "Greylock", "Turing", "Augment", "Vercel", "Stripe", "Linear"]).concat(["Mercor", "Cognition", "SevenAI", "Greylock", "Turing", "Augment", "Vercel", "Stripe", "Linear"]).map((name, idx) => (
              <span
                key={`${name}-${idx}`}
                className="text-xs sm:text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Floating badge: toggles between guest/sign-in CTAs */}
      {(!user || guestActive) && (
        <div className="fixed bottom-6 right-6 opacity-0 animate-[scaleIn_0.6s_ease-out_2s_forwards] reveal-visible">
          {!guestActive ? (
            <button
              type="button"
              onClick={async () => { await signIn('anonymous'); setGuestActive(true); }}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--bg-primary)] border border-[var(--border-color)] shadow-lg hover:bg-[var(--bg-secondary)]/40 transition-colors pressable focus-bloom"
              aria-label="Sign in later and start a guest session"
            >
              Sign in later
            </button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-primary)] border border-[var(--border-color)] shadow-lg">
              <span className="text-xs text-[var(--text-secondary)]">Guest session active</span>
              <button
                type="button"
                onClick={() => void signIn('google', { redirectTo: typeof window !== 'undefined' ? window.location.href : '/' })}
                className="text-xs font-medium text-[var(--accent-primary)] hover:underline"
              >
                Sign in
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default WelcomeLanding;

