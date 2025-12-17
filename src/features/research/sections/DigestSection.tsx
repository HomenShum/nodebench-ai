/**
 * DigestSection - Morning Digest wrapper with error boundary and skeleton
 *
 * This is a thin wrapper around MorningDigest that adds:
 * - Error boundary protection
 * - Loading skeleton
 * - Standardized props interface
 */

import React, { Suspense } from 'react';
import { MorningDigest } from '../components/MorningDigest';
import { DigestSkeleton } from '@/components/skeletons';
import { ErrorBoundary, DigestErrorFallback } from '@/components/ErrorBoundary';

interface DigestSectionProps {
  /** User's display name */
  userName?: string;
  /** Called when a digest item is clicked */
  onItemClick?: (item: { text: string; relevance?: string; linkedEntity?: string }) => void;
  /** Called when refresh is requested */
  onRefresh?: () => void;
  /** Class name for container */
  className?: string;
}

function DigestSectionInner({
  userName = 'there',
  onItemClick,
  onRefresh,
  className = '',
}: DigestSectionProps) {
  return (
    <div className={className}>
      <MorningDigest
        userName={userName}
        onItemClick={onItemClick}
        onRefresh={onRefresh}
      />
    </div>
  );
}

export function DigestSection(props: DigestSectionProps) {
  return (
    <ErrorBoundary
      section="Morning Digest"
      fallback={<DigestErrorFallback onRetry={() => window.location.reload()} />}
    >
      <Suspense fallback={<DigestSkeleton />}>
        <DigestSectionInner {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}

export default DigestSection;
