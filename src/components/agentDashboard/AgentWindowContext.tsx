import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";

export type WindowMode = "fixed" | "fit" | "center";

type Ctx = {
  windowMode: WindowMode;
  setWindowMode: (m: WindowMode) => void;
};

export const AgentWindowContext = createContext<Ctx | null>(null);

export function AgentWindowProvider({ children }: { children: React.ReactNode }) {
  const [windowMode, setWindowModeState] = useState<WindowMode>(() => {
    try {
      const v = localStorage.getItem("agents.windowMode") as WindowMode | null;
      return v === "fit" || v === "center" || v === "fixed" ? v : "fixed";
    } catch {
      return "fixed";
    }
  });

  const setWindowMode = useCallback((m: WindowMode) => {
    try { localStorage.setItem("agents.windowMode", m); } catch {}
    setWindowModeState(m);
  }, []);

  const value = useMemo(() => ({ windowMode, setWindowMode }), [windowMode, setWindowMode]);
  return <AgentWindowContext.Provider value={value}>{children}</AgentWindowContext.Provider>;
}

