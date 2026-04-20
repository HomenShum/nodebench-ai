import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import type { Node as ProseMirrorNode } from "prosemirror-model";
import type { EvidenceTier } from "@/features/entities/components/EvidenceChip";

export const diligenceDecorationPluginKey = new PluginKey<DecorationSet>(
  "nodebench.diligenceDecorations",
);

/**
 * Transitional note:
 * `projection` is a bridge type for the existing report-derived notebook
 * snapshot while the generic diligence block pipeline is being wired end to
 * end. The steady-state types remain the diligence block families below.
 */
export type DiligenceBlockType =
  | "projection"
  | "founder"
  | "product"
  | "funding"
  | "news"
  | "hiring"
  | "patent"
  | "publicOpinion"
  | "competitor"
  | "regulatory"
  | "financial";

export type DiligenceDecorationData = {
  blockType: DiligenceBlockType;
  overallTier: EvidenceTier;
  headerText: string;
  bodyProse?: string;
  scratchpadRunId: string;
  version: number;
  updatedAt: number;
  sourceSectionId?: string;
  sourceRefIds?: string[];
  sourceCount?: number;
  sourceLabel?: string;
  sourceTokens?: string[];
  payload?: unknown;
};

export type AnchorStrategy =
  | { kind: "top" }
  | { kind: "bottom" }
  | { kind: "after-heading"; text: string }
  | { kind: "before-heading"; text: string };

export type DecorationRenderer = {
  render: (data: DiligenceDecorationData) => HTMLElement;
};

export type DecorationRendererRegistry = Partial<
  Record<DiligenceBlockType, DecorationRenderer>
>;

export type DiligenceDecorationPluginConfig = {
  getDecorations: () => readonly DiligenceDecorationData[];
  anchors: AnchorStrategy[];
  renderers?: DecorationRendererRegistry;
  onAcceptDecoration?: (
    scratchpadRunId: string,
    blockType: DiligenceDecorationData["blockType"],
  ) => void;
  onDismissDecoration?: (
    scratchpadRunId: string,
    blockType: DiligenceDecorationData["blockType"],
  ) => void;
  onRefreshDecoration?: (
    scratchpadRunId: string,
    blockType: DiligenceDecorationData["blockType"],
  ) => void;
};

function tierToneClass(tier: EvidenceTier): string {
  switch (tier) {
    case "verified":
      return "border-emerald-400/30 bg-emerald-500/10 text-emerald-300";
    case "corroborated":
      return "border-sky-400/30 bg-sky-500/10 text-sky-300";
    case "single-source":
      return "border-amber-400/30 bg-amber-500/10 text-amber-300";
    case "unverified":
      return "border-slate-400/20 bg-slate-500/10 text-slate-300";
  }
}

function tierLabel(tier: EvidenceTier): string {
  switch (tier) {
    case "verified":
      return "Verified";
    case "corroborated":
      return "Corroborated";
    case "single-source":
      return "Single source";
    case "unverified":
      return "Unverified";
  }
}

function formatRelative(updatedAt: number): string {
  const ageMs = Math.max(0, Date.now() - updatedAt);
  if (ageMs < 60_000) return "just now";
  const minutes = Math.round(ageMs / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function resolveAnchorPosition(
  doc: ProseMirrorNode,
  anchors: readonly AnchorStrategy[],
): number {
  const safeTop = 1;
  const safeBottom = Math.max(doc.content.size, 1);
  const findHeading = (
    headingText: string,
    matchKind: "after" | "before",
  ): number | null => {
    const target = normalizeText(headingText);
    let resolved: number | null = null;
    doc.descendants((node, pos) => {
      if (!node.isTextblock) return true;
      const text = normalizeText(node.textContent ?? "");
      if (!text || text !== target) return true;
      resolved = matchKind === "after" ? pos + node.nodeSize : pos;
      return false;
    });
    return resolved;
  };

  for (const anchor of anchors) {
    if (anchor.kind === "top") return safeTop;
    if (anchor.kind === "bottom") return safeBottom;
    if (anchor.kind === "after-heading") {
      const found = findHeading(anchor.text, "after");
      if (found != null) return found;
    }
    if (anchor.kind === "before-heading") {
      const found = findHeading(anchor.text, "before");
      if (found != null) return found;
    }
  }

  return safeTop;
}

function attachAction(
  button: HTMLButtonElement,
  callback: (() => void) | undefined,
): void {
  if (!callback) {
    button.disabled = true;
    button.classList.add("opacity-50", "cursor-not-allowed");
    return;
  }
  button.addEventListener("mousedown", (event) => event.preventDefault());
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    callback();
  });
}

