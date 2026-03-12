import { useCallback, useRef } from "react";

import type { MainView } from "./useMainLayoutRouting";
import type { CockpitMode } from "../layouts/cockpitModes";

export interface VoiceIntentActions {
  navigateToView: (viewId: MainView) => void;
  openSettings: () => void;
  openCommandPalette: () => void;
  createDocument: () => void;
  createTask: () => void;
  createEvent: () => void;
  setCockpitMode: (mode: CockpitMode) => void;
  setLayout: (layout: "cockpit" | "classic") => void;
  setThemeMode: (mode: "light" | "dark") => void;
  toggleTheme: () => void;
  toggleLayout: () => void;
  selectThread: (index: number) => void;
  triggerSearch: (query: string) => void;
  scrollTo: (position: "top" | "bottom") => void;
  goBack: () => void;
  refresh: () => void;
}

export interface VoiceIntentResult {
  matched: true;
  intent: string;
  label: string;
}

export interface ParsedVoiceIntent {
  intent: string;
  action:
    | "navigateToView"
    | "openSettings"
    | "openCommandPalette"
    | "createDocument"
    | "createTask"
    | "createEvent"
    | "setCockpitMode"
    | "setLayout"
    | "setThemeMode"
    | "toggleTheme"
    | "toggleLayout"
    | "selectThread"
    | "triggerSearch"
    | "scrollTo"
    | "goBack"
    | "refresh";
  params: Record<string, string | number>;
}

const VIEW_ALIASES: Record<string, MainView> = {
  activity: "activity",
  agents: "agents",
  assistants: "agents",
  benchmarks: "benchmarks",
  calendar: "calendar",
  costs: "cost-dashboard",
  "cost dashboard": "cost-dashboard",
  documents: "documents",
  dogfood: "dogfood",
  engine: "engine-demo",
  "engine demo": "engine-demo",
  entity: "entity",
  feedback: "analytics-recommendations",
  footnotes: "footnotes",
  "for you": "for-you-feed",
  "for you feed": "for-you-feed",
  funding: "funding",
  github: "github-explorer",
  "github explorer": "github-explorer",
  home: "research",
  industry: "industry-updates",
  "industry updates": "industry-updates",
  linkedin: "linkedin-posts",
  "linkedin posts": "linkedin-posts",
  marketplace: "agent-marketplace",
  mcp: "mcp-ledger",
  "mcp ledger": "mcp-ledger",
  "mcp log": "mcp-ledger",
  performance: "analytics-components",
  "pr suggestions": "pr-suggestions",
  "pull request": "pr-suggestions",
  "pull requests": "pr-suggestions",
  public: "public",
  qa: "dogfood",
  recommendations: "document-recommendations",
  research: "research",
  review: "analytics-hitl",
  roadmap: "roadmap",
  shared: "public",
  showcase: "showcase",
  signals: "signals",
  sources: "footnotes",
  spreadsheets: "spreadsheets",
  suggestions: "document-recommendations",
  timeline: "timeline",
  workspace: "documents",
  observability: "observability",
  health: "observability",
  "system health": "observability",
  "self healing": "observability",
  slo: "observability",
  monitoring: "observability",
};

const MODE_ALIASES: Record<string, CockpitMode> = {
  admin: "system",
  agent: "agents",
  agents: "agents",
  build: "build",
  intel: "intel",
  intelligence: "intel",
  mission: "mission",
  system: "system",
  workspace: "build",
};

const INTERIM_VOICE_STATES = new Set(["listening", "transcribing"]);

function normalizeVoiceText(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\u2026/g, "...")
    .replace(/\s+/g, " ");
}

export function isIgnoredVoiceTranscript(raw: string): boolean {
  const normalized = normalizeVoiceText(raw).replace(/\.+$/, "");
  return INTERIM_VOICE_STATES.has(normalized);
}

