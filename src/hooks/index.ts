/**
 * hooks/ — All shared React hooks (canonical location)
 *
 * Feature-specific hooks live in their feature directories.
 * Hooks here are used across 2+ features or are infrastructure.
 */

// Infrastructure
export { useMcp } from "./useMcp";
export { useWebMcpProvider } from "./useWebMcpProvider";
export { useViewWebMcpTools } from "./useViewWebMcpTools";
export { useMainLayoutRouting } from "./useMainLayoutRouting";

// Navigation & interaction
export { useCommandPalette } from "./useCommandPalette";
export { useKeyboardNavigation } from "./useKeyboardNavigation";
export { useFocusTrap } from "./useFocusTrap";
export { useGlobalEventListeners } from "./useGlobalEventListeners";

// Voice pipeline
export { useVoiceIntentRouter } from "./useVoiceIntentRouter";
export { useVoiceRecording } from "./useVoiceRecording";
export { useVoiceInput } from "./useVoiceInput";

// UI utilities
export { useZoom } from "./useZoom";
export { usePanelResize } from "./usePanelResize";
export { useScreenCapture } from "./useScreenCapture";
export { useReducedMotion } from "./useReducedMotion";
export { useStableQuery } from "./useStableQuery";
export { useTimeContext } from "./useTimeContext";
export { useInlineCitations } from "./useInlineCitations";

// Analytics
export { useEngagementTracking } from "./useEngagementTracking";
export { useIntentTelemetry } from "./useIntentTelemetry";

// Feedback
export { FeedbackListener } from "./FeedbackListener";
export { useFeedback } from "./useFeedback";
