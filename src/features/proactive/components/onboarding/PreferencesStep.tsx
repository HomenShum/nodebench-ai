/**
 * Preferences Step - Configure notification settings
 */

import React from "react";
import { Settings, Bell, Moon, Gauge, MessageSquare, Mail, Slack } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OnboardingState } from "../../views/ProactiveOnboarding";

export function PreferencesStep({
  state,
  updateState,
}: {
  state: OnboardingState;
  updateState: (updates: Partial<OnboardingState>) => void;
}) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10 mb-4">
          <Settings className="w-8 h-8 text-amber-500" />
        </div>
        <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
          Configure Preferences
        </h3>
        <p className="text-[var(--text-secondary)]">
          Customize how and when you receive proactive notifications
        </p>
      </div>

      <div className="space-y-6">
        {/* Notification channels */}
        <div className="p-4 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)]">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-blue-500" />
            <h4 className="font-semibold text-[var(--text-primary)]">
              Notification Channels
            </h4>
          </div>
          <div className="space-y-3">
            <ChannelToggle
              icon={MessageSquare}
              label="In-App Notifications"
              description="Show notifications in NodeBench"
              enabled={state.notificationChannels.inApp}
              onChange={(enabled) =>
                updateState({
                  notificationChannels: {
                    ...state.notificationChannels,
                    inApp: enabled,
                  },
                })
              }
            />
            <ChannelToggle
              icon={Slack}
              label="Slack Messages"
              description="Send notifications to your Slack DM"
              enabled={state.notificationChannels.slack}
              onChange={(enabled) =>
                updateState({
                  notificationChannels: {
                    ...state.notificationChannels,
                    slack: enabled,
                  },
                })
              }
              badge="Coming Soon"
            />
            <ChannelToggle
              icon={Mail}
              label="Email Notifications"
              description="Send digest emails for important updates"
              enabled={state.notificationChannels.email}
              onChange={(enabled) =>
                updateState({
                  notificationChannels: {
                    ...state.notificationChannels,
                    email: enabled,
                  },
                })
              }
              badge="Coming Soon"
            />
          </div>
        </div>

        {/* Quiet hours */}
        <div className="p-4 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)]">
          <div className="flex items-center gap-2 mb-4">
            <Moon className="w-5 h-5 text-blue-500" />
            <h4 className="font-semibold text-[var(--text-primary)]">
              Quiet Hours
            </h4>
          </div>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Don't send notifications during these hours
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Start Time
              </label>
              <select
                value={state.quietHoursStart ?? 22}
                onChange={(e) =>
                  updateState({ quietHoursStart: parseInt(e.target.value) })
                }
                className="w-full px-3 py-2 rounded border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {i.toString().padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                End Time
              </label>
              <select
                value={state.quietHoursEnd ?? 8}
                onChange={(e) =>
                  updateState({ quietHoursEnd: parseInt(e.target.value) })
                }
                className="w-full px-3 py-2 rounded border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {i.toString().padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-2">
            Timezone: {state.timezone}
          </p>
        </div>

        {/* Confidence threshold */}
        <div className="p-4 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)]">
          <div className="flex items-center gap-2 mb-4">
            <Gauge className="w-5 h-5 text-blue-500" />
            <h4 className="font-semibold text-[var(--text-primary)]">
              Confidence Threshold
            </h4>
          </div>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Only show notifications with confidence above this level
          </p>
          <div className="space-y-2">
            <input
              type="range"
              min="0"
              max="100"
              value={state.minimumConfidence * 100}
              onChange={(e) =>
                updateState({ minimumConfidence: parseInt(e.target.value) / 100 })
              }
              className="w-full"
            />
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-secondary)]">More notifications</span>
              <span className="font-medium text-blue-500">
                {Math.round(state.minimumConfidence * 100)}% confidence
              </span>
              <span className="text-[var(--text-secondary)]">Fewer, higher quality</span>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <p className="text-sm text-[var(--text-secondary)]">
            <span className="font-medium text-[var(--text-primary)]">💡 Tip:</span>{" "}
            Start with moderate settings and adjust based on your preferences. You can change these anytime in Settings.
          </p>
        </div>
      </div>
    </div>
  );
}

function ChannelToggle({
  icon: Icon,
  label,
  description,
  enabled,
  onChange,
  badge,
}: {
  icon: any;
  label: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  badge?: string;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => onChange(e.target.checked)}
        disabled={!!badge}
        className="mt-1 w-5 h-5 rounded border-[var(--border-color)] text-blue-500 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-[var(--text-secondary)]" />
          <span className="font-medium text-[var(--text-primary)]">{label}</span>
          {badge && (
            <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-600 font-medium">
              {badge}
            </span>
          )}
        </div>
        <p className="text-sm text-[var(--text-secondary)] mt-1">{description}</p>
      </div>
    </label>
  );
}
