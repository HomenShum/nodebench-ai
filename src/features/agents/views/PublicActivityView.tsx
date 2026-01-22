/**
 * PublicActivityView - Public activity feed for agent task sessions
 *
 * This view displays public agent activity (cron jobs, public tasks)
 * that can be accessed by unauthenticated users via #activity hash.
 *
 * Uses TaskManagerView with isPublic=true to show only
 * sessions with visibility="public".
 */

import React from "react";
import { Activity, Globe } from "lucide-react";

// Shared UI components
import { TopDividerBar } from "@shared/ui/TopDividerBar";
import { UnifiedHubPills } from "@/shared/ui/UnifiedHubPills";
import { PageHeroHeader } from "@shared/ui/PageHeroHeader";

// Task Manager components
import { TaskManagerView } from "../components/TaskManager";

export function PublicActivityView() {
  return (
    <div className="h-full w-full bg-[var(--bg-primary)] overflow-y-auto">
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Top Divider Bar */}
          <TopDividerBar
            left={
              <UnifiedHubPills active="agents" showRoadmap roadmapDisabled={false} />
            }
          />

          {/* Hero Header */}
          <PageHeroHeader
            icon={<Globe className="w-6 h-6" />}
            title="Public Activity Feed"
            subtitle="View autonomous agent activity, cron job executions, and public task sessions"
            accent
            className="mb-6"
          />

          {/* Activity Info Banner */}
          <div className="mb-6 p-4 bg-gradient-to-r from-[var(--accent-primary-bg)] to-[var(--bg-secondary)] rounded-lg border border-[var(--accent-primary)]/20">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-5 h-5 text-[var(--accent-primary)]" />
              <h3 className="font-semibold text-[var(--text-primary)]">
                Autonomous Agent Activity
              </h3>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              This feed shows public agent sessions including automated cron jobs,
              scheduled tasks, and agent swarm activities. View telemetry and trace
              data for each execution.
            </p>
          </div>

          {/* Task Manager - Public Mode */}
          <div className="rounded-lg border border-[var(--border-color)] overflow-hidden h-[600px]">
            <TaskManagerView isPublic={true} className="h-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default PublicActivityView;

