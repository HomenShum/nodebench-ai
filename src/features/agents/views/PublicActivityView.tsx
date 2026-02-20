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
import { Globe } from "lucide-react";

// Shared UI components
import { TopDividerBar } from "@shared/ui/TopDividerBar";
import { UnifiedHubPills } from "@/shared/ui/UnifiedHubPills";
import { PageHeroHeader } from "@shared/ui/PageHeroHeader";

// Task Manager components
import { TaskManagerView } from "../components/TaskManager";

export function PublicActivityView() {
  return (
    <div className="h-full w-full bg-[var(--bg-primary)] overflow-y-auto pb-24 lg:pb-0">
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
            subtitle="Automated tasks and scheduled workflows — live as they run"
            className="mb-6"
          />

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

