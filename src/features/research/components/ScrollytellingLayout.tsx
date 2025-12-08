import React, { useEffect, useMemo, useRef, useState } from "react";
import DashboardPanel from "./DashboardPanel";
import SmartLink from "./SmartLink";
import DeepDiveAccordion from "./DeepDiveAccordion";
import streamData from "@/features/research/content/researchStream.json";

// Define a proper type to avoid JSON inference issues
export interface ScrollySection {
  id: string;
  meta: { date: string; title: string };
  content: {
    body: string[];
    deepDives: Array<{ title: string; content: string }>;
  };
  dashboard: {
    phaseLabel: string;
    kpis: Array<{ label: string; value: number; unit: string; color: string }>;
    marketSentiment: number;
    activeRegion: string;
  };
  smartLinks?: Record<string, { summary: string; source?: string }>;
}

// Lightweight intersection observer hook to avoid external dependency
const useInView = (options?: IntersectionObserverInit) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => setInView(entry.isIntersecting));
      },
      options ?? { threshold: 0.5 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [options]);

  return { ref, inView };
};

const parseSmartLinks = (text: string, linksData?: Record<string, { summary: string; source?: string }>) => {
  // Basic parser for <SmartLink id='x'>Label</SmartLink> tags
  const regex = /<SmartLink id=['"]([^'"]+)['"]>(.*?)<\/SmartLink>/g;
  const parts: Array<string | { id: string; label: string }> = [];
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push({ id: match[1], label: match[2] });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.map((part, idx) => {
    if (typeof part === "string") return <React.Fragment key={idx}>{part}</React.Fragment>;
    const link = linksData?.[part.id];
    return (
      <SmartLink key={`${part.id}-${idx}`} summary={link?.summary} source={link?.source}>
        {part.label}
      </SmartLink>
    );
  });
};

interface SectionRendererProps {
  section: ScrollySection;
  onVisible: () => void;
  isLast?: boolean;
}

const SectionRenderer = ({ section, onVisible, isLast = false }: SectionRendererProps) => {
  const { ref, inView } = useInView({ threshold: 0.5 });

  useEffect(() => {
    if (inView) onVisible();
  }, [inView, onVisible]);

  return (
    <div ref={ref} className="relative mb-24 min-h-[40vh] scroll-mt-24 pl-6 xl:pl-0">
      {/* Timeline Connector Line */}
      {!isLast && (
        <div className="absolute left-0 top-8 bottom-[-96px] w-px bg-gradient-to-b from-indigo-200 to-transparent hidden xl:block" />
      )}
      {/* Timeline Dot */}
      <div className="absolute left-[-4px] top-[10px] w-2 h-2 rounded-full bg-indigo-500 ring-4 ring-indigo-50 hidden xl:block" />

      {/* Date Badge */}
      <span className="mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-700">
        {section.meta.date}
      </span>

      {/* Section Title - Editorial Serif */}
      <h2 className="mb-4 font-serif text-2xl font-bold tracking-tight text-gray-900 leading-snug">
        {section.meta.title}
      </h2>

      {/* Narrative Body - Serif for Editorial Feel */}
      <div className="prose prose-base prose-slate font-serif text-gray-700 leading-relaxed max-w-none">
        {section.content.body.map((paragraph, idx) => (
          <p key={idx} className="mb-4 last:mb-0">
            {parseSmartLinks(paragraph, (section.smartLinks ?? {}) as Record<string, { summary: string; source?: string }>)}
          </p>
        ))}
      </div>

      {section.content.deepDives.length > 0 && (
        <div className="mt-6 space-y-4">
          {section.content.deepDives.map((dd, idx) => (
            <DeepDiveAccordion key={idx} title={dd.title} content={dd.content} />
          ))}
        </div>
      )}
    </div>
  );
};

interface ScrollytellingLayoutProps {
  data?: ScrollySection[];
  /** If true, shows the "free daily" badge and sign-in prompt */
  isGuestMode?: boolean;
}

export const ScrollytellingLayout: React.FC<ScrollytellingLayoutProps> = ({ data, isGuestMode }) => {
  // Priority: props data > static fallback
  const sourceData = useMemo(() => {
    if (data && data.length) return data;
    return streamData as unknown as ScrollySection[];
  }, [data]);
  
  const showGuestBadge = isGuestMode ?? !data?.length;
  const isLiveData = false;
  
  const initial = useMemo(
    () =>
      sourceData[0]?.dashboard ?? {
        phaseLabel: "",
        kpis: [],
        marketSentiment: 0,
        activeRegion: "",
      },
    [sourceData],
  );
  const [activeData, setActiveData] = useState(initial);

  // Generate today's date for the header
  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
  }, []);

  const sectionCount = sourceData.length;

  return (
    <div className="w-full py-8">
      {/* Daily Briefing Header */}
      {showGuestBadge && (
        <header className="mb-12 pb-8 border-b border-gray-100">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-sm">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  Free Daily Briefing
                </span>
                <span className="text-xs text-gray-500 font-medium">{todayFormatted}</span>
                {isLiveData && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold uppercase">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                    Live
                  </span>
                )}
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-2">
                {"AI Intelligence Dossier"}
              </h1>
              <p className="text-gray-600 max-w-2xl">
                Your daily synthesis of AI infrastructure funding, emerging trends, and technical deep dives. 
                {isLiveData ? " Generated fresh by our deep research agents." : " Updated every morning by our research agents."}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="text-right text-xs text-gray-500">
                <span className="font-medium text-gray-700">{sectionCount} sections</span> · {Math.ceil(sectionCount * 2.5)} min read
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${isLiveData ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                  {isLiveData ? "AI-Generated" : "Sample Data"}
                </span>
              </div>
            </div>
          </div>
          
          {/* Sign-in prompt for personalized content */}
          <div className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-indigo-50/30 rounded-xl border border-gray-100">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Want personalized dossiers?</p>
                  <p className="text-xs text-gray-500">Sign in to get AI-generated reports on your deals, watchlist, and custom topics.</p>
                </div>
              </div>
              <button 
                type="button"
                className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
              >
                Sign in free
              </button>
            </div>
          </div>
        </header>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7 xl:col-span-8 pb-24 relative">
          {sourceData.map((section, idx) => (
            <SectionRenderer
              key={section.id}
              section={section as ScrollySection}
              onVisible={() => setActiveData(section.dashboard)}
              isLast={idx === sourceData.length - 1}
            />
          ))}
        </div>
        <div className="hidden lg:block lg:col-span-5 xl:col-span-4">
          <div className="sticky top-12 min-h-[400px] rounded-xl border border-gray-200 bg-white shadow-sm p-6 ring-1 ring-black/5">
            <DashboardPanel data={activeData} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScrollytellingLayout;
