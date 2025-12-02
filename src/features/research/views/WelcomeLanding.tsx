import { useAction, useMutation, useQuery, useConvexAuth } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useUIMessages } from "@convex-dev/agent/react";
import {
  Sparkles,
  TrendingUp,
  Globe,
  Newspaper,
  Calendar,
  Tag,
  ChevronRight,
  ChevronDown,
  Circle,
  FileText,
  LayoutDashboard as Layout,
  Clock,
  BarChart2,
  ExternalLink,
  Zap,
  AlertCircle,
  Search,
  Filter,
  Image as ImageIcon,
} from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";
import { extractMediaFromMessages, ExtractedAsset } from "../../../../convex/lib/dossierHelpers";
import { RichMediaSection } from "@features/agents/components/FastAgentPanel/RichMediaSection";
import { DocumentActionGrid, extractDocumentActions, type DocumentAction } from "@features/agents/components/FastAgentPanel/DocumentActionCard";
import { extractMediaFromText, type ExtractedMedia } from "@features/agents/components/FastAgentPanel/utils/mediaExtractor";
// LiveEventsPanel removed - events now shown inline in LiveDossierDocument
// import { LiveEventsPanel } from "@features/agents/components/FastAgentPanel/LiveEventsPanel";
// import type { LiveEvent, LiveEventType, LiveEventStatus } from "@features/agents/components/FastAgentPanel/LiveEventCard";
import React, { useMemo, useState, useEffect } from "react";
import ReactMarkdown from 'react-markdown';
import LiveDossierDocument from "@/features/research/views/LiveDossierDocument";
import MagicInputContainer from "@/features/research/components/MagicInputContainer";
import { InlineMetrics, type WorkflowMetrics } from "@/features/agents/views/WorkflowMetricsBar";

const baseMedia: ExtractedMedia = {
  youtubeVideos: [],
  secDocuments: [],
  webSources: [],
  profiles: [],
  images: [],
};

function sanitizeMedia(media?: Partial<ExtractedMedia>): ExtractedMedia {
  const safeArray = <T,>(items: T[] | undefined, filter?: (item: T) => boolean) =>
    (items || []).filter((item) => (filter ? filter(item) : Boolean(item)));

  const youtubeVideos = safeArray(media?.youtubeVideos, (v: any) => Boolean(v && (v.url || v.videoId)));
  const secDocuments = safeArray(media?.secDocuments, (d: any) => Boolean(d && (d.documentUrl || d.accessionNumber || d.title)));
  const webSources = safeArray(media?.webSources, (s: any) => Boolean(s && (s.url || s.title)));
  const profiles = safeArray(media?.profiles, (p: any) => Boolean(p && (p.url || p.name)));
  const images = safeArray(media?.images, (i: any) => Boolean(i && i.url));

  return {
    youtubeVideos,
    secDocuments,
    webSources,
    profiles,
    images,
  };
}

function sanitizeDocumentActions(docs: any[]): DocumentAction[] {
  if (!Array.isArray(docs)) return [];

  return docs.filter((doc): doc is DocumentAction =>
    Boolean(
      doc &&
      (doc.action === 'created' || doc.action === 'updated') &&
      typeof doc.documentId === 'string' &&
      typeof doc.title === 'string'
    )
  );
}

import { SOURCES, SOURCE_PRESETS } from "@/lib/sources";

interface WelcomeLandingProps {
  onDocumentSelect?: (documentId: string) => void;
  onEnterWorkspace?: () => void;
}

