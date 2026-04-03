/**
 * useCockpitMode — Hook that wraps useCockpitRouting with mode awareness.
 *
 * Adds CockpitMode derivation on top of the existing routing system.
 * Navigating to a mode switches to that mode's default view.
 */

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCockpitRouting } from "../hooks/useCockpitRouting";
import { buildCockpitPath, getSurfaceForView } from "@/lib/registry/viewRegistry";
import {
  type CockpitMode,
  VIEW_TO_MODE,
  MODES,
  getModeForView,
} from "./cockpitModes";

const COCKPIT_MODE_KEY = "nodebench-cockpit-mode";

export function useCockpitMode() {
  const routing = useCockpitRouting();
  const { setCurrentView } = routing;
  const navigate = useNavigate();
  const location = useLocation();

  const mode = VIEW_TO_MODE[routing.currentView] ?? "mission";
  const modeConfig = useMemo(() => getModeForView(routing.currentView), [routing.currentView]);
  const skipInitialPersistRef = useRef(true);

  // Persist the current mode whenever it changes
  useEffect(() => {
    if (skipInitialPersistRef.current) {
      skipInitialPersistRef.current = false;
      return;
    }
    localStorage.setItem(COCKPIT_MODE_KEY, mode);
  }, [mode]);

  // On first mount, restore the last active mode — BUT only if the URL
  // doesn't already have an explicit ?surface= param. If the user (or code)
  // navigated to /?surface=memo, respect that instead of overriding.
  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    const isHomeLikePath =
      location.pathname === "/" ||
      location.pathname === "/control-plane" ||
      location.pathname === "/home" ||
      location.pathname === "/landing";
    if (!isHomeLikePath) return;
    // If URL already has an explicit surface OR view param, respect it — don't override.
    // This prevents /?surface=memo from being clobbered by saved localStorage mode.
    const urlParams = new URLSearchParams(location.search);
    if (urlParams.has("surface") || urlParams.has("view")) return;
    const saved = localStorage.getItem(COCKPIT_MODE_KEY) as CockpitMode | null;
    if (saved && saved !== mode) {
      const config = MODES.find((m) => m.id === saved);
      if (config) {
        setCurrentView(config.defaultView);
        const path = buildCockpitPath({ surfaceId: getSurfaceForView(config.defaultView) });
        navigate(path, { replace: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search]);

  const setMode = useCallback(
    (m: CockpitMode) => {
      const config = MODES.find((c) => c.id === m);
      if (config) {
        setCurrentView(config.defaultView);
        const path = buildCockpitPath({ surfaceId: getSurfaceForView(config.defaultView) });
        navigate(path);
      }
    },
    [setCurrentView, navigate],
  );

  return {
    ...routing,
    mode,
    setMode,
    modeConfig,
  };
}