function resolveViewAlias(spoken: string): MainView | null {
  const normalized = normalizeVoiceText(spoken);
  if (!normalized) return null;

  const exact = VIEW_ALIASES[normalized];
  if (exact) return exact;

  const candidates = Object.keys(VIEW_ALIASES).filter(
    (alias) => alias.startsWith(normalized) || normalized.startsWith(alias),
  );
  const uniqueViews = [...new Set(candidates.map((alias) => VIEW_ALIASES[alias]))];
  return uniqueViews.length === 1 ? uniqueViews[0] : null;
}

function resolveModeAlias(spoken: string): CockpitMode | null {
  return MODE_ALIASES[normalizeVoiceText(spoken)] ?? null;
}

export function parseVoiceIntent(raw: string): ParsedVoiceIntent | null {
  const text = normalizeVoiceText(raw);
  if (!text || isIgnoredVoiceTranscript(text)) return null;
  if (text.length > 120 || text.split(/\s+/).length > 18) return null;

  if (/^(?:open\s+)?(?:settings|preferences)$/.test(text)) {
    return { intent: "system", action: "openSettings", params: {} };
  }

  if (/^(?:command\s+palette|commands|open\s+commands)$/.test(text)) {
    return { intent: "system", action: "openCommandPalette", params: {} };
  }

  const modeMatch = text.match(/^(?:(?:go|switch)\s+to\s+)?(mission|intel|build|agents|system|admin|workspace|intelligence)(?:\s+mode)?$/);
  if (modeMatch) {
    const mode = resolveModeAlias(modeMatch[1]);
    if (mode) {
      return {
        intent: "mode",
        action: "setCockpitMode",
        params: { mode },
      };
    }
  }

  if (/^(?:new|create|add)\s+(?:document|doc|note)$/.test(text)) {
    return { intent: "create", action: "createDocument", params: {} };
  }

  if (/^(?:new|create|add)\s+task$/.test(text)) {
    return { intent: "create", action: "createTask", params: {} };
  }

  if (/^(?:new|create|add)\s+(?:event|meeting)$/.test(text)) {
    return { intent: "create", action: "createEvent", params: {} };
  }

  if (/^(?:dark\s+mode|toggle\s+dark)$/.test(text)) {
    return { intent: "theme", action: "setThemeMode", params: { mode: "dark" } };
  }

  if (/^(?:light\s+mode|toggle\s+light)$/.test(text)) {
    return { intent: "theme", action: "setThemeMode", params: { mode: "light" } };
  }

  if (/^toggle\s+theme$/.test(text)) {
    return { intent: "theme", action: "toggleTheme", params: {} };
  }

  if (/^(?:classic|classic\s+layout)$/.test(text)) {
    return { intent: "layout", action: "setLayout", params: { layout: "classic" } };
  }

  if (/^(?:cockpit|cockpit\s+layout)$/.test(text)) {
    return { intent: "layout", action: "setLayout", params: { layout: "cockpit" } };
  }

  if (/^switch\s+layout$/.test(text)) {
    return { intent: "layout", action: "toggleLayout", params: {} };
  }

  const searchMatch = text.match(/^(?:search\s+for|search|find|look\s+up)\s+(.+)$/);
  if (searchMatch?.[1]) {
    return {
      intent: "search",
      action: "triggerSearch",
      params: { query: searchMatch[1].trim() },
    };
  }

  const threadMatch = text.match(/^(?:(?:switch\s+to\s+)?thread|tab)\s+(\d+)$/);
  if (threadMatch) {
    return {
      intent: "thread",
      action: "selectThread",
      params: { index: parseInt(threadMatch[1], 10) },
    };
  }

  if (/^(?:go\s+back|back|previous)$/.test(text)) {
    return { intent: "utility", action: "goBack", params: {} };
  }

  if (/^(?:scroll\s+to\s+top|scroll\s+up|top)$/.test(text)) {
    return { intent: "utility", action: "scrollTo", params: { position: "top" } };
  }

  if (/^(?:scroll\s+to\s+bottom|scroll\s+down|bottom)$/.test(text)) {
    return {
      intent: "utility",
      action: "scrollTo",
      params: { position: "bottom" },
    };
  }

  if (/^(?:refresh|reload)$/.test(text)) {
    return { intent: "utility", action: "refresh", params: {} };
  }

  const bareView = resolveViewAlias(text);
  if (bareView) {
    return {
      intent: "navigate",
      action: "navigateToView",
      params: { view: bareView },
    };
  }

  const navMatch = text.match(/^(?:go\s+to|open|show|navigate\s+to|switch\s+to)\s+(.+)$/);
  if (navMatch?.[1]) {
    const view = resolveViewAlias(navMatch[1]);
    if (view) {
      return {
        intent: "navigate",
        action: "navigateToView",
        params: { view },
      };
    }
  }

  return null;
}

