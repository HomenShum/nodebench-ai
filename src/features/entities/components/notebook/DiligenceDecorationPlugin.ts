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
  /**
   * Opens the side-panel agent drawer with this decoration as context.
   * The seam between inline AI (decorations) and chat AI (drawer).
   *
   * When provided, the plugin auto-injects an "Ask NodeBench" button
   * into the action bar of every decoration (no per-renderer change
   * required). When omitted, the button is suppressed — not disabled —
   * so we never show dead UI.
   */
  onAskAboutDecoration?: (
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

  /*
   * Central injection of the "Ask NodeBench" button — one line of config
   * wires every renderer, no per-renderer edits. We locate the action bar
   * by the first existing action button (accept / refresh / dismiss),
   * then prepend our button so it reads left-to-right as the first
   * option — "Ask > Accept > Refresh > Dismiss" — because "learn more"
   * is almost always the safest action when a user isn't sure yet.
   *
   * Suppressed (not disabled) when onAskAboutDecoration is absent, so
   * tests running with partial configs don't see dead UI.
   */
  if (config.onAskAboutDecoration) {
    const anchorButton = root.querySelector<HTMLButtonElement>(
      '[data-action="accept"], [data-action="refresh"], [data-action="dismiss"]',
    );
    const actionBar = anchorButton?.parentElement;
    if (actionBar) {
      const askButton = document.createElement("button");
      askButton.type = "button";
      askButton.setAttribute("data-action", "ask");
      askButton.setAttribute("data-block", data.blockType);
      askButton.setAttribute("data-run-id", data.scratchpadRunId);
      askButton.className =
        "inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-xs font-medium text-content-muted hover:border-[color:var(--accent-primary)]/40 hover:text-content transition";
      askButton.textContent = "Ask NodeBench";
      actionBar.insertBefore(askButton, actionBar.firstChild);
      attachAction(askButton, () =>
        config.onAskAboutDecoration?.(data.scratchpadRunId, data.blockType),
      );
    }
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
  // Inline agent suggestion — rendered like a natural notebook block, not a
  // card. Left-accent hints "this is agent-authored, not yet accepted".
  // Actions appear on hover (Notion/Linear pattern).
  const root = document.createElement("span");
  root.className =
    "notebook-diligence-decoration group my-2 block border-l-2 border-l-[var(--accent-primary)]/35 pl-3 text-left";
  root.setAttribute("contenteditable", "false");
  root.dataset.blockType = data.blockType;
  root.dataset.runId = data.scratchpadRunId;
  root.dataset.version = String(data.version);

  // Section header: reads like an H3 in the document. Small "· agent"
  // suffix tells the user this section is a pending suggestion.
  const titleRow = document.createElement("span");
  titleRow.className = "mb-1 flex items-baseline gap-2";

  const title = document.createElement("span");
  title.className = "text-[15px] font-semibold tracking-tight text-gray-900 dark:text-gray-100";
  title.textContent = data.headerText;
  titleRow.appendChild(title);

  const agentTag = document.createElement("span");
  agentTag.className = "text-[10px] uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400";
  agentTag.textContent = "agent · suggestion";
  titleRow.appendChild(agentTag);

  // Tier chip only when meaningful (not the default "unverified").
  if (data.overallTier !== "unverified") {
    const tier = document.createElement("span");
    tier.className = `ml-auto inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] ${tierToneClass(data.overallTier)}`;
    const tierDot = document.createElement("span");
    tierDot.className = "h-1.5 w-1.5 rounded-full bg-current";
    tier.appendChild(tierDot);
    tier.appendChild(document.createTextNode(tierLabel(data.overallTier)));
    titleRow.appendChild(tier);
  }
  root.appendChild(titleRow);

  // Body: plain agent-ink prose, matching the notebook's reading rhythm.
  // No card padding, no background tint — flows like any other paragraph.
  const paragraphs = (data.bodyProse ?? "")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  for (const paragraph of paragraphs) {
    const p = document.createElement("span");
    p.className = "block text-[15px] leading-[1.5] text-gray-600 dark:text-gray-300";
    p.textContent = paragraph;
    root.appendChild(p);
  }

  // Meta row: source count + inline action strip. Hidden opacity, reveals
  // on hover (keeps reading surface calm).
  const meta = document.createElement("span");
  meta.className =
    "mt-1 flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100";

  if (data.sourceCount != null && data.sourceCount > 0) {
    const count = document.createElement("span");
    count.textContent = `${data.sourceCount} source${data.sourceCount === 1 ? "" : "s"}`;
    meta.appendChild(count);
    const sep = document.createElement("span");
    sep.className = "text-gray-300 dark:text-gray-600";
    sep.textContent = "·";
    meta.appendChild(sep);
  }

  // Render source-token chips ([s1], [s2], ...) so a reader can see
  // which report sources backed the suggestion at a glance. Restored
  // here after an earlier refactor dropped them; test coverage in
  // NotebookDiligenceOverlayHost.test.tsx asserts on these literals.
  if (data.sourceTokens && data.sourceTokens.length > 0) {
    for (const token of data.sourceTokens) {
      const chip = document.createElement("span");
      chip.className =
        "rounded px-1.5 py-0.5 text-[10px] font-medium text-[var(--accent-primary)] bg-[var(--accent-primary)]/10";
      chip.textContent = token;
      meta.appendChild(chip);
    }
    const chipSep = document.createElement("span");
    chipSep.className = "text-gray-300 dark:text-gray-600";
    chipSep.textContent = "·";
    meta.appendChild(chipSep);
  }

  const updated = document.createElement("span");
  updated.textContent = `updated ${formatRelative(data.updatedAt)}`;
  meta.appendChild(updated);

  const hasActions =
    Boolean(config.onAcceptDecoration) ||
    Boolean(config.onRefreshDecoration) ||
    Boolean(config.onDismissDecoration);
  if (hasActions) {
    const actionSep = document.createElement("span");
    actionSep.className = "ml-1 text-gray-300 dark:text-gray-600";
    actionSep.textContent = "·";
    meta.appendChild(actionSep);

    if (config.onAcceptDecoration) {
      const accept = document.createElement("button");
      accept.type = "button";
      accept.className =
        "rounded px-1.5 py-0.5 text-[11px] font-medium text-[var(--accent-primary)] transition-colors hover:bg-[var(--accent-primary)]/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)]/40";
      accept.textContent = "Accept";
      attachAction(accept, () =>
        config.onAcceptDecoration?.(data.scratchpadRunId, data.blockType),
      );
      meta.appendChild(accept);
    }

    if (config.onRefreshDecoration) {
      const refresh = document.createElement("button");
      refresh.type = "button";
      refresh.className =
        "rounded px-1.5 py-0.5 text-[11px] text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.05]";
      refresh.textContent = "Refresh";
      attachAction(refresh, () =>
        config.onRefreshDecoration?.(data.scratchpadRunId, data.blockType),
      );
      meta.appendChild(refresh);
    }

    if (config.onDismissDecoration) {
      const dismiss = document.createElement("button");
      dismiss.type = "button";
      dismiss.className =
        "rounded px-1.5 py-0.5 text-[11px] text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.05]";
      dismiss.textContent = "Dismiss";
      attachAction(dismiss, () =>
        config.onDismissDecoration?.(data.scratchpadRunId, data.blockType),
      );
      meta.appendChild(dismiss);
    }
  }

  root.appendChild(meta);
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

/**
 * Maps diligence block-types to the H2/H3 heading text where their content
 * naturally belongs. When the notebook contains that heading, the decoration
 * is anchored AFTER it (inline flow, Notion pattern). When it doesn't,
 * decorations fall back to the top of the document.
 *
 * This eliminates the "wall of cards at top" problem: agent content now
 * appears where the user would expect it in the document.
 */
const BLOCK_TYPE_ANCHOR_HEADING: Record<string, string> = {
  founder: "Founders",
  product: "Product",
  funding: "Funding",
  news: "News",
  hiring: "Hiring",
  patent: "Patents",
  publicOpinion: "Public opinion",
  competitor: "Competitors",
  regulatory: "Regulatory",
  financial: "Financial",
};

function buildDecorationSet(
  doc: ProseMirrorNode,
  config: DiligenceDecorationPluginConfig,
): DecorationSet {
  const decorations = config.getDecorations();
  if (decorations.length === 0) {
    return DecorationSet.empty;
  }

  const registry = config.renderers ?? {};
  const widgets: Decoration[] = [];

  // One widget PER decoration, each anchored at its natural in-flow
  // position. Decorations for the same blockType cluster together under
  // their matching heading, not in a wall at the top of the document.
  for (const item of decorations) {
    const headingText = BLOCK_TYPE_ANCHOR_HEADING[item.blockType];
    const anchorStrategies: AnchorStrategy[] = headingText
      ? [{ kind: "after-heading", text: headingText }, ...config.anchors]
      : config.anchors;
    const pos = resolveAnchorPosition(doc, anchorStrategies);

    const widget = Decoration.widget(
      pos,
      () =>
        renderDiligenceDecorationElement(item, { ...config, renderers: registry }),
      {
        key: `nodebench-diligence:${item.scratchpadRunId}:${item.version}:${item.blockType}`,
        side: -1,
      },
    );
    widgets.push(widget);
  }

  return DecorationSet.create(doc, widgets);
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
