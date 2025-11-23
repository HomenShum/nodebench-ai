import { useAction, useMutation, useQuery, useConvexAuth } from "convex/react";
import { api } from "../../../convex/_generated/api";
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
import { Id } from "../../../convex/_generated/dataModel";
import { extractMediaFromMessages, ExtractedAsset } from "../../../convex/lib/dossierHelpers";
import { useMemo, useState, useEffect } from "react";
import ReactMarkdown from 'react-markdown';
import LiveDossierDocument from "./LiveDossierDocument";
import MagicInputContainer from "./MagicInputContainer";

// Source Configuration
interface SourceConfig {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  activeBgColor: string;
  activeBorderColor: string;
  trustScore: number; // 0-100
  freshness: 'realtime' | 'hourly' | 'daily';
  category: 'tech' | 'academic' | 'social' | 'news';
  keyboardShortcut: number;
}

const SOURCES: SourceConfig[] = [
  {
    id: 'ycombinator',
    name: 'YCombinator News',
    shortName: 'YC',
    icon: 'Y',
    color: 'text-orange-600',
    bgColor: 'bg-white',
    borderColor: 'border-orange-200',
    activeBgColor: 'bg-orange-50',
    activeBorderColor: 'border-orange-300',
    trustScore: 95,
    freshness: 'realtime',
    category: 'tech',
    keyboardShortcut: 1,
  },
  {
    id: 'techcrunch',
    name: 'TechCrunch',
    shortName: 'TC',
    icon: 'T',
    color: 'text-blue-600',
    bgColor: 'bg-white',
    borderColor: 'border-blue-200',
    activeBgColor: 'bg-blue-50',
    activeBorderColor: 'border-blue-300',
    trustScore: 90,
    freshness: 'hourly',
    category: 'news',
    keyboardShortcut: 2,
  },
  {
    id: 'reddit',
    name: 'Reddit',
    shortName: 'RD',
    icon: 'R',
    color: 'text-red-600',
    bgColor: 'bg-white',
    borderColor: 'border-red-200',
    activeBgColor: 'bg-red-50',
    activeBorderColor: 'border-red-300',
    trustScore: 75,
    freshness: 'realtime',
    category: 'social',
    keyboardShortcut: 3,
  },
  {
    id: 'twitter',
    name: 'Twitter/X',
    shortName: 'X',
    icon: 'X',
    color: 'text-gray-900',
    bgColor: 'bg-white',
    borderColor: 'border-gray-300',
    activeBgColor: 'bg-gray-50',
    activeBorderColor: 'border-gray-400',
    trustScore: 70,
    freshness: 'realtime',
    category: 'social',
    keyboardShortcut: 4,
  },
  {
    id: 'github',
    name: 'GitHub',
    shortName: 'GH',
    icon: 'G',
    color: 'text-purple-600',
    bgColor: 'bg-white',
    borderColor: 'border-purple-200',
    activeBgColor: 'bg-purple-50',
    activeBorderColor: 'border-purple-300',
    trustScore: 92,
    freshness: 'hourly',
    category: 'tech',
    keyboardShortcut: 5,
  },
  {
    id: 'arxiv',
    name: 'ArXiv',
    shortName: 'AR',
    icon: 'A',
    color: 'text-green-600',
    bgColor: 'bg-white',
    borderColor: 'border-green-200',
    activeBgColor: 'bg-green-50',
    activeBorderColor: 'border-green-300',
    trustScore: 98,
    freshness: 'daily',
    category: 'academic',
    keyboardShortcut: 6,
  },
];

// Source Presets
interface SourcePreset {
  id: string;
  name: string;
  description: string;
  sources: string[];
  icon: string;
  color: string;
}

const SOURCE_PRESETS: SourcePreset[] = [
  {
    id: 'all',
    name: 'All Sources',
    description: 'Search across all available sources',
    sources: ['ycombinator', 'techcrunch', 'reddit', 'twitter', 'github', 'arxiv'],
    icon: '🌐',
    color: 'text-gray-600',
  },
  {
    id: 'tech-news',
    name: 'Tech News',
    description: 'YC News, TechCrunch, GitHub',
    sources: ['ycombinator', 'techcrunch', 'github'],
    icon: '📰',
    color: 'text-blue-600',
  },
  {
    id: 'academic',
    name: 'Academic',
    description: 'ArXiv and research papers',
    sources: ['arxiv'],
    icon: '🎓',
    color: 'text-green-600',
  },
  {
    id: 'social',
    name: 'Social Media',
    description: 'Reddit and Twitter/X',
    sources: ['reddit', 'twitter'],
    icon: '💬',
    color: 'text-pink-600',
  },
  {
    id: 'high-trust',
    name: 'High Trust',
    description: 'Only sources with 90+ trust score',
    sources: ['ycombinator', 'techcrunch', 'github', 'arxiv'],
    icon: '⭐',
    color: 'text-yellow-600',
  },
];

