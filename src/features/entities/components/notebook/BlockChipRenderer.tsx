/**
 * BlockChipRenderer — renders a Chip[] (from productBlocks.content) as
 * inline spans. Used by both read-only blocks and as the initial content
 * for the per-block Lexical editor.
 *
 * Chip types:
 *   - text       → <span> with optional style bitmap (bold/italic/underline/strike/code)
 *   - mention    → clickable @entity or #tag chip that navigates to the target
 *   - link       → external link chip
 *   - linebreak  → <br>
 *   - image      → <img> inline
 */

import { useNavigate } from "react-router-dom";

export type BlockChip = {
  type: "text" | "mention" | "link" | "linebreak" | "image";
  value: string;
  url?: string;
  styles?: number;
  mentionTrigger?: string;
  mentionTarget?: string;
};

type Props = {
  chips: BlockChip[];
  className?: string;
};

// Bit masks for style bitmap
const STYLE_BOLD = 1;
const STYLE_ITALIC = 2;
const STYLE_UNDERLINE = 4;
const STYLE_STRIKE = 8;
const STYLE_CODE = 16;

function styleClass(styles: number | undefined): string {
  if (!styles) return "";
  const classes: string[] = [];
  if (styles & STYLE_BOLD) classes.push("font-semibold");
  if (styles & STYLE_ITALIC) classes.push("italic");
  if (styles & STYLE_UNDERLINE) classes.push("underline");
  if (styles & STYLE_STRIKE) classes.push("line-through");
  if (styles & STYLE_CODE) classes.push("font-mono text-[0.9em] bg-gray-100 dark:bg-white/[0.06] px-1 rounded");
  return classes.join(" ");
}

export function BlockChipRenderer({ chips, className = "" }: Props) {
  const navigate = useNavigate();

  return (
    <span className={className}>
      {chips.map((chip, idx) => {
        if (chip.type === "linebreak") {
          return <br key={idx} />;
        }
        if (chip.type === "image") {
          return (
            <img
              key={idx}
              src={chip.url ?? chip.value}
              alt=""
              className="my-2 inline-block max-h-64 rounded border border-gray-200 dark:border-white/10"
            />
          );
        }
        if (chip.type === "link") {
          return (
            <a
              key={idx}
              href={chip.url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent-primary)] underline decoration-[var(--accent-primary)]/40 underline-offset-2 hover:decoration-[var(--accent-primary)]"
            >
              {chip.value}
            </a>
          );
        }
        if (chip.type === "mention") {
          const trigger = chip.mentionTrigger ?? "@";
          const isHashtag = trigger === "#";
          const target = chip.mentionTarget ?? chip.value;
          const baseClass = isHashtag
            ? "text-amber-500 hover:text-amber-400"
            : "text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 px-1 rounded";
          return (
            <button
              key={idx}
              type="button"
              className={`cursor-pointer transition-colors ${baseClass}`}
              onClick={(e) => {
                e.preventDefault();
                if (!isHashtag && target) {
                  navigate(`/entity/${encodeURIComponent(target)}`);
                }
              }}
            >
              {trigger}
              {chip.value}
            </button>
          );
        }
        // Plain text with optional styles
        return (
          <span key={idx} className={styleClass(chip.styles)}>
            {chip.value}
          </span>
        );
      })}
    </span>
  );
}

/**
 * Convert a plain string into a single text chip. Utility for callers that
 * have raw text (e.g. markdown line) and just want to show it.
 */
export function chipsFromText(text: string): BlockChip[] {
  return [{ type: "text", value: text }];
}

/**
 * Parse a string that may contain @mentions, #tags, and URLs into chips.
 * Used by the slash command handler + the backfill migration.
 *
 * Very simple heuristic version — the persistent authoring path (Lexical)
 * will emit properly-typed chips directly and won't need this.
 */
export function chipsFromMarkup(text: string): BlockChip[] {
  const chips: BlockChip[] = [];
  // Matches @word, #word, <>word, or an http(s):// URL
  const pattern = /(@[\w-]+|#[\w-]+|<>[\w-]+|https?:\/\/[^\s]+)/g;
  let lastIndex = 0;
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    const matched = match[0];
    if (start > lastIndex) {
      chips.push({ type: "text", value: text.slice(lastIndex, start) });
    }
    if (matched.startsWith("@")) {
      chips.push({
        type: "mention",
        value: matched.slice(1),
        mentionTrigger: "@",
        mentionTarget: matched.slice(1),
      });
    } else if (matched.startsWith("#")) {
      chips.push({
        type: "mention",
        value: matched.slice(1),
        mentionTrigger: "#",
      });
    } else if (matched.startsWith("<>")) {
      chips.push({
        type: "mention",
        value: matched.slice(2),
        mentionTrigger: "<>",
        mentionTarget: matched.slice(2),
      });
    } else {
      chips.push({ type: "link", value: matched, url: matched });
    }
    lastIndex = start + matched.length;
  }
  if (lastIndex < text.length) {
    chips.push({ type: "text", value: text.slice(lastIndex) });
  }
  return chips.length > 0 ? chips : [{ type: "text", value: text }];
}

export default BlockChipRenderer;