function WelcomeLandingInner({
  onDocumentSelect,
  onEnterWorkspace,
}: WelcomeLandingProps) {
  const { isAuthenticated } = useConvexAuth();
  const user = useQuery(api.domains.auth.auth.loggedInUser);
  const { signIn } = useAuthActions();
  const createThread = useAction(api.domains.agents.fastAgentPanelStreaming.createThread);
  const sendStreaming = useMutation(api.domains.agents.fastAgentPanelStreaming.initiateAsyncStreaming);
  // State with persistence
  const [activeTab, setActiveTab] = useState<'dossier' | 'newsletter' | 'media' | 'artifacts'>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('nodebench_landing_activeTab');
      return (saved as 'dossier' | 'newsletter' | 'media' | 'artifacts') || 'dossier';
    }
    return 'dossier';
  });

  const [researchPrompt, setResearchPrompt] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('nodebench_landing_prompt') || "Summarize last week's top funding news and any SEC filings for AI infrastructure startups.";
    }
    return "Summarize last week's top funding news and any SEC filings for AI infrastructure startups.";
  });
  const [researchMode, setResearchMode] = useState<"quick" | "deep">(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('nodebench_landing_mode');
      return (saved === "deep" || saved === "quick") ? saved : "quick";
    }
    return "quick";
  });

  const [threadId, setThreadId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('nodebench_landing_threadId');
    }
    return null;
  });

  const [isRunning, setIsRunning] = useState(false);

  const [activeSources, setActiveSources] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('nodebench_landing_sources');
      return saved ? JSON.parse(saved) : ['ycombinator', 'techcrunch', 'reddit', 'twitter', 'github', 'arxiv'];
    }
    return ['ycombinator', 'techcrunch', 'reddit', 'twitter', 'github', 'arxiv'];
  });

  const [activePreset, setActivePreset] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('nodebench_landing_preset') || 'all';
    }
    return 'all';
  });

  const [isReasoningOpen, setIsReasoningOpen] = useState(false);

  const [hasReceivedResponse, setHasReceivedResponse] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('nodebench_landing_hasResponse') === 'true';
    }
    return false;
  });

  const [showHero, setShowHero] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('nodebench_landing_showHero');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });

  const [isFromCache, setIsFromCache] = useState(false);
  const [cacheHistory, setCacheHistory] = useState<Array<{ prompt: string; date: string; threadId: string; timestamp: number }>>([]);
  const [followUpMode, setFollowUpMode] = useState<"append" | "new">("append");
  const [followUpHistory, setFollowUpHistory] = useState<Array<{ prompt: string; mode: "append" | "new"; status: "queued" | "done"; timestamp: number }>>([]);

  // Live Events Panel state - REMOVED (events now inline in LiveDossierDocument)
  // const [showEventsPanel, setShowEventsPanel] = useState(false);
  // const [liveEvents, setLiveEvents] = useState([]);

  // Persist state changes
  useEffect(() => {
    sessionStorage.setItem('nodebench_landing_activeTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    sessionStorage.setItem('nodebench_landing_prompt', researchPrompt);
  }, [researchPrompt]);

  useEffect(() => {
    sessionStorage.setItem('nodebench_landing_mode', researchMode);
  }, [researchMode]);

  useEffect(() => {
    if (threadId) {
      sessionStorage.setItem('nodebench_landing_threadId', threadId);
    } else {
      sessionStorage.removeItem('nodebench_landing_threadId');
    }
  }, [threadId]);

  useEffect(() => {
    sessionStorage.setItem('nodebench_landing_sources', JSON.stringify(activeSources));
  }, [activeSources]);

  useEffect(() => {
    if (activePreset) {
      sessionStorage.setItem('nodebench_landing_preset', activePreset);
    } else {
      sessionStorage.removeItem('nodebench_landing_preset');
    }
  }, [activePreset]);

  useEffect(() => {
    sessionStorage.setItem('nodebench_landing_hasResponse', String(hasReceivedResponse));
  }, [hasReceivedResponse]);

  useEffect(() => {
    sessionStorage.setItem('nodebench_landing_showHero', String(showHero));
  }, [showHero]);

  // Cache utility functions - include userId to isolate per-user caches
  const userId = user?._id;
  const getCacheKey = (prompt: string, date: string, uid?: string) => {
    const userPart = uid ? `_${uid}` : '';
    return `search_cache_${prompt.trim().toLowerCase()}_${date}${userPart}`;
  };

  const loadCacheHistory = (): Array<{ prompt: string; date: string; threadId: string; timestamp: number }> => {
    if (typeof window === 'undefined' || !userId) return [];
    const entries: Array<{ prompt: string; date: string; threadId: string; timestamp: number }> = [];
    // Only load cache entries that belong to the current user
    const userSuffix = `_${userId}`;
    Object.keys(localStorage)
      .filter((k) => k.startsWith('search_cache_') && k.endsWith(userSuffix))
      .forEach((key) => {
        try {
          const raw = localStorage.getItem(key);
          if (!raw) return;
          const parsed = JSON.parse(raw);
          if (parsed?.prompt && parsed?.threadId && parsed?.date) {
            entries.push({
              prompt: parsed.prompt,
              date: parsed.date,
              threadId: parsed.threadId,
              timestamp: parsed.timestamp ?? Date.now(),
            });
          }
        } catch {
          // ignore malformed
        }
      });
    return entries.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 10);
  };

  const getCachedResult = (prompt: string): string | null => {
    // Only use cache if we have a userId to ensure user isolation
    if (!userId) return null;
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const cacheKey = getCacheKey(prompt, today, userId);
      const cached = localStorage.getItem(cacheKey);

      if (cached) {
        const { threadId, date } = JSON.parse(cached);
        if (date === today) {
          return threadId;
        }
      }
    } catch (e) {
      console.error('Failed to read cache:', e);
    }
    return null;
  };

  const cacheResult = (prompt: string, threadId: string) => {
    // Only cache if we have a userId to ensure user isolation
    if (!userId) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const cacheKey = getCacheKey(prompt, today, userId);
      const cacheValue = {
        threadId,
        prompt: prompt.trim(),
        date: today,
        timestamp: Date.now()
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheValue));
      setCacheHistory(loadCacheHistory());
    } catch (e) {
      console.error('Failed to cache result:', e);
    }
  };

  // Resolve agent thread and streaming messages to keep UI consistent with agent artifacts
  const streamingThread = useQuery(
    api.domains.agents.fastAgentPanelStreaming.getThreadByStreamId,
    threadId ? { threadId: threadId as Id<"chatThreadsStream"> } : "skip"
  ) as any;

  const agentThreadId = streamingThread?.agentThreadId as string | undefined;
  // MOCK DATA FOR TESTING
  const mockMessages = [
    {
      role: "assistant",
      text: `# Daily Dossier: Nuclear Fusion Breakthroughs

## Executive Summary
Recent developments in nuclear fusion have marked a significant turning point in the quest for limitless, clean energy. The National Ignition Facility (NIF) has reportedly achieved net energy gain for the second time, demonstrating reproducibility. Meanwhile, private investment in fusion startups has surged, with companies like Helion and CFS reporting major milestones.

## Key Developments

### 1. NIF Achieves Net Energy Gain Again
The US National Ignition Facility has repeated its historic ignition experiment, producing more energy from the fusion reaction than was consumed by the lasers.
*   **Impact**: Validates the scientific feasibility of inertial confinement fusion.
*   **Next Steps**: Focus on increasing yield and repetition rate.

### 2. Private Sector Momentum
*   **Helion Energy**: Announced target for grid deployment by 2028.
*   **Commonwealth Fusion Systems (CFS)**: Successfully tested high-temperature superconducting magnets.

## Market Analysis
The fusion energy market is projected to grow at a CAGR of 8.5% over the next decade. Venture capital funding has exceeded $5B in 2024 alone.

## Conclusion
While commercial fusion is still years away, the pace of innovation has accelerated dramatically.

> "Fusion is the holy grail of clean energy." - Industry Expert
`
    }
  ];

  const {
    results: realUiMessages = [],
    error: messagesError,
  } = (useUIMessages(
    api.domains.agents.fastAgentPanelStreaming.getThreadMessagesWithStreaming,
    agentThreadId ? { threadId: agentThreadId as Id<"chatThreadsStream"> } : "skip",
    { initialNumItems: 50, stream: true }
  ) as any) ?? { results: [] };

  // Use mock messages if we are in "test mode" (triggered by a specific prompt or just always for now)
  const isTestMode = true;
  const uiMessages = isTestMode ? mockMessages : realUiMessages;

  useEffect(() => {
    if (messagesError) {
      console.error("[WelcomeLanding] Failed to stream messages", messagesError);
    }
  }, [messagesError]);
  const handleSignIn = async () => {
    await signIn("google", { redirectTo: "/" });
  };

  // 1. Absolute latest message (for active status/reasoning)
  const latestAssistantMessage = useMemo(() => {
    if (!uiMessages || uiMessages.length === 0) return null;
    const latest = [...uiMessages]
      .reverse()
      .find((m: any) => (m.role ?? m?.message?.role) === "assistant");
    return latest || null;
  }, [uiMessages]);

  // 2. Latest message with text content (for persistent display of Dossier/Newsletter)
  const latestContentMessage = useMemo(() => {
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
      console.error("Error finding latest content message:", error);
      return null;
    }
  }, [uiMessages]);

  const latestAssistantText = useMemo(() => {
    const latest = latestContentMessage as any;
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
  }, [latestContentMessage]);

  const assistantTexts = useMemo(() => {
    if (!uiMessages) return [] as string[];

    return uiMessages
      .filter((msg: any) => (msg.role ?? msg?.message?.role) === "assistant")
      .map((msg: any) => {
        if (typeof msg.text === "string" && msg.text.trim()) return msg.text;
        if (typeof msg.content === "string" && msg.content.trim()) return msg.content;
        if (Array.isArray(msg.content)) {
          const parts = msg.content
            .filter((c: any) => typeof c?.text === "string")
            .map((c: any) => c.text)
            .join("\n\n");
          if (parts.trim()) return parts;
        }
        if (typeof msg.message?.text === "string" && msg.message.text.trim()) return msg.message.text;
        return "";
      })
      .filter(Boolean);
  }, [uiMessages]);

  const aggregatedAssistantText = assistantTexts.join("\n\n").trim();
  const responseText = aggregatedAssistantText || (typeof latestAssistantText === "string" ? latestAssistantText : "");

  // Track when we first receive a response to prevent flickering between views
  useEffect(() => {
    if (responseText && responseText.trim() && !hasReceivedResponse) {
      setHasReceivedResponse(true);
      setShowHero(false); // Switch to dossier view
    }
  }, [responseText, hasReceivedResponse]);

  useEffect(() => {
    setCacheHistory(loadCacheHistory());
  }, [userId]); // Reload cache history when user changes

  // Mark latest history item as done when new assistant text arrives (completion heuristic)
  useEffect(() => {
    if (!responseText) return;
    setFollowUpHistory((prev) => {
      if (!prev.length) return prev;
      const [latest, ...rest] = prev;
      if (latest.status === "done") return prev;
      return [{ ...latest, status: "done" as const }, ...rest];
    });
  }, [responseText]);

  // Tool parts for the Active Status (Reasoning Chain)
  const toolParts = useMemo(
    () => (latestAssistantMessage as any)?.parts?.filter?.((p: any) => p?.type?.startsWith?.("tool-")) ?? [],
    [latestAssistantMessage]
  );

  // Tool parts from Content Message (for Citations)
  const contentToolParts = useMemo(
    () => (latestContentMessage as any)?.parts?.filter?.((p: any) => p?.type?.startsWith?.("tool-")) ?? [],
    [latestContentMessage]
  );

  // Live events extraction REMOVED - events now shown inline in LiveDossierDocument
  // The LiveAgentTicker component in LiveDossierDocument handles real-time tool visualization

  const reasoningText = useMemo(
    () =>
      (latestAssistantMessage as any)?.parts
        ?.filter?.((p: any) => p.type === "reasoning")
        ?.map((p: any) => p.text)
        ?.join("\n") ?? "",
    [latestAssistantMessage]
  );

  // Extract media assets from the CONTENT message (persistent)
  const mediaAssets = useMemo(() => {
    if (!latestContentMessage) return [];

    try {
      return extractMediaFromMessages([latestContentMessage]);
    } catch (error) {
      console.error("[WelcomeLanding] Failed to extract media from messages", error);
      return [];
    }
  }, [latestContentMessage]);

  // Extract citations from CONTENT tool parts (persistent)
  const citations = useMemo(() => {
    try {
      if (!contentToolParts || contentToolParts.length === 0) return [];

      return contentToolParts
        .filter((p: any) => p?.type === "tool-result" && p?.toolName === "linkupSearch")
        .map((p: any) => {
          try {
            const output = p?.output?.value || p?.output || p?.result;
            if (typeof output !== "string") return [];

            const galleryRegex = /<!--\s*SOURCE_GALLERY_DATA\s*\n([\s\S]*?)\n-->/;
            const match = output.match(galleryRegex);
            if (!match || !match[1]) return [];

            const results = JSON.parse(match[1]);
            if (!Array.isArray(results)) return [];

            // Add source detection to each result
            return results.map((r: any) => {
              if (!r || typeof r !== 'object') return null;

              const domain = r.url ? new URL(r.url).hostname : undefined;
              let detectedSource = 'unknown';

              if (domain?.includes('ycombinator.com') || domain?.includes('news.ycombinator.com')) {
                detectedSource = 'ycombinator';
              } else if (domain?.includes('techcrunch.com')) {
                detectedSource = 'techcrunch';
              } else if (domain?.includes('reddit.com')) {
                detectedSource = 'reddit';
              } else if (domain?.includes('twitter.com') || domain?.includes('x.com')) {
                detectedSource = 'twitter';
              } else if (domain?.includes('github.com')) {
                detectedSource = 'github';
              } else if (domain?.includes('arxiv.org')) {
                detectedSource = 'arxiv';
              }

              return { ...r, source: detectedSource };
            }).filter(Boolean); // Remove null entries
          } catch (e) {
            console.error("Failed to parse citation:", e);
            return [];
          }
        })
        .flat()
        .slice(0, 10); // Increased to 10 citations
    } catch (error) {
      console.error("Error extracting citations:", error);
      return [];
    }
  }, [contentToolParts]);

  // Calculate source analytics
  const sourceAnalytics = useMemo(() => {
    const counts: Record<string, number> = {};
    citations.forEach((citation: any) => {
      const source = citation.source || 'unknown';
      counts[source] = (counts[source] || 0) + 1;
    });
    return counts;
  }, [citations]);

  const aggregatedMedia = useMemo<ExtractedMedia>(() => {
    const base: ExtractedMedia = sanitizeMedia(baseMedia);

    try {
      const dedupe = <T,>(items: T[], getKey: (item: T) => string | undefined) => {
        const map = new Map<string, T>();
        items.forEach((item) => {
          const key = getKey(item);
          if (!key) return;
          if (!map.has(key)) map.set(key, item);
        });
        return Array.from(map.values());
      };

      const collected = assistantTexts.reduce((acc, text) => {
        try {
          const media = extractMediaFromText(text);
          acc.youtubeVideos.push(...media.youtubeVideos);
          acc.secDocuments.push(...media.secDocuments);
          acc.webSources.push(...media.webSources);
          acc.profiles.push(...media.profiles);
          acc.images.push(...media.images);
        } catch (error) {
          console.error("[WelcomeLanding] Failed to parse media from text", error);
        }
        return acc;
      }, base);

      const citationSources = citations
        .map((c: any) => {
          if (!c?.url) return null;
          return {
            title: c.title || c.headline || c.url,
            url: c.url,
            favicon: c.favicon,
            source: c.source,
            publishedAt: c.date || c.publishedAt,
          };
        })
        .filter(Boolean);

      collected.webSources.push(...citationSources);

      const sanitized = sanitizeMedia({
        youtubeVideos: dedupe(collected.youtubeVideos, (v: any) => v.url || v.videoId),
        secDocuments: dedupe(collected.secDocuments, (doc: any) => doc.accessionNumber || doc.documentUrl),
        webSources: dedupe(collected.webSources, (source: any) => source.url || source.title),
        profiles: dedupe(collected.profiles, (profile: any) => profile.url || profile.name),
        images: dedupe(collected.images, (img: any) => img.url),
      });

      return sanitized;
    } catch (error) {
      console.error("[WelcomeLanding] Failed to aggregate media", error);
      return base;
    }
  }, [assistantTexts, citations]);

  const aggregatedDocumentActions = useMemo<DocumentAction[]>(() => {
    const dedupe = (docs: DocumentAction[]) => {
      const map = new Map<string, DocumentAction>();
      docs.forEach((doc) => {
        if (!map.has(doc.documentId)) map.set(doc.documentId, doc);
      });
      return Array.from(map.values());
    };

    try {
      const docs = assistantTexts.flatMap((text) => extractDocumentActions(text));
      return dedupe(sanitizeDocumentActions(docs));
    } catch (error) {
      console.error("[WelcomeLanding] Failed to extract document actions", error);
      return [];
    }
  }, [assistantTexts]);

  const totalArtifacts = aggregatedMedia.youtubeVideos.length +
    aggregatedMedia.secDocuments.length +
    aggregatedMedia.webSources.length +
    aggregatedMedia.profiles.length +
    aggregatedMedia.images.length +
    aggregatedDocumentActions.length;

  const toggleSource = (sourceId: string) => {
    setActiveSources(prev =>
      prev.includes(sourceId)
        ? prev.filter(id => id !== sourceId)
        : [...prev, sourceId]
    );
    setActivePreset(''); // Clear preset when manually toggling
  };

  const applyPreset = (presetId: string) => {
    const preset = SOURCE_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setActiveSources(preset.sources);
      setActivePreset(presetId);
    }
  };

  // Keyboard shortcuts for source toggling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘/Ctrl + 1-6 for source toggling
      if ((e.metaKey || e.ctrlKey) && e.key >= '1' && e.key <= '6') {
        e.preventDefault();
        const shortcutNum = parseInt(e.key);
        const source = SOURCES.find(s => s.keyboardShortcut === shortcutNum);
        if (source) {
          toggleSource(source.id);
        }
      }
      // ⌘/Ctrl + Shift + A for "All Sources" preset
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        applyPreset('all');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSources]);

  // Function to reset back to search view
  const handleBackToSearch = () => {
    setShowHero(true);
    // Keep threadId so we can navigate back to results
  };

  // Function to view last results
  const handleViewLastResults = () => {
    setShowHero(false);
  };

  const handleRunPrompt = async (
    promptOverride?: string,
    options?: { appendToThread?: boolean; mode?: "quick" | "deep" }
  ) => {
    const promptToRun = promptOverride || researchPrompt;
    const selectedMode = options?.mode || researchMode;
    setResearchMode(selectedMode);

    if (promptOverride) {
      setResearchPrompt(promptOverride);
    }

    if (!promptToRun.trim()) {
      console.warn("[WelcomeLanding] Ignoring empty prompt");
      return;
    }

    const preferAppend = options?.appendToThread ?? (followUpMode === "append");
    const shouldAppendToExisting = Boolean(preferAppend && threadId);

    // Track history entry
    setFollowUpHistory((prev) => [
      {
        prompt: promptToRun,
        mode: (preferAppend ? "append" : "new") as "append" | "new",
        status: "queued" as const,
        timestamp: Date.now()
      },
      ...prev
    ].slice(0, 5));

    const modeInstruction = selectedMode === "deep"
      ? "Create a comprehensive research dossier with cross-verified sources, SEC/filing checks, and section-level confidence scores."
      : "Produce a concise quick brief (30-second read) with the top 3-5 findings, key numbers, and the sources used.";

    if (shouldAppendToExisting && threadId) {
      if (!isAuthenticated) {
        await handleSignIn();
        return;
      }

      setIsRunning(true);
      setShowHero(false);
      setHasReceivedResponse(true); // keep the current dossier visible while enriching
      setIsFromCache(false);

      try {
        await sendStreaming({
          threadId: threadId as Id<"chatThreadsStream">,
          prompt: `${promptToRun}\n\n${modeInstruction}`,
        });
      } catch (error) {
        console.error("Failed to run follow-up prompt:", error);
        setIsRunning(false);
      }
      return;
    }

    if (preferAppend && !threadId) {
      console.warn("[WelcomeLanding] Follow-up requested with no active thread; starting a new thread instead.");
    }

    // Check cache first - works for both authenticated and anonymous users
    const cachedThreadId = getCachedResult(promptToRun);
    if (cachedThreadId) {
      console.log('✨ Loading cached results for:', promptToRun);
      setThreadId(cachedThreadId);
      setShowHero(false);
      setHasReceivedResponse(true);
      setIsFromCache(true);
      setIsRunning(false);
      return; // Skip API call entirely
    }

    // No cache hit, proceed with normal search
    if (!isAuthenticated && !isTestMode) {
      await handleSignIn();
      return;
    }

    setIsRunning(true);
    setShowHero(false); // Switch to dossier view immediately
    setHasReceivedResponse(false);
    setIsFromCache(false);

    if (isTestMode) {
      setHasReceivedResponse(true);
      // Simulate delay
      setTimeout(() => setIsRunning(false), 2000);
      return;
    }

    try {
      const newThreadId = await createThread({
        title: promptToRun.slice(0, 120) || "Research Thread",
      });
      setThreadId(newThreadId);

      // Cache the threadId for this prompt
      cacheResult(promptToRun, newThreadId);

      // Build prompt with source filters and intent
      let enhancedPrompt = `${promptToRun}\n\n${modeInstruction}`;
      if (activeSources.length > 0) {
        const sourceNames = activeSources
          .map((s) => {
            const source = SOURCES.find(src => src.id === s);
            return source ? source.name : s;
          })
          .join(', ');
        enhancedPrompt = `${enhancedPrompt}\n\nPrioritize these sources: ${sourceNames}.`;
      }

      await sendStreaming({
        threadId: newThreadId,
        prompt: enhancedPrompt,
      });
      // setIsRunning(false) is handled by the useEffect when content arrives
    } catch (error) {
      console.error("Failed to run prompt:", error);
      setIsRunning(false);
    }
  };

  // Turn off loading once an assistant message arrives
  useEffect(() => {
    if (isRunning && latestAssistantText) {
      setIsRunning(false);
    }
  }, [isRunning, latestAssistantText]);

  // Thought Stream Ticker Component
  function ThoughtStreamTicker({ isActive }: { isActive: boolean }) {
    const [currentStep, setCurrentStep] = useState(0);

    const steps = [
      "Reading TechCrunch...",
      "Parsing PDF attachments...",
      "Cross-referencing Q3 financials...",
      "Synthesizing Dossier..."
    ];

    useEffect(() => {
      if (!isActive) return;

      const interval = setInterval(() => {
        setCurrentStep((prev) => (prev + 1) % steps.length);
      }, 800);

      return () => clearInterval(interval);
    }, [isActive]);

    if (!isActive) return null;

    return (
      <div className="max-w-3xl mx-auto mt-2 px-2">
        <div className="text-[11px] font-mono text-gray-800 animate-pulse">
          &gt; {steps[currentStep]}
        </div>
      </div>
    );
  }

  // Trust Badge Component
  function TrustBadge({ score }: { score: number }) {
    const getColor = (score: number) => {
      if (score >= 90) return 'text-green-600 bg-green-50 border-green-200';
      if (score >= 75) return 'text-blue-600 bg-blue-50 border-blue-200';
      return 'text-amber-600 bg-amber-50 border-amber-200';
    };

    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${getColor(score)} tabular-nums`}>
        {score}%
      </span>
    );
  }

  // Freshness Badge Component
  function FreshnessBadge({ freshness }: { freshness: 'realtime' | 'hourly' | 'daily' }) {
    const getStyle = (freshness: string) => {
      switch (freshness) {
        case 'realtime':
          return 'text-red-600 bg-red-50 border-red-200';
        case 'hourly':
          return 'text-orange-600 bg-orange-50 border-orange-200';
        case 'daily':
          return 'text-gray-600 bg-gray-50 border-gray-200';
        default:
          return 'text-gray-600 bg-gray-50 border-gray-200';
      }
    };

    const getLabel = (freshness: string) => {
      switch (freshness) {
        case 'realtime':
          return 'Live';
        case 'hourly':
          return '1h';
        case 'daily':
          return '24h';
        default:
          return freshness;
      }
    };

    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold border ${getStyle(freshness)}`}>
        {getLabel(freshness)}
      </span>
    );
  }

  // Sidebar Item Component
  function SidebarItem({
    icon,
    title,
    time,
    active = false,
    isLive = false,
    onClick,
    activityCount = 0,
    isQuerying = false,
  }: {
    icon: React.ReactNode;
    title: React.ReactNode;
    time: React.ReactNode;
    active?: boolean;
    isLive?: boolean;
    onClick?: () => void;
    activityCount?: number;
    isQuerying?: boolean;
  }) {
    return (
      <div
        onClick={onClick}
        className={`group relative flex items-center justify-between py-2 pl-3 pr-2.5 rounded-lg cursor-pointer transition-colors ${active
          ? 'bg-gray-100'
          : 'hover:bg-gray-50'
          } ${onClick ? 'select-none' : ''}`}
      >
        {/* Left side: Icon + Name */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`shrink-0 transition-opacity ${active ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'}`}>
            {icon}
          </div>
          <div className={`text-sm font-medium truncate transition-colors ${active ? 'text-gray-900' : 'text-gray-600 group-hover:text-gray-900'}`}>
            {title}
          </div>
        </div>

        {/* Right side: Trust Badge + Live Indicator */}
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {/* This renders the TrustBadge component passed as 'time' prop */}
          {time}

          {/* Activity badges */}
          {activityCount > 0 && (
            <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
              {activityCount} hit{activityCount > 1 ? 's' : ''}
            </span>
          )}
          {isQuerying && (
            <span className="text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
              Running
            </span>
          )}

          {/* The Live Dot - Enhanced animation */}
          {isLive && !isQuerying && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
          )}
        </div>
      </div>
    );
  }

  // Executive Summary Component
  function ExecutiveSummaryBlock() {
    return (
      <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 mb-8 relative overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Executive Brief</h3>
          <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-1 rounded-full border border-green-200">
            96% Confidence
          </span>
        </div>
        <ul className="space-y-3">
          <li className="flex gap-3 text-slate-800">
            <span className="text-blue-500 mt-1">✦</span>
            <p className="text-sm leading-relaxed">
              <span className="font-semibold">Market Shift:</span> Capital is rotating rapidly from SaaS to AI Infrastructure platforms.
            </p>
          </li>
          <li className="flex gap-3 text-slate-800">
            <span className="text-blue-500 mt-1">✦</span>
            <p className="text-sm leading-relaxed">
              <span className="font-semibold">Funding Velocity:</span> Q3 saw 42 deals totaling $1.2B, up 14% from Q2.
            </p>
          </li>
          <li className="flex gap-3 text-slate-800">
            <span className="text-blue-500 mt-1">✦</span>
            <p className="text-sm leading-relaxed">
              <span className="font-semibold">Risk Alert:</span> Regulatory scrutiny on compute infrastructure increasing in EU.
            </p>
          </li>
        </ul>
      </div>
    );
  }

  // Stat Card Component
  function StatCard({ label, value, change, trend }: {
    label: string;
    value: string;
    change: string;
    trend: 'up' | 'down' | 'flat';
  }) {
    const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-500';
    const trendSymbol = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';

    return (
      <div className="border border-gray-100 shadow-sm rounded-lg p-4 flex flex-col items-center text-center">
        <span className="text-xs text-gray-400 uppercase">{label}</span>
        <span className="text-2xl font-serif font-medium text-gray-900 mt-1">{value}</span>
        <span className={`text-xs mt-1 ${trendColor}`}>{trendSymbol} {change}</span>
      </div>
    );
  }

  // Citation Tooltip Component
  function CitationTooltip({ number, title, domain, url }: {
    number: number;
    title: string;
    domain?: string;
    url: string;
  }) {
    const [isVisible, setIsVisible] = useState(false);

    return (
      <span className="relative inline-block">
        <sup
          className="text-blue-600 hover:text-blue-700 cursor-pointer font-medium text-xs mx-0.5"
          onMouseEnter={() => setIsVisible(true)}
          onMouseLeave={() => setIsVisible(false)}
        >
          [{number}]
        </sup>
        {isVisible && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-white border border-gray-200 shadow-xl rounded-lg p-3 z-50 animate-in fade-in duration-150">
            <div className="text-xs font-semibold text-gray-900 mb-1 line-clamp-2">{title}</div>
            {domain && <div className="text-[10px] text-gray-500 mb-2">{domain}</div>}
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline">
              View Source →
            </a>
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white" />
          </div>
        )}
      </span>
    );
  }

  // Typewriter Effect Hook
  function useTypewriter(text: string, speed: number = 20) {
    const [displayedText, setDisplayedText] = useState("");
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
      if (!text) {
        setDisplayedText("");
        setIsComplete(false);
        return;
      }

      setDisplayedText("");
      setIsComplete(false);
      let index = 0;

      const timer = setInterval(() => {
        if (index < text.length) {
          setDisplayedText(text.slice(0, index + 1));
          index++;
        } else {
          setIsComplete(true);
          clearInterval(timer);
        }
      }, speed);

      return () => clearInterval(timer);
    }, [text, speed]);

    return { displayedText, isComplete };
  }

  // Collapsible Reasoning Chain Component with Metrics
  function CollapsibleReasoningChain({ steps, metrics }: { steps: any[]; metrics?: WorkflowMetrics }) {
    const [isExpanded, setIsExpanded] = useState(false);

    const stepIcons: Record<string, string> = {
      'search': '🔍',
      'read': '📄',
      'analyze': '🧠',
      'write': '✍️',
      'tool': '🔧',
      'delegate': '👥'
    };

    const getStepIcon = (stepName: string) => {
      const name = stepName.toLowerCase();
      if (name.includes('search')) return stepIcons.search;
      if (name.includes('read')) return stepIcons.read;
      if (name.includes('analyz')) return stepIcons.analyze;
      if (name.includes('writ')) return stepIcons.write;
      if (name.includes('delegate')) return stepIcons.delegate;
      return stepIcons.tool;
    };

    // Derive metrics from steps if not provided
    const derivedMetrics = useMemo(() => {
      if (metrics) return metrics;

      // Extract metrics from tool parts
      const toolNames = steps
        .filter(s => s.toolName || s.name)
        .map(s => s.toolName || s.name);

      const agentNames = steps
        .filter(s => (s.toolName || s.name || '').toLowerCase().includes('delegate'))
        .map(s => {
          const name = s.toolName || s.name || '';
          const match = name.match(/delegateTo(\w+)/i);
          return match ? match[1] : 'Agent';
        });

      return {
        sourcesExplored: steps.filter(s =>
          (s.toolName || s.name || '').toLowerCase().includes('search')
        ).length,
        toolsUsed: [...new Set(toolNames)],
        agentsCalled: [...new Set(agentNames)],
      };
    }, [steps, metrics]);

    if (!steps || steps.length === 0) return null;

    const uniqueTools = [...new Set(derivedMetrics.toolsUsed)];
    const uniqueAgents = [...new Set(derivedMetrics.agentsCalled)];

    return (
      <div className="my-6 border border-gray-200 rounded-lg overflow-hidden">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">Reasoning Chain</span>
            {/* Clean metrics display */}
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span>{derivedMetrics.sourcesExplored} sources</span>
              <span className="text-gray-300">•</span>
              <span>{uniqueTools.length} tools</span>
              <span className="text-gray-300">•</span>
              <span>{uniqueAgents.length} agents</span>
            </div>
          </div>
          <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </button>
        {isExpanded && (
          <div className="p-4 bg-white">
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />
              <div className="space-y-4">
                {steps.map((step, idx) => (
                  <div key={idx} className="relative flex gap-3 pl-2">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm z-10">
                      {getStepIcon(step.name || step.toolName || '')}
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="text-sm font-medium text-gray-900">{step.name || step.toolName || 'Processing'}</div>
                      {step.description && (
                        <div className="text-xs text-gray-600 mt-1">{step.description}</div>
                      )}
                      <div className="text-[10px] text-gray-400 mt-1 font-mono">
                        {step.status === 'success' ? '✓ Complete' : step.status === 'error' ? '✗ Failed' : '⋯ Running'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Main Render - Persistent Layout
  return (
    <>
      {/* Custom Scrollbar Styling */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&display=swap');
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #E5E7EB;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #D1D5DB;
        }
      `}</style>

      <div className="flex h-screen bg-[#FAFAFA] font-sans selection:bg-blue-100 overflow-hidden">

        {/* PERSISTENT SIDEBAR */}
        <aside className="w-64 bg-[#FBFBFB] border-r border-gray-200 flex flex-col shrink-0 z-30">
          {/* Logo Area */}
          <div className="h-16 flex items-center px-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center shadow-lg shadow-black/10">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900 tracking-tight">Nodebench AI</span>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6 custom-scrollbar">
            {/* Main Nav */}
            <div className="space-y-1">
              <div className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Workspace</div>
              <SidebarItem icon={<Layout className="w-4 h-4" />} title="Dashboard" time="" active onClick={onEnterWorkspace} />
              <SidebarItem icon={<Clock className="w-4 h-4" />} title="Recent Research" time="" onClick={onEnterWorkspace} />
              <SidebarItem icon={<FileText className="w-4 h-4" />} title="Saved Dossiers" time="" onClick={onEnterWorkspace} />
            </div>

            {/* Live Sources */}
            <div className="space-y-1">
              <div className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex justify-between items-center">
                <span>Live Sources</span>
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              </div>
              {SOURCES.map(source => (
                <SidebarItem
                  key={source.id}
                  icon={<span className={`font-bold ${source.color}`}>{source.icon}</span>}
                  title={source.name}
                  time={<TrustBadge score={source.trustScore} />}
                  active={activeSources.includes(source.id)}
                  onClick={() => toggleSource(source.id)}
                  isLive={source.freshness === 'realtime'}
                  activityCount={sourceAnalytics[source.id] || 0}
                  isQuerying={isRunning && activeSources.includes(source.id)}
                />
              ))}
            </div>
          </div>

          {/* User Profile */}
          <div className="p-4 border-t border-gray-200 bg-white">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-xs">
                  {user?.name?.charAt(0) || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{user?.name || "User"}</div>
                  <div className="text-xs text-gray-500 truncate">Pro Plan</div>
                </div>
              </div>
            ) : (
              <button
                onClick={handleSignIn}
                className="w-full py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 flex flex-col relative min-w-0 bg-white">

          {/* PERSISTENT HEADER */}
          <header className="h-16 border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              {/* Breadcrumbs or Title */}
              <div className="flex items-center text-sm text-gray-500">
                <span>Research</span>
                <ChevronRight className="w-4 h-4 mx-1" />
                <span className="text-gray-900 font-medium">
                  {activeTab === 'dossier' ? 'Live Dossier' : activeTab === 'newsletter' ? 'Newsletter' : 'Media Gallery'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {!showHero && (
                <>
                  <button
                    onClick={handleBackToSearch}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                    Back to Search
                  </button>
                  <div className="h-4 w-px bg-gray-200"></div>
                </>
              )}
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <Search className="w-4 h-4" />
              </button>
              <div className="h-4 w-px bg-gray-200"></div>
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <Filter className="w-4 h-4" />
              </button>
              {/* Live Events Toggle - REMOVED (events now inline in LiveDossierDocument) */}
            </div>
          </header>

          {/* CONTENT + EVENTS PANEL CONTAINER */}
          <div className="flex-1 flex overflow-hidden">
            {/* SCROLLABLE CANVAS */}
            <main className="flex-1 overflow-y-auto custom-scrollbar relative">

              {/* CONDITIONAL CONTENT: HERO vs ACTIVE */}
              {showHero ? (
                // HERO STATE
                <div className="min-h-full flex flex-col items-center justify-center p-8 pb-32">
                  <div className="max-w-2xl w-full text-center space-y-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-900/5 text-gray-900 rounded-full text-xs font-medium border border-gray-200 mb-4">
                      <Sparkles className="w-3 h-3" />
                      <span>New: Multi-source Verification Engine</span>
                    </div>

                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900">
                      Research at the Speed of <span className="underline decoration-gray-900/50 decoration-4 underline-offset-8">Thought.</span>
                    </h1>

                    <p className="text-lg text-gray-600 max-w-xl mx-auto">
                      Access real-time intelligence from trusted sources. Generate briefings, analyze trends, and verify facts in seconds.
                    </p>

                    <div className="pt-8 w-full max-w-xl mx-auto">
                      <MagicInputContainer
                        onRun={(prompt, opts) => handleRunPrompt(prompt, { mode: opts?.mode || researchMode })}
                        onDeepRun={(prompt) => handleRunPrompt(prompt, { mode: "deep" })}
                        defaultValue={researchPrompt}
                        mode={researchMode}
                      />

                      <div className="mt-6 flex gap-3 justify-center">
                        {[
                          {
                            id: "quick",
                            title: "⚡ Quick Brief",
                            description: "30-second answer, key facts only",
                            mode: "quick" as const,
                          },
                          {
                            id: "deep",
                            title: "🔬 Deep Dossier",
                            description: "Comprehensive research with cross-verification",
                            mode: "deep" as const,
                          },
                        ].map((intent) => {
                          const isActive = researchMode === intent.mode;
                          return (
                            <button
                              key={intent.id}
                              type="button"
                              onClick={() => handleRunPrompt(undefined, { mode: intent.mode })}
                              className={`relative text-center rounded-lg border px-6 py-3 transition-all ${isActive
                                ? "border-gray-900 bg-gray-900 text-white shadow-sm"
                                : "border-gray-200 bg-white hover:border-gray-300"
                                }`}
                            >
                              <div className="text-sm font-semibold">{intent.title}</div>
                              <p className={`mt-1 text-xs ${isActive ? "text-gray-300" : "text-gray-500"}`}>
                                {intent.description}
                              </p>
                            </button>
                          );
                        })}
                      </div>

                      {/* Source Category Pills - Simplified */}
                      <div className="flex flex-wrap justify-center gap-2 mt-6">
                        {SOURCE_PRESETS.map(preset => (
                          <button
                            key={preset.id}
                            onClick={() => applyPreset(preset.id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium border transition-all ${activePreset === preset.id
                              ? 'bg-gray-900 text-white border-gray-900'
                              : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                              }`}
                          >
                            <span>{preset.icon}</span>
                            <span>{preset.name}</span>
                          </button>
                        ))}
                      </div>

                      {/* View Last Results Button */}
                      {threadId && hasReceivedResponse && (
                        <div className="mt-6">
                          <button
                            onClick={handleViewLastResults}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors border border-blue-200"
                          >
                            <Clock className="w-4 h-4" />
                            View Last Results
                          </button>
                        </div>
                      )}

                      {cacheHistory.length > 0 && (
                        <div className="mt-8 text-left">
                          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recent searches</div>
                          <div className="space-y-2">
                            {cacheHistory.map((entry, idx) => (
                              <button
                                key={`${entry.threadId}-${idx}`}
                                onClick={() => {
                                  setThreadId(entry.threadId);
                                  setShowHero(false);
                                  setHasReceivedResponse(true);
                                  setIsFromCache(true);
                                  setIsRunning(false);
                                }}
                                className="w-full text-left px-3 py-2 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors"
                              >
                                <div className="text-sm font-medium text-gray-900 line-clamp-1">{entry.prompt}</div>
                                <div className="text-[11px] text-gray-500">Cached: {entry.date}</div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                // ACTIVE DOSSIER STATE
                <div className="min-h-full bg-gray-50/50">
                  {/* Sticky Input Bar for Active State */}
                  <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-200 py-3 px-6 shadow-sm">
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <MagicInputContainer
                            onRun={(prompt, opts) => handleRunPrompt(prompt, { mode: opts?.mode || researchMode })}
                            onDeepRun={(prompt) => handleRunPrompt(prompt, { mode: "deep", appendToThread: followUpMode === "append" })}
                            compact={true}
                            defaultValue={researchPrompt}
                            mode={researchMode}
                          />
                        </div>
                        {/* Unified Action Button with Mode Toggle */}
                        <div className="flex items-center">
                          <button
                            type="button"
                            onClick={() => handleRunPrompt(undefined, { appendToThread: followUpMode === "append" })}
                            disabled={isRunning}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-l-full border-y border-l text-xs font-semibold transition-colors whitespace-nowrap ${isRunning
                              ? "bg-black text-white border-black cursor-wait"
                              : "bg-black text-white border-black hover:bg-gray-800"
                              }`}
                            title={followUpMode === "append" ? "Add findings to current dossier" : "Replace with fresh results"}
                          >
                            <span className={`h-2 w-2 rounded-full ${isRunning ? "bg-white animate-pulse" : "bg-white"}`} />
                            {isRunning ? "Running…" : (followUpMode === "append" ? "Add to Dossier" : "Replace Dossier")}
                          </button>
                          {/* Mode Dropdown */}
                          <div className="relative group">
                            <button
                              type="button"
                              className="inline-flex items-center px-2 py-2 rounded-r-full border border-l-0 border-black bg-black text-white hover:bg-gray-800 transition-colors"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 min-w-[140px]">
                              <button
                                type="button"
                                onClick={() => setFollowUpMode("append")}
                                className={`w-full px-3 py-2 text-left text-xs hover:bg-gray-50 rounded-t-lg flex items-center gap-2 ${followUpMode === "append" ? "bg-gray-100 font-semibold" : ""}`}
                              >
                                <span className={`w-2 h-2 rounded-full ${followUpMode === "append" ? "bg-black" : "bg-gray-300"}`} />
                                Append
                              </button>
                              <button
                                type="button"
                                onClick={() => setFollowUpMode("new")}
                                className={`w-full px-3 py-2 text-left text-xs hover:bg-gray-50 rounded-b-lg flex items-center gap-2 ${followUpMode === "new" ? "bg-gray-100 font-semibold" : ""}`}
                              >
                                <span className={`w-2 h-2 rounded-full ${followUpMode === "new" ? "bg-black" : "bg-gray-300"}`} />
                                Replace
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      <ThoughtStreamTicker isActive={isRunning} />
                    </div>

                    {/* Cache Indicator */}
                    {isFromCache && (
                      <div className="max-w-4xl mx-auto mt-2 px-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-900/5 text-gray-900 text-xs font-medium rounded-full border border-gray-200">
                          <Zap className="w-3 h-3 text-gray-900" />
                          Loaded from cache (instant results)
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="max-w-5xl mx-auto p-6 md:p-8 space-y-8">
                    {/* Follow-up history drawer (compact) */}
                    {followUpHistory.length > 0 && (
                      <div className="flex flex-col gap-2 p-3 border border-gray-200 rounded-lg bg-white shadow-sm">
                        <div className="flex items-center justify-between text-xs font-semibold text-gray-600 uppercase tracking-wide">
                          <span>Follow-up history</span>
                          <span className="text-[11px] text-gray-500">Last {followUpHistory.length}</span>
                        </div>
                        <div className="space-y-1">
                          {followUpHistory.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs text-gray-700">
                              <div className="flex items-center gap-2">
                                <span className={`h-2 w-2 rounded-full ${item.status === "done" ? "bg-black" : "bg-gray-700 animate-pulse"}`} />
                                <span className="font-medium">{item.mode === "append" ? "Add to Dossier" : "Replace"}</span>
                              </div>
                              <div className="flex-1 mx-2 truncate text-gray-900">{item.prompt}</div>
                              <span className="text-[11px] text-gray-500">{new Date(item.timestamp).toLocaleTimeString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Tabs */}
                    <div className="flex border-b border-gray-200 mb-8">
                      <button
                        onClick={() => setActiveTab('dossier')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'dossier' ? 'border-black text-black' : 'border-transparent text-gray-600 hover:text-gray-800'
                          }`}
                      >
                        Live Dossier
                      </button>
                      <button
                        onClick={() => setActiveTab('newsletter')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'newsletter' ? 'border-black text-black' : 'border-transparent text-gray-600 hover:text-gray-800'
                          }`}
                      >
                        Newsletter Preview
                      </button>
                      <button
                        onClick={() => setActiveTab('media')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'media' ? 'border-black text-black' : 'border-transparent text-gray-600 hover:text-gray-800'
                          }`}
                      >
                        Media Gallery <span className="ml-1 bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full text-xs">{mediaAssets.length}</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('artifacts')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'artifacts' ? 'border-black text-black' : 'border-transparent text-gray-600 hover:text-gray-800'
                          }`}
                      >
                        Artifacts <span className="ml-1 bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full text-xs">{totalArtifacts}</span>
                      </button>
                    </div>

                    {/* View Content */}
                    {activeTab === 'dossier' && (<div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                      {/* Executive Summary Block (Only show if we have some content) */}
                      {citations.length > 0 && <ExecutiveSummaryBlock />}

                      {/* Reasoning Chain */}
                      <CollapsibleReasoningChain steps={toolParts} />

                      {/* The Main Document */}
                      <LiveDossierDocument
                        threadId={threadId}
                        isLoading={isRunning || (hasReceivedResponse && !responseText)}
                        onRunFollowUp={(query) => handleRunPrompt(query, { appendToThread: true })}
                      />
                    </div>
                    )}

                    {activeTab === 'newsletter' && (
                      <MockNewsletterView
                        responseText={responseText}
                        isLoading={isRunning || (hasReceivedResponse && !responseText)}
                        mediaAssets={mediaAssets}
                        citations={citations}
                        sourceAnalytics={sourceAnalytics}
                      />
                    )}

                    {activeTab === 'media' && (
                      <MockMediaView
                        mediaAssets={mediaAssets}
                        aggregatedMedia={aggregatedMedia}
                        onGenerateVisualization={() =>
                          handleRunPrompt(
                            "Create a funding comparison chart for the mentioned companies and pull any logos or screenshots that support the findings.",
                            { appendToThread: true, mode: "deep" }
                          )
                        }
                      />
                    )}

                    {activeTab === 'artifacts' && (
                      <LandingArtifactsView
                        media={aggregatedMedia}
                        documents={aggregatedDocumentActions}
                        hasThread={Boolean(threadId)}
                        onDocumentSelect={onDocumentSelect}
                        onGenerateArtifact={() =>
                          handleRunPrompt(
                            "Generate a CSV of key funding or filing data and produce a PDF-ready executive summary with citations.",
                            { appendToThread: Boolean(threadId), mode: "deep" }
                          )
                        }
                        onStartResearch={() => handleRunPrompt(undefined, { appendToThread: false, mode: researchMode })}
                      />
                    )}
                  </div>
                </div>
              )}
            </main>

            {/* LIVE EVENTS PANEL - REMOVED (events now inline in LiveDossierDocument) */}
          </div>
        </div>
      </div>
    </>
  );
}

class LandingErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: Error }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[WelcomeLanding] Render failure", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
          <div className="max-w-md w-full bg-white border border-gray-200 rounded-xl shadow-sm p-6 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-red-50 border border-red-100 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Something went wrong</h2>
            <p className="text-sm text-gray-600">
              The welcome landing hit an unexpected error while composing the newsletter. Try reloading, or rerun your query.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                onClick={() => window.location.reload()}
              >
                Reload
              </button>
              <button
                className="px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-900 transition-colors"
                onClick={() => this.setState({ hasError: false, error: undefined })}
              >
                Return
              </button>
            </div>
            {this.state.error && (
              <pre className="text-left text-xs text-gray-500 bg-gray-50 rounded-lg p-3 overflow-auto max-h-40 border border-gray-100">
                {this.state.error?.message}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children as React.ReactElement;
  }
}

export default function WelcomeLanding(props: WelcomeLandingProps) {
  return (
    <LandingErrorBoundary>
      <WelcomeLandingInner {...props} />
    </LandingErrorBoundary>
  );
}

// --- Mock Views for Tabs ---

function MockNewsletterView({
  responseText,
  isLoading,
  mediaAssets = [],
  citations = [],
  sourceAnalytics = {},
}: {
  responseText?: string;
  isLoading?: boolean;
  mediaAssets?: ExtractedAsset[];
  citations?: any[];
  sourceAnalytics?: Record<string, number>;
}) {
  // Loading state
  if (isLoading && !responseText) {
    return (
      <div className="mx-auto max-w-3xl bg-white shadow-sm min-h-full border border-gray-200/60 p-20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center animate-pulse">
            <Layout className="w-6 h-6 text-blue-600" />
          </div>
          <p className="text-sm font-medium text-gray-600">Formatting newsletter...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl bg-white shadow-sm min-h-full border border-gray-200/60">
      {/* Email Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-10 text-center">
        <div className="inline-flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-white/90 text-sm font-medium tracking-wide">NODEBENCH INSIGHTS</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Your Research Digest
        </h1>
        <p className="text-blue-100 text-sm">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {/* Email Body */}
      <div className="px-8 py-8 space-y-6">
        {/* Main Content - Rendered as Markdown */}
        <div className="prose prose-sm max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-p:text-gray-600 prose-p:leading-relaxed prose-li:text-gray-600 prose-strong:text-gray-900">
          <ReactMarkdown
            components={{
              h1: ({ children }) => <h2 className="text-xl font-bold text-gray-900 mt-6 mb-3">{children}</h2>,
              h2: ({ children }) => <h3 className="text-lg font-semibold text-gray-900 mt-5 mb-2">{children}</h3>,
              h3: ({ children }) => <h4 className="text-base font-semibold text-gray-800 mt-4 mb-2">{children}</h4>,
              p: ({ children }) => <p className="text-gray-600 leading-relaxed text-[15px] mb-3">{children}</p>,
              ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-3">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-3">{children}</ol>,
              li: ({ children }) => <li className="text-gray-600 text-[15px]">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {children}
                </a>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-blue-300 pl-4 py-1 my-3 bg-blue-50/50 italic text-gray-700">
                  {children}
                </blockquote>
              ),
            }}
          >
            {responseText || ''}
          </ReactMarkdown>
        </div>

        {/* Featured Media */}
        {mediaAssets.length > 0 && (
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide">Featured Research</h3>
            <div className="grid grid-cols-2 gap-3">
              {mediaAssets.slice(0, 4).map((asset, idx) => (
                <a
                  key={idx}
                  href={asset.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group border border-gray-200 rounded-lg overflow-hidden hover:border-blue-300 transition-colors"
                >
                  {asset.thumbnail && (
                    <div className="aspect-video bg-gray-100 overflow-hidden">
                      <img
                        src={asset.thumbnail}
                        alt={asset.title || 'Asset'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <div className="p-3 bg-white">
                    <p className="text-xs font-medium text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {asset.title || 'View Asset'}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Citations */}
        {citations.length > 0 && (
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Sources</h3>
              {/* SourceAnalytics component removed/inline if needed, or assume it's defined elsewhere. 
                  Wait, previous code had SourceAnalytics. I should keep it or mock it. 
                  The previous code had a missing SourceAnalytics definition error. 
                  I will inline a simple one here to be safe. */}
              <div className="flex gap-1">
                {Object.entries(sourceAnalytics).map(([source, count]) => (
                  <span key={source} className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                    {source}: {count}
                  </span>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              {citations.map((citation: any, idx) => {
                const source = SOURCES.find(s => s.id === citation.source);
                return (
                  <a
                    key={idx}
                    href={citation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2 text-xs text-blue-600 hover:text-blue-800 hover:underline group"
                  >
                    <span className="text-gray-400 font-mono">[{idx + 1}]</span>
                    <span className="flex-1">{citation.title}</span>
                    {source && (
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${source.activeBgColor} ${source.color} opacity-0 group-hover:opacity-100 transition-opacity`}>
                        {source.shortName}
                      </span>
                    )}
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Email Footer */}
      <div className="bg-gray-50 px-8 py-6 border-t border-gray-200 text-center">
        <p className="text-xs text-gray-500 mb-2">
          Generated by Nodebench AI • Research made simple
        </p>
        <div className="flex items-center justify-center gap-4 text-[10px] text-gray-400">
          <span>Privacy Policy</span>
          <span>•</span>
          <span>Unsubscribe</span>
        </div>
      </div>
    </div>
  );
}

function MockMediaView({
  mediaAssets,
  aggregatedMedia,
  onGenerateVisualization
}: {
  mediaAssets: ExtractedAsset[];
  aggregatedMedia?: ExtractedMedia;
  onGenerateVisualization?: () => void;
}) {
  // Calculate total media count from both sources
  const totalCount = mediaAssets.length +
    (aggregatedMedia?.youtubeVideos.length || 0) +
    (aggregatedMedia?.images.length || 0) +
    (aggregatedMedia?.webSources.length || 0) +
    (aggregatedMedia?.profiles.length || 0);

  if (totalCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500 border-2 border-dashed border-gray-200 rounded-xl space-y-3 bg-white">
        <ImageIcon className="w-8 h-8 opacity-50" />
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-gray-900">No visuals captured yet.</p>
          <p className="text-xs text-gray-500">Ask the agent to pull charts, screenshots, or logos from the sources.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onGenerateVisualization}
            className="px-3 py-1.5 text-xs rounded-lg bg-gray-900 text-white hover:bg-black transition-colors"
          >
            Generate visualization
          </button>
          <button
            type="button"
            onClick={onGenerateVisualization}
            className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Capture screenshots
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="flex items-center gap-4 text-xs text-gray-500 border-b border-gray-200 pb-3">
        <span className="font-semibold text-gray-900">Media Gallery</span>
        <span>{aggregatedMedia?.youtubeVideos.length || 0} videos</span>
        <span>•</span>
        <span>{aggregatedMedia?.images.length || mediaAssets.length} images</span>
        <span>•</span>
        <span>{aggregatedMedia?.webSources.length || 0} sources</span>
        <span>•</span>
        <span>{aggregatedMedia?.profiles.length || 0} profiles</span>
      </div>

      {/* YouTube Videos Section */}
      {aggregatedMedia?.youtubeVideos && aggregatedMedia.youtubeVideos.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Videos ({aggregatedMedia.youtubeVideos.length})</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {aggregatedMedia.youtubeVideos.map((video, idx) => (
              <a
                key={idx}
                href={video.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative aspect-video bg-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all"
              >
                <img
                  src={video.thumbnail || `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`}
                  alt={video.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-3">
                  <p className="text-white text-sm font-medium line-clamp-2">{video.title}</p>
                  <p className="text-white/70 text-xs mt-1">{video.channel}</p>
                </div>
                {/* Play button overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all">
                    <svg className="w-5 h-5 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Images Section */}
      {((aggregatedMedia?.images && aggregatedMedia.images.length > 0) || mediaAssets.length > 0) && (
        <div>
          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Images ({(aggregatedMedia?.images.length || 0) + mediaAssets.length})
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* From aggregated media */}
            {aggregatedMedia?.images.map((img, idx) => (
              <a
                key={`agg-${idx}`}
                href={img.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative aspect-square bg-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all"
              >
                <img
                  src={img.url}
                  alt={img.alt || 'Image'}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                  <p className="text-white text-xs line-clamp-2">{img.alt}</p>
                </div>
              </a>
            ))}
            {/* From mediaAssets */}
            {mediaAssets.map((asset, idx) => (
              <a
                key={`asset-${idx}`}
                href={asset.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative aspect-square bg-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all"
              >
                {asset.thumbnail ? (
                  <img
                    src={asset.thumbnail}
                    alt={asset.title || 'Media Asset'}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-50">
                    <ImageIcon className="w-8 h-8 text-gray-300" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                  <p className="text-white text-sm font-medium line-clamp-2">{asset.title}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Web Sources Section */}
      {aggregatedMedia?.webSources && aggregatedMedia.webSources.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Sources ({aggregatedMedia.webSources.length})</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {aggregatedMedia.webSources.slice(0, 8).map((source, idx) => (
              <a
                key={idx}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
              >
                {source.favicon && (
                  <img src={source.favicon} alt="" className="w-5 h-5 rounded mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 line-clamp-1">{source.title}</p>
                  <p className="text-xs text-gray-500 line-clamp-1">{source.domain || new URL(source.url).hostname}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </a>
            ))}
          </div>
          {aggregatedMedia.webSources.length > 8 && (
            <p className="text-xs text-gray-500 mt-2 text-center">
              + {aggregatedMedia.webSources.length - 8} more sources
            </p>
          )}
        </div>
      )}

      {/* Profiles Section */}
      {aggregatedMedia?.profiles && aggregatedMedia.profiles.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">People ({aggregatedMedia.profiles.length})</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {aggregatedMedia.profiles.map((profile, idx) => (
              <a
                key={idx}
                href={profile.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
              >
                {profile.imageUrl ? (
                  <img src={profile.imageUrl} alt={profile.name} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-bold">
                    {profile.name?.charAt(0) || '?'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 line-clamp-1">{profile.name}</p>
                  {profile.profession && (
                    <p className="text-xs text-gray-500 line-clamp-1">{profile.profession}</p>
                  )}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LandingArtifactsView({
  media,
  documents,
  hasThread,
  onDocumentSelect,
  onGenerateArtifact,
  onStartResearch,
}: {
  media: ExtractedMedia;
  documents: DocumentAction[];
  hasThread: boolean;
  onDocumentSelect?: (documentId: string) => void;
  onGenerateArtifact?: () => void;
  onStartResearch?: () => void;
}) {
  try {
    const safeMedia = sanitizeMedia(media || baseMedia);
    const safeDocuments = sanitizeDocumentActions(documents);

    const totalSources = safeMedia.webSources.length + safeMedia.secDocuments.length;
    const totalVideos = safeMedia.youtubeVideos.length;
    const totalProfiles = safeMedia.profiles.length;
    const totalImages = safeMedia.images.length;
    const totalDocs = safeDocuments.length;
    const totalArtifacts = totalSources + totalVideos + totalProfiles + totalImages + totalDocs;

    if (totalArtifacts === 0) {
      return (
        <div className="bg-white shadow-sm min-h-full border border-gray-200/60 p-10 text-center rounded-xl">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-50 flex items-center justify-center border border-gray-200">
            <Layout className="w-5 h-5 text-gray-500" />
          </div>
          <p className="text-sm font-semibold text-gray-900">No artifacts yet</p>
          <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
            {hasThread
              ? "Run or finish a query to see the sources, filings, media, and generated docs the agent found."
              : "Start a dossier to collect sources, filings, media, and generated docs as the agent works."}
          </p>
          <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onGenerateArtifact}
              className="px-3 py-1.5 text-xs rounded-lg bg-gray-900 text-white hover:bg-black transition-colors"
            >
              Generate first artifact
            </button>
            <button
              type="button"
              onClick={onStartResearch}
              className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Start new research
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[{ label: 'Sources & Filings', value: totalSources }, { label: 'Videos', value: totalVideos }, { label: 'People', value: totalProfiles }, { label: 'Images', value: totalImages }, { label: 'Doc actions', value: totalDocs }]
            .filter(card => card.value > 0)
            .map((card) => (
              <div
                key={card.label}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 flex items-center justify-between text-xs shadow-sm"
              >
                <span className="font-medium text-gray-900">{card.label}</span>
                <span className="text-blue-600 font-semibold">{card.value}</span>
              </div>
            ))}
        </div>

        <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-4 space-y-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">Artifacts</p>
            <p className="text-xs text-gray-500">Evidence with timestamps, URLs, and generated outputs.</p>
          </div>

          <RichMediaSection media={safeMedia} showCitations={true} />

          {safeDocuments.length > 0 && (
            <div className="border-t border-gray-100 pt-3">
              <DocumentActionGrid
                documents={safeDocuments}
                title="Generated Documents"
                onDocumentSelect={onDocumentSelect || (() => { })}
              />
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error("[WelcomeLanding] Failed to render artifacts tab", error);
    return (
      <div className="bg-white shadow-sm min-h-full border border-gray-200/60 p-10 text-center rounded-xl">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-50 flex items-center justify-center border border-red-100">
          <AlertCircle className="w-5 h-5 text-red-500" />
        </div>
        <p className="text-sm font-semibold text-gray-900">Artifacts temporarily unavailable</p>
        <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
          We hit a rendering error while loading evidence. Please try again or switch back to the dossier tab.
        </p>
      </div>
    );
  }
}
