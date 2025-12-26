/**
 * Home Page Enhancement Suite - Component Exports
 * All components from the PRD implementation
 */

// Phase 1: Foundation & Core Infrastructure
export { ThemeCustomizer } from '../ThemeCustomizer';
export { SkipLinks } from '../SkipLinks';
export { LiveRegion } from '../LiveRegion';

// Phase 2: Intelligent Features
export { QuickCaptureWidget } from '../QuickCapture/QuickCaptureWidget';
export { RecommendationCard } from '../RecommendationCard';
export { RecommendationPanel } from '../RecommendationPanel';
export {
  AdaptiveWidget,
  MorningDigestWidget,
  AfternoonProductivityWidget,
  EveningReviewWidget,
  WeekendPlannerWidget,
} from '../widgets';

// Phase 3: Advanced Interactions
export { EnhancedTimelineStrip } from '../EnhancedTimelineStrip';
export { PersonalDashboard } from '../PersonalDashboard';
export { EnhancedPersonalPulse } from '../EnhancedPersonalPulse';
export { WorkspaceGrid } from '../WorkspaceGrid';

// Phase 4: Polish & Optimization
export {
  AnimatedButton,
  AnimatedCard,
  Fade,
  ScaleFade,
  SlideUp,
  StaggerList,
  StaggerItem,
  Collapsible,
} from '../AnimatedComponents';
export { PersonalAnalytics } from '../PersonalAnalytics';
export { OnboardingFlow } from '../OnboardingFlow';
export {
  EmptyState,
  EmptyDocuments,
  EmptyTasks,
  EmptyCalendar,
  EmptySearch,
  EmptyFolder,
  EmptyRecommendations,
  ErrorState,
  OfflineState,
} from '../EmptyStates';

// Hooks
export { useCommandPalette } from '../../hooks/useCommandPalette';
export { useTimeContext } from '../../hooks/useTimeContext';
export { useVoiceRecording } from '../../hooks/useVoiceRecording';
export { useScreenCapture } from '../../hooks/useScreenCapture';
export { useRecommendations, useBehaviorTracking } from '../../hooks/useRecommendations';
export { useFocusTrap } from '../../hooks/useFocusTrap';

// Utilities
export * from '../../utils/animations';
export * from '../../utils/a11y';

// Types
export type { Theme, ThemeMode, AccentColor, DensityLevel } from '../../types/theme';

