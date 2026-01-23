/**
 * Success Step - Confirmation and next steps
 */

import React from "react";
import { CheckCircle2, Sparkles, Calendar, Bell, FileText } from "lucide-react";
import type { OnboardingState } from "../../views/ProactiveOnboarding";

const DETECTOR_NAMES: Record<string, string> = {
  meeting_prep: "Meeting Prep Packs",
  follow_up: "Follow-Up Nudges",
  daily_brief: "Daily Brief",
  risk_alerts: "Risk Alerts",
  email_drafts: "Email Draft Generator",
};

export function SuccessStep({ state }: { state: OnboardingState }) {
  const enabledChannels = Object.entries(state.notificationChannels)
    .filter(([_, enabled]) => enabled)
    .map(([channel]) => channel);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-500" />
        </div>
        <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
          You're All Set!
        </h3>
        <p className="text-[var(--text-secondary)]">
          Proactive features are ready to start working for you
        </p>
      </div>

      {/* Summary */}
      <div className="space-y-4 mb-8">
        {/* Enabled features */}
        <div className="p-4 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)]">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-blue-500" />
            <h4 className="font-semibold text-[var(--text-primary)]">
              Enabled Features ({state.enabledDetectors.length})
            </h4>
          </div>
          <ul className="space-y-2">
            {state.enabledDetectors.map((detectorId) => (
              <li
                key={detectorId}
                className="flex items-center gap-2 text-sm text-[var(--text-secondary)]"
              >
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>{DETECTOR_NAMES[detectorId] || detectorId}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Notification settings */}
        <div className="p-4 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)]">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-5 h-5 text-blue-500" />
            <h4 className="font-semibold text-[var(--text-primary)]">
              Notification Settings
            </h4>
          </div>
          <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
            <li>
              <span className="font-medium">Channels:</span>{" "}
              {enabledChannels.length > 0
                ? enabledChannels.map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join(", ")
                : "None"}
            </li>
            {state.quietHoursStart !== undefined && state.quietHoursEnd !== undefined && (
              <li>
                <span className="font-medium">Quiet Hours:</span>{" "}
                {state.quietHoursStart.toString().padStart(2, "0")}:00 -{" "}
                {state.quietHoursEnd.toString().padStart(2, "0")}:00
              </li>
            )}
            <li>
              <span className="font-medium">Confidence Threshold:</span>{" "}
              {Math.round(state.minimumConfidence * 100)}%
            </li>
          </ul>
        </div>
      </div>

      {/* What happens next */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
        <h4 className="font-semibold text-[var(--text-primary)] mb-4">
          What happens next?
        </h4>
        <div className="space-y-4">
          <NextStep
            icon={Calendar}
            title="Meeting Prep"
            description="You'll receive briefings 4 hours before your next meeting"
          />
          <NextStep
            icon={Bell}
            title="Follow-Ups"
            description="Smart reminders when you haven't responded to important emails"
          />
          <NextStep
            icon={FileText}
            title="Daily Brief"
            description="Morning summary delivered at 8:00 AM in your timezone"
          />
        </div>
      </div>

      {/* Tips */}
      <div className="mt-6 text-center space-y-2">
        <p className="text-sm text-[var(--text-secondary)]">
          💡 You can adjust these settings anytime in{" "}
          <span className="font-medium text-[var(--text-primary)]">Settings → Proactive Features</span>
        </p>
        <p className="text-sm text-[var(--text-secondary)]">
          📊 View your proactive feed at{" "}
          <span className="font-medium text-[var(--text-primary)]">/proactive</span>
        </p>
      </div>
    </div>
  );
}

function NextStep({
  icon: Icon,
  title,
  description,
}: {
  icon: any;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
        <Icon className="w-4 h-4 text-blue-500" />
      </div>
      <div>
        <h5 className="font-medium text-[var(--text-primary)] mb-1">{title}</h5>
        <p className="text-sm text-[var(--text-secondary)]">{description}</p>
      </div>
    </div>
  );
}
