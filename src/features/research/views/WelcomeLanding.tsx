import React, { useCallback } from "react";
import { EvidenceProvider } from "@/features/research/contexts/EvidenceContext";
import { useFastAgent } from "@/features/agents/context/FastAgentContext";
import type { FeedItem } from "@/features/research/components/FeedCard";
import {
  BriefingSection,
  DashboardSection,
  DealListSection,
  DigestSection,
  FeedSection,
} from "@/features/research/sections";

export interface WelcomeLandingProps {
  onDocumentSelect?: (documentId: string) => void;
  onEnterWorkspace?: () => void;
  /** When true, renders content-only (no sidebar/header) for use inside MainLayout */
  embedded?: boolean;
  /** Source toggles from parent (MainLayout) - used in embedded mode */
  activeSources?: string[];
  onToggleSource?: (sourceId: string) => void;
}

export default function WelcomeLanding(props: WelcomeLandingProps) {
  const {
    embedded = false,
    onDocumentSelect: _onDocumentSelect,
    onEnterWorkspace: _onEnterWorkspace,
    activeSources: _activeSources,
    onToggleSource: _onToggleSource,
  } = props;

  const { openWithContext } = useFastAgent();

  const handleFeedItemClick = useCallback((item: FeedItem) => {
    if (item.url) {
      window.open(item.url, "_blank", "noopener,noreferrer");
      return;
    }

    openWithContext({
      contextTitle: item.title,
      initialMessage: `Analyze this feed item and summarize key takeaways.\n\n${item.title}${item.subtitle ? `\n\n${item.subtitle}` : ""}`,
    });
  }, [openWithContext]);

  const handleFeedOpenWithAgent = useCallback((item: FeedItem) => {
    openWithContext({
      contextTitle: item.title,
      contextWebUrls: item.url ? [item.url] : undefined,
      initialMessage: `Deep dive on: ${item.title}\n\nWhat happened, why it matters, and what to watch next?`,
    });
  }, [openWithContext]);

  const handleDigestItemClick = useCallback((item: { text: string; relevance?: string; linkedEntity?: string }) => {
    openWithContext({
      contextTitle: item.linkedEntity ? `Digest: ${item.linkedEntity}` : "Morning Digest",
      initialMessage: `Expand on this digest item:\n\n${item.text}`,
    });
  }, [openWithContext]);

  const handleAskAI = useCallback((prompt: string) => {
    openWithContext({
      contextTitle: "Executive Brief",
      initialMessage: prompt,
    });
  }, [openWithContext]);

  const handleDashboardPointClick = useCallback((point: { seriesId: string; dataIndex: number; dataLabel: string; value: number; unit?: string }) => {
    openWithContext({
      contextTitle: "Dashboard",
      initialMessage: `Analyze this chart point:\n- Series: ${point.seriesId}\n- Point: ${point.dataLabel}\n- Value: ${point.value}${point.unit ?? ""}\n\nWhat changed, what it implies, and the next actions to consider.`,
    });
  }, [openWithContext]);

  return (
    <EvidenceProvider>
      <div className={`${embedded ? "h-full" : "h-screen"} flex flex-col bg-[#F9FAFB] overflow-hidden`}>
        {!embedded && (
          <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4">
            <div className="text-sm font-semibold text-gray-900">Research</div>
          </header>
        )}

        <main className="flex-1 grid grid-cols-12 gap-0 overflow-hidden min-h-0">
          {/* LEFT: Live Feed */}
          <aside className="col-span-3 border-r border-gray-200 bg-white min-h-0 overflow-y-auto">
            <div className="p-4">
              <FeedSection
                onItemClick={handleFeedItemClick}
                onOpenWithAgent={handleFeedOpenWithAgent}
              />
            </div>
          </aside>

          {/* CENTER: Digest + Briefing */}
          <section className="col-span-6 bg-[#F9FAFB] min-h-0 overflow-y-auto">
            <div className="max-w-4xl mx-auto w-full p-6 space-y-8">
              <DigestSection onItemClick={handleDigestItemClick} />
              <BriefingSection onAskAI={handleAskAI} />
            </div>
          </section>

          {/* RIGHT: Dashboard + Deals */}
          <aside className="col-span-3 border-l border-gray-200 bg-white min-h-0 overflow-hidden flex flex-col">
            <div className="flex-1 min-h-0 overflow-y-auto p-3">
              <DashboardSection onDataPointClick={handleDashboardPointClick} />
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto border-t border-gray-200 bg-gray-50/50">
              <div className="p-3 border-b border-gray-100 font-medium text-xs text-gray-500 uppercase tracking-wider">
                Recent Deal Flow
              </div>
              <div className="p-3">
                <DealListSection />
              </div>
            </div>
          </aside>
        </main>
      </div>
    </EvidenceProvider>
  );
}

