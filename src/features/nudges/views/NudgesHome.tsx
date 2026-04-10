/**
 * NudgesHome — Reminders, follow-ups, and connector actions.
 *
 * Combines: cron nudges, report-change alerts, connector inbox,
 * suggested outreach, and follow-up reminders.
 */

import { memo } from "react";
import { Bell, Mail, MessageSquare, RefreshCw, Calendar, ArrowRight } from "lucide-react";

const DEMO_NUDGES = [
  { id: "1", type: "follow_up", title: "Anthropic report needs refresh", summary: "Last updated 3 hours ago. New sources may be available.", due: "Today", icon: RefreshCw },
  { id: "2", type: "connector", title: "New message from recruiter", summary: "Received via Gmail about a role at Figma.", due: "Today", icon: Mail },
  { id: "3", type: "reminder", title: "Follow up on Stripe diligence", summary: "You saved a reminder to revisit the FTC risk analysis.", due: "Tomorrow", icon: Calendar },
  { id: "4", type: "change", title: "Databricks report changed", summary: "New funding round detected. Report confidence may shift.", due: "This week", icon: Bell },
];

const CONNECTORS = [
  { name: "Gmail", connected: false },
  { name: "Slack", connected: false },
  { name: "Notion", connected: false },
  { name: "Linear", connected: false },
  { name: "Discord", connected: false },
  { name: "Telegram", connected: false },
];

export const NudgesHome = memo(function NudgesHome() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-content">Nudges</h1>
        <p className="text-xs text-content-muted">Reminders, follow-ups, and actions that keep your research useful.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Nudge feed */}
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-content-muted mb-3">Recent Nudges</div>
          <div className="space-y-2">
            {DEMO_NUDGES.map((nudge) => {
              const Icon = nudge.icon;
              return (
                <button
                  key={nudge.id}
                  type="button"
                  className="flex w-full items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-left transition-all hover:border-white/[0.12] hover:bg-white/[0.04]"
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#d97757]" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-content">{nudge.title}</div>
                    <div className="mt-0.5 text-xs text-content-muted">{nudge.summary}</div>
                    <div className="mt-1 text-[10px] text-content-muted/50">{nudge.due}</div>
                  </div>
                  <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-content-muted/40" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Connected channels */}
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-content-muted mb-3">Connected Channels</div>
          <div className="space-y-2">
            {CONNECTORS.map((c) => (
              <div key={c.name} className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5 text-content-muted" />
                  <span className="text-sm text-content">{c.name}</span>
                </div>
                <span className={`text-[10px] font-medium ${c.connected ? "text-emerald-400" : "text-content-muted/40"}`}>
                  {c.connected ? "Connected" : "Not connected"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

export default NudgesHome;
