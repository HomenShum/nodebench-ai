/**
 * ViewSkeleton - Generic view skeleton for MainLayout loading states
 * Route-aware skeleton that matches common view layouts
 */

import React from 'react';
import { Skeleton, SkeletonText, SkeletonCircle, SkeletonCard, SkeletonBadge } from './Skeleton';

type ViewType = 'default' | 'documents' | 'calendar' | 'agents' | 'settings' | 'dashboard';

interface ViewSkeletonProps {
  variant?: ViewType;
}

export function ViewSkeleton({ variant = 'default' }: ViewSkeletonProps) {
  switch (variant) {
    case 'documents':
      return <DocumentsViewSkeleton />;
    case 'calendar':
      return <CalendarViewSkeleton />;
    case 'agents':
      return <AgentsViewSkeleton />;
    case 'settings':
      return <SettingsViewSkeleton />;
    case 'dashboard':
      return <DashboardViewSkeleton />;
    default:
      return <DefaultViewSkeleton />;
  }
}

function DefaultViewSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" rounded="lg" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}

function DocumentsViewSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Header with tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-24" rounded="lg" />
          ))}
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9" rounded="md" />
          <Skeleton className="h-9 w-28" rounded="md" />
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonBadge key={i} width={70} />
        ))}
      </div>

      {/* Document grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <DocumentCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

function DocumentCardSkeleton() {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Skeleton className="w-10 h-10 shrink-0" rounded="lg" />
        <div className="flex-1 space-y-2 min-w-0">
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <SkeletonText lines={2} />
      <div className="flex gap-2">
        <SkeletonBadge width={50} />
        <SkeletonBadge width={40} />
      </div>
    </div>
  );
}

function CalendarViewSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8" rounded="md" />
          <Skeleton className="h-7 w-40" rounded="lg" />
          <Skeleton className="h-8 w-8" rounded="md" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" rounded="md" />
          <Skeleton className="h-9 w-20" rounded="md" />
          <Skeleton className="h-9 w-20" rounded="md" />
        </div>
      </div>

      {/* Week header */}
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" rounded="md" />
        ))}
      </div>

      {/* Time grid */}
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" rounded="lg" />
        ))}
      </div>
    </div>
  );
}

function AgentsViewSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="w-6 h-6" rounded="md" />
            <Skeleton className="h-7 w-32" rounded="lg" />
          </div>
          <Skeleton className="h-4 w-64" />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-stone-200 bg-white p-4 space-y-2">
            <Skeleton className="h-8 w-12" rounded="lg" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-32" rounded="lg" />
        ))}
      </div>

      {/* Agent cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <AgentCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

function AgentCardSkeleton() {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SkeletonCircle size={40} />
          <div className="space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <SkeletonBadge width={50} />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 flex-1" rounded="md" />
        <Skeleton className="h-8 w-8" rounded="md" />
        <Skeleton className="h-8 w-8" rounded="md" />
      </div>
    </div>
  );
}

function SettingsViewSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse max-w-2xl mx-auto">
      {/* Header */}
      <Skeleton className="h-7 w-32" rounded="lg" />

      {/* Settings sections */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-stone-200 bg-white p-5 space-y-4">
          <Skeleton className="h-5 w-40" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="flex items-center justify-between">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-6 w-12" rounded="full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DashboardViewSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" rounded="lg" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-28" rounded="md" />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-stone-200 bg-white p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10" rounded="lg" />
              <div className="space-y-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-16" rounded="lg" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart placeholder */}
      <div className="rounded-xl border border-stone-200 bg-white p-5">
        <Skeleton className="h-5 w-32 mb-4" />
        <Skeleton className="h-64 w-full" rounded="lg" />
      </div>
    </div>
  );
}

export default ViewSkeleton;
