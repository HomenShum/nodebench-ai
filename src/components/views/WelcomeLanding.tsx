import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useUIMessages } from "@convex-dev/agent/react";
import { StepTimeline, toolPartsToTimelineSteps } from "../FastAgentPanel/StepTimeline";
import { extractMediaFromMessages, ExtractedAsset } from "../../../convex/lib/dossierHelpers";
import {
  ArrowRight,
  Sparkles,
  Search,
  MoreHorizontal,
  Clock,
  FileText,
  TrendingUp,
  Activity,
  Newspaper,
  Image as ImageIcon,
  Layout,
  ChevronRight,
  ChevronDown,
  Filter
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import ReactMarkdown from 'react-markdown';

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
}

const SOURCE_PRESETS: SourcePreset[] = [
  {
    id: 'all',
    name: 'All Sources',
    description: 'Search across all available sources',
    sources: ['ycombinator', 'techcrunch', 'reddit', 'twitter', 'github', 'arxiv'],
    icon: '🌐',
  },
  {
    id: 'tech-news',
    name: 'Tech News',
    description: 'YC News, TechCrunch, GitHub',
    sources: ['ycombinator', 'techcrunch', 'github'],
    icon: '📰',
  },
  {
    id: 'academic',
    name: 'Academic',
    description: 'ArXiv and research papers',
    sources: ['arxiv'],
    icon: '🎓',
  },
  {
    id: 'social',
    name: 'Social Media',
    description: 'Reddit and Twitter/X',
    sources: ['reddit', 'twitter'],
    icon: '💬',
  },
  {
    id: 'high-trust',
    name: 'High Trust',
    description: 'Only sources with 90+ trust score',
    sources: ['ycombinator', 'techcrunch', 'github', 'arxiv'],
    icon: '⭐',
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

  // Resolve agent thread and streaming messages to keep UI consistent with agent artifacts
  const streamingThread = useQuery(
    api.fastAgentPanelStreaming.getThreadByStreamId,
    threadId ? { threadId } : "skip"
  ) as any;

  const agentThreadId = streamingThread?.agentThreadId as string | undefined;
  const { results: uiMessages } = useUIMessages(
    api.fastAgentPanelStreaming.getThreadMessagesWithStreaming,
    agentThreadId ? { threadId: agentThreadId } : "skip",
    { initialNumItems: 50, stream: true }
  );

  const handleSignIn = async () => {
    await signIn("github", { redirectTo: "/" });
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
        ? prev.filter(s => s !== sourceId)
        : [...prev, sourceId]
    );
    setActivePreset(null); // Clear preset when manually toggling
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
      // ?/Ctrl + 1-6 for source toggling
      if ((e.metaKey || e.ctrlKey) && e.key >= '1' && e.key <= '6') {
        e.preventDefault();
        const shortcutNum = parseInt(e.key);
        const source = SOURCES.find(s => s.keyboardShortcut === shortcutNum);
        if (source) {
          toggleSource(source.id);
        }
      }
      // ?/Ctrl + Shift + A for "All Sources" preset
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        applyPreset('all');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSources]);

  const handleRunPrompt = async () => {
    if (!user) {
      await handleSignIn();
      return;
    }
    setIsRunning(true);
    setHasReceivedResponse(false); // Reset to show fresh content
    try {
      const newThreadId = await createThread({
        title: researchPrompt.slice(0, 120) || "Research Thread",
      });
      setThreadId(newThreadId);

      // Build prompt with source filters
      let enhancedPrompt = researchPrompt;
      if (activeSources.length > 0 && activeSources.length < 2) {
        const sourceNames = activeSources.map(s =>
          s === 'ycombinator' ? 'YCombinator News' : 'TechCrunch'
        ).join(', ');
        enhancedPrompt = `${researchPrompt}\n\nFocus on sources: ${sourceNames}`;
      }

      await sendStreaming({
        threadId: newThreadId,
        prompt: enhancedPrompt,
      });
      setIsRunning(false);
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

  // Welcome state - show when no content yet
  if (!latestAssistantText && !isRunning) {
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

      <div className="min-h-screen bg-[#FAFAFA] font-sans selection:bg-blue-100 relative">
        {/* Ambient Background Mesh */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-purple-100/40 rounded-full blur-[120px]" />
          <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[60%] bg-blue-100/40 rounded-full blur-[120px]" />
        </div>

        {/* Header / Nav */}
        <header className="relative z-20 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center shadow-lg shadow-black/10">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900 tracking-tight">Nodebench AI</span>
          </div>

          {user && onEnterWorkspace && (
            <button
              onClick={onEnterWorkspace}
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-full transition-all border border-gray-200 shadow-sm hover:shadow text-sm font-medium"
            >
              Enter Workspace
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {!user && (
            <button
              onClick={handleSignIn}
              className="px-5 py-2 bg-black hover:bg-gray-800 text-white rounded-full transition-all shadow-lg hover:shadow-xl text-sm font-medium"
            >
              Sign In
            </button>
          )}
        </header>

        {/* Hero Section */}
        <main className="relative z-10 w-full max-w-7xl mx-auto px-6 pt-12 pb-32 lg:pt-20 lg:pb-40 text-center">
          <div className="max-w-3xl mx-auto space-y-8">
            <h1 className="text-5xl lg:text-7xl font-bold text-gray-900 leading-[1.1] tracking-tight">
              The AI That Builds Your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                Research Dossier
              </span>
            </h1>

            <p className="text-xl text-gray-600 font-medium max-w-2xl mx-auto leading-relaxed">
              Capture notes, analyze documents, and generate professional briefings with an AI partner that understands your context.
            </p>

            {!user && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
                <button
                  onClick={handleSignIn}
                  className="px-8 py-4 bg-black hover:bg-gray-800 text-white rounded-2xl font-semibold text-lg transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5 flex items-center gap-2"
                >
                  Open your workspace
                  <ArrowRight className="w-5 h-5" />
                </button>
                <span className="text-sm text-gray-500 font-medium">No credit card required</span>
              </div>
            )}
          </div>
        </main>

        {/* Floating App Preview (Breaking the Plane) */}
        <div className="relative z-20 -mt-24 lg:-mt-32 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-20">
          {/* The "Glow" Orb behind the app window */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-gradient-to-r from-purple-200/40 via-blue-200/40 to-pink-200/40 blur-3xl rounded-full -z-10 pointer-events-none" />

          <div className="rounded-2xl bg-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] ring-1 ring-white/10 ring-inset overflow-hidden backdrop-blur-sm transform transition-all hover:scale-[1.002] duration-500">

            {/* Fake Browser Toolbar */}
            <div className="border-b border-gray-200 bg-gray-50/80 px-4 py-3 flex items-center gap-4 backdrop-blur-md">
              <div className="flex gap-2">
                <div className="h-3 w-3 rounded-full bg-[#FF5F57] border border-[#E0443E]/50"></div>
                <div className="h-3 w-3 rounded-full bg-[#FEBC2E] border border-[#D89E24]/50"></div>
                <div className="h-3 w-3 rounded-full bg-[#28C840] border border-[#1AAB29]/50"></div>
              </div>

              {/* Tab Bar / Segmented Control */}
              <div className="flex-1 flex justify-center">
                <div className="flex items-center p-1 bg-gray-200/50 rounded-lg border border-gray-200/50">
                  <button
                    onClick={() => setActiveTab('dossier')}
                    className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'dossier'
                      ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                      }`}
                  >
                    <Newspaper className="w-3.5 h-3.5" />
                    Dossier
                  </button>
                  <button
                    onClick={() => setActiveTab('newsletter')}
                    className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'newsletter'
                      ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                      }`}
                  >
                    <Layout className="w-3.5 h-3.5" />
                    Newsletter
                  </button>
                  <button
                    onClick={() => setActiveTab('media')}
                    className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'media'
                      ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                      }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    Media
                  </button>
                </div>
              </div>

              <div className="w-16"></div> {/* Spacer for balance */}
            </div>

            {/* Main App Layout */}
            <div className="flex h-[650px] bg-white">
              {/* Sidebar */}
              <div className="w-64 bg-white h-full flex flex-col border-r border-gray-100">
                <div className="p-4 shrink-0">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search..."
                      className="w-full pl-8 pr-3 py-1.5 bg-white shadow-sm rounded-lg text-xs focus:outline-none focus:shadow-md transition-all"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-5 space-y-2">
                  <div className="px-1 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Recent Dossiers</div>

                  <SidebarItem
                    icon={<TrendingUp className="w-4 h-4 text-blue-600" />}
                    title="Tech Market Q3"
                    time="2m ago"
                    active
                  />
                  <SidebarItem
                    icon={<Activity className="w-4 h-4 text-emerald-600" />}
                    title="VitalWatch DD"
                    time="4h ago"
                  />
                  <SidebarItem
                    icon={<FileText className="w-4 h-4 text-purple-600" />}
                    title="Competitor Analysis"
                    time="1d ago"
                  />

                  {/* Source Presets */}
                  <div className="px-1 py-1.5 mt-4 flex items-center justify-between group">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Presets</span>
                    <span className="text-[9px] text-gray-400 opacity-0 transition-opacity group-hover:opacity-100">Cmd + A for All</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {SOURCE_PRESETS.map(preset => (
                      <button
                        key={preset.id}
                        onClick={() => applyPreset(preset.id)}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-md border transition-colors ${
                          activePreset === preset.id
                            ? 'bg-purple-100 text-purple-700 border-purple-200'
                            : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                        }`}
                        title={preset.description}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>

                  {/* Individual Sources */}
                  <div className="px-1 py-1.5 mt-2 flex items-center justify-between group">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sources</span>
                    <span className="text-[9px] text-gray-400 opacity-0 transition-opacity group-hover:opacity-100">Cmd + 1-6</span>
                  </div>
                  {SOURCES.map(source => (
                    <SidebarItem
                      key={source.id}
                      icon={
                        <div className={`w-5 h-5 rounded-md shadow-sm border flex items-center justify-center transition-all ${
                          activeSources.includes(source.id)
                            ? `${source.activeBgColor} ${source.activeBorderColor}`
                            : 'bg-white border-gray-200 opacity-50'
                        }`}>
                          <span className={`text-xs font-bold transition-colors ${
                            activeSources.includes(source.id) ? source.color : 'text-gray-400'
                          }`}>
                            {source.icon}
                          </span>
                        </div>
                      }
                      title={
                        <div className="flex items-center gap-1.5">
                          <span>{source.name}</span>
                          <span className="text-[9px] text-gray-400 font-normal opacity-0 group-hover:opacity-100 transition-opacity">Cmd+{source.keyboardShortcut}</span>
                        </div>
                      }
                      time={
                        <div className="flex items-center gap-2">
                          <TrustBadge score={source.trustScore} />
                        </div>
                      }
                      isLive={source.freshness === 'realtime'}
                      active={activeSources.includes(source.id)}
                      onClick={() => toggleSource(source.id)}
                    />
                  ))}
                </div>

                <div className="p-4 border-t border-gray-100 shrink-0 bg-white">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-sm"></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-900 truncate">Demo User</div>
                      <div className="text-[10px] text-gray-500 truncate">Pro Plan</div>
                    </div>
                    <MoreHorizontal className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: The Canvas */}
              <div className="flex-1 bg-white flex flex-col h-full relative">

                {/* OMNIBAR - Sticky Command Center - Only shown when content exists */}
                {(latestAssistantText || isRunning) && (
                  <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl px-8 py-6 shrink-0 border-b border-gray-100">
                    <div className="max-w-2xl mx-auto">
                      {/* The Input Container */}
                      <div className="relative w-full h-14 group">
                        {/* Icon (Absolute Left) */}
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10">
                          <Sparkles className="w-5 h-5" />
                        </div>

                        {/* The Actual Input Field */}
                        <input
                          type="text"
                          value={researchPrompt}
                          onChange={(e) => setResearchPrompt(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                              e.preventDefault();
                              handleRunPrompt();
                            }
                          }}
                          className="w-full h-full pl-12 pr-14 rounded-xl border border-gray-200 bg-white text-gray-700 placeholder:text-gray-400 outline-none transition-all focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                          style={{
                            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
                          }}
                          placeholder="Ask anything about companies, markets, or docs..."
                        />

                        {/* Button (Absolute Right) */}
                        <button
                          type="button"
                          onClick={handleRunPrompt}
                          disabled={isRunning}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Generate (Cmd+Enter)"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Helper Text */}
                      <div className="flex gap-2 text-[11px] text-gray-600 font-medium mt-3 justify-center">
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 text-gray-700 px-2.5 py-1 border border-gray-200 shadow-[0_1px_0_rgba(0,0,0,0.03)]">
                          <span className="px-1 py-0.5 rounded bg-white text-[10px] font-semibold border border-gray-300">Cmd</span>
                          <span>Focus</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 text-gray-700 px-2.5 py-1 border border-gray-200 shadow-[0_1px_0_rgba(0,0,0,0.03)]">
                          <span className="px-1 py-0.5 rounded bg-white text-[10px] font-semibold border border-gray-300">Enter</span>
                          <span>Run</span>
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Content Area - Changes based on active tab */}
                {!latestAssistantText && !isRunning && (
                  <div className="flex-1 overflow-y-auto p-6">

                    {/* Dossier Preview */}
                    {activeTab === 'dossier' && (
                      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                        <div className="border-b-2 border-black pb-3 mb-6">
                          <h1 className="text-3xl font-black text-center" style={{ fontFamily: "'Playfair Display', serif" }}>
                            THE DAILY DOSSIER
                          </h1>
                          <p className="text-xs text-center text-gray-500 mt-2">Preview Mode</p>
                        </div>
                        <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
                          Healthcare Seed Funding: A Market Shift
                        </h2>
                        <p className="text-sm text-gray-700 leading-relaxed mb-4">
                          The landscape of healthcare seed funding has undergone a dramatic transformation.
                          Traditional biotech investments are yielding ground to AI-driven diagnostic platforms.
                        </p>
                        <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-4">
                          <p className="text-sm italic text-gray-700">
                            "The integration of generative AI into clinical workflows is becoming the standard for new entrants."
                          </p>
                        </div>
                        <p className="text-xs text-gray-500 mt-6">
                          Run a query to see your personalized dossier here
                        </p>
                      </div>
                    )}

                    {/* Newsletter Preview */}
                    {activeTab === 'newsletter' && (
                      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-center">
                          <h1 className="text-2xl font-bold text-white">Your Research Digest</h1>
                          <p className="text-blue-100 text-sm mt-1">Preview Mode</p>
                        </div>
                        <div className="p-6 space-y-4">
                          <h2 className="text-xl font-bold text-gray-900">Healthcare Seed Funding</h2>
                          <p className="text-sm text-gray-700">
                            Key insights from recent market analysis:
                          </p>
                          <ul className="space-y-2 text-sm text-gray-700">
                            <li className="flex items-start gap-2">
                              <span className="text-blue-600 mt-1">•</span>
                              <span>AI diagnostics seeing 40% higher valuations</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-blue-600 mt-1">•</span>
                              <span>Deal flow increased 15% QoQ despite market slowdown</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-blue-600 mt-1">•</span>
                              <span>VitalWatch AI raised $12M Series A</span>
                            </li>
                          </ul>
                          <p className="text-xs text-gray-500 mt-6 pt-4 border-t">
                            Run a query to generate your personalized newsletter
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Media Preview */}
                    {activeTab === 'media' && (
                      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Media Gallery</h2>
                        <p className="text-sm text-gray-600 mb-6">Preview Mode - Sample Assets</p>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="aspect-video bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <ImageIcon className="w-12 h-12 text-white opacity-50" />
                          </div>
                          <div className="aspect-video bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                            <FileText className="w-12 h-12 text-white opacity-50" />
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 text-center">
                          Run a query to collect images, videos, and documents
                        </p>
                      </div>
                    )}

                  </div>
                )}

                {/* Footer watermark */}
                <div className="absolute bottom-6 w-full text-center">
                  <span className="text-xs text-gray-300 flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3" /> Powered by Nodebench AI Agent
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </>
    );
  }

  // Loading state
  if (isRunning && !latestAssistantText) {
    return (
      <div className="mx-auto max-w-3xl bg-white shadow-2xl rounded-sm min-h-[800px] border-t-4 border-black flex items-center justify-center p-20">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center animate-pulse">
            <Sparkles className="w-8 h-8 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Researching...</h3>
          <p className="text-sm text-gray-600">
            The agent is gathering insights for your dossier
          </p>
        </div>
      </div>
    );
  }

  // Render content with tabs
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Tab Navigation */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setActiveTab('dossier')}
              className={`px-6 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'dossier'
                  ? 'bg-black text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Newspaper className="w-4 h-4" />
              Dossier
            </button>
            <button
              onClick={() => setActiveTab('newsletter')}
              className={`px-6 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'newsletter'
                  ? 'bg-black text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Layout className="w-4 h-4" />
              Newsletter
            </button>
            <button
              onClick={() => setActiveTab('media')}
              className={`px-6 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'media'
                  ? 'bg-black text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              Media
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'newsletter' && (
          <MockNewsletterView
            responseText={responseText || `# Healthcare Seed Funding: A Market Shift Towards AI Diagnostics

The landscape of healthcare seed funding has undergone a dramatic transformation in Q3 2024. Traditional biotech investments are yielding ground to AI-driven diagnostic platforms, driven by recent breakthroughs in multimodal models.

**Key Finding:** Investors are prioritizing platforms that integrate clinical workflow automation with diagnostic capabilities. The "pure play" AI diagnostic tools are seeing a 40% higher valuation multiple compared to standard SaaS health platforms.

> The integration of generative AI into clinical workflows isn't just an efficiency play; it's becoming the standard for new entrants in the digital health space.

## Market Velocity

Deal flow in the sector has increased by 15% QoQ, despite a broader market slowdown. This resilience suggests a decoupling of AI-Health from general tech trends.

## Notable Deals

- **VitalWatch AI** raised $12M Series A for real-time patient monitoring
- **DiagnosticFlow** secured $8M seed for AI-powered pathology
- **CareSync** announced $15M for clinical workflow automation`}
            isLoading={isRunning}
            mediaAssets={mediaAssets.length > 0 ? mediaAssets : [
              { type: 'image', url: 'https://via.placeholder.com/400x300/4F46E5/FFFFFF?text=AI+Diagnostics', title: 'AI Diagnostics Platform', description: 'Next-generation diagnostic tools' },
              { type: 'image', url: 'https://via.placeholder.com/400x300/7C3AED/FFFFFF?text=Healthcare+Tech', title: 'Healthcare Technology', description: 'Innovation in patient care' },
            ]}
            citations={citations}
            sourceAnalytics={sourceAnalytics}
          />
        )}

        {activeTab === 'media' && (
          <MockMediaView
            mediaAssets={mediaAssets.length > 0 ? mediaAssets : [
              { type: 'image', url: 'https://via.placeholder.com/600x400/4F46E5/FFFFFF?text=AI+Infrastructure', title: 'AI Infrastructure Startup', description: 'Leading AI infrastructure company' },
              { type: 'image', url: 'https://via.placeholder.com/600x400/7C3AED/FFFFFF?text=Funding+Round', title: 'Series A Funding', description: '$50M raised for AI platform' },
              { type: 'image', url: 'https://via.placeholder.com/600x400/EC4899/FFFFFF?text=Tech+Innovation', title: 'Technology Innovation', description: 'Breakthrough in machine learning' },
              { type: 'youtube', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', title: 'AI Startup Pitch', description: 'CEO presents vision for AI future' },
              { type: 'pdf', url: '#', title: 'Q3 2024 Market Report', description: 'Comprehensive analysis of AI funding trends' },
              { type: 'sec-document', url: '#', title: 'SEC Filing - Form S-1', description: 'IPO registration statement' },
            ]}
            isLoading={isRunning}
          />
        )}

        {activeTab === 'dossier' && (
          <div className="mx-auto max-w-3xl bg-white shadow-2xl rounded-sm min-h-[800px] border-t-4 border-black relative">
      {/* Privacy Badge */}
      <div className="absolute top-4 right-4 px-3 py-1 bg-black text-white text-[10px] font-bold uppercase tracking-wider rounded">
        Private & Confidential
      </div>

      <div className="p-12 font-serif">
        {/* Masthead */}
        <div className="border-b-4 border-black pb-4 mb-8">
          <div className="text-center border-b border-gray-200 pb-4 mb-3">
            <h1 className="text-5xl font-black tracking-tighter text-black mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              THE DAILY DOSSIER
            </h1>
            <div className="flex items-center justify-center gap-4 text-xs font-bold text-gray-500 uppercase tracking-[0.2em]">
              <span>Intelligence Report</span>
              <span className="w-1 h-1 rounded-full bg-gray-400" />
              <span>Tech Sector</span>
            </div>
          </div>
          <div className="flex justify-between items-end text-xs font-medium text-gray-600 font-sans">
            <div className="flex gap-4">
              <span>Vol. 24, No. 142</span>
              <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <div className="uppercase tracking-wide">Confidential</div>
          </div>
        </div>

        {/* Main Headline */}
        <div className="mb-8">
          <h2 className="text-4xl font-bold leading-[1.1] text-gray-900 mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
            {hasReceivedResponse ? "Live Dossier Preview" : "Healthcare Seed Funding:"} <br />
            <span className="text-gray-600 italic font-serif">
              {hasReceivedResponse ? "Generated from your prompt in real time" : "A Market Shift Towards AI Diagnostics"}
            </span>
          </h2>
          <div className="flex items-center gap-3 text-sm text-gray-500 font-sans mb-6">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600">AI</div>
            <span>{hasReceivedResponse ? "Nodebench Fast Agent" : "Generated by Nodebench Agent"}</span>
            <span className="w-1 h-1 rounded-full bg-gray-300" />
            <span>{isRunning ? "Streaming..." : "5 min read"}</span>
          </div>
        </div>

        {/* Executive Summary Block */}
        <ExecutiveSummaryBlock />

        {/* Stat Cards Grid */}
        <div className="my-8 grid grid-cols-2 gap-4">
          <StatCard label="Total Funding (Q3)" value="$1.2B" change="14% vs Q2" trend="up" />
          <StatCard label="Deal Count" value="42" change="Flat" trend="flat" />
        </div>

        {/* Columns */}
        <div className="grid grid-cols-12 gap-8">
          {/* Main Column */}
          <div className="col-span-8">
            {hasReceivedResponse ? (
              <div className="prose prose-slate max-w-none prose-headings:font-serif prose-headings:font-bold prose-p:text-gray-700 prose-p:leading-relaxed prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-strong:font-semibold prose-blockquote:border-l-4 prose-blockquote:border-purple-500 prose-blockquote:pl-6 prose-blockquote:py-2 prose-blockquote:italic prose-blockquote:text-xl prose-blockquote:text-gray-900 prose-blockquote:bg-purple-50/50 prose-blockquote:rounded-r-lg prose-blockquote:my-8 first-letter:prose-p:first:text-5xl first-letter:prose-p:first:font-bold first-letter:prose-p:first:float-left first-letter:prose-p:first:mr-3 first-letter:prose-p:first:mt-[-6px]">
                {responseText ? (
                  <ReactMarkdown
                    components={{
                      // Transform **Bold Text** into "Entity Chips"
                      strong: ({ node, ...props }) => (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-gray-800 font-semibold text-[0.9em] align-baseline mx-0.5 cursor-pointer hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors">
                          {props.children}
                        </span>
                      ),
                      // Pull quotes for blockquotes
                      blockquote: ({ node, ...props }) => (
                        <blockquote className="my-8 border-l-4 border-purple-500 pl-6 py-2 italic text-xl text-gray-900 font-serif bg-purple-50/50 rounded-r-lg">
                          {props.children}
                        </blockquote>
                      ),
                    }}
                  >
                    {responseText}
                  </ReactMarkdown>
                ) : (
                  <div className="flex items-center justify-center py-12 text-gray-400">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-75" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150" />
                      <span className="ml-2">Loading next update...</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6 text-gray-800 leading-relaxed text-[15px]">
                <p className="first-letter:text-5xl first-letter:font-bold first-letter:float-left first-letter:mr-3 first-letter:mt-[-6px]">
                  The landscape of healthcare seed funding has undergone a dramatic transformation in Q3 2024. Traditional biotech investments are yielding ground to AI-driven diagnostic platforms, driven by recent breakthroughs in multimodal models.
                </p>
                <p>
                  <strong>Key Finding:</strong>{" "}
                  Investors are prioritizing platforms that integrate clinical workflow automation with diagnostic capabilities. The "pure play" AI diagnostic tools are seeing a 40% higher valuation multiple compared to standard SaaS health platforms.
                </p>

                <div className="my-8 p-6 bg-gray-50 border-l-4 border-blue-500 italic text-gray-700">
                  The integration of generative AI into clinical workflows isn't just an efficiency play; it's becoming the standard for new entrants in the digital health space.
                </div>

                <h3 className="text-xl font-bold text-gray-900 mt-8 mb-2">Market Velocity</h3>
                <p>
                  Deal flow in the sector has increased by 15% QoQ, despite a broader market slowdown. This resilience suggests a decoupling of AI-Health from general tech trends.
                </p>
              </div>
            )}

            {/* Media Gallery - Display images and PDFs from tool outputs */}
            {mediaAssets.length > 0 && (
              <div className="my-8">
                <h4 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4 font-sans">Research Assets</h4>
                <div className="grid grid-cols-2 gap-4">
                  {mediaAssets.slice(0, 6).map((asset, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                      {(asset.type === 'image' || asset.type === 'news') && asset.thumbnail && (
                        <div className="aspect-video bg-gray-100 relative">
                          <img
                            src={asset.thumbnail}
                            alt={asset.title || 'Asset'}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      {(asset.type === 'pdf' || asset.type === 'sec-document') && (
                        <div className="aspect-video bg-red-50/50 flex items-center justify-center">
                          <FileText className="w-12 h-12 text-red-600 opacity-50" />
                        </div>
                      )}
                      <div className="p-3 bg-white">
                        <a
                          href={asset.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-gray-900 hover:text-blue-600 line-clamp-2 transition-colors"
                        >
                          {asset.title || 'View Asset'}
                        </a>
                        {asset.toolName && (
                          <div className="text-[10px] text-gray-400 mt-1 font-sans">
                            via {asset.toolName}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Citation Cards - Display sources from linkupSearch */}
            {citations.length > 0 && (
              <div className="my-8">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-gray-500 font-sans">Sources & Citations</h4>
                  <SourceAnalytics analytics={sourceAnalytics} />
                </div>
                <div className="space-y-3">
                  {citations.map((citation: any, idx) => {
                    const source = SOURCES.find(s => s.id === citation.source);
                    return (
                      <a
                        key={idx}
                        href={citation.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 bg-gray-50/50 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/30 transition-all group"
                      >
                        <div className="flex items-start gap-3">
                          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 mt-0.5 transition-colors" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="text-sm font-medium text-gray-900 group-hover:text-blue-700 line-clamp-1 transition-colors flex-1">
                                {citation.title}
                              </div>
                              {source && (
                                <div className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${source.activeBgColor} ${source.color}`}>
                                  {source.shortName}
                                </div>
                              )}
                            </div>
                            {citation.description && (
                              <div className="text-xs text-gray-600 mt-1 line-clamp-2 font-sans">
                                {citation.description}
                              </div>
                            )}
                            {citation.domain && (
                              <div className="text-[10px] text-gray-400 mt-1 font-sans">
                                {citation.domain}
                              </div>
                            )}
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Column */}
          <div className="col-span-4 space-y-6">
            <div className="bg-gray-50 p-4 border border-gray-100">
              <h4 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Key Players</h4>
              <ul className="space-y-3 font-sans text-sm">
                <li className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                    <span className="font-medium truncate">VitalWatch</span>
                  </div>
                  <svg width="40" height="16" className="flex-shrink-0">
                    <polyline
                      points="0,12 10,8 20,10 30,4 40,6"
                      fill="none"
                      stroke="#3B82F6"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  </svg>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0" />
                    <span className="font-medium truncate">MediGen AI</span>
                  </div>
                  <svg width="40" height="16" className="flex-shrink-0">
                    <polyline
                      points="0,10 10,12 20,6 30,8 40,2"
                      fill="none"
                      stroke="#A855F7"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  </svg>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                    <span className="font-medium truncate">CureFlow</span>
                  </div>
                  <svg width="40" height="16" className="flex-shrink-0">
                    <polyline
                      points="0,8 10,5 20,7 30,3 40,4"
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  </svg>
                </li>
              </ul>
            </div>

            <div className="bg-gray-50 p-4 border border-gray-100">
              <h4 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Sentiment</h4>
              <div className="flex items-end gap-2 mb-1">
                <span className="text-3xl font-bold text-emerald-600">84%</span>
                <span className="text-xs text-emerald-600 font-medium mb-1.5">Bullish</span>
              </div>
              <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full w-[84%]" />
              </div>
            </div>
          </div>
        </div>

        {(toolParts.length > 0 || reasoningText || latestAssistantMessage) && (
          <div className="mt-12 border-t border-gray-100 pt-6">
            <button
              type="button"
              onClick={() => setIsReasoningOpen(!isReasoningOpen)}
              className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-purple-600 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              {isReasoningOpen ? "Hide AI Reasoning & Sources" : "View AI Reasoning & Sources"}
              <ChevronDown className={`w-4 h-4 transition-transform ${isReasoningOpen ? 'rotate-180' : ''}`} />
            </button>

            {isReasoningOpen && (
              <div className="mt-4 space-y-4">
                {reasoningText && (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2">Reasoning</div>
                    <pre className="whitespace-pre-wrap text-xs text-gray-700 font-mono">{reasoningText}</pre>
                  </div>
                )}
                {toolParts.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Tool Calls</div>
                      <span className="text-[10px] text-gray-400">{toolParts.length} part(s)</span>
                    </div>
                    <StepTimeline steps={toolPartsToTimelineSteps(toolParts as any)} />
                  </div>
                )}
                {latestAssistantMessage && (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 overflow-x-auto">
                    <div className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold mb-2">
                      Raw Agent Message (truncated schema)
                    </div>
                    <pre className="text-[10px] font-mono text-gray-600 whitespace-pre-wrap">
                      {JSON.stringify(
                        {
                          id: latestAssistantMessage._id ?? latestAssistantMessage.id ?? latestAssistantMessage.messageId,
                          role: latestAssistantMessage.role ?? latestAssistantMessage?.message?.role,
                          text: latestAssistantMessage.text ?? latestAssistantMessage?.message?.text,
                          parts: Array.isArray(latestAssistantMessage.parts)
                            ? latestAssistantMessage.parts.map((p: any) => ({
                              type: p.type,
                              toolName: p.toolName,
                              hasArgs: !!p.args,
                              hasResult: !!(p.result || p.output),
                            }))
                            : undefined,
                        },
                        null,
                        2
                      )}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
        )}
      </div>
    </div>
  );
}

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
              <SourceAnalytics analytics={sourceAnalytics} />
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
  mediaAssets = [],
  isLoading,
}: {
  mediaAssets?: ExtractedAsset[];
  isLoading?: boolean;
}) {
  // Loading state
  if (isLoading && mediaAssets.length === 0) {
    return (
      <div className="mx-auto max-w-5xl bg-white shadow-sm min-h-full border border-gray-200/60 p-20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center animate-pulse">
            <ImageIcon className="w-6 h-6 text-pink-600" />
          </div>
          <p className="text-sm font-medium text-gray-600">Collecting media...</p>
        </div>
      </div>
    );
  }

  // Group media by type
  const images = mediaAssets.filter(a => a.type === 'image' || a.type === 'news');
  const documents = mediaAssets.filter(a => a.type === 'pdf' || a.type === 'sec-document');
  const videos = mediaAssets.filter(a => a.type === 'youtube' || a.type === 'video');

  return (
    <div className="mx-auto max-w-5xl bg-white shadow-sm min-h-full border border-gray-200/60">
      {/* Gallery Header */}
      <div className="border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Media Gallery</h2>
            <p className="text-sm text-gray-500">
              {mediaAssets.length} asset{mediaAssets.length !== 1 ? 's' : ''} collected from research
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            {images.length > 0 && (
              <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full font-medium">
                {images.length} {images.length === 1 ? 'image' : 'images'}
              </span>
            )}
            {documents.length > 0 && (
              <span className="px-2 py-1 bg-red-50 text-red-700 rounded-full font-medium">
                {documents.length} {documents.length === 1 ? 'doc' : 'docs'}
              </span>
            )}
            {videos.length > 0 && (
              <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-full font-medium">
                {videos.length} {videos.length === 1 ? 'video' : 'videos'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="p-8">
        <div className="grid grid-cols-3 gap-4">
          {mediaAssets.map((asset, idx) => (
            <a
              key={idx}
              href={asset.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative border border-gray-200 rounded-lg overflow-hidden hover:border-blue-300 hover:shadow-lg transition-all duration-300"
            >
              {/* Asset Preview */}
              {(asset.type === 'image' || asset.type === 'news') && asset.thumbnail && (
                <div className="aspect-square bg-gray-100 overflow-hidden">
                  <img
                    src={asset.thumbnail}
                    alt={asset.title || 'Media asset'}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
              {(asset.type === 'pdf' || asset.type === 'sec-document') && (
                <div className="aspect-square bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
                  <FileText className="w-16 h-16 text-red-600 opacity-50" />
                </div>
              )}
              {(asset.type === 'youtube' || asset.type === 'video') && (
                <div className="aspect-square bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center relative">
                  {asset.thumbnail ? (
                    <img src={asset.thumbnail} alt={asset.title || 'Video'} className="w-full h-full object-cover" />
                  ) : (
                    <Activity className="w-16 h-16 text-purple-600 opacity-50" />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                      <ChevronRight className="w-6 h-6 text-gray-900 ml-0.5" />
                    </div>
                  </div>
                </div>
              )}

              {/* Asset Info Overlay */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-xs font-medium line-clamp-2">
                  {asset.title || 'Untitled'}
                </p>
                {asset.toolName && (
                  <p className="text-[10px] text-white/70 mt-1">
                    via {asset.toolName}
                  </p>
                )}
              </div>

              {/* Type Badge */}
              <div className="absolute top-2 right-2 px-2 py-1 bg-black/50 backdrop-blur-sm rounded text-[10px] text-white font-medium uppercase tracking-wide">
                {asset.type}
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
