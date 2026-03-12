/**
 * HUDContext — Upward data-flow from focal views to cockpit chrome.
 *
 * Views can publish entity / status / kpi data upward so the StatusStrip
 * and ModeRail can reflect what the active view is focusing on, without
 * prop-drilling through the 28-view FocalArea.
 *
 * Usage (inside any view component):
 *   const publish = useHUDPublish();
 *   useEffect(() => { publish({ entity: "Anthropic Corp", status: "ok" }); }, [entityName]);
 *
 * Reading (in chrome components):
 *   const hud = useHUDState();
 *   console.log(hud.entity, hud.status, hud.kpis);
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

/** HUD state pushed up from the active focal view. */
export interface HUDState {
  /** The primary entity currently in focus (e.g. company name, document title). */
  entity: string | null;
  /** Operational status that can affect chrome color / urgency signals. */
  status: "ok" | "warning" | "critical";
  /** Short KPI strings to surface in the StatusStrip ticker. */
  kpis: string[];
}

const DEFAULT_STATE: HUDState = {
  entity: null,
  status: "ok",
  kpis: [],
};

interface HUDContextValue {
  state: HUDState;
  publish: (partial: Partial<HUDState>) => void;
  reset: () => void;
}

const HUDContext = createContext<HUDContextValue>({
  state: DEFAULT_STATE,
  publish: () => {},
  reset: () => {},
});

/** Wrap CockpitLayout's content with this so views can push state upward. */
export function HUDProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<HUDState>(DEFAULT_STATE);

  const publish = useCallback((partial: Partial<HUDState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  const reset = useCallback(() => {
    setState(DEFAULT_STATE);
  }, []);

  return (
    <HUDContext.Provider value={{ state, publish, reset }}>
      {children}
    </HUDContext.Provider>
  );
}

/**
 * Returns a stable `publish` function for views to push HUD state upward.
 * Call inside a `useEffect` so updates are tied to the view's lifecycle.
 */
export function useHUDPublish() {
  return useContext(HUDContext).publish;
}

/**
 * Returns a stable `reset` function that clears HUD state back to defaults.
 * Useful in view unmount effects to avoid stale state bleeding across views.
 */
export function useHUDReset() {
  return useContext(HUDContext).reset;
}

/** Read the current HUD state in chrome components (StatusStrip, ModeRail, etc.). */
export function useHUDState(): HUDState {
  return useContext(HUDContext).state;
}
