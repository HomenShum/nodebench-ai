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

import HeroSection from "./HeroSection";

// ... existing imports

const SectionRenderer = ({ section, onVisible, isLast = false }: SectionRendererProps) => {
  const { ref, inView } = useInView({ threshold: 0.5 });

  useEffect(() => {
    if (inView) onVisible();
  }, [inView, onVisible]);

  return (
    <div ref={ref} className="relative mb-32 min-h-[60vh] scroll-mt-32 pl-8 xl:pl-4">
      {/* Timeline Connector Line - Simplified for Clean Look */}
      {!isLast && (
        <div className="absolute left-0 top-10 bottom-[-128px] w-px bg-gray-200 hidden xl:block" />
      )}
      {/* Timeline Dot - Static Minimalist */}
      <div className="absolute left-[-4px] top-[14px] hidden xl:block">
        <div className="h-2.5 w-2.5 rounded-full bg-gray-900 ring-4 ring-[#fbfaf2]"></div>
      </div>

      {/* Date Badge */}
      <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/50 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500 backdrop-blur-sm">
        {section.meta.date}
      </span>

      {/* Section Title - Clean Sans */}
      <h2 className="mb-6 text-4xl font-medium tracking-tight text-gray-900 leading-[1.1]">
        {section.meta.title}
      </h2>

      {/* Narrative Body - Clean Sans */}
      <div className="prose prose-lg prose-slate text-gray-600 leading-loose max-w-none not-italic">
        {section.content.body.map((paragraph, idx) => (
          <p key={idx} className="mb-6 last:mb-0">
            {parseSmartLinks(paragraph, (section.smartLinks ?? {}) as Record<string, { summary: string; source?: string }>)}
          </p>
        ))}
      </div>

      {section.content.deepDives.length > 0 && (
        <div className="mt-8 space-y-4">
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
    <div className="w-full pb-32">
      {/* Daily Briefing Header */}
      {showGuestBadge && (
        <HeroSection
          todayFormatted={todayFormatted}
          sectionCount={sectionCount}
          readTimeMin={Math.ceil(sectionCount * 2.5)}
          isLiveData_={isLiveData}
        />
      )}

      {/* Mobile/Tablet Compact Dashboard (Sticky Top) */}
      <div className="lg:hidden relative mt-6 mb-8 mx-4 bg-[#fbfaf2]/90 backdrop-blur-sm border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-gray-900">{activeData.phaseLabel || "Briefing"}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] text-gray-500 uppercase font-medium">Sentiment</div>
              <div className="text-sm font-bold text-gray-900">{activeData.marketSentiment}/100</div>
            </div>
          </div>
        </div>
        {/* Progress Bar */}
        <div className="mt-3 h-1 w-full rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full bg-gray-900 transition-all duration-1000 ease-out"
            style={{ width: `${activeData.marketSentiment}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto">
        <div className="lg:col-span-7 xl:col-span-8 pb-24 relative">
          {sourceData.length === 0 && (
            <div className="p-8 text-center text-gray-500 bg-white/50 rounded-xl border border-gray-100">
              <p>No briefing data available for this view.</p>
            </div>
          )}
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
          <div className="sticky top-24 min-h-[400px]">
            <DashboardPanel data={activeData} />
          </div>
        </div>
      </div>

      {/* Footer / CTA for Guests */}
      {showGuestBadge && (
        <div className="mt-24 border-t border-gray-200 pt-16 text-center">
          <h3 className="mb-4 text-2xl font-medium text-gray-900">
            Dive deeper with your own data
          </h3>
          <p className="mx-auto mb-8 max-w-xl text-gray-500">
            Connect your workspace to generate personalized intelligence briefings,
            track your specific deals, and get real-time market alerts.
          </p>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-105 hover:bg-gray-800"
          >
            <span>Start Free Trial</span>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </button>
          <p className="mt-6 text-xs text-gray-400">
            No credit card required · SOC2 Compliant
          </p>
        </div>
      )}
    </div>
  );
};

export default ScrollytellingLayout;
