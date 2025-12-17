/**
 * DealListSection - Right-rail deal/regulatory list wrapper
 *
 * Currently uses a small demo set until deals are backed by a query.
 */

import React, { useMemo, useState } from "react";
import { DealFlyout, DealListPanel, type Deal } from "../components/DealListPanel";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useFastAgent } from "@/features/agents/context/FastAgentContext";

export interface DealListSectionProps {
  className?: string;
  deals?: Deal[];
}

const DEMO_DEALS: Deal[] = [
  {
    id: "atlas-robotics",
    company: "Atlas Robotics",
    sector: "robotics",
    stage: "series a",
    amount: "$18M",
    date: "2d ago",
    location: "Austin, TX",
    leads: ["Khosla Ventures"],
    coInvestors: ["Lux Capital"],
    summary: "Autonomous warehouse picking with vision-language control loops. Early pilots show 27% throughput gains.",
    traction: "3 paid pilots (Fortune 500 retail)",
    sentiment: "hot",
    spark: [8, 9, 11, 13, 15, 18, 21, 24],
    people: [
      { name: "Ava Patel", role: "CEO", past: "ex-Amazon Robotics; CMU Robotics" },
      { name: "Jon Kim", role: "CTO", past: "ex-Boston Dynamics; MIT" },
    ],
    timeline: [
      { label: "Dec", detail: "Series A $18M (Khosla lead)" },
      { label: "Nov", detail: "Signed 3 pilots" },
      { label: "Oct", detail: "V2 control stack shipped" },
    ],
    regulatory: {
      patents: ["Safety-aware grasp planning", "Multi-agent route optimization"],
    },
  },
  {
    id: "helix-bio",
    company: "Helix BioSystems",
    sector: "healthcare",
    stage: "seed",
    amount: "$3.2M",
    date: "5d ago",
    location: "Boston, MA",
    leads: ["Atlas Ventures"],
    coInvestors: ["General Catalyst"],
    summary: "Lab-on-a-chip diagnostics for rapid sepsis detection. Early results show 15-minute turnaround with 92% sensitivity.",
    traction: "Clinical pilot in 2 hospitals",
    sentiment: "watch",
    spark: [12, 14, 15, 16, 17, 18, 20, 22, 25],
    people: [
      { name: "Dr. Mia Chen", role: "CEO", past: "ex-Illumina; Stanford PhD BioE" },
      { name: "Rafael Ortiz", role: "CTO", past: "ex-Thermo Fisher; MIT EE" },
    ],
    timeline: [
      { label: "Dec", detail: "Seed $3.2M (Atlas lead)" },
      { label: "Nov", detail: "IDE package submitted to FDA" },
      { label: "Oct", detail: "Pilot validated in 2 ICUs" },
    ],
    regulatory: {
      fdaStatus: "FDA: IDE submitted, review pending",
      papers: ["Contrastive learning for diagnostic triage"],
    },
  },
];

function DealListSectionInner({ className = "", deals }: DealListSectionProps) {
  const { openWithContext } = useFastAgent();
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

  const resolvedDeals = useMemo(() => deals ?? DEMO_DEALS, [deals]);

  const handlePrep = (intent: "email" | "call" | "invite", deal: Deal) => {
    const intentLabel = intent === "email" ? "draft an email" : intent === "call" ? "prepare for a call" : "write an invite";
    openWithContext({
      contextTitle: `Deal: ${deal.company}`,
      initialMessage: `Help me ${intentLabel} about ${deal.company} (${deal.amount}, ${deal.stage}). Include key questions, risks, and next steps.`,
    });
  };

  return (
    <div className={className}>
      <DealListPanel deals={resolvedDeals} onOpenDeal={setSelectedDeal} />
      <DealFlyout deal={selectedDeal} onClose={() => setSelectedDeal(null)} onPrep={handlePrep} />
    </div>
  );
}

export function DealListSection(props: DealListSectionProps) {
  return (
    <ErrorBoundary section="Deal List">
      <DealListSectionInner {...props} />
    </ErrorBoundary>
  );
}

export default DealListSection;

