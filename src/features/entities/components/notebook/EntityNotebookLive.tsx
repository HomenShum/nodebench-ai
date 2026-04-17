/**
 * EntityNotebookLive — Phase 3-4 of the Ideaflow/Mew-inspired notebook.
 *
 * Renders the entity as a single flowing document of persisted blocks from
 * productBlocks. Each block has its own contenteditable surface for inline
 * editing. Enter appends a block, Backspace at start merges with previous,
 * `/` opens the slash command palette, `@` triggers entity mention autocomplete.
 *
 * This deliberately uses plain contenteditable + Lexical-style patterns rather
 * than one Lexical editor per block for Phase 1 — the data model already
 * supports that upgrade. Ships working inline editing today with the right
 * contract (Chip[]-based content) so Lexical can slot in later without any
 * backend churn.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { ExternalLink, Link2, Sparkles } from "lucide-react";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useConvexApi } from "@/lib/convexApi";
import { getAnonymousProductSessionId } from "@/features/product/lib/productIdentity";
import { useStreamingSearch } from "@/hooks/useStreamingSearch";
import { chipsFromMarkup, type BlockChip } from "./BlockChipRenderer";
import { BlockProvenance } from "./BlockProvenance";
import { SlashPalette, type SlashCommand } from "./SlashPalette";
import { MentionPicker, type EntityMatch } from "./MentionPicker";

type BlockKind =
  | "text"
  | "heading_1"
  | "heading_2"
  | "heading_3"
  | "bullet"
  | "todo"
  | "quote"
  | "callout"
  | "code"
  | "image"
  | "evidence"
  | "mention"
  | "generated_marker";

type AuthorKind = "user" | "agent" | "anonymous";

type LiveBlock = {
  _id: Id<"productBlocks">;
  entityId: Id<"productEntities">;
  parentBlockId?: Id<"productBlocks">;
  kind: BlockKind;
  authorKind: AuthorKind;
  authorId?: string;
  content: BlockChip[];
  positionInt: number;
  positionFrac: string;
  isChecked?: boolean;
  sourceSessionId?: Id<"productChatSessions">;
  sourceToolStep?: number;
  sourceRefIds?: string[];
  revision: number;
  updatedAt: number;
};

type Props = {
  entitySlug: string;
  onBackfillNeeded?: () => void;
};

function authorDotClass(author: AuthorKind): string {
  switch (author) {
    case "agent":
      return "bg-[var(--accent-primary)] text-white";
    case "user":
      return "bg-emerald-500 text-white";
    default:
      return "bg-gray-400 text-white";
  }
}

function authorLetter(author: AuthorKind): string {
  return author === "agent" ? "A" : author === "user" ? "Y" : "?";
}

function chipsToPlainText(chips: BlockChip[]): string {
  return chips
    .map((c) => {
      if (c.type === "linebreak") return "\n";
      if (c.type === "mention") return `${c.mentionTrigger ?? "@"}${c.value}`;
      if (c.type === "link") return c.value;
      if (c.type === "image") return "";
      return c.value;
    })
    .join("");
}

export function EntityNotebookLive({ entitySlug, onBackfillNeeded }: Props) {
  const api = useConvexApi();
  const navigate = useNavigate();
  const anonymousSessionId = getAnonymousProductSessionId();

  const blocks = useQuery(
    api?.domains.product.blocks.listEntityBlocks ?? "skip",
    api?.domains.product.blocks.listEntityBlocks ? { anonymousSessionId, entitySlug } : "skip",
  ) as LiveBlock[] | undefined;

  const snapshot = useQuery(
    api?.domains.product.blocks.getEntityNotebook ?? "skip",
    api?.domains.product.blocks.getEntityNotebook ? { anonymousSessionId, entitySlug } : "skip",
  );

  const backlinks = useQuery(
    api?.domains.product.blocks.listBacklinksForEntity ?? "skip",
    api?.domains.product.blocks.listBacklinksForEntity ? { anonymousSessionId, entitySlug } : "skip",
  );

  const appendBlock = useMutation(api?.domains.product.blocks.appendBlock ?? ("skip" as any));
  const insertBlockBetween = useMutation(
    api?.domains.product.blocks.insertBlockBetween ?? ("skip" as any),
  );
  const updateBlock = useMutation(api?.domains.product.blocks.updateBlock ?? ("skip" as any));
  const deleteBlock = useMutation(api?.domains.product.blocks.deleteBlock ?? ("skip" as any));
  const backfillEntityBlocks = useMutation(
    api?.domains.product.blocks.backfillEntityBlocks ?? ("skip" as any),
  );
  const createBlockRelation = useMutation(
    api?.domains.product.blocks.createBlockRelation ?? ("skip" as any),
  );

  const [slashFor, setSlashFor] = useState<Id<"productBlocks"> | null>(null);
  const [mentionFor, setMentionFor] = useState<{ blockId: Id<"productBlocks">; initial: string } | null>(null);
  const [focusedBlockId, setFocusedBlockId] = useState<Id<"productBlocks"> | null>(null);
  const [innerView, setInnerView] = useState<"document" | "outline" | "review">("document");
  const pendingSaveRef = useRef<Map<string, number>>(new Map());

  // Auto-backfill on first render if no blocks exist yet but the entity has a report.
  const backfillAttempted = useRef(false);
  useEffect(() => {
    if (backfillAttempted.current) return;
    if (!blocks || blocks.length > 0) return;
    if (!snapshot || snapshot.blocks.length === 0) return;
    backfillAttempted.current = true;
    onBackfillNeeded?.();
    backfillEntityBlocks({ anonymousSessionId, entitySlug }).catch((err: unknown) => {
      console.warn("[notebook] backfill failed", err);
    });
  }, [blocks, snapshot, backfillEntityBlocks, anonymousSessionId, entitySlug, onBackfillNeeded]);

  // Debounced save of inline edits. Keyed by blockId.
  const scheduleSave = useCallback(
    (blockId: Id<"productBlocks">, text: string) => {
      const prev = pendingSaveRef.current.get(blockId);
      if (prev) window.clearTimeout(prev);
      const timeoutId = window.setTimeout(() => {
        void updateBlock({
          anonymousSessionId,
          blockId,
          content: chipsFromMarkup(text),
          forkHistory: false, // inline edits don't fork the whole block; explicit revert UI later
          editedByAuthorKind: "user",
        }).catch((err) => console.warn("[notebook] save failed", err));
        pendingSaveRef.current.delete(blockId);
      }, 500);
      pendingSaveRef.current.set(blockId, timeoutId);
    },
    [anonymousSessionId, updateBlock],
  );

  const handleEnter = useCallback(
    async (block: LiveBlock, blockIndex: number) => {
      if (!blocks) return;
      const next = blocks[blockIndex + 1];
      await insertBlockBetween({
        anonymousSessionId,
        entitySlug,
        beforeBlockId: block._id,
        afterBlockId: next?._id,
        parentBlockId: block.parentBlockId,
        kind: "text",
        content: [{ type: "text", value: "" }],
        authorKind: "user",
      });
    },
    [blocks, insertBlockBetween, anonymousSessionId, entitySlug],
  );

  const streaming = useStreamingSearch();

  const handleMentionPick = useCallback(
    async (match: EntityMatch) => {
      if (!mentionFor) return;
      const targetBlockId = mentionFor.blockId;
      setMentionFor(null);
      // Find the current block to append a mention chip inline.
      const block = blocks?.find((b) => b._id === targetBlockId);
      if (!block) return;
      await updateBlock({
        anonymousSessionId,
        blockId: targetBlockId,
        content: [
          ...block.content,
          {
            type: "mention",
            value: match.name,
            mentionTrigger: "@",
            mentionTarget: match.slug,
          },
        ],
      });
      // Record the relation so backlinks work.
      try {
        await createBlockRelation({
          anonymousSessionId,
          fromBlockId: targetBlockId,
          toEntityId: undefined,
          toBlockId: undefined,
          toUrl: undefined,
          relationKind: "mention",
          relationLabel: match.slug,
          authorKind: "user",
        });
      } catch (err) {
        console.warn("[notebook] mention relation failed", err);
      }
    },
    [anonymousSessionId, blocks, createBlockRelation, mentionFor, updateBlock],
  );

  const runSlashCommand = useCallback(
    async (command: SlashCommand, block: LiveBlock) => {
      setSlashFor(null);
      const prompt = command.prompt ?? "";
      if (!prompt.trim() && command.id !== "mention") return;

      if (command.id === "ai" || command.id === "search" || command.id === "deepresearch") {
        // Insert a "generating…" callout block so the user sees progress immediately.
        const progressBlockId = await appendBlock({
          anonymousSessionId,
          entitySlug,
          parentBlockId: block.parentBlockId,
          kind: "callout",
          content: [
            { type: "text", value: `✨ ${command.label}: ${prompt}` },
            { type: "text", value: " — working…" },
          ],
          authorKind: "agent",
          authorId: `slash:${command.id}`,
        });

        // Kick off the existing streaming search. On complete, we persist each
        // section as a block so the user can edit them inline.
        const lens = command.id === "deepresearch" ? "founder" : "general";
        streaming.startStream(prompt, lens, {
          onComplete: async (payload) => {
            const packet = (payload.packet ?? payload) as {
              answerBlocks?: Array<{ text?: string; title?: string; sourceRefIds?: string[] }>;
              answer?: string;
            };
            // Mark the progress block as complete and capture the headline answer.
            try {
              if (packet.answerBlocks && packet.answerBlocks.length > 0) {
                for (let i = 0; i < packet.answerBlocks.length; i++) {
                  const ab = packet.answerBlocks[i];
                  const text = ab.text ?? "";
                  if (!text.trim()) continue;
                  await appendBlock({
                    anonymousSessionId,
                    entitySlug,
                    parentBlockId: block.parentBlockId,
                    kind: ab.title ? "heading_3" : "text",
                    content: [{ type: "text", value: ab.title ?? text }],
                    authorKind: "agent",
                    authorId: `slash:${command.id}`,
                    sourceRefIds: ab.sourceRefIds,
                  });
                  if (ab.title && ab.text) {
                    await appendBlock({
                      anonymousSessionId,
                      entitySlug,
                      parentBlockId: block.parentBlockId,
                      kind: "text",
                      content: [{ type: "text", value: ab.text }],
                      authorKind: "agent",
                      authorId: `slash:${command.id}`,
                      sourceRefIds: ab.sourceRefIds,
                    });
                  }
                }
              } else if (packet.answer) {
                await appendBlock({
                  anonymousSessionId,
                  entitySlug,
                  parentBlockId: block.parentBlockId,
                  kind: "text",
                  content: [{ type: "text", value: packet.answer }],
                  authorKind: "agent",
                  authorId: `slash:${command.id}`,
                });
              }
              // Mark the progress block as complete.
              await updateBlock({
                anonymousSessionId,
                blockId: progressBlockId,
                content: [{ type: "text", value: `✨ ${command.label}: ${prompt} — done` }],
              });
            } catch (err) {
              console.warn("[notebook] stream persist failed", err);
            }
          },
          onError: (message) => {
            updateBlock({
              anonymousSessionId,
              blockId: progressBlockId,
              content: [{ type: "text", value: `⚠ ${command.label}: ${prompt} — ${message}` }],
            }).catch((err) => console.warn("[notebook] error persist failed", err));
          },
        });
      } else if (command.id === "mention") {
        // Open the entity picker seeded with whatever the user typed.
        setMentionFor({ blockId: block._id, initial: prompt });
      }
    },
    [anonymousSessionId, appendBlock, entitySlug, streaming, updateBlock],
  );

  const sourcesById = useMemo(() => {
    const map = new Map<string, { id: string; label: string; href?: string; confidence?: number; domain?: string }>();
    if (snapshot?.sources) {
      for (const src of snapshot.sources) {
        map.set(src.id, src);
      }
    }
    return map;
  }, [snapshot?.sources]);

  if (blocks === undefined || snapshot === undefined) {
    return <div className="py-16 text-center text-sm text-gray-500">Loading notebook…</div>;
  }

  if (!blocks || blocks.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-gray-500">
        <p>No persisted blocks yet.</p>
        <button
          type="button"
          onClick={() =>
            backfillEntityBlocks({ anonymousSessionId, entitySlug }).catch((err: unknown) =>
              console.warn("[notebook] backfill failed", err),
            )
          }
          className="mt-3 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 transition-colors hover:border-gray-300 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-300"
        >
          Seed blocks from latest report
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>
          {blocks.length} block{blocks.length === 1 ? "" : "s"} · live · press <kbd className="rounded border border-gray-200 bg-white px-1 dark:border-white/10 dark:bg-white/[0.05]">/</kbd>{" "}
          for commands
        </span>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5 rounded-md border border-gray-200 bg-gray-50/60 p-0.5 dark:border-white/10 dark:bg-white/[0.02]">
            {(["document", "outline", "review"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setInnerView(mode)}
                className={`rounded px-2 py-0.5 text-[11px] transition-colors ${
                  innerView === mode
                    ? "bg-white text-gray-900 shadow-sm dark:bg-white/10 dark:text-gray-100"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                {mode[0].toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
          <span>
            <Sparkles className="mr-1 inline h-3 w-3 text-[var(--accent-primary)]" />
            inline AI
          </span>
        </div>
      </div>

      <div className={`space-y-0.5 ${innerView === "outline" ? "text-[13px] leading-tight" : ""}`}>
        {(innerView === "review"
          ? blocks.filter((b) => b.authorKind === "agent" || b.revision > 1)
          : blocks
        ).map((block, blockIndex) => (
          <BlockRow
            key={block._id}
            block={block}
            prev={blocks[blockIndex - 1]}
            next={blocks[blockIndex + 1]}
            sourcesById={sourcesById}
            isFocused={focusedBlockId === block._id}
            showSlash={slashFor === block._id}
            onFocus={() => setFocusedBlockId(block._id)}
            onBlur={() => {
              if (focusedBlockId === block._id) setFocusedBlockId(null);
            }}
            onChangeText={(text) => scheduleSave(block._id, text)}
            onEnter={() => void handleEnter(block, blockIndex)}
            onBackspaceAtStart={async () => {
              if (blockIndex === 0) return;
              await deleteBlock({ anonymousSessionId, blockId: block._id });
            }}
            onOpenSlash={() => setSlashFor(block._id)}
            onCloseSlash={() => setSlashFor(null)}
            onSlashCommand={(cmd) => void runSlashCommand(cmd, block)}
            navigate={navigate}
          />
        ))}
      </div>

      {/* Backlinks */}
      {/* Mention picker — modal overlay when active */}
      {mentionFor ? (
        <div
          className="fixed inset-0 z-40 flex items-start justify-center bg-black/30 px-4 pt-32"
          onClick={() => setMentionFor(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative"
          >
            <MentionPicker
              initialQuery={mentionFor.initial}
              onSelect={(match) => void handleMentionPick(match)}
              onClose={() => setMentionFor(null)}
            />
          </div>
        </div>
      ) : null}

      {backlinks && backlinks.length > 0 ? (
        <div className="mt-10 border-t border-gray-100 pt-6 dark:border-white/[0.06]">
          <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Linked from · {backlinks.length} place{backlinks.length === 1 ? "" : "s"}
          </h3>
          <div className="mt-3 space-y-2">
            {backlinks.map((ref) => (
              <button
                key={ref.relationId}
                type="button"
                onClick={() => navigate(`/entity/${encodeURIComponent(ref.fromEntitySlug)}`)}
                className="block w-full rounded-md border border-gray-100 px-3 py-2 text-left text-sm transition-colors hover:border-gray-200 hover:bg-gray-50 dark:border-white/[0.06] dark:hover:bg-white/[0.02]"
              >
                <div className="font-medium text-gray-900 dark:text-gray-100">{ref.fromEntityName}</div>
                <div className="mt-0.5 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                  {ref.snippet || <em className="opacity-60">(empty block)</em>}
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// BlockRow — contenteditable surface per block
// ────────────────────────────────────────────────────────────────────────────

type BlockRowProps = {
  block: LiveBlock;
  prev?: LiveBlock;
  next?: LiveBlock;
  sourcesById: Map<string, { id: string; label: string; href?: string; confidence?: number; domain?: string }>;
  isFocused: boolean;
  showSlash: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onChangeText: (text: string) => void;
  onEnter: () => void;
  onBackspaceAtStart: () => void;
  onOpenSlash: () => void;
  onCloseSlash: () => void;
  onSlashCommand: (cmd: SlashCommand) => void;
  navigate: (path: string) => void;
};

function BlockRow({
  block,
  sourcesById,
  isFocused,
  showSlash,
  onFocus,
  onBlur,
  onChangeText,
  onEnter,
  onBackspaceAtStart,
  onOpenSlash,
  onCloseSlash,
  onSlashCommand,
}: BlockRowProps) {
  const ref = useRef<HTMLDivElement>(null);
  const lastRenderedText = useRef<string>("");

  // Only sync DOM text back when the block's content updated from elsewhere
  // (e.g. another client or backfill) — not on every local keystroke.
  useEffect(() => {
    const plain = chipsToPlainText(block.content);
    if (plain === lastRenderedText.current) return;
    if (document.activeElement === ref.current) return; // don't clobber focus
    if (ref.current) ref.current.textContent = plain;
    lastRenderedText.current = plain;
  }, [block.content]);

  const isEvidence = block.kind === "evidence";

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onEnter();
      return;
    }
    if (e.key === "Backspace") {
      const selection = window.getSelection();
      if (selection && selection.anchorOffset === 0 && selection.focusOffset === 0) {
        const text = ref.current?.textContent ?? "";
        if (text.length === 0) {
          e.preventDefault();
          onBackspaceAtStart();
          return;
        }
      }
    }
    if (e.key === "/" && !e.shiftKey) {
      const text = ref.current?.textContent ?? "";
      if (text.length === 0) {
        // Don't prevent default so the "/" still types, but open the palette.
        onOpenSlash();
      }
    }
    if (e.key === "Escape") {
      onCloseSlash();
    }
  };

  const handleInput = () => {
    const text = ref.current?.textContent ?? "";
    lastRenderedText.current = text;
    onChangeText(text);
  };

  // Render heading/text/bullet/todo/callout/evidence kinds.
  const classesForKind = (): string => {
    switch (block.kind) {
      case "heading_1":
        return "text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-4 mb-1";
      case "heading_2":
        return "text-lg font-semibold text-gray-900 dark:text-gray-100 mt-4 mb-1";
      case "heading_3":
        return "text-sm font-semibold text-gray-900 dark:text-gray-100 mt-3";
      case "bullet":
        return "text-sm text-gray-700 dark:text-gray-300";
      case "todo":
        return "text-sm text-gray-700 dark:text-gray-300";
      case "callout":
        return "text-sm text-gray-700 dark:text-gray-300 border-l-2 border-[var(--accent-primary)] pl-3 py-1 bg-[var(--accent-primary)]/5";
      case "quote":
        return "text-sm italic text-gray-600 dark:text-gray-400 border-l-2 border-gray-300 dark:border-white/20 pl-3";
      case "code":
        return "text-[12.5px] font-mono text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-white/[0.04] rounded px-3 py-2";
      default:
        return "text-sm leading-relaxed text-gray-700 dark:text-gray-300";
    }
  };

  if (isEvidence) {
    const href = block.content.find((c) => c.type === "link")?.url ?? block.content[0]?.url;
    const label = block.content.find((c) => c.type === "link")?.value ?? chipsToPlainText(block.content);
    return (
      <div className="group ml-6 py-1">
        <a
          href={href ?? "#"}
          target={href ? "_blank" : undefined}
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white/40 px-2.5 py-1 text-[12.5px] text-gray-600 transition-colors hover:border-gray-300 dark:border-white/10 dark:bg-white/[0.02] dark:text-gray-400"
        >
          <Link2 className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
          <span className="truncate">{label}</span>
          {href ? <ExternalLink className="h-3 w-3 text-gray-400" /> : null}
        </a>
      </div>
    );
  }

  return (
    <div
      className={`group relative grid grid-cols-[22px_1fr] gap-2 rounded px-1 transition-colors ${
        isFocused ? "bg-[var(--accent-primary)]/[0.03]" : "hover:bg-gray-50 dark:hover:bg-white/[0.015]"
      }`}
    >
      <div className="flex items-start justify-center pt-2">
        <span
          title={`${block.authorKind === "agent" ? "Agent" : block.authorKind === "user" ? "You" : "Anonymous"} · rev ${block.revision}`}
          className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${authorDotClass(block.authorKind)}`}
        >
          {authorLetter(block.authorKind)}
        </span>
      </div>
      <div className="relative min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div
              ref={ref}
              contentEditable
              suppressContentEditableWarning
              onFocus={onFocus}
              onBlur={onBlur}
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              className={`outline-none focus-visible:outline-none ${classesForKind()}`}
              role="textbox"
              aria-label={`Block · ${block.kind}`}
            >
              {/* Initial text rendered here; subsequent updates managed via lastRenderedText ref */}
              {chipsToPlainText(block.content)}
            </div>
            {/* Render inline citations (sourceRefIds) after the editable surface */}
            {block.sourceRefIds && block.sourceRefIds.length > 0 ? (
              <span className="ml-1 inline-flex gap-0.5 align-super">
                {block.sourceRefIds.map((refId, idx) => {
                  const source = sourcesById.get(refId);
                  const tooltip = source
                    ? `${source.domain ?? source.label}${
                        source.confidence != null ? ` · confidence ${source.confidence.toFixed(2)}` : ""
                      }`
                    : refId;
                  return (
                    <a
                      key={`${block._id}-cite-${idx}`}
                      href={source?.href ?? "#"}
                      target={source?.href ? "_blank" : undefined}
                      rel="noopener noreferrer"
                      title={tooltip}
                      className="rounded bg-[var(--accent-primary)]/15 px-1 text-[10px] font-medium text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/25"
                    >
                      [{refId}]
                    </a>
                  );
                })}
              </span>
            ) : null}
          </div>
          <BlockProvenance block={block} />
        </div>

        {showSlash ? (
          <SlashPalette
            onCommand={onSlashCommand}
            onClose={onCloseSlash}
          />
        ) : null}
      </div>
    </div>
  );
}

export default EntityNotebookLive;
