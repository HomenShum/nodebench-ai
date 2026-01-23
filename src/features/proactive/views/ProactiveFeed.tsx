/**
 * Proactive Feed
 * Main view for displaying proactive opportunities to users
 *
 * Features:
 * - List of opportunities with status filtering
 * - Opportunity cards with actions
 * - Usage stats and quota display
 * - Empty state for onboarding
 */

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Calendar,
  Bell,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { ProactiveOnboarding } from "./ProactiveOnboarding";

export function ProactiveFeed() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  // Fetch data
  const consentStatus = useQuery(api.proactive.queries.getConsentStatus);
  const opportunities = useQuery(api.proactive.queries.getUserOpportunities, {
    status: statusFilter as any,
  });
  const usage = useQuery(api.proactive.queries.getUserUsage);
  const summary = useQuery(api.proactive.queries.getOpportunitiesSummary);

  // Check if user has not granted consent
  if (consentStatus && !consentStatus.hasConsent) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/10 mb-4">
              <Sparkles className="w-8 h-8 text-blue-500" />
            </div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
              Enable Proactive Features
            </h1>
            <p className="text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
              Let NodeBench work for you. Get meeting prep, follow-up reminders, and daily
              briefs automatically.
            </p>
            <button
              onClick={() => setShowOnboarding(true)}
              className="px-6 py-3 rounded-lg bg-blue-500 text-white hover:bg-blue-600 font-medium"
            >
              Get Started
            </button>
          </div>
        </div>

        {showOnboarding && (
          <ProactiveOnboarding onComplete={() => setShowOnboarding(false)} />
        )}
      </div>
    );
  }

  // Loading state
  if (!opportunities || !usage || !summary) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Sparkles className="w-8 h-8 text-blue-500" />
                Proactive Feed
              </h1>
              <p className="text-[var(--text-secondary)] mt-1">
                Your personalized opportunities and insights
              </p>
            </div>
            <a
              href="/settings/proactive"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
            >
              <Settings className="w-4 h-4" />
              Settings
            </a>
          </div>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={Sparkles}
            label="This Week"
            value={summary.thisWeek}
            color="blue"
          />
          <StatCard
            icon={CheckCircle2}
            label="Completed"
            value={summary.byStatus.completed}
            color="green"
          />
          <StatCard
            icon={Clock}
            label="Time Saved"
            value={`${summary.totalTimeSaved}m`}
            color="purple"
          />
          <StatCard
            icon={TrendingUp}
            label="Usage"
            value={
              usage.limit === -1
                ? "Unlimited"
                : `${usage.used}/${usage.limit}`
            }
            color={usage.remaining < 10 ? "red" : "blue"}
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6">
          <span className="text-sm font-medium text-[var(--text-secondary)]">
            Filter:
          </span>
          {[
            { label: "All", value: undefined },
            { label: "Active", value: "approved" },
            { label: "Completed", value: "completed" },
            { label: "Dismissed", value: "dismissed" },
          ].map((filter) => (
            <button
              key={filter.label}
              onClick={() => setStatusFilter(filter.value)}
              className={cn(
                "px-3 py-1.5 rounded text-sm font-medium transition-colors",
                statusFilter === filter.value
                  ? "bg-blue-500 text-white"
                  : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Opportunities List */}
        {opportunities.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--bg-secondary)] mb-4">
              <Sparkles className="w-8 h-8 text-[var(--text-muted)]" />
            </div>
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              No opportunities yet
            </h3>
            <p className="text-[var(--text-secondary)]">
              We're analyzing your activity. Check back soon for personalized insights!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {opportunities.map((opportunity) => (
              <OpportunityCard key={opportunity._id} opportunity={opportunity} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color = "blue",
}: {
  icon: any;
  label: string;
  value: string | number;
  color?: "blue" | "green" | "purple" | "red";
}) {
  const colorClasses = {
    blue: "text-blue-500 bg-blue-500/10",
    green: "text-green-500 bg-green-500/10",
    purple: "text-purple-500 bg-purple-500/10",
    red: "text-red-500 bg-red-500/10",
  };

  return (
    <div className="p-4 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)]">
      <div className="flex items-center gap-2 mb-2">
        <div className={cn("p-2 rounded", colorClasses[color])}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-sm text-[var(--text-secondary)]">{label}</span>
      </div>
      <div className="text-2xl font-bold text-[var(--text-primary)]">{value}</div>
    </div>
  );
}

function OpportunityCard({ opportunity }: { opportunity: any }) {
  const getIcon = (type: string) => {
    const icons: Record<string, any> = {
      meeting_prep: Calendar,
      follow_up: Bell,
      daily_brief: FileText,
    };
    return icons[type] || Sparkles;
  };

  const Icon = getIcon(opportunity.type);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      detected: "bg-blue-500/20 text-blue-600",
      approved: "bg-green-500/20 text-green-600",
      completed: "bg-gray-500/20 text-gray-600",
      dismissed: "bg-gray-500/20 text-gray-600",
    };
    return colors[status] || "bg-gray-500/20 text-gray-600";
  };

  return (
    <div className="p-6 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-blue-500/50 transition-colors">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 p-3 rounded-lg bg-blue-500/10">
          <Icon className="w-6 h-6 text-blue-500" />
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                {opportunity.type
                  .split("_")
                  .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(" ")}
              </h3>
              <p className="text-[var(--text-secondary)] mt-1">
                {opportunity.trigger.whyNow}
              </p>
            </div>
            <span
              className={cn(
                "px-2 py-1 rounded text-xs font-medium",
                getStatusColor(opportunity.status)
              )}
            >
              {opportunity.status}
            </span>
          </div>

          {opportunity.suggestedActions && opportunity.suggestedActions.length > 0 && (
            <div className="mt-4">
              {opportunity.type === "daily_brief" && opportunity.suggestedActions[0].config?.sections ? (
                <DailyBriefSections sections={opportunity.suggestedActions[0].config.sections} />
              ) : (
                <p className="text-sm text-[var(--text-secondary)]">
                  {opportunity.suggestedActions[0].description}
                </p>
              )}
            </div>
          )}

          <div className="flex items-center gap-4 mt-4">
            <button className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 text-sm font-medium">
              View Details
            </button>
            {opportunity.status !== "completed" && opportunity.status !== "dismissed" && (
              <>
                <button className="px-4 py-2 rounded bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--bg-quaternary)] text-sm font-medium">
                  Mark Complete
                </button>
                <button className="px-4 py-2 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-quaternary)] text-sm font-medium">
                  Dismiss
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DailyBriefSections({ sections }: { sections: any[] }) {
  return (
    <div className="space-y-4">
      {sections.map((section, idx) => (
        <div key={idx} className="border-l-2 border-blue-500 pl-4">
          <h4 className="font-semibold text-[var(--text-primary)] mb-2">
            {section.title}
          </h4>
          {section.items && section.items.length > 0 ? (
            <ul className="space-y-2">
              {section.items.map((item: any, itemIdx: number) => (
                <li key={itemIdx} className="text-sm text-[var(--text-secondary)]">
                  <div className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <div className="flex-1">
                      <div className="font-medium text-[var(--text-primary)]">
                        {item.title}
                      </div>
                      {item.description && (
                        <div className="text-[var(--text-muted)] mt-0.5">
                          {item.description}
                        </div>
                      )}
                      {item.time && (
                        <div className="text-xs text-[var(--text-muted)] mt-0.5">
                          {item.time}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--text-muted)] italic">No items</p>
          )}
        </div>
      ))}
    </div>
  );
}
