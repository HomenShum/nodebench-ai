/**
 * AgentCommandBar.tsx
 *
 * Central input for agent commands with /spawn syntax support.
 * Features: auto-complete, agent type dropdown, model selector, quick action chips.
 */

import React, { memo, useState, useRef, useCallback, useEffect } from "react";
import {
  Send,
  Zap,
  ChevronDown,
  FileText,
  Video,
  Building,
  TrendingUp,
  Search,
  Sparkles,
  Command,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { parseSpawnCommand, isSpawnCommand } from "@/hooks/useSwarm";

// ============================================================================
// Types & Constants
// ============================================================================

export type AgentMode = "quick" | "research" | "deep";
export type ApprovedModel =
  | "claude-3-5-sonnet-latest"
  | "claude-3-5-haiku-latest"
  | "claude-sonnet-4-20250514"
  | "gpt-4o"
  | "gpt-4o-mini"
  | "o3-mini"
  | "gemini-2.0-flash";

const MODE_CONFIG: Record<AgentMode, { label: string; description: string; icon: React.ElementType }> = {
  quick: {
    label: "Quick",
    description: "Fast single-agent response",
    icon: Zap,
  },
  research: {
    label: "Research",
    description: "Multi-source parallel search",
    icon: Search,
  },
  deep: {
    label: "Deep",
    description: "Thorough analysis with planning",
    icon: Sparkles,
  },
};

const MODEL_OPTIONS: { value: ApprovedModel; label: string; provider: string }[] = [
  { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4", provider: "Anthropic" },
  { value: "claude-3-5-sonnet-latest", label: "Claude 3.5 Sonnet", provider: "Anthropic" },
  { value: "claude-3-5-haiku-latest", label: "Claude 3.5 Haiku", provider: "Anthropic" },
  { value: "gpt-4o", label: "GPT-4o", provider: "OpenAI" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini", provider: "OpenAI" },
  { value: "o3-mini", label: "o3-mini", provider: "OpenAI" },
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash", provider: "Google" },
];

const QUICK_ACTIONS = [
  { label: "Research", command: "/spawn", agents: ["doc", "media", "sec"], icon: Search },
  { label: "Compare Sources", command: "/spawn", agents: ["research"], icon: FileText },
  { label: "Market Analysis", command: "/spawn", agents: ["finance", "sec"], icon: TrendingUp },
  { label: "Media Scan", command: "/spawn", agents: ["media"], icon: Video },
];

const AGENT_SHORTCUTS = [
  { key: "doc", name: "Document", icon: FileText },
  { key: "media", name: "Media", icon: Video },
  { key: "sec", name: "SEC", icon: Building },
  { key: "finance", name: "Finance", icon: TrendingUp },
  { key: "research", name: "Research", icon: Search },
];

interface AgentCommandBarProps {
  onSubmit: (query: string, options: {
    mode: AgentMode;
    model: ApprovedModel;
    agents?: string[];
  }) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
}

// ============================================================================
// Sub-components
// ============================================================================

const ModeSelector = memo(function ModeSelector({
  mode,
  onModeChange,
  isOpen,
  onToggle,
}: {
  mode: AgentMode;
  onModeChange: (mode: AgentMode) => void;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const config = MODE_CONFIG[mode];
  const Icon = config.icon;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg",
          "text-xs font-medium border border-[var(--border-color)]",
          "hover:bg-[var(--bg-hover)] transition-colors",
          isOpen && "bg-[var(--bg-hover)]"
        )}
      >
        <Icon className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
        <span>{config.label}</span>
        <ChevronDown className={cn("w-3 h-3 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-50 min-w-[180px] bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg shadow-lg overflow-hidden">
          {(Object.entries(MODE_CONFIG) as [AgentMode, typeof MODE_CONFIG["quick"]][]).map(([key, cfg]) => {
            const ModeIcon = cfg.icon;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  onModeChange(key);
                  onToggle();
                }}
                className={cn(
                  "w-full flex items-start gap-2 px-3 py-2 text-left",
                  "hover:bg-[var(--bg-hover)] transition-colors",
                  mode === key && "bg-[var(--accent-primary-bg)]"
                )}
              >
                <ModeIcon className="w-4 h-4 mt-0.5 text-[var(--accent-primary)]" />
                <div>
                  <div className="text-xs font-medium text-[var(--text-primary)]">{cfg.label}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">{cfg.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
});

const ModelSelector = memo(function ModelSelector({
  model,
  onModelChange,
  isOpen,
  onToggle,
}: {
  model: ApprovedModel;
  onModelChange: (model: ApprovedModel) => void;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const selected = MODEL_OPTIONS.find((m) => m.value === model) || MODEL_OPTIONS[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg",
          "text-xs font-medium border border-[var(--border-color)]",
          "hover:bg-[var(--bg-hover)] transition-colors",
          isOpen && "bg-[var(--bg-hover)]"
        )}
      >
        <span className="max-w-[100px] truncate">{selected.label}</span>
        <ChevronDown className={cn("w-3 h-3 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 z-50 min-w-[200px] bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg shadow-lg overflow-hidden max-h-[280px] overflow-y-auto">
          {MODEL_OPTIONS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => {
                onModelChange(m.value);
                onToggle();
              }}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 text-left",
                "hover:bg-[var(--bg-hover)] transition-colors",
                model === m.value && "bg-[var(--accent-primary-bg)]"
              )}
            >
              <div className="text-xs font-medium text-[var(--text-primary)]">{m.label}</div>
              <div className="text-[10px] text-[var(--text-muted)]">{m.provider}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

// ============================================================================
// Main Component
// ============================================================================

export const AgentCommandBar = memo(function AgentCommandBar({
  onSubmit,
  isLoading = false,
  placeholder = "Ask anything or use /spawn for parallel agents...",
  className,
}: AgentCommandBarProps) {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<AgentMode>("quick");
  const [model, setModel] = useState<ApprovedModel>("claude-sonnet-4-20250514");
  const [modeDropdownOpen, setModeDropdownOpen] = useState(false);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Detect /spawn command in input
  const isSpawn = isSpawnCommand(input);
  const parsedSpawn = isSpawn ? parseSpawnCommand(input) : null;

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  // Show hint when user starts typing /
  useEffect(() => {
    setShowHint(input.startsWith("/") && !isSpawn);
  }, [input, isSpawn]);

  const handleSubmit = useCallback(() => {
    if (!input.trim() || isLoading) return;

    if (parsedSpawn) {
      onSubmit(parsedSpawn.query, { mode: "research", model, agents: parsedSpawn.agents });
    } else {
      onSubmit(input.trim(), { mode, model });
    }

    setInput("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
  }, [input, isLoading, parsedSpawn, mode, model, onSubmit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const handleQuickAction = useCallback((action: typeof QUICK_ACTIONS[0]) => {
    const agentsStr = action.agents.join(",");
    setInput(`/spawn "" --agents=${agentsStr}`);
    inputRef.current?.focus();
    // Position cursor inside quotes
    setTimeout(() => {
      if (inputRef.current) {
        const pos = 8; // Position after first quote
        inputRef.current.setSelectionRange(pos, pos);
      }
    }, 0);
  }, []);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Quick Action Chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              type="button"
              onClick={() => handleQuickAction(action)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full",
                "text-xs font-medium border border-[var(--border-color)]",
                "bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)]",
                "transition-colors"
              )}
            >
              <Icon className="w-3 h-3 text-[var(--accent-primary)]" />
              {action.label}
            </button>
          );
        })}
      </div>

      {/* Command Input Area */}
      <div className="relative">
        <div
          className={cn(
            "flex flex-col bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)]",
            "focus-within:ring-2 focus-within:ring-[var(--accent-primary)]/20",
            "focus-within:border-[var(--accent-primary)]/50 transition-all"
          )}
        >
          {/* Input Row */}
          <div className="flex items-end gap-2 p-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              rows={1}
              className={cn(
                "flex-1 resize-none bg-transparent text-sm",
                "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                "outline-none min-h-[24px] max-h-[120px]"
              )}
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!input.trim() || isLoading}
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-lg",
                "bg-[var(--accent-primary)] text-white",
                "hover:opacity-90 transition-opacity",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          {/* Controls Row */}
          <div className="flex items-center justify-between px-3 pb-3 pt-0">
            <div className="flex items-center gap-2">
              <ModeSelector
                mode={mode}
                onModeChange={setMode}
                isOpen={modeDropdownOpen}
                onToggle={() => {
                  setModeDropdownOpen(!modeDropdownOpen);
                  setModelDropdownOpen(false);
                }}
              />
              <ModelSelector
                model={model}
                onModelChange={setModel}
                isOpen={modelDropdownOpen}
                onToggle={() => {
                  setModelDropdownOpen(!modelDropdownOpen);
                  setModeDropdownOpen(false);
                }}
              />
            </div>

            {/* Spawn indicator */}
            {isSpawn && parsedSpawn && (
              <div className="flex items-center gap-1.5 text-[10px] text-[var(--accent-primary)]">
                <Zap className="w-3 h-3" />
                <span>Swarm: {parsedSpawn.agents.length} agents</span>
              </div>
            )}
          </div>
        </div>

        {/* Command Hint */}
        {showHint && (
          <div className="absolute top-full left-0 mt-1 z-50 w-full max-w-md bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg shadow-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Command className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              <span className="text-xs font-medium text-[var(--text-primary)]">
                Spawn Command
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mb-2">
              Use <code className="px-1 bg-[var(--bg-secondary)] rounded">/spawn "query" --agents=doc,media,sec</code>
            </p>
            <div className="flex flex-wrap gap-1">
              {AGENT_SHORTCUTS.map((agent) => {
                const Icon = agent.icon;
                return (
                  <span
                    key={agent.key}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] bg-[var(--bg-secondary)] rounded"
                  >
                    <Icon className="w-2.5 h-2.5" />
                    {agent.key}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default AgentCommandBar;
