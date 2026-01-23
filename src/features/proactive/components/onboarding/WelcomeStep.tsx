/**
 * Welcome Step - Introduce proactive features
 */

import React from "react";
import { Sparkles, Zap, Bell, TrendingUp } from "lucide-react";

export function WelcomeStep() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/10 mb-4">
          <Sparkles className="w-8 h-8 text-blue-500" />
        </div>
        <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
          Welcome to Proactive Intelligence
        </h3>
        <p className="text-[var(--text-secondary)] text-lg">
          Let NodeBench work for you - automatically detect opportunities and take action
        </p>
      </div>

      <div className="space-y-6">
        {/* Feature highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FeatureCard
            icon={Zap}
            title="Meeting Prep"
            description="Auto-generate briefings with context from emails, calendar, and past conversations"
          />
          <FeatureCard
            icon={Bell}
            title="Follow-Up Reminders"
            description="Never miss a follow-up - get smart nudges when action is needed"
          />
          <FeatureCard
            icon={TrendingUp}
            title="Daily Briefs"
            description="Morning summary of important updates, deadlines, and priorities"
          />
        </div>

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
          <h4 className="font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            How it works
          </h4>
          <ol className="space-y-2 text-sm text-[var(--text-secondary)]">
            <li className="flex items-start gap-2">
              <span className="font-medium text-blue-500">1.</span>
              <span>NodeBench monitors your connected accounts (Gmail, Calendar, Slack)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium text-blue-500">2.</span>
              <span>Detectors identify opportunities (upcoming meetings, pending follow-ups, etc.)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium text-blue-500">3.</span>
              <span>You receive smart notifications with suggested actions</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium text-blue-500">4.</span>
              <span>Choose to execute, draft, or dismiss - you're always in control</span>
            </li>
          </ol>
        </div>

        <div className="text-center text-sm text-[var(--text-muted)]">
          <p>This will take about 2 minutes to set up</p>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: any;
  title: string;
  description: string;
}) {
  return (
    <div className="p-4 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)]">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-5 h-5 text-blue-500" />
        <h4 className="font-semibold text-[var(--text-primary)]">{title}</h4>
      </div>
      <p className="text-sm text-[var(--text-secondary)]">{description}</p>
    </div>
  );
}
