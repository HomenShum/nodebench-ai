/**
 * Features Step - Show available proactive features
 */

import React from "react";
import { Zap, Bell, FileText, AlertTriangle, Mail, Calendar, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    id: "meeting_prep",
    name: "Meeting Prep Packs",
    description: "Auto-generate briefings 4 hours before meetings with context from emails, past conversations, and research",
    icon: Calendar,
    tier: "free",
    defaultEnabled: true,
  },
  {
    id: "follow_up",
    name: "Follow-Up Nudges",
    description: "Smart reminders when you haven't responded to important emails or need to follow up after meetings",
    icon: Bell,
    tier: "free",
    defaultEnabled: true,
  },
  {
    id: "daily_brief",
    name: "Daily Brief",
    description: "Morning summary of important updates, upcoming deadlines, and priorities for the day",
    icon: FileText,
    tier: "free",
    defaultEnabled: true,
  },
  {
    id: "risk_alerts",
    name: "Risk Alerts",
    description: "Proactive warnings about potential issues (missed deadlines, conflicting commitments, etc.)",
    icon: AlertTriangle,
    tier: "free",
    defaultEnabled: false,
  },
  {
    id: "email_drafts",
    name: "Email Draft Generator",
    description: "Auto-draft common emails (thank yous, follow-ups, meeting requests) based on context",
    icon: Mail,
    tier: "free",
    defaultEnabled: false,
  },
];

export function FeaturesStep({
  enabledDetectors,
  onDetectorsChange,
}: {
  enabledDetectors: string[];
  onDetectorsChange: (detectors: string[]) => void;
}) {
  const toggleDetector = (detectorId: string) => {
    if (enabledDetectors.includes(detectorId)) {
      onDetectorsChange(enabledDetectors.filter((id) => id !== detectorId));
    } else {
      onDetectorsChange([...enabledDetectors, detectorId]);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/10 mb-4">
          <Zap className="w-8 h-8 text-purple-500" />
        </div>
        <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
          Choose Your Features
        </h3>
        <p className="text-[var(--text-secondary)]">
          Select which proactive features you'd like to enable. You can change these anytime.
        </p>
      </div>

      {/* Feature list */}
      <div className="space-y-3 mb-6">
        {FEATURES.map((feature) => {
          const isEnabled = enabledDetectors.includes(feature.id);
          return (
            <button
              key={feature.id}
              onClick={() => toggleDetector(feature.id)}
              className={cn(
                "w-full p-4 rounded-lg border-2 transition-all text-left",
                isEnabled
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-blue-300"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <feature.icon className={cn(
                      "w-5 h-5",
                      isEnabled ? "text-blue-500" : "text-[var(--text-secondary)]"
                    )} />
                    <h4 className="font-semibold text-[var(--text-primary)]">
                      {feature.name}
                    </h4>
                    {feature.defaultEnabled && (
                      <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-600 font-medium">
                        Recommended
                      </span>
                    )}
                    {feature.tier === "paid" && (
                      <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-600 font-medium">
                        Premium
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {feature.description}
                  </p>
                </div>
                <div className={cn(
                  "flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                  isEnabled
                    ? "border-blue-500 bg-blue-500"
                    : "border-[var(--border-color)]"
                )}>
                  {isEnabled && <CheckCircle2 className="w-4 h-4 text-white" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Info box */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <p className="text-sm text-[var(--text-secondary)]">
          <span className="font-medium text-[var(--text-primary)]">💡 Tip:</span>{" "}
          Start with the recommended features and enable more as you get comfortable. You can always add custom detectors later!
        </p>
      </div>

      {enabledDetectors.length === 0 && (
        <div className="mt-4 text-center text-sm text-amber-600">
          <p>⚠️ Please enable at least one feature to continue</p>
        </div>
      )}
    </div>
  );
}
