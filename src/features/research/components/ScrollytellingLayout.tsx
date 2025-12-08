import React, { useEffect, useMemo, useRef, useState } from "react";
import DashboardPanel from "./DashboardPanel";
import SmartLink from "./SmartLink";
import DeepDiveAccordion from "./DeepDiveAccordion";
import streamData from "@/features/research/content/researchStream.json";

export type ScrollySection = (typeof streamData)[number];

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

const parseSmartLinks = (text: string, linksData: ScrollySection["smartLinks"]) => {
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

const SectionRenderer = ({ section, onVisible }: { section: ScrollySection; onVisible: () => void }) => {
  const { ref, inView } = useInView({ threshold: 0.5, triggerOnce: false });

  useEffect(() => {
    if (inView) onVisible();
  }, [inView, onVisible]);

  return (
    <div ref={ref} className="mb-32 min-h-[50vh] scroll-mt-24">
      <span className="mb-2 block font-mono text-xs uppercase tracking-widest text-indigo-600">{section.meta.date}</span>
      <h2 className="mb-6 font-serif text-3xl font-bold text-gray-900">{section.meta.title}</h2>

      <div className="prose prose-lg prose-slate text-gray-700">
        {section.content.body.map((paragraph, idx) => (
          <p key={idx}>{parseSmartLinks(paragraph, section.smartLinks)}</p>
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

export const ScrollytellingLayout: React.FC<{ data?: ScrollySection[] }> = ({ data }) => {
  const sourceData = data && data.length ? data : (streamData as ScrollySection[]);
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

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
        <div className="lg:col-span-7 xl:col-span-8 pb-96">
          {sourceData.map((section) => (
            <SectionRenderer key={section.id} section={section as ScrollySection} onVisible={() => setActiveData(section.dashboard)} />
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
