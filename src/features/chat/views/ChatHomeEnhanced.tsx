/**
 * ChatHomeEnhanced — Chat surface with ObjectFirst layout integration.
 *
 * This wraps the existing ChatHome with the new object-first two-column layout
 * when the feature flag is enabled. Falls back to legacy ChatHome when disabled.
 */

import React, { useState, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { ObjectFirstSurfaceHost } from "@/layouts/ObjectFirstSurfaceHost";
import type { ArtifactTab } from "@/features/artifacts/components/ArtifactTabs";
import type { LensId } from "@/features/controlPlane/components/searchTypes";
import type { ArtifactMode, ArtifactState } from "@/features/artifacts/context/ArtifactContext";
import { ChatHome as LegacyChatHome } from "./ChatHome";
import { useFeatureFlag } from "@/lib/featureFlags";

// Types matching the ObjectFirstSurfaceHost expectations
interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: Date;
  suggestions?: Array<{
    id: string;
    label: string;
    onClick: () => void;
  }>;
}

interface ArtifactSection {
  id: string;
  title: string;
  content: string;
  confidence?: "high" | "medium" | "low";
  sourceCount?: number;
}

interface ArtifactSource {
  id: string;
  title: string;
  domain: string;
  confidence: number;
  url?: string;
}

interface ActivityEvent {
  id: string;
  type: "created" | "updated" | "synced" | "exported";
  description: string;
  timestamp: Date;
}

/**
 * ChatHomeEnhanced — Object-first integrated chat surface.
 *
 * Usage:
 * - Automatically detects feature flag
 * - Renders ObjectFirst layout when enabled
 * - Falls back to legacy ChatHome when disabled
 * - URL opt-in: ?layout=object-first or ?ff_object-first-chat=1
 */
export function ChatHomeEnhanced() {
  // Check feature flag
  const objectFirstEnabled = useFeatureFlag("object-first-chat");

  // State for object-first mode
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ArtifactTab>("brief");
  const [mode, setMode] = useState<ArtifactMode>("quick");
  const [lens, setLens] = useState<LensId>("founder");
  const [entityState, setEntityState] = useState<ArtifactState>("draft");

  // Get entity name from URL
  const [searchParams] = useSearchParams();
  const entityName = searchParams.get("entity") || "New Research";

  // Handle submit
  const handleSubmit = useCallback(() => {
    if (!inputValue.trim()) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    setEntityState("syncing");

    // Simulate response
    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `I've processed your request about "${inputValue}". Check the ${activeTab} tab for details.`,
        timestamp: new Date(),
        suggestions: [
          {
            id: "continue",
            label: "Continue research",
            onClick: () => {},
          },
          {
            id: "export",
            label: "Export results",
            onClick: () => {},
          },
        ],
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
      setEntityState("synced");
    }, 1500);
  }, [inputValue, activeTab]);

  // Quick actions
  const quickActions = useMemo(
    () => [
      {
        id: "open-report",
        label: "Open report",
        onClick: () => setActiveTab("notebook"),
      },
      {
        id: "continue-research",
        label: "Continue research",
        onClick: () => {},
      },
      {
        id: "export",
        label: "Export memo",
        onClick: () => {},
      },
    ],
    []
  );

  // Sample artifact data (would come from API in production)
  const artifactSections: ArtifactSection[] = useMemo(
    () => [
      {
        id: "what-it-is",
        title: "What it is",
        content: entityName === "Stripe"
          ? "Stripe is a technology company that builds economic infrastructure for the internet. Businesses of every size use their software to accept payments and manage their businesses online."
          : `Research about ${entityName} will appear here.`,
        confidence: "high",
        sourceCount: 12,
      },
      {
        id: "why-it-matters",
        title: "Why it matters",
        content: entityName === "Stripe"
          ? "Stripe has become the default payment infrastructure for online businesses, processing hundreds of billions in payments annually."
          : "Key insights will be generated based on your research query.",
        confidence: "high",
        sourceCount: 8,
      },
      {
        id: "whats-missing",
        title: "What is missing",
        content: entityName === "Stripe"
          ? "Recent regulatory scrutiny on payment processors, competition from Adyen and Square, and their withdrawal from crypto payments are key gaps."
          : "Missing evidence and open questions will appear here.",
        confidence: "medium",
        sourceCount: 5,
      },
      {
        id: "next-steps",
        title: "What to do next",
        content: entityName === "Stripe"
          ? "1. Review Stripe's latest earnings call for growth metrics\n2. Compare their developer satisfaction scores to competitors\n3. Assess the impact of their recent pricing changes"
          : "A concrete next move will appear here based on your research goals.",
        confidence: "high",
        sourceCount: 3,
      },
    ],
    [entityName]
  );

  const artifactSources: ArtifactSource[] = useMemo(
    () => [
      {
        id: "1",
        title: "Company Overview",
        domain: "stripe.com",
        confidence: 95,
      },
      {
        id: "2",
        title: "Annual Report 2024",
        domain: "sec.gov",
        confidence: 98,
      },
      {
        id: "3",
        title: "Payment Processing Market Analysis",
        domain: "reuters.com",
        confidence: 88,
      },
    ],
    []
  );

  const activity: ActivityEvent[] = useMemo(
    () => [
      {
        id: "1",
        type: "created",
        description: "Research artifact created",
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
      },
      {
        id: "2",
        type: "synced",
        description: "Synced with latest company data",
        timestamp: new Date(Date.now() - 1000 * 60 * 5),
      },
    ],
    []
  );

  // If object-first is not enabled, render legacy ChatHome
  if (!objectFirstEnabled) {
    return <LegacyChatHome />;
  }

  // Render ObjectFirst layout
  return (
    <ObjectFirstSurfaceHost
      surfaceId="workspace"
      entityName={entityName}
      entityState={entityState}
      mode={mode}
      onModeChange={setMode}
      syncStatus="Synced 5m ago"
      sourceCount={12}
      lens={lens}
      onLensChange={setLens}
      messages={messages}
      isLoading={isLoading}
      inputValue={inputValue}
      onInputChange={setInputValue}
      onSubmit={handleSubmit}
      quickActions={quickActions}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      artifactTitle={`${entityName} Research`}
      artifactType="report"
      artifactSections={artifactSections}
      artifactSources={artifactSources}
      artifactActivity={activity}
      lastUpdated={new Date(Date.now() - 1000 * 60 * 5)}
      confidenceScore={87}
      isEmpty={messages.length === 0}
    >
      <LegacyChatHome />
    </ObjectFirstSurfaceHost>
  );
}

export default ChatHomeEnhanced;