function attachRendererActions(
  root: HTMLElement,
  data: DiligenceDecorationData,
  config: DiligenceDecorationPluginConfig,
): void {
  for (const button of Array.from(root.querySelectorAll<HTMLButtonElement>('[data-action="accept"]'))) {
    attachAction(button, () =>
      config.onAcceptDecoration?.(data.scratchpadRunId, data.blockType),
    );
  }

  for (const button of Array.from(root.querySelectorAll<HTMLButtonElement>('[data-action="refresh"]'))) {
    attachAction(button, () =>
      config.onRefreshDecoration?.(data.scratchpadRunId, data.blockType),
    );
  }

  for (const button of Array.from(root.querySelectorAll<HTMLButtonElement>('[data-action="dismiss"]'))) {
    attachAction(button, () =>
      config.onDismissDecoration?.(data.scratchpadRunId, data.blockType),
    );
  }
}

export function renderDiligenceDecorationElement(
  data: DiligenceDecorationData,
  config: DiligenceDecorationPluginConfig,
): HTMLElement {
  const renderer = config.renderers?.[data.blockType];
  const node = renderer
    ? renderer.render(data)
    : renderDefaultDecoration(data, config);
  if (renderer) {
    attachRendererActions(node, data, config);
  }
  return node;
}

function renderDefaultDecoration(
  data: DiligenceDecorationData,
  config: DiligenceDecorationPluginConfig,
): HTMLElement {
  const root = document.createElement("span");
  root.className =
    "notebook-diligence-decoration mb-4 block rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left";
  root.setAttribute("contenteditable", "false");
  root.dataset.blockType = data.blockType;
  root.dataset.runId = data.scratchpadRunId;
  root.dataset.version = String(data.version);

  const eyebrow = document.createElement("span");
  eyebrow.className =
    "mb-2 inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-gray-400";
  const liveChip = document.createElement("span");
  liveChip.className =
    "rounded-full border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/10 px-2 py-0.5 text-[var(--accent-primary)]";
  liveChip.textContent = "Live";
  eyebrow.appendChild(liveChip);
  const typeLabel = document.createElement("span");
  typeLabel.textContent =
    data.blockType === "projection" ? "Reference overlay" : data.blockType;
  eyebrow.appendChild(typeLabel);
  root.appendChild(eyebrow);

  const headerRow = document.createElement("span");
  headerRow.className = "mb-2 flex items-center justify-between gap-2";

  const title = document.createElement("span");
  title.className = "text-sm font-semibold tracking-tight text-gray-100";
  title.textContent = data.headerText;
  headerRow.appendChild(title);

  const meta = document.createElement("span");
  meta.className = "inline-flex items-center gap-2";
  const tier = document.createElement("span");
  tier.className = `inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${tierToneClass(data.overallTier)}`;
  const tierDot = document.createElement("span");
  tierDot.className = "h-1.5 w-1.5 rounded-full bg-current";
  tier.appendChild(tierDot);
  tier.appendChild(document.createTextNode(tierLabel(data.overallTier)));
  meta.appendChild(tier);

  const updated = document.createElement("span");
  updated.className = "text-[11px] text-gray-500";
  updated.textContent = `updated ${formatRelative(data.updatedAt)}`;
  meta.appendChild(updated);
  headerRow.appendChild(meta);
  root.appendChild(headerRow);

  const body = document.createElement("span");
  body.className = "block space-y-2";
  const paragraphs = (data.bodyProse ?? "")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  if (paragraphs.length === 0) {
    const empty = document.createElement("span");
    empty.className = "block text-sm leading-6 text-gray-400";
    empty.textContent = "No live diligence content is available yet.";
    body.appendChild(empty);
  } else {
    for (const paragraph of paragraphs) {
      const p = document.createElement("span");
      p.className = "block text-sm leading-6 text-gray-300";
      p.textContent = paragraph;
      body.appendChild(p);
    }
  }
  root.appendChild(body);

  const footer = document.createElement("span");
  footer.className = "mt-3 flex flex-wrap items-center justify-between gap-2";

  const sourceMeta = document.createElement("span");
  sourceMeta.className = "inline-flex flex-wrap items-center gap-2 text-[11px] text-gray-500";
  if (data.sourceCount != null) {
    const count = document.createElement("span");
    count.textContent = `${data.sourceCount} source${data.sourceCount === 1 ? "" : "s"}`;
    sourceMeta.appendChild(count);
  }
  if (data.sourceTokens && data.sourceTokens.length > 0) {
    for (const token of data.sourceTokens) {
      const source = document.createElement("span");
      source.className =
        "rounded px-1.5 py-0.5 text-[10px] font-medium text-[var(--accent-primary)] bg-[var(--accent-primary)]/10";
      source.textContent = token;
      sourceMeta.appendChild(source);
    }
  } else if (data.sourceLabel) {
    const label = document.createElement("span");
    label.textContent = data.sourceLabel;
    sourceMeta.appendChild(label);
  }
  footer.appendChild(sourceMeta);

  const hasActions =
    Boolean(config.onAcceptDecoration) ||
    Boolean(config.onRefreshDecoration) ||
    Boolean(config.onDismissDecoration);
  if (hasActions) {
    const actions = document.createElement("span");
    actions.className = "inline-flex items-center gap-2";
    if (config.onAcceptDecoration) {
      const accept = document.createElement("button");
      accept.type = "button";
      accept.className =
        "rounded-md border border-white/10 px-2 py-1 text-[11px] font-medium text-gray-200 transition-colors hover:bg-white/[0.05]";
      accept.textContent = "Accept";
      attachAction(accept, () =>
        config.onAcceptDecoration?.(data.scratchpadRunId, data.blockType),
      );
      actions.appendChild(accept);
    }

    if (config.onRefreshDecoration) {
      const refresh = document.createElement("button");
      refresh.type = "button";
      refresh.className =
        "rounded-md border border-white/10 px-2 py-1 text-[11px] font-medium text-gray-300 transition-colors hover:bg-white/[0.05]";
      refresh.textContent = "Refresh";
      attachAction(refresh, () =>
        config.onRefreshDecoration?.(data.scratchpadRunId, data.blockType),
      );
      actions.appendChild(refresh);
    }

    if (config.onDismissDecoration) {
      const dismiss = document.createElement("button");
      dismiss.type = "button";
      dismiss.className =
        "rounded-md border border-white/10 px-2 py-1 text-[11px] font-medium text-gray-400 transition-colors hover:bg-white/[0.05]";
      dismiss.textContent = "Dismiss";
      attachAction(dismiss, () =>
        config.onDismissDecoration?.(data.scratchpadRunId, data.blockType),
      );
      actions.appendChild(dismiss);
    }

    footer.appendChild(actions);
  }
  root.appendChild(footer);

  return root;
}

