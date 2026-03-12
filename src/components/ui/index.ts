/**
 * UI Components — backward-compatible barrel.
 *
 * Canonical source: @/shared/ui
 * This re-exports for existing '@/components/ui' imports.
 */

// Re-export all shared UI primitives
export {
  Button,
  IconButton,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  SidebarButton,
  Sparkline,
  ToastProvider,
  useToast,
  EmptyState,
} from "@shared/ui";

// HUD / Jarvis-style components (live here, not in shared)
export { CursorGlow } from '../hud/CursorGlow';
export { GridOverlay, GridOverlayStyles } from '../hud/GridOverlay';
export { ScanLine } from '../hud/ScanLine';
export { HUDPanel } from '../hud/HUDPanel';
