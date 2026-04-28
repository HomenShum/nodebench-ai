/**
 * ModelCapabilityBadge — single info pill with popover for full modality matrix.
 *
 * Per design review: 8 always-visible capability icons next to the model
 * trigger competed visually with the rest of the composer. The kit's
 * discipline is one icon per pill, progressive disclosure for detail.
 *
 * Replacement: a tiny `i` info indicator next to the model name. Click
 * (or focus) opens a popover that lists supported + unsupported
 * modalities with the same icons + descriptions. Tooltips on always-on
 * icons are an anti-pattern — the better fix is fewer icons, not more
 * tooltips.
 *
 * Pattern borrowed from open-source unified routers (OpenRouter, pi-ai,
 * LibreChat) which expose `architecture.input_modalities` per model.
 * Curated registry below covers the models NodeBench routes today;
 * unknown models fall back to text-only with `(unverified)` (HONEST_SCORES).
 */

import { useState, useEffect, useRef } from "react";
import {
  Code2,
  FileText,
  Globe,
  Image as ImageIcon,
  Info,
  Mic,
  Type,
  Video,
  Wrench,
} from "lucide-react";

export type ModelCapability =
  | "text"
  | "image"
  | "pdf"
  | "audio"
  | "video"
  | "web_search"
  | "code_exec"
  | "tools";

interface CapabilityMeta {
  icon: typeof Type;
  shortLabel: string;
  description: string;
}

const META: Record<ModelCapability, CapabilityMeta> = {
  text:        { icon: Type,      shortLabel: "Text",        description: "Reads and writes text natively." },
  image:       { icon: ImageIcon, shortLabel: "Image",       description: "Accepts image inputs (vision-language model)." },
  pdf:         { icon: FileText,  shortLabel: "PDF / files", description: "Accepts PDF documents directly without external parsing." },
  audio:       { icon: Mic,       shortLabel: "Audio",       description: "Transcribes or reasons over audio input." },
  video:       { icon: Video,     shortLabel: "Video",       description: "Reads video frames as input." },
  web_search:  { icon: Globe,     shortLabel: "Web search",  description: "Native web grounding / citations." },
  code_exec:   { icon: Code2,     shortLabel: "Code",        description: "Executes code in a sandbox." },
  tools:       { icon: Wrench,    shortLabel: "Tools",       description: "Function / tool calling with structured output." },
};

const ALL_CAPABILITIES: ModelCapability[] = [
  "text",
  "image",
  "pdf",
  "audio",
  "video",
  "web_search",
  "code_exec",
  "tools",
];

export const MODEL_CAPABILITIES: Record<string, ModelCapability[]> = {
  // Anthropic
  "claude-opus-4-7":   ["text", "image", "pdf", "tools"],
  "claude-sonnet-4-6": ["text", "image", "pdf", "tools"],
  "claude-haiku-4-5":  ["text", "image", "pdf", "tools"],
  // OpenAI
  "gpt-5":             ["text", "image", "tools"],
  "gpt-4.1":           ["text", "image", "tools"],
  "gpt-4o":            ["text", "image", "audio", "tools"],
  "o1":                ["text", "tools"],
  "o3":                ["text", "tools"],
  // Google
  "gemini-3-pro":      ["text", "image", "pdf", "audio", "video", "tools"],
  "gemini-3-flash":    ["text", "image", "pdf", "audio", "video", "tools"],
  "gemini-2.5-flash":  ["text", "image", "pdf", "audio", "video", "tools"],
  // xAI
  "grok-4":            ["text", "image", "tools"],
  // Open weights via OpenRouter
  "kimi-k2.6":         ["text", "tools"],
  "deepseek-v3.5":     ["text", "tools"],
  "glm-4.6v":          ["text", "image", "tools"],
};

export function getCapabilitiesForModel(model: string | undefined | null): {
  capabilities: ModelCapability[];
  isKnown: boolean;
} {
  if (!model) return { capabilities: ["text"], isKnown: false };
  const normalized = model.toLowerCase();
  for (const [key, caps] of Object.entries(MODEL_CAPABILITIES)) {
    if (normalized.includes(key.toLowerCase())) {
      return { capabilities: caps, isKnown: true };
    }
  }
  return { capabilities: ["text"], isKnown: false };
}

interface Props {
  model: string;
  /** Override the capability set explicitly (e.g. for OpenRouter responses). */
  capabilities?: ModelCapability[];
  className?: string;
}

/**
 * Renders as a single 16px `i` info button with subtle hover. Click
 * opens a popover anchored to the button. The popover lists the model
 * name + verified-state, then the modality matrix (supported in
 * terracotta, unsupported in muted line-through).
 */
export function ModelCapabilityBadge({ model, capabilities, className }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const resolved = capabilities ?? getCapabilitiesForModel(model).capabilities;
  const isKnown = capabilities !== undefined || getCapabilitiesForModel(model).isKnown;
  const supported = new Set<ModelCapability>(resolved);

  // Close on outside click + Escape
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={`relative inline-flex ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Show ${resolved.length} capabilities of model ${model}`}
        title="Model capabilities"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--accent-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40"
      >
        <Info size={13} strokeWidth={1.8} aria-hidden="true" />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={`Capabilities for ${model}`}
          className="absolute bottom-full left-1/2 z-[70] mb-2 w-64 -translate-x-1/2 rounded-[12px] border border-[var(--border-color)] p-3 shadow-[var(--shadow-lg,0_12px_24px_rgba(0,0,0,0.12))]"
          style={{ backgroundColor: "var(--bg-primary)" }}
        >
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <span className="font-mono text-[12px] font-semibold text-[var(--text-primary)]">
              {model}
            </span>
            {!isKnown && (
              <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                unverified
              </span>
            )}
          </div>
          <ul className="space-y-1.5">
            {ALL_CAPABILITIES.map((cap) => {
              const meta = META[cap];
              const Icon = meta.icon;
              const isSupported = supported.has(cap);
              return (
                <li
                  key={cap}
                  className={`flex items-start gap-2 text-[12px] ${
                    isSupported
                      ? "text-[var(--text-secondary)]"
                      : "text-[var(--text-tertiary)] line-through opacity-60"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded ${
                      isSupported
                        ? "text-[var(--accent-primary)]"
                        : "text-[var(--text-tertiary)]"
                    }`}
                  >
                    <Icon size={12} strokeWidth={1.8} />
                  </span>
                  <span className="flex-1 leading-[1.4]">
                    <span className="font-medium text-[var(--text-primary)]">
                      {meta.shortLabel}
                    </span>{" "}
                    — {isSupported ? meta.description : "Not supported by this model."}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 border-t border-[var(--border-color)] pt-2 text-[10px] text-[var(--text-tertiary)]">
            Modality matrix from curated registry. Unknown models default to text-only (HONEST_SCORES).
          </p>
        </div>
      )}
    </div>
  );
}