function hasAction(
  action: ParsedVoiceIntent["action"],
  actions: Partial<VoiceIntentActions>,
): boolean {
  switch (action) {
    case "navigateToView":
      return typeof actions.navigateToView === "function";
    case "openSettings":
      return typeof actions.openSettings === "function";
    case "openCommandPalette":
      return typeof actions.openCommandPalette === "function";
    case "createDocument":
      return typeof actions.createDocument === "function";
    case "createTask":
      return typeof actions.createTask === "function";
    case "createEvent":
      return typeof actions.createEvent === "function";
    case "setCockpitMode":
      return typeof actions.setCockpitMode === "function";
    case "setLayout":
      return typeof actions.setLayout === "function";
    case "setThemeMode":
      return typeof actions.setThemeMode === "function";
    case "toggleTheme":
      return typeof actions.toggleTheme === "function";
    case "toggleLayout":
      return typeof actions.toggleLayout === "function";
    case "selectThread":
      return typeof actions.selectThread === "function";
    case "triggerSearch":
      return typeof actions.triggerSearch === "function";
    case "scrollTo":
      return typeof actions.scrollTo === "function";
    case "goBack":
      return typeof actions.goBack === "function";
    case "refresh":
      return typeof actions.refresh === "function";
  }
}

export function useVoiceIntentRouter(actions: Partial<VoiceIntentActions>): {
  handleIntent: (text: string) => boolean;
  lastResult: VoiceIntentResult | null;
} {
  const lastResultRef = useRef<VoiceIntentResult | null>(null);

  const handleIntent = useCallback(
    (text: string): boolean => {
      const parsed = parseVoiceIntent(text);
      if (!parsed || !hasAction(parsed.action, actions)) {
        lastResultRef.current = null;
        return false;
      }

      switch (parsed.action) {
        case "navigateToView":
          actions.navigateToView?.(parsed.params.view as MainView);
          break;
        case "openSettings":
          actions.openSettings?.();
          break;
        case "openCommandPalette":
          actions.openCommandPalette?.();
          break;
        case "createDocument":
          actions.createDocument?.();
          break;
        case "createTask":
          actions.createTask?.();
          break;
        case "createEvent":
          actions.createEvent?.();
          break;
        case "setCockpitMode":
          actions.setCockpitMode?.(parsed.params.mode as CockpitMode);
          break;
        case "setLayout":
          actions.setLayout?.(parsed.params.layout as "cockpit" | "classic");
          break;
        case "setThemeMode":
          actions.setThemeMode?.(parsed.params.mode as "light" | "dark");
          break;
        case "toggleTheme":
          actions.toggleTheme?.();
          break;
        case "toggleLayout":
          actions.toggleLayout?.();
          break;
        case "selectThread":
          actions.selectThread?.(parsed.params.index as number);
          break;
        case "triggerSearch":
          actions.triggerSearch?.(parsed.params.query as string);
          break;
        case "scrollTo":
          actions.scrollTo?.(parsed.params.position as "top" | "bottom");
          break;
        case "goBack":
          actions.goBack?.();
          break;
        case "refresh":
          actions.refresh?.();
          break;
      }

      lastResultRef.current = {
        matched: true,
        intent: parsed.intent,
        label: text.trim(),
      };
      return true;
    },
    [actions],
  );

  return { handleIntent, lastResult: lastResultRef.current };
}
