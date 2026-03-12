/**
 * Re-export from canonical ErrorBoundary.
 * This file exists for import path compatibility — all implementations live in
 * src/components/ErrorBoundary.tsx.
 */
export {
  ErrorBoundary,
  ErrorFallback,
  FeedErrorFallback,
  DigestErrorFallback,
  BriefingErrorFallback,
} from "../../components/ErrorBoundary";
