/**
 * HomeLandingEnhanced — Ask landing page wrapper.
 *
 * The home/ask surface doesn't use the object-first two-column layout
 * (that's for workspace + packets surfaces with a research object).
 * This wrapper exists for feature-flag symmetry and future enhancement.
 */
import { ObjectFirstSurfaceHost } from "@/layouts/ObjectFirstSurfaceHost";
import { HomeLanding } from "@/features/home/views/HomeLanding";

interface HomeLandingEnhancedProps {
  onSurfaceChange?: (surface: string) => void;
}

export function HomeLandingEnhanced({ onSurfaceChange }: HomeLandingEnhancedProps) {
  return (
    <ObjectFirstSurfaceHost
      surfaceId="ask"
      entityName="NodeBench"
    >
      <HomeLanding onSurfaceChange={onSurfaceChange} />
    </ObjectFirstSurfaceHost>
  );
}