function buildSignature(decorations: readonly DiligenceDecorationData[]): string {
  return JSON.stringify(
    decorations.map((item) => ({
      scratchpadRunId: item.scratchpadRunId,
      version: item.version,
      blockType: item.blockType,
      updatedAt: item.updatedAt,
      headerText: item.headerText,
      bodyProse: item.bodyProse,
    })),
  );
}

function buildDecorationSet(
  doc: ProseMirrorNode,
  config: DiligenceDecorationPluginConfig,
): DecorationSet {
  const decorations = config.getDecorations();
  if (decorations.length === 0) {
    return DecorationSet.empty;
  }

  const anchorPos = resolveAnchorPosition(doc, config.anchors);
  const registry = config.renderers ?? {};
  const widget = Decoration.widget(
    anchorPos,
    () => {
      const wrapper = document.createElement("span");
      wrapper.className = "notebook-diligence-decoration-root block";
      wrapper.setAttribute("contenteditable", "false");
      wrapper.dataset.testid = "diligence-decoration-overlay";

      for (const item of decorations) {
        const node = renderDiligenceDecorationElement(item, {
          ...config,
          renderers: registry,
        });
        wrapper.appendChild(node);
      }

      return wrapper;
    },
    {
      key: `nodebench-diligence:${buildSignature(decorations)}`,
      side: -1,
    },
  );

  return DecorationSet.create(doc, [widget]);
}

export function createDiligenceDecorationPlugin(
  config: DiligenceDecorationPluginConfig,
): Plugin {
  return new Plugin<DecorationSet>({
    key: diligenceDecorationPluginKey,
    state: {
      init(_, state) {
        return buildDecorationSet(state.doc, config);
      },
      apply(tr, current, _oldState, newState) {
        const shouldRefresh =
          Boolean(tr.getMeta(diligenceDecorationPluginKey)) || tr.docChanged;
        if (!shouldRefresh) {
          return current.map(tr.mapping, tr.doc);
        }
        return buildDecorationSet(newState.doc, config);
      },
    },
    props: {
      decorations(state) {
        return diligenceDecorationPluginKey.getState(state) ?? DecorationSet.empty;
      },
    },
  });
}
