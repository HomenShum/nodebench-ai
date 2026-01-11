import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import DashboardPanel from "./DashboardPanel";
import SmartLink from "./SmartLink";
import DeepDiveAccordion from "./DeepDiveAccordion";
import dossierStream from "../content/dossierStream.json";
import { Sparkles, Loader2, Shield } from "lucide-react";

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
    kpis: Array<{ label: string; value: number; unit: string; color: string; prefix?: string }>;
    marketSentiment?: number;
    activeRegion?: string;
    fundingChart?: { seed: number; seriesA: number; valuation: number };
    roiChart?: { currentCost: number; withNodeBench: number; savingsPercent: number };
    investorLogos?: string[];
  };
  smartLinks?: Record<string, { summary: string; source?: string }>;
}

// Lightweight intersection observer hook to avoid extra deps
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
      options ?? { threshold: 0.5 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [options]);

  return { ref, inView };
};

const parseSmartLinks = (text: string, linksData?: Record<string, { summary: string; source?: string }>) => {
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
    <div ref={ref} className="relative mb-32 min-h-[50vh] scroll-mt-24 pl-8 xl:pl-0">
      {/* Timeline Connector Line */}
      {!isLast && (
        <div className="absolute left-0 top-10 bottom-[-128px] w-px bg-gradient-to-b from-indigo-200 to-transparent hidden xl:block" />
      )}
      {/* Timeline Dot */}
      <div className="absolute left-[-4px] top-[10px] w-2 h-2 rounded-full bg-indigo-500 ring-4 ring-indigo-50 hidden xl:block" />

      {/* Date Badge */}
      <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 font-mono text-xs font-semibold uppercase tracking-widest text-indigo-700">
        {section.meta.date}
      </span>

      {/* Section Title - Editorial Serif */}
      <h2 className="mb-6 font-serif text-3xl font-bold tracking-tight text-[color:var(--text-primary)] leading-tight">
        {section.meta.title}
      </h2>

      {/* Narrative Body - Serif for Editorial Feel */}
      <div className="prose prose-lg prose-slate font-serif text-[color:var(--text-primary)] leading-relaxed">
        {section.content.body.map((paragraph, idx) => (
          <p key={idx} className="mb-4 last:mb-0">
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

type Props = {
  data?: ScrollySection[];
};

export const ScrollytellingLayout: React.FC<Props> = ({ data }) => {
  const sourceData = data && data.length ? data : (dossierStream as unknown as ScrollySection[]);
  const initial = useMemo(
    () =>
      sourceData[0]?.dashboard ?? {
        phaseLabel: "",
        kpis: [],
        marketSentiment: 0,
        activeRegion: "",
      },
    [sourceData]
  );
  const [activeData, setActiveData] = useState(initial);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  // Agent action for analyzing email intelligence content
  const analyzeWithAgent = useAction(api.domains.agents.arbitrage.agent.research);

  const handleAnalyzeIntelligence = useCallback(async () => {
    if (isAnalyzing) return;
    
    setIsAnalyzing(true);
    try {
      // Compile all section content for analysis
      const contentSummary = sourceData.map(section => 
        `${section.meta.title}: ${section.content.body.join(' ')}`
      ).join('\n\n');

      const result = await analyzeWithAgent({
        prompt: `Analyze this email intelligence dossier using receipts-first research. Verify key claims, identify contradictions between sources, and rank source quality:\n\n${contentSummary.slice(0, 4000)}`,
        model: 'gpt-4o',
      });
      
      setAnalysisResult(typeof result === 'string' ? result : JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('[ScrollytellingLayout] Agent analysis failed:', error);
      setAnalysisResult('Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [sourceData, isAnalyzing, analyzeWithAgent]);

  if (!sourceData.length) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      {/* AI Analysis Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[color:var(--border-color)]">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-600" />
          <span className="text-sm font-medium text-[color:var(--text-primary)]">Email Intelligence Dossier</span>
        </div>
        <button
          onClick={handleAnalyzeIntelligence}
          disabled={isAnalyzing}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Verify with AI
            </>
          )}
        </button>
      </div>

      {/* Analysis Result (if any) */}
      {analysisResult && (
        <div className="mb-8 p-4 rounded-lg bg-indigo-50 border border-indigo-200">
          <h4 className="text-sm font-semibold text-indigo-900 mb-2">AI Verification Result</h4>
          <p className="text-sm text-indigo-800 whitespace-pre-wrap">{analysisResult}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
        <div className="lg:col-span-7 xl:col-span-8 pb-96 relative">
          {sourceData.map((section, idx) => (
            <SectionRenderer
              key={section.id}
              section={section}
              onVisible={() => setActiveData(section.dashboard)}
              isLast={idx === sourceData.length - 1}
            />
          ))}
        </div>
        <div className="hidden lg:block lg:col-span-5 xl:col-span-4">
          <div className="sticky top-12 min-h-[400px] rounded-xl border border-[color:var(--border-color)] bg-[color:var(--bg-primary)] shadow-sm p-6 ring-1 ring-black/5">
            <DashboardPanel data={activeData} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScrollytellingLayout;
