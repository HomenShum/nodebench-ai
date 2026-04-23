/**
 * ObjectFirstDemo — Demo view showcasing the new object-first layout.
 *
 * This is a standalone page that demonstrates the redesigned layout
 * with the ObjectBar, ChatLane, and ArtifactHost components.
 */

import React, { useState, useCallback } from "react";
import { ObjectFirstLayout } from "@/layouts/ObjectFirstLayout";
import { ChatLane } from "@/features/chat/components/ChatLane";
import { ArtifactHost } from "@/features/artifacts/components/ArtifactHost";
import type { ArtifactTab } from "@/features/artifacts/components/ArtifactTabs";
import type { LensId } from "@/features/controlPlane/components/searchTypes";
import type { ArtifactMode, ArtifactState } from "@/features/artifacts/context/ArtifactContext";

// Demo data
const DEMO_SECTIONS = [
  {
    id: "what-it-is",
    title: "What it is",
    content:
      "Stripe is a technology company that builds economic infrastructure for the internet. Businesses of every size—from new startups to public companies—use their software to accept payments and manage their businesses online.",
    confidence: "high" as const,
    sourceCount: 12,
  },
  {
    id: "why-it-matters",
    title: "Why it matters",
    content:
      "Stripe has become the default payment infrastructure for online businesses, processing hundreds of billions in payments annually. Their developer-first approach and comprehensive API suite have made them the standard for internet commerce.",
    confidence: "high" as const,
    sourceCount: 8,
  },
  {
    id: "whats-missing",
    title: "What is missing",
    content:
      "Recent regulatory scrutiny on payment processors, competition from Adyen and Square, and their withdrawal from crypto payments are key gaps to investigate further.",
    confidence: "medium" as const,
    sourceCount: 5,
  },
  {
    id: "next-steps",
    title: "What to do next",
    content:
      "1. Review Stripe's latest earnings call for growth metrics\n2. Compare their developer satisfaction scores to competitors\n3. Assess the impact of their recent pricing changes",
    confidence: "high" as const,
    sourceCount: 3,
  },
];

const DEMO_SOURCES = [
  {
    id: "1",
    title: "Stripe Q4 2024 Earnings Report",
    domain: "stripe.com",
    confidence: 95,
    url: "#",
  },
  {
    id: "2",
    title: "Stripe Press - Company Overview",
    domain: "stripe.com",
    confidence: 98,
    url: "#",
  },
  {
    id: "3",
    title: "The Developer Experience of Stripe vs Adyen",
    domain: "medium.com",
    confidence: 72,
    url: "#",
  },
  {
    id: "4",
    title: "Payment Processing Market Analysis 2024",
    domain: "reuters.com",
    confidence: 88,
    url: "#",
  },
  {
    id: "5",
    title: "Stripe's Developer-First Strategy",
    domain: "techcrunch.com",
    confidence: 85,
    url: "#",
  },
];

const DEMO_ACTIVITY = [
  {
    id: "1",
    type: "created" as const,
    description: "Research artifact created",
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
  },
  {
    id: "2",
    type: "updated" as const,
    description: "Added sources from SEC filings",
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
  },
  {
    id: "3",
    type: "synced" as const,
    description: "Synced with latest company data",
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
  },
];

const DEMO_FILES = [
  {
    id: "1",
    name: "Stripe-Research-2024.pdf",
    type: "PDF",
    size: "2.4 MB",
  },
  {
    id: "2",
    name: "competitor-analysis.csv",
    type: "CSV",
    size: "156 KB",
  },
];

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestions?: { id: string; label: string; onClick: () => void }[];
}

export function ObjectFirstDemo() {
  // Object state
  const [objectName, setObjectName] = useState("Stripe");
  const [objectState, setObjectState] = useState<ArtifactState>("synced");
  const [mode, setMode] = useState<ArtifactMode>("quick");
  const [activeTab, setActiveTab] = useState<ArtifactTab>("brief");
  const [isTracked, setIsTracked] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "I've created a research brief on Stripe. What would you like to explore next?",
      suggestions: [
        {
          id: "deep-dive",
          label: "Deep dive on competitors",
          onClick: () => handleSuggestion("Tell me about Stripe's main competitors"),
        },
        {
          id: "financials",
          label: "Latest financials",
          onClick: () => handleSuggestion("What are Stripe's latest financial metrics?"),
        },
        {
          id: "export",
          label: "Export report",
          onClick: () => console.log("Export"),
        },
      ],
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lens, setLens] = useState<LensId>("investor");

  const handleSuggestion = useCallback((text: string) => {
    setInputValue(text);
    // Auto-submit after a brief delay
    setTimeout(() => {
      handleSubmit();
    }, 100);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!inputValue.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    // Simulate assistant response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `I've updated the research with information about "${inputValue}". Check the ${activeTab} tab for the latest findings.`,
        suggestions: [
          {
            id: "continue",
            label: "Continue research",
            onClick: () => handleSuggestion("Tell me more"),
          },
          {
            id: "export",
            label: "Export to PDF",
            onClick: () => console.log("Export"),
          },
        ],
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);

      // Update sync state
      setObjectState("synced");
    }, 1500);
  }, [inputValue, activeTab]);

  const handleModeChange = useCallback((newMode: ArtifactMode) => {
    setMode(newMode);
    setObjectState(newMode === "deep" ? "syncing" : "synced");
    // Simulate mode change effect
    setTimeout(() => {
      setObjectState("synced");
    }, 500);
  }, []);

  const quickActions = [
    {
      id: "open-report",
      label: "Open full report",
      onClick: () => setActiveTab("notebook"),
    },
    {
      id: "compare",
      label: "Compare to Adyen",
      onClick: () => handleSuggestion("Compare Stripe to Adyen"),
    },
    {
      id: "export",
      label: "Export memo",
      onClick: () => console.log("Export"),
    },
  ];

  return (
    <ObjectFirstLayout
      objectName={objectName}
      objectState={objectState}
      mode={mode}
      onModeChange={handleModeChange}
      syncStatus="Synced 5m ago"
      sourceCount={12}
      lensLabel={lens === "investor" ? "Investor lens" : "Founder lens"}
      leftContent={
        <ChatLane
          threadTitle="Stripe Research"
          messages={messages}
          isLoading={isLoading}
          quickActions={quickActions}
          inputValue={inputValue}
          onInputChange={setInputValue}
          onSubmit={handleSubmit}
          lens={lens}
          onLensChange={setLens}
          placeholder="Ask about Stripe..."
        />
      }
      rightContent={
        <ArtifactHost
          title={`${objectName} Research`}
          type="report"
          activeTab={activeTab}
          onTabChange={setActiveTab}
          sections={DEMO_SECTIONS}
          sources={DEMO_SOURCES}
          activity={DEMO_ACTIVITY}
          files={DEMO_FILES}
          lastUpdated={new Date(Date.now() - 1000 * 60 * 5)}
          confidenceScore={87}
          isTracked={isTracked}
          onTrackToggle={() => setIsTracked(!isTracked)}
          onShare={() => console.log("Share")}
          onExport={(format) => console.log("Export as", format)}
        />
      }
    />
  );
}