interface WelcomeLandingProps {
  onDocumentSelect?: (documentId: string) => void;
  onEnterWorkspace?: () => void;
}

export default function WelcomeLanding({
  onDocumentSelect,
  onEnterWorkspace,
}: WelcomeLandingProps) {
  const { isAuthenticated } = useConvexAuth();
  const user = useQuery(api.auth.loggedInUser);
  const { signIn } = useAuthActions();
  const createThread = useAction(api.fastAgentPanelStreaming.createThread);
  const sendStreaming = useMutation(api.fastAgentPanelStreaming.initiateAsyncStreaming);
  const [activeTab, setActiveTab] = useState<'dossier' | 'newsletter' | 'media'>('dossier');
  const [researchPrompt, setResearchPrompt] = useState(
    "Summarize last week's top funding news and any SEC filings for AI infrastructure startups."
  );
  const [threadId, setThreadId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [activeSources, setActiveSources] = useState<string[]>(['ycombinator', 'techcrunch', 'reddit', 'twitter', 'github', 'arxiv']);
  const [activePreset, setActivePreset] = useState<string | null>('all');
  const [isReasoningOpen, setIsReasoningOpen] = useState(false);
  const [hasReceivedResponse, setHasReceivedResponse] = useState(false);
  const [showHero, setShowHero] = useState(true); // Control which view to show
  const [isFromCache, setIsFromCache] = useState(false); // Track if results are from cache

  // Cache utility functions
  const getCacheKey = (prompt: string, date: string) => {
    return `search_cache_${prompt.trim().toLowerCase()}_${date}`;
  };

  const getCachedResult = (prompt: string): string | null => {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const cacheKey = getCacheKey(prompt, today);
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
    try {
      const today = new Date().toISOString().split('T')[0];
      const cacheKey = getCacheKey(prompt, today);
      const cacheValue = {
        threadId,
        prompt: prompt.trim(),
        date: today,
        timestamp: Date.now()
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheValue));
    } catch (e) {
      console.error('Failed to cache result:', e);
    }
  };

  // Resolve agent thread and streaming messages to keep UI consistent with agent artifacts
  const streamingThread = useQuery(
    api.fastAgentPanelStreaming.getThreadByStreamId,
    threadId ? { threadId: threadId as Id<"chatThreadsStream"> } : "skip"
  ) as any;

  const agentThreadId = streamingThread?.agentThreadId as string | undefined;
  const { results: uiMessages } = useUIMessages(
    api.fastAgentPanelStreaming.getThreadMessagesWithStreaming,
    agentThreadId ? { threadId: agentThreadId as Id<"chatThreadsStream"> } : "skip",
    { initialNumItems: 50, stream: true }
  );

  const handleSignIn = async () => {
    await signIn("google", { redirectTo: "/" });
  };

  const latestAssistantMessage = useMemo(() => {
    if (!uiMessages || uiMessages.length === 0) return "";
    const latest = [...uiMessages]
      .reverse()
      .find((m: any) => (m.role ?? m?.message?.role) === "assistant");
    return latest || null;
  }, [uiMessages]);

  const latestAssistantText = useMemo(() => {
    const latest = latestAssistantMessage as any;
    if (!latest) return "";
    if (typeof (latest as any).text === "string" && (latest as any).text.trim()) return (latest as any).text;
    if (Array.isArray((latest as any).content)) {
      const textParts = (latest as any).content
        .filter((c: any) => typeof c?.text === "string")
        .map((c: any) => c.text)
        .join("\n\n");
      if (textParts.trim()) return textParts;
    }
    if (typeof (latest as any).message?.text === "string") return latest.message.text;
    return "";
  }, [latestAssistantMessage]);
  const responseText = typeof latestAssistantText === "string" ? latestAssistantText : "";

  // Track when we first receive a response to prevent flickering between views
  useEffect(() => {
    if (responseText && responseText.trim() && !hasReceivedResponse) {
      setHasReceivedResponse(true);
      setShowHero(false); // Switch to dossier view
    }
  }, [responseText, hasReceivedResponse]);

  const toolParts = useMemo(
    () => (latestAssistantMessage as any)?.parts?.filter?.((p: any) => p?.type?.startsWith?.("tool-")) ?? [],
    [latestAssistantMessage]
  );

  const reasoningText = useMemo(
    () =>
      (latestAssistantMessage as any)?.parts
        ?.filter?.((p: any) => p.type === "reasoning")
        ?.map((p: any) => p.text)
        ?.join("\n") ?? "",
    [latestAssistantMessage]
  );

  // Extract media assets from the latest message
  const mediaAssets = useMemo(() => {
    if (!latestAssistantMessage) return [];
    return extractMediaFromMessages([latestAssistantMessage]);
  }, [latestAssistantMessage]);

  // Extract citations from tool parts with source tracking
  const citations = useMemo(() => {
    return toolParts
      .filter((p: any) => p.type === "tool-result" && p.toolName === "linkupSearch")
      .map((p: any) => {
        try {
          const output = p.output?.value || p.output || p.result;
          if (typeof output === "string") {
            const galleryRegex = /<!--\s*SOURCE_GALLERY_DATA\s*\n([\s\S]*?)\n-->/;
            const match = output.match(galleryRegex);
            if (match && match[1]) {
              const results = JSON.parse(match[1]);
              // Add source detection to each result
              return results.map((r: any) => {
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
              });
            }
          }
        } catch (e) {
          console.error("Failed to parse citations:", e);
        }
        return [];
      })
      .flat()
      .slice(0, 10); // Increased to 10 citations
  }, [toolParts]);

  // Calculate source analytics
  const sourceAnalytics = useMemo(() => {
    const counts: Record<string, number> = {};
    citations.forEach((citation: any) => {
      const source = citation.source || 'unknown';
      counts[source] = (counts[source] || 0) + 1;
    });
    return counts;
  }, [citations]);

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

  const handleRunPrompt = async (promptOverride?: string) => {
    const promptToRun = promptOverride || researchPrompt;
    if (promptOverride) {
      setResearchPrompt(promptOverride);
    }

    if (!promptToRun.trim()) return;

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
    if (!user) {
      await handleSignIn();
      return;
    }

    setIsRunning(true);
    setShowHero(false); // Switch to dossier view immediately
    setHasReceivedResponse(false);
    setIsFromCache(false);

    try {
      const newThreadId = await createThread({
        title: promptToRun.slice(0, 120) || "Research Thread",
      });
      setThreadId(newThreadId);

      // Cache the threadId for this prompt
      cacheResult(promptToRun, newThreadId);

      // Build prompt with source filters
      let enhancedPrompt = promptToRun;
      if (activeSources.length > 0 && activeSources.length < 2) {
        const sourceNames = activeSources.map(s =>
          s === 'ycombinator' ? 'YCombinator News' : 'TechCrunch'
        ).join(', ');
        enhancedPrompt = `${promptToRun}\n\nFocus on sources: ${sourceNames}`;
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
        <div className="text-[11px] font-mono text-blue-600 animate-pulse">
          &gt; {steps[currentStep]}
        </div>
      </div>
    );
  }

  // Trust Badge Component
  function TrustBadge({ score }: { score: number }) {
    const getColor = (score: number) => {
      if (score >= 90) return 'text-green-600 bg-green-50 border-green-100';
      if (score >= 70) return 'text-blue-600 bg-blue-50 border-blue-100';
      return 'text-gray-600 bg-gray-50 border-gray-100';
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
  }: {
    icon: React.ReactNode;
    title: React.ReactNode;
    time: React.ReactNode;
    active?: boolean;
    isLive?: boolean;
    onClick?: () => void;
  }) {
    return (
      <div
        onClick={onClick}
        className={`group relative flex items-center justify-between py-2 px-2.5 rounded-lg cursor-pointer transition-colors ${active
          ? 'bg-gray-50'
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

          {/* The Live Dot - Enhanced animation */}
          {isLive && (
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

  // Collapsible Reasoning Chain Component
  function CollapsibleReasoningChain({ steps }: { steps: any[] }) {
    const [isExpanded, setIsExpanded] = useState(false);

    const stepIcons: Record<string, string> = {
      'search': '🔍',
      'read': '📄',
      'analyze': '🧠',
      'write': '✍️',
      'tool': '🔧'
    };

    const getStepIcon = (stepName: string) => {
      const name = stepName.toLowerCase();
      if (name.includes('search')) return stepIcons.search;
      if (name.includes('read')) return stepIcons.read;
      if (name.includes('analyz')) return stepIcons.analyze;
      if (name.includes('writ')) return stepIcons.write;
      return stepIcons.tool;
    };

    if (!steps || steps.length === 0) return null;

    return (
      <div className="my-6 border border-gray-200 rounded-lg overflow-hidden">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">Reasoning Chain</span>
            <span className="text-xs text-gray-500">
              Checked {steps.length} source{steps.length !== 1 ? 's' : ''} • Analyzed {steps.filter(s => s.status === 'success').length} result{steps.filter(s => s.status === 'success').length !== 1 ? 's' : ''}
            </span>
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
              <SidebarItem icon={<Layout className="w-4 h-4" />} title="Dashboard" time="" active />
              <SidebarItem icon={<Clock className="w-4 h-4" />} title="Recent Research" time="" />
              <SidebarItem icon={<FileText className="w-4 h-4" />} title="Saved Dossiers" time="" />
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
            </div>
          </header>

          {/* SCROLLABLE CANVAS */}
          <main className="flex-1 overflow-y-auto custom-scrollbar relative">

            {/* CONDITIONAL CONTENT: HERO vs ACTIVE */}
            {showHero ? (
              // HERO STATE
              <div className="min-h-full flex flex-col items-center justify-center p-8 pb-32">
                <div className="max-w-2xl w-full text-center space-y-8">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium border border-purple-100 mb-4">
                    <Sparkles className="w-3 h-3" />
                    <span>New: Multi-source Verification Engine</span>
                  </div>

                  <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900">
                    Research at the Speed of <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">Thought.</span>
                  </h1>

                  <p className="text-lg text-gray-600 max-w-xl mx-auto">
                    Access real-time intelligence from trusted sources. Generate briefings, analyze trends, and verify facts in seconds.
                  </p>

                  <div className="pt-8 w-full max-w-xl mx-auto">
                    <MagicInputContainer
                      onRun={(prompt) => handleRunPrompt(prompt)}
                      defaultValue={researchPrompt}
                    />

                    {/* Source Pills */}
                    <div className="flex flex-wrap justify-center gap-2 mt-6">
                      {SOURCE_PRESETS.map(preset => (
                        <button
                          key={preset.id}
                          onClick={() => applyPreset(preset.id)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${activePreset === preset.id
                            ? 'bg-gray-900 text-white border-gray-900'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                          <span className="mr-1.5">{preset.icon}</span>
                          {preset.name}
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
                  </div>
                </div>
              </div>
            ) : (
              // ACTIVE DOSSIER STATE
              <div className="min-h-full bg-gray-50/50">
                {/* Sticky Input Bar for Active State */}
                <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-200 py-3 px-6 shadow-sm">
                  <MagicInputContainer
                    onRun={(prompt) => handleRunPrompt(prompt)}
                    compact={true}
                    defaultValue={researchPrompt}
                  />
                  <ThoughtStreamTicker isActive={isRunning} />

                  {/* Cache Indicator */}
                  {isFromCache && (
                    <div className="max-w-4xl mx-auto mt-2 px-2">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-medium rounded-full border border-green-200">
                        <Zap className="w-3 h-3" />
                        Loaded from cache (instant results)
                      </div>
                    </div>
                  )}
                </div>

                <div className="max-w-5xl mx-auto p-6 md:p-8 space-y-8">
                  {/* Tabs */}
                  <div className="flex border-b border-gray-200 mb-8">
                    <button
                      onClick={() => setActiveTab('dossier')}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'dossier' ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                      Live Dossier
                    </button>
                    <button
                      onClick={() => setActiveTab('newsletter')}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'newsletter' ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                      Newsletter Preview
                    </button>
                    <button
                      onClick={() => setActiveTab('media')}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'media' ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                      Media Gallery <span className="ml-1 bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full text-xs">{mediaAssets.length}</span>
                    </button>
                  </div>

                  {/* View Content */}
                  {activeTab === 'dossier' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                      {/* Executive Summary Block (Only show if we have some content) */}
                      {citations.length > 0 && <ExecutiveSummaryBlock />}

                      {/* Reasoning Chain */}
                      <CollapsibleReasoningChain steps={toolParts} />

                      {/* The Main Document */}
                      <LiveDossierDocument threadId={threadId} isLoading={isRunning} />
                    </div>
                  )}

                  {activeTab === 'newsletter' && (
                    <MockNewsletterView
                      responseText={responseText}
                      isLoading={isRunning}
                      mediaAssets={mediaAssets}
                      citations={citations}
                      sourceAnalytics={sourceAnalytics}
                    />
                  )}

                  {activeTab === 'media' && (
                    <MockMediaView mediaAssets={mediaAssets} />
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </>
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
        {/* Main Content */}
        <div className="prose prose-sm max-w-none">
          <p className="text-gray-600 leading-relaxed text-[15px]">
            {responseText}
          </p>
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

function MockMediaView({ mediaAssets }: { mediaAssets: ExtractedAsset[] }) {
  if (mediaAssets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
        <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-sm">No media assets found in this research.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {mediaAssets.map((asset, idx) => (
        <div key={idx} className="group relative aspect-square bg-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
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
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
            <p className="text-white text-sm font-medium line-clamp-2">{asset.title}</p>
            <a
              href={asset.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 text-xs text-white/80 hover:text-white underline"
            >
              View Source
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}
