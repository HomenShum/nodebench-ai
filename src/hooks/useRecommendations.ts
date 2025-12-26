import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { useCallback } from 'react';

/**
 * Hook for managing recommendations
 */
export function useRecommendations() {
  const recommendations = useQuery(api.domains.recommendations.recommendationEngine.getActiveRecommendations, {
    limit: 5,
  });

  const stats = useQuery(api.domains.recommendations.recommendationEngine.getRecommendationStats);

  const dismissMutation = useMutation(api.domains.recommendations.recommendationEngine.dismissRecommendation);
  const clickMutation = useMutation(api.domains.recommendations.recommendationEngine.clickRecommendation);

  const dismiss = useCallback(
    async (recommendationId: Id<"recommendations">) => {
      await dismissMutation({ recommendationId });
    },
    [dismissMutation]
  );

  const click = useCallback(
    async (recommendationId: Id<"recommendations">) => {
      await clickMutation({ recommendationId });
    },
    [clickMutation]
  );

  return {
    recommendations: recommendations ?? [],
    stats,
    isLoading: recommendations === undefined,
    dismiss,
    click,
  };
}

/**
 * Hook for tracking user behavior
 */
export function useBehaviorTracking() {
  const trackEventMutation = useMutation(api.domains.recommendations.behaviorTracking.trackEvent);
  const summary = useQuery(api.domains.recommendations.behaviorTracking.getBehaviorSummary);

  const trackEvent = useCallback(
    async (
      eventType: 
        | "document_created"
        | "document_viewed"
        | "document_edited"
        | "task_completed"
        | "task_created"
        | "agent_interaction"
        | "search_performed"
        | "calendar_event_ended"
        | "quick_capture",
      entityId?: string,
      metadata?: Record<string, unknown>
    ) => {
      await trackEventMutation({ eventType, entityId, metadata });
    },
    [trackEventMutation]
  );

  return {
    trackEvent,
    summary,
  };
}

export default useRecommendations;

