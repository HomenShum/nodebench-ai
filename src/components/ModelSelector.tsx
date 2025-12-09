/**
 * Model Selector Component
 * Allows users to select their preferred LLM provider and model
 */

import React, { useState, useMemo } from "react";
import { ChevronDown, Sparkles, Zap, Brain, Check } from "lucide-react";

// Model definitions (mirrors modelCatalog.ts)
interface ModelOption {
  id: string;
  name: string;
  provider: "openai" | "anthropic" | "gemini";
  description: string;
  tier: "fast" | "balanced" | "powerful";
  contextWindow: string;
}

const MODELS: ModelOption[] = [
  // OpenAI
  { id: "gpt-5.1", name: "GPT-5.1", provider: "openai", description: "Latest flagship", tier: "powerful", contextWindow: "128K" },
  { id: "gpt-5-mini", name: "GPT-5 Mini", provider: "openai", description: "Balanced speed/quality", tier: "balanced", contextWindow: "400K" },
  { id: "gpt-5-nano", name: "GPT-5 Nano", provider: "openai", description: "Fastest", tier: "fast", contextWindow: "400K" },
  { id: "gpt-5.1-codex", name: "GPT-5.1 Codex", provider: "openai", description: "Coding optimized", tier: "powerful", contextWindow: "400K" },
  
  // Anthropic
  { id: "claude-sonnet-4-5-20250929", name: "Claude Sonnet 4.5", provider: "anthropic", description: "Best balance", tier: "balanced", contextWindow: "200K" },
  { id: "claude-opus-4-5-20251101", name: "Claude Opus 4.5", provider: "anthropic", description: "Most capable", tier: "powerful", contextWindow: "200K" },
  { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", provider: "anthropic", description: "Fastest", tier: "fast", contextWindow: "200K" },
  
  // Gemini
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "gemini", description: "Fast, great quality", tier: "balanced", contextWindow: "1M" },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "gemini", description: "Best quality", tier: "powerful", contextWindow: "2M" },
  { id: "gemini-2.5-flash-lite", name: "Gemini Flash Lite", provider: "gemini", description: "Ultra-fast", tier: "fast", contextWindow: "1M" },
];

const PROVIDER_COLORS = {
  openai: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", icon: "🟢" },
  anthropic: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", icon: "🟠" },
  gemini: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", icon: "🔵" },
};

const TIER_ICONS = {
  fast: Zap,
  balanced: Sparkles,
  powerful: Brain,
};

interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
  className?: string;
  compact?: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  value,
  onChange,
  className = "",
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filterProvider, setFilterProvider] = useState<"all" | "openai" | "anthropic" | "gemini">("all");

  const selectedModel = useMemo(() => 
    MODELS.find(m => m.id === value) ?? MODELS[0],
    [value]
  );

  const filteredModels = useMemo(() =>
    filterProvider === "all" 
      ? MODELS 
      : MODELS.filter(m => m.provider === filterProvider),
    [filterProvider]
  );

  const providerStyle = PROVIDER_COLORS[selectedModel.provider];
  const TierIcon = TIER_ICONS[selectedModel.tier];

  if (compact) {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${providerStyle.bg} ${providerStyle.border} border ${providerStyle.text} hover:opacity-80 transition-opacity`}
        >
          <span>{providerStyle.icon}</span>
          <span>{selectedModel.name}</span>
          <ChevronDown className="h-3 w-3" />
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute top-full left-0 mt-1 z-50 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-1 max-h-80 overflow-y-auto">
              {MODELS.map((model) => {
                const style = PROVIDER_COLORS[model.provider];
                const Icon = TIER_ICONS[model.tier];
                const isSelected = model.id === value;
                return (
                  <button
                    key={model.id}
                    onClick={() => { onChange(model.id); setIsOpen(false); }}
                    className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 ${isSelected ? 'bg-gray-50' : ''}`}
                  >
                    <span className="text-sm">{style.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{model.name}</div>
                      <div className="text-xs text-gray-500">{model.description}</div>
                    </div>
                    <Icon className="h-3.5 w-3.5 text-gray-400" />
                    {isSelected && <Check className="h-4 w-4 text-indigo-600" />}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Provider Filter */}
      <div className="flex gap-2">
        {(["all", "openai", "anthropic", "gemini"] as const).map((provider) => (
          <button
            key={provider}
            onClick={() => setFilterProvider(provider)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filterProvider === provider
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {provider === "all" ? "All" : provider.charAt(0).toUpperCase() + provider.slice(1)}
          </button>
        ))}
      </div>

      {/* Model Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {filteredModels.map((model) => {
          const style = PROVIDER_COLORS[model.provider];
          const Icon = TIER_ICONS[model.tier];
          const isSelected = model.id === value;

          return (
            <button
              key={model.id}
              onClick={() => onChange(model.id)}
              className={`p-3 rounded-lg border-2 text-left transition-all ${
                isSelected
                  ? `${style.border} ${style.bg} ring-2 ring-offset-1 ring-indigo-500`
                  : "border-gray-200 hover:border-gray-300 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{style.icon}</span>
                    <span className="font-medium text-gray-900 text-sm">{model.name}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{model.description}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Icon className="h-4 w-4 text-gray-400" />
                  {isSelected && <Check className="h-4 w-4 text-indigo-600" />}
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-400">
                <span className="px-1.5 py-0.5 bg-gray-100 rounded">{model.contextWindow}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ModelSelector;
