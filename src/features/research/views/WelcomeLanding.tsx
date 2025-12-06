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
import { SidebarGlobalNav, type ActivePage } from "@/components/SidebarGlobalNav";
import { SourceNode, type SourceStatus } from "@/components/SourceNode";
import { Id } from "../../../../convex/_generated/dataModel";
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
import { InstantSearchBar } from "@/features/research/components/InstantSearchBar";
import { MorningBriefingHeader } from "@/features/research/components/MorningBriefingHeader";
import { PulseGrid, type InsightCard } from "@/features/research/components/PulseGrid";
import { FeedCard, type FeedItem } from "@/features/research/components/FeedCard";
import { TrendRail, type TrendItem } from "@/features/research/components/TrendRail";
import { InlineMetrics, type WorkflowMetrics } from "@/features/agents/views/WorkflowMetricsBar";
import { useFastAgent } from "@/features/agents/context/FastAgentContext";
import { FloatingAgentButton } from "@/features/agents/components/FloatingAgentButton";

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
  const documents = useQuery(api.domains.documents.documents.getSidebar);
  const { signIn } = useAuthActions();
  const createThread = useAction(api.domains.agents.fastAgentPanelStreaming.createThread);

  // Global Fast Agent context for contextual opening
  const { openWithContext } = useFastAgent();

  // Feed pagination state (must be before liveFeed query that uses it)
  const [feedLimit, setFeedLimit] = useState(12);

  // Get recent dossiers for the expandable nav menu
  const recentDossiers = useMemo(() => {
    return (documents ?? [])
      .filter((doc: any) => doc.type === 'dossier')
      .slice(0, 5)
      .map((doc: any) => ({
        id: doc._id,
        title: doc.title || 'Untitled Dossier',
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : undefined,
        isAgentUpdating: false,
      }));
  }, [documents]);

  // Generate InsightCards from recent documents for PulseGrid
  const insightCards: InsightCard[] = useMemo(() => {
    if (!documents?.length) return [];

    const cards: InsightCard[] = [];
    const docs = documents.slice(0, 20); // Look at recent 20 docs

    // Find a trending dossier (most recent research)
    const trendingDossier = docs.find((d: any) => d.documentType === 'dossier' || d.type === 'dossier');
    if (trendingDossier) {
      cards.push({
        id: `trending-${trendingDossier._id}`,
        type: 'trending',
        title: trendingDossier.title || 'Recent Research',
        description: trendingDossier.summary || 'AI-powered research dossier',
        source: 'Research',
        updatedAt: (trendingDossier as any).lastModified || trendingDossier._creationTime,
      });
    }

    // Find a document that might be a "watchlist" item (SEC, filing, alert)
    const watchlistDoc = docs.find((d: any) =>
      d.title?.toLowerCase().includes('sec') ||
      d.title?.toLowerCase().includes('filing') ||
      d.title?.toLowerCase().includes('alert') ||
      d.documentType === 'note'
    );
    if (watchlistDoc) {
      cards.push({
        id: `watchlist-${watchlistDoc._id}`,
        type: 'watchlist',
        title: watchlistDoc.title || 'Recent Alert',
        description: watchlistDoc.summary || 'Tracked document update',
        source: 'Watchlist',
        updatedAt: (watchlistDoc as any).lastModified || watchlistDoc._creationTime,
      });
    }

    // Find a draft document (resume work)
    const draftDoc = docs.find((d: any) =>
      d.documentType === 'document' ||
      (!d.documentType && !d.type)
    );
    if (draftDoc) {
      cards.push({
        id: `resume-${draftDoc._id}`,
        type: 'resume',
        title: draftDoc.title || 'Recent Draft',
        description: 'Continue where you left off',
        source: 'Drafts',
        updatedAt: (draftDoc as any).lastModified || draftDoc._creationTime,
      });
    }

    return cards;
  }, [documents]);

  // Count updated sources (mock for now, could integrate with SourceNode status)
  const updatedSourceCount = useMemo(() => {
    // In production, this would check actual source sync status
    return insightCards.length;
  }, [insightCards]);

  // ============================================================================
  // LIVE FEED: Central Newsstand data from Hacker News, ArXiv, RSS, etc.
  // "Write Once, Read Many" - shared across all users, free forever
  // ============================================================================
  const liveFeed = useQuery(api.feed.get, { limit: feedLimit });

  // Generate FeedItems combining LIVE FEED + user documents (Instagram x Bloomberg style)
  const feedItems: FeedItem[] = useMemo(() => {
    const items: FeedItem[] = [];

    // 1. Add LIVE FEED items first (Central Newsstand - public free data)
    if (liveFeed?.length) {
      liveFeed.forEach((item) => {
        const publishedTime = new Date(item.publishedAt).getTime();
        items.push({
          id: `feed-${item._id}`,
          type: item.type as FeedItem['type'],
          title: item.title,
          subtitle: item.summary,
          timestamp: formatRelativeTime(publishedTime),
          tags: item.tags,
          metrics: item.metrics?.map(m => ({
            label: m.label,
            value: m.value,
            trend: m.trend as 'up' | 'down' | undefined
          })),
          sourceIcon: item.source === 'YCombinator' ? (
            <div className="w-4 h-4 bg-orange-500 rounded-sm flex items-center justify-center text-[10px] font-bold text-white">Y</div>
          ) : undefined,
          // Store original URL for opening external links
          url: item.url,
        });
      });
    }

    // 2. Add USER DOCUMENTS (personal workspace data)
    if (documents?.length) {
      const docs = documents
        .filter((doc: any) => {
          const docType = typeof doc.documentType === 'string'
            ? doc.documentType.toLowerCase()
            : typeof doc.type === 'string'
              ? doc.type.toLowerCase()
              : '';

          if (docType === 'nbdoc') return false; // Hide Quick Notes from feed
          return docType === 'dossier';
        })
        .slice(0, 8); // Show recent 8 dossiers (balance with live feed)

      docs.forEach((doc: any) => {
        const isDossier = doc.documentType === 'dossier' || doc.type === 'dossier';
        const hasSecKeyword = doc.title?.toLowerCase().includes('sec') || doc.title?.toLowerCase().includes('filing');
        const hasFundingKeyword = doc.title?.toLowerCase().includes('fund') || doc.title?.toLowerCase().includes('series');

        // Determine card type based on content
        let itemType: FeedItem['type'] = 'dossier';
        if (hasSecKeyword || hasFundingKeyword) itemType = 'signal';
        else if (!isDossier) itemType = 'news';

        // Calculate relative time
        const updatedAt = doc.lastModified || doc._creationTime;
        const relativeTime = updatedAt ? formatRelativeTime(updatedAt) : 'Recently';

        items.push({
          id: doc._id, // Document ID for navigation
          type: itemType,
          title: doc.title || 'Untitled Document',
          subtitle: doc.summary || (isDossier ? 'AI-powered research dossier with comprehensive analysis.' : 'Document from your workspace.'),
          timestamp: relativeTime,
          tags: extractTags(doc.title || ''),
          metrics: itemType === 'signal' ? [
            { label: 'Sources', value: String(Math.floor(Math.random() * 8) + 3) },
            { label: 'Confidence', value: '92%', trend: 'up' as const }
          ] : undefined,
        });
      });
    }

    // 3. If no data at all, show placeholder mock data
    if (items.length === 0) {
      return [
        {
          id: 'mock-1', type: 'signal' as const, title: 'Generative AI Infrastructure Funding',
          subtitle: 'Investment volume has increased 45% QoQ despite broader market cooldown.',
          timestamp: '2h ago', tags: ['VC', 'Infra', 'Series A'],
          metrics: [{ label: 'Vol', value: '$4.2B', trend: 'up' as const }, { label: 'Deals', value: '12' }]
        },
        {
          id: 'mock-2', type: 'dossier' as const, title: 'The State of Autonomous Agents',
          subtitle: 'A deep dive into the current capabilities, limitations, and regulatory landscape of autonomous browser agents.',
          timestamp: '4h ago', tags: ['Agents', 'Research']
        },
        {
          id: 'mock-3', type: 'news' as const, title: 'OpenAI Releases "O1" Reasoning Model',
          subtitle: 'New model demonstrates advanced problem solving capabilities in math and coding benchmarks.',
          timestamp: '5h ago', tags: ['LLM', 'Product Launch']
        },
      ];
    }

    return items;
  }, [liveFeed, documents]);

  // Helper: Format relative time
  function formatRelativeTime(timestamp: number): string {
    const diff = Date.now() - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  }

  // Helper: Extract tags from title
  function extractTags(title: string): string[] {
    const keywords = ['AI', 'SEC', 'Funding', 'FinTech', 'Healthcare', 'Biotech', 'Series', 'Seed', 'Research'];
    return keywords.filter(kw => title.toLowerCase().includes(kw.toLowerCase())).slice(0, 3);
  }

  const sendStreaming = useMutation(api.domains.agents.fastAgentPanelStreaming.initiateAsyncStreaming);
  // State with persistence (tabs removed - unified view)
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

  const [showHero, setShowHero] = useState(true);
  const [hasActiveSearch, setHasActiveSearch] = useState(false);

  const [isFromCache, setIsFromCache] = useState(false);
  const [cacheHistory, setCacheHistory] = useState<Array<{ prompt: string; date: string; threadId: string; timestamp: number }>>([]);
  const [followUpMode, setFollowUpMode] = useState<"append" | "new">("append");
  const [followUpHistory, setFollowUpHistory] = useState<Array<{ prompt: string; mode: "append" | "new"; status: "queued" | "done"; timestamp: number }>>([]);

  // Search focus state for dimming PulseGrid
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Live Events Panel state - REMOVED (events now inline in LiveDossierDocument)
  // const [showEventsPanel, setShowEventsPanel] = useState(false);
  // const [liveEvents, setLiveEvents] = useState([]);

  // Persist state changes
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
    if (!responseText || !responseText.trim() || hasReceivedResponse) return;
    setHasReceivedResponse(true);
    if (hasActiveSearch) {
      setShowHero(false); // Switch to dossier view
    }
  }, [responseText, hasActiveSearch, hasReceivedResponse]);

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

  // Function to view last results
  const handleViewLastResults = () => {
    setShowHero(false);
    setHasActiveSearch(true);
  };

  const resetToBriefing = () => {
    setHasActiveSearch(false);
    setShowHero(true);
    setIsRunning(false);
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
      setHasActiveSearch(true);
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
      setHasActiveSearch(true);
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
    setHasActiveSearch(true);
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

          {/* Unified Global Navigation */}
          <div className="px-3 pt-4">
            <SidebarGlobalNav
              activePage="research"
              onNavigate={(page: ActivePage) => {
                if (page === 'workspace' || page === 'saved') {
                  onEnterWorkspace?.();
                }
                // 'research' is already active, no navigation needed
              }}
              recentDossiers={recentDossiers}
              onDossierSelect={(dossierIdStr) => {
                onDocumentSelect?.(dossierIdStr);
                onEnterWorkspace?.();
              }}
            />
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-200 mx-5 my-2" />

          {/* Context Area: Source Nodes (Active Knowledge Bases) */}
          <div className="flex-1 overflow-y-auto py-2 px-3 custom-scrollbar">
            <div className="px-2 mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Source Nodes
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">
                  {activeSources.length}/{SOURCES.length}
                </span>
                <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                  LIVE
                </span>
              </div>
            </div>

            {/* Source Nodes - Draggable & Configurable */}
            <div className="space-y-1">
              {SOURCES.map(source => {
                const isActive = activeSources.includes(source.id);
                const isQuerying = isRunning && isActive;
                const activityCount = sourceAnalytics[source.id] || 0;

                // Determine status
                let status: SourceStatus = 'paused';
                if (isQuerying) status = 'querying';
                else if (isActive && source.freshness === 'realtime') status = 'live';
                else if (isActive) status = 'syncing';

                return (
                  <SourceNode
                    key={source.id}
                    id={source.id}
                    name={source.name}
                    icon={<span className={`font-bold ${source.color}`}>{source.icon}</span>}
                    status={status}
                    trustScore={source.trustScore}
                    activityCount={activityCount}
                    active={isActive}
                    onToggle={() => toggleSource(source.id)}
                    onConfigure={() => {
                      // TODO: Open source configuration modal
                      console.log('Configure source:', source.id);
                    }}
                    onDragStart={(e, sourceId) => {
                      e.dataTransfer.setData('application/x-source-node', sourceId);
                      e.dataTransfer.effectAllowed = 'link';
                    }}
                  />
                );
              })}
            </div>

            {/* Quick Actions */}
            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between px-2">
                <span className="text-[10px] text-gray-400">
                  Drag a node to Agent to monitor
                </span>
                <button
                  type="button"
                  className="text-[10px] text-blue-600 hover:text-blue-700 font-medium"
                  onClick={() => {
                    // Toggle all sources
                    if (activeSources.length === SOURCES.length) {
                      SOURCES.forEach(s => {
                        if (activeSources.includes(s.id)) toggleSource(s.id);
                      });
                    } else {
                      SOURCES.forEach(s => {
                        if (!activeSources.includes(s.id)) toggleSource(s.id);
                      });
                    }
                  }}
                >
                  {activeSources.length === SOURCES.length ? 'Pause All' : 'Activate All'}
                </button>
              </div>
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
                  {showHero ? "Morning Briefing" : "Live Dossier"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={resetToBriefing}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
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
                // HERO STATE - "The Living Briefing" (Instagram x Bloomberg x Newsletter)
                <div className="min-h-full flex flex-col bg-gradient-to-b from-white to-gray-50/50">
                  {/* 1. HEADER: Personal & Briefing Style */}
                  <div className="text-center pt-8 pb-4 px-6 space-y-2">
                    <p className="text-gray-500 font-medium uppercase tracking-widest text-xs">
                      {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} • Morning Briefing
                    </p>
                    <h1 className="text-3xl font-serif text-gray-900">
                      Good morning, {user?.name?.split(' ')[0] || 'there'}. <br/>
                      <span className="text-gray-400 italic text-2xl">{updatedSourceCount} sectors updated overnight.</span>
                    </h1>
                  </div>

                  {/* 2. FLOATING COMMAND CENTER (Perplexity/Raycast style) */}
                  <div className={`sticky top-4 z-40 transition-all duration-500 px-6 ${isSearchFocused ? 'mb-6' : 'mb-4'}`}>
                    <div className="max-w-2xl mx-auto">
                      <div className={`transition-all duration-300 ${isSearchFocused ? 'shadow-2xl rounded-2xl ring-2 ring-blue-500/20' : 'shadow-lg rounded-xl'}`}>
                        <InstantSearchBar
                          onStartNewResearch={(prompt, opts) => handleRunPrompt(prompt, { mode: opts?.mode || researchMode })}
                          onDocumentSelect={onDocumentSelect}
                          defaultValue={researchPrompt}
                          mode={researchMode}
                          onFocus={() => setIsSearchFocused(true)}
                          onBlur={() => setIsSearchFocused(false)}
                          floating={true}
                        />
                      </div>
                      {/* Research Mode Pills - below search */}
                      <div className={`flex gap-2 justify-center mt-3 transition-all duration-300 ${isSearchFocused ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
                        {[
                          { id: "quick", title: "⚡ Quick Brief", mode: "quick" as const },
                          { id: "deep", title: "🔬 Deep Dossier", mode: "deep" as const },
                        ].map((intent) => (
                          <button
                            key={intent.id}
                            type="button"
                            onClick={() => handleRunPrompt(undefined, { mode: intent.mode })}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${researchMode === intent.mode
                              ? "border-gray-900 bg-gray-900 text-white"
                              : "border-gray-200 bg-white hover:border-gray-300 text-gray-600"
                            }`}
                          >
                            {intent.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 3. THE "STORIES" RAIL - Live Signals (Instagram/Twitter style) */}
                  <div className={`px-6 transition-all duration-300 ${isSearchFocused ? 'opacity-20 blur-sm pointer-events-none' : 'opacity-100'}`}>
                    <TrendRail
                      onTrendClick={(trend) => {
                        setResearchPrompt(`Latest news and analysis on ${trend.label}`);
                        handleRunPrompt(`Latest news and analysis on ${trend.label}`, { mode: 'quick' });
                      }}
                    />
                  </div>

                  {/* 4. THE INTELLIGENCE FEED (Masonry Grid - Pinterest/Bloomberg hybrid) */}
                  <div className={`flex-1 px-6 py-6 transition-all duration-300 ${isSearchFocused ? 'opacity-20 blur-sm pointer-events-none scale-[0.98]' : 'opacity-100'}`}>
                    <div className="w-full">
                      {/* Feed Header */}
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Your Intelligence Feed</h2>
                        <div className="flex gap-2">
                          {SOURCE_PRESETS.slice(0, 3).map(preset => (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => applyPreset(preset.id)}
                              className={`text-xs px-2.5 py-1 rounded-full border transition-all ${activePreset === preset.id
                                ? 'bg-gray-900 text-white border-gray-900'
                                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              {preset.icon} {preset.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Masonry Grid of FeedCards */}
                      <div className="columns-1 md:columns-2 xl:columns-3 2xl:columns-4 gap-6">
                        {feedItems.map((item) => (
                          <FeedCard
                            key={item.id}
                            item={item}
                            onClick={() => {
                              // Live feed items (from Central Newsstand) open external URL
                              if (item.id.startsWith('feed-') && item.url) {
                                window.open(item.url, '_blank', 'noopener,noreferrer');
                                return;
                              }
                              // If it's a real document, navigate to it
                              if (!item.id.startsWith('mock-') && !item.id.startsWith('feed-') && onDocumentSelect) {
                                onDocumentSelect(item.id);
                              } else if (item.id.startsWith('mock-')) {
                                // Mock item - start research on it
                                handleRunPrompt(item.title, { mode: 'quick' });
                              }
                            }}
                            onAnalyze={() => {
                              // Open Fast Agent with context about this item
                              openWithContext({
                                initialMessage: `Analyze this ${item.type}: "${item.title}"\n\n${item.subtitle || ''}`,
                                contextWebUrls: item.url ? [item.url] : undefined,
                                contextTitle: item.title,
                              });
                            }}
                          />
                        ))}
                      </div>

                      {/* Load More Button */}
                      {feedItems.length >= feedLimit && (
                        <div className="text-center mt-6">
                          <button
                            type="button"
                            onClick={() => setFeedLimit(prev => prev + 12)}
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
                          >
                            Load More
                          </button>
                        </div>
                      )}

                      {/* View Last Results - if available */}
                      {threadId && hasReceivedResponse && (
                        <div className="text-center mt-8">
                          <button
                            type="button"
                            onClick={handleViewLastResults}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors border border-blue-200"
                          >
                            <Clock className="w-4 h-4" />
                            View Last Results
                          </button>
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
                    {/* Unified Live Dossier View - All content in one place */}
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                      {/* Executive Summary Block (Only show if we have some content) */}
                      {citations.length > 0 && <ExecutiveSummaryBlock />}

                      {/* Reasoning Chain */}
                      <CollapsibleReasoningChain steps={toolParts} />

                      {/* The Main Document with inline media and documents */}
                      <LiveDossierDocument
                        threadId={threadId}
                        isLoading={isRunning || (hasReceivedResponse && !responseText)}
                        onRunFollowUp={(query) => handleRunPrompt(query, { appendToThread: true })}
                        media={aggregatedMedia}
                        documents={aggregatedDocumentActions}
                        onDocumentSelect={onDocumentSelect}
                      />
                    </div>
                  </div>
                </div>
              )}
            </main>

            {/* LIVE EVENTS PANEL - REMOVED (events now inline in LiveDossierDocument) */}
          </div>
        </div>
      </div>

      {/* Floating Agent Button - Universal access to AI agent */}
      {isAuthenticated && <FloatingAgentButton label="Ask Agent" />}
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

// --- Mock Views for Tabs (REMOVED - Unified view now used) ---
// MockNewsletterView, MockMediaView, and LandingArtifactsView have been removed.
// All content is now displayed inline in LiveDossierDocument with collapsible sections.
