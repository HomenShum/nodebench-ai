/**
 * EntityNotebookLive â€” Phase 3-4 of the Ideaflow/Mew-inspired notebook.
 *
 * Renders the entity as a single flowing document of persisted blocks from
 * productBlocks. Focused editable blocks use a Tiptap + Convex ProseMirror
 * sync editor so collaboration happens on maintained OT plumbing while the
 * notebook keeps its existing BlockChip[] persistence contract and provenance.
 * Enter appends a block, Backspace at start merges with previous, and `/`
 * opens the slash command palette.
 *
 * The notebook keeps the backend contract stable and only swaps the editing
 * shell, so report/backfill/query behavior can harden independently from the
 * editor implementation.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ExternalLink, Link2, Lock, Sparkles } from "lucide-react";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useConvexApi } from "@/lib/convexApi";
import { getAnonymousProductSessionId } from "@/features/product/lib/productIdentity";
import { useStreamingSearch } from "@/hooks/useStreamingSearch";
import { publishNotebookAlert } from "@/lib/notebookAlerts";
import { useToast } from "@/shared/ui";
import {
  chipsFromMarkup,
  BlockChipRenderer,
  type BlockChip,
} from "./BlockChipRenderer";
import { BlockProvenance } from "./BlockProvenance";
import { NotebookBlockEditor, type NotebookBlockEditorHandle } from "./NotebookBlockEditor";
import { SlashPalette, type SlashCommand } from "./SlashPalette";
import { MentionPicker, type EntityMatch } from "./MentionPicker";
import { buildProductBlockSyncId } from "../../../../../shared/productBlockSync";

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
type AccessMode = "read" | "append" | "edit";

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
  accessMode?: AccessMode;
  isPublic?: boolean;
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

function chipsEqual(left: BlockChip[] | undefined, right: BlockChip[] | undefined): boolean {
  return JSON.stringify(left ?? []) === JSON.stringify(right ?? []);
}

function isSyncEditableBlock(block: Pick<LiveBlock, "kind" | "content">): boolean {
  return block.kind !== "image" && !block.content.some((chip) => chip.type === "image");
}

export function shouldRefreshAgentNotebookProjection(
  blocks: LiveBlock[] | undefined,
  snapshot:
    | {
        reportUpdatedAt?: number;
        blocks?: Array<unknown>;
      }
    | null
    | undefined,
) {
  if (!blocks || !snapshot?.reportUpdatedAt) return false;
  if (blocks.length === 0) {
    return Array.isArray(snapshot.blocks) && snapshot.blocks.length > 0;
  }

  const latestUserEditAt = blocks
    .filter((block) => block.authorKind === "user")
    .reduce<number | null>((latest, block) => Math.max(latest ?? 0, block.updatedAt ?? 0), null);
  if (latestUserEditAt != null && latestUserEditAt > snapshot.reportUpdatedAt) {
    return false;
  }

  const latestAgentBlockAt = blocks
    .filter((block) => block.authorKind === "agent")
    .reduce<number | null>((latest, block) => Math.max(latest ?? 0, block.updatedAt ?? 0), null);

  if (latestAgentBlockAt == null) {
    return Array.isArray(snapshot.blocks) && snapshot.blocks.length > 0;
  }

  return latestAgentBlockAt < snapshot.reportUpdatedAt;
}

export function getNotebookLoadState(args: {
  loadedCount: number;
  totalCount?: number;
  paginationStatus?: string;
}) {
  const totalCount = Math.max(args.totalCount ?? args.loadedCount, args.loadedCount);
  const paginationStatus = args.paginationStatus ?? "Exhausted";
  const remainingCount = Math.max(totalCount - args.loadedCount, 0);
  return {
    totalCount,
    remainingCount,
    fullyLoaded: paginationStatus === "Exhausted" && remainingCount === 0,
    canLoadMore: paginationStatus === "CanLoadMore" || paginationStatus === "LoadingMore",
    isLoadingMore: paginationStatus === "LoadingMore" || paginationStatus === "LoadingFirstPage",
  };
}

type ParsedNotebookMutationError = {
  code?: string;
  current?: number;
  expected?: number;
  retryAfterMs?: number;
  message?: string;
  // Convex Request ID — the HTTP client puts this in err.message as
  // "[Request ID: <hex>] Server Error". Surfacing it in the client toast
  // + console lets support correlate user reports to `npx convex logs`
  // entries in seconds instead of minutes.
  requestId?: string;
};

// Pull the Convex Request ID out of a thrown error's message string.
// Returns null if no ID present (e.g. purely client-side error).
export function extractConvexRequestId(error: unknown): string | null {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const match = /\[Request ID:\s*([a-f0-9]+)\]/i.exec(message);
  return match ? match[1] : null;
}

export function parseNotebookMutationError(error: unknown): ParsedNotebookMutationError {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : error == null
          ? undefined
          : String(error);

  const requestId = extractConvexRequestId(error) ?? undefined;

  // ConvexError surfaces structured payload on `err.data` (the HTTP client
  // replaces `err.message` with "[Request ID: ...] Server Error"). Prefer
  // reading err.data directly; fall back to regex for legacy serializations.
  if (
    error &&
    typeof error === "object" &&
    (error as { constructor?: { name?: string } }).constructor?.name === "ConvexError"
  ) {
    const data = (error as { data?: unknown }).data;
    if (data && typeof data === "object") {
      return { ...(data as ParsedNotebookMutationError), message, requestId };
    }
  }

  if (!message) return { requestId };
  if (
    message.includes("OptimisticConcurrencyControlFailure") &&
    message.includes("productBlockWriteWindows")
  ) {
    return {
      code: "RATE_LIMITED",
      retryAfterMs: 10_000,
      message,
      requestId,
    };
  }
  const match = /ConvexError:\s*(\{.*\})/s.exec(message);
  if (!match) {
    return { message, requestId };
  }
  try {
    const parsed = JSON.parse(match[1]) as ParsedNotebookMutationError;
    return {
      ...parsed,
      message,
      requestId,
    };
  } catch {
    return { message, requestId };
  }
}

export function describeNotebookMutationFailure(
  action: "save" | "mention" | "command",
  error: unknown,
): { title: string; detail?: string; level: "error" | "warning" } {
  const parsed = parseNotebookMutationError(error);
  if (parsed.code === "REVISION_MISMATCH") {
    const revisionDetail =
      typeof parsed.current === "number" && typeof parsed.expected === "number"
        ? `This block moved from revision ${parsed.expected} to ${parsed.current} in another tab or agent run.`
        : "Another tab or agent run updated this block first.";
    return {
      title: "Notebook changed in another tab",
      detail: `${revisionDetail} The latest version has been reloaded. Reapply your edit if it still matters.`,
      level: "warning",
    };
  }
  if (parsed.code === "RATE_LIMITED") {
    const waitSeconds =
      typeof parsed.retryAfterMs === "number" && parsed.retryAfterMs > 0
        ? Math.max(1, Math.ceil(parsed.retryAfterMs / 1000))
        : null;
    return {
      title: "Notebook write rate limit reached",
      detail: waitSeconds
        ? `Too many notebook edits landed in a short burst. Wait about ${waitSeconds}s and try again.`
        : "Too many notebook edits landed in a short burst. Wait a moment and try again.",
      level: "warning",
    };
  }
  if (parsed.code === "CONTENT_TOO_LARGE") {
    return {
      title: "Notebook block is too large",
      detail: "Split this block into smaller sections before saving it again.",
      level: "error",
    };
  }
  const actionLabel =
    action === "mention"
      ? "attach the mention"
      : action === "command"
        ? "finish the notebook command"
        : "save the notebook block";
  // Tail the Convex Request ID onto the detail so support can jump to the
  // exact log line with `npx convex logs --prod | grep <id>`.
  const detailWithId = parsed.requestId
    ? `${parsed.message ?? "Unknown error"} (ref: ${parsed.requestId})`
    : parsed.message;
  return {
    title: `Failed to ${actionLabel}`,
    detail: detailWithId,
    level: "error",
  };
}

export function EntityNotebookLive({ entitySlug, onBackfillNeeded }: Props) {
  const api = useConvexApi();
  const navigate = useNavigate();
  const anonymousSessionId = getAnonymousProductSessionId();
  const toast = useToast();

  const blocksPagination = usePaginatedQuery(
    api?.domains.product.blocks.listEntityBlocksPaginated ?? ("skip" as any),
    api?.domains.product.blocks.listEntityBlocksPaginated
      ? { anonymousSessionId, entitySlug }
      : "skip",
    { initialNumItems: 150 },
  );
  const blocks = blocksPagination.results as LiveBlock[] | undefined;

  const snapshot = useQuery(
    api?.domains.product.blocks.getEntityNotebook ?? "skip",
    api?.domains.product.blocks.getEntityNotebook ? { anonymousSessionId, entitySlug } : "skip",
  );

  const blockSummary = useQuery(
    api?.domains.product.blocks.getEntityBlockSummary ?? "skip",
    api?.domains.product.blocks.getEntityBlockSummary ? { anonymousSessionId, entitySlug } : "skip",
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
  const [runtimeError, setRuntimeError] = useState<{ title: string; detail?: string } | null>(null);
  const [backfillPending, setBackfillPending] = useState(false);
  const [optimisticBlockContent, setOptimisticBlockContent] = useState<Record<string, BlockChip[]>>(
    {},
  );
  const backfillInFlightRef = useRef<Promise<void> | null>(null);
  const syncedProjectionKeyRef = useRef<string | null>(null);
  const editorHandlesRef = useRef<Map<string, NotebookBlockEditorHandle>>(new Map());

  const describeError = useCallback((error: unknown): string | undefined => {
    if (!error) return undefined;
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
    return undefined;
  }, []);

  const reportNotebookError = useCallback(
    (title: string, error: unknown) => {
      const detail = describeError(error);
      console.warn(`[notebook] ${title}`, error);
      setRuntimeError({ title, detail });
      toast.error(title, detail);
    },
    [describeError, toast],
  );

  // Codes we expect and handle gracefully — do NOT alert on these. They
  // correspond to the `level: "warning"` branch in describeNotebookMutationFailure
  // plus rate limit, both of which are designed-for states that don't need
  // a page-the-on-call signal.
  const EXPECTED_ALERT_CODES = useMemo(
    () => new Set(["REVISION_MISMATCH", "RATE_LIMITED", "CONTENT_TOO_LARGE"]),
    [],
  );

  const reportNotebookMutationFailure = useCallback(
    (action: "save" | "mention" | "command", error: unknown) => {
      const failure = describeNotebookMutationFailure(action, error);
      const parsed = parseNotebookMutationError(error);
      console.warn(`[notebook] ${failure.title}`, error);
      setRuntimeError({ title: failure.title, detail: failure.detail });
      if (failure.level === "warning") {
        toast.warning(failure.title, failure.detail);
      } else {
        toast.error(failure.title, failure.detail);
      }
      // Real-time alert: fire ntfy only on UNEXPECTED failures. Expected
      // codes (conflict, rate limit, content too large) are designed states
      // and would otherwise pager-storm on normal usage. Sampling at the
      // ntfy helper guarantees at most 1 alert per code per 60s per tab.
      const code = parsed.code ?? "UNKNOWN_ERROR";
      if (!EXPECTED_ALERT_CODES.has(code)) {
        publishNotebookAlert({
          severity: code === "SERVER_ERROR" || code === "UNKNOWN_ERROR" ? "P0" : "P1",
          code,
          title: failure.title,
          detail: failure.detail,
          requestId: parsed.requestId,
          context: { action, entitySlug },
        });
      }
    },
    [EXPECTED_ALERT_CODES, entitySlug, toast],
  );

  const notifyReadOnly = useCallback(
    (action: string) => {
      const title = "Block is read-only";
      const detail = `You cannot ${action} this block until its access mode is set to edit.`;
      setRuntimeError({ title, detail });
      toast.warning(title, detail);
    },
    [toast],
  );

  const runBackfill = useCallback(async (): Promise<boolean> => {
    if (backfillInFlightRef.current) {
      await backfillInFlightRef.current;
      return true;
    }
    setBackfillPending(true);
    const run = backfillEntityBlocks({ anonymousSessionId, entitySlug })
      .then(() => {
        setRuntimeError(null);
        onBackfillNeeded?.();
        return true;
      })
      .catch((error: unknown) => {
        reportNotebookError("Failed to seed notebook blocks", error);
        return false;
      })
      .finally(() => {
        setBackfillPending(false);
        backfillInFlightRef.current = null;
      });
    backfillInFlightRef.current = run;
    return run;
  }, [anonymousSessionId, backfillEntityBlocks, entitySlug, onBackfillNeeded, reportNotebookError]);

  const projectionSyncKey = useMemo(
    () =>
      snapshot
        ? `${snapshot.reportUpdatedAt ?? 0}:${snapshot.revision ?? 0}:${snapshot.reportCount ?? 0}`
        : null,
    [snapshot],
  );

  useEffect(() => {
    if (!blocks || !snapshot || !projectionSyncKey) return;
    if (!shouldRefreshAgentNotebookProjection(blocks, snapshot)) return;
    if (syncedProjectionKeyRef.current === projectionSyncKey) return;

    syncedProjectionKeyRef.current = projectionSyncKey;
    void runBackfill().then((succeeded) => {
      if (!succeeded) {
        syncedProjectionKeyRef.current = null;
      }
    });
  }, [blocks, projectionSyncKey, runBackfill, snapshot]);

  useEffect(() => {
    if (!blocks || Object.keys(optimisticBlockContent).length === 0) return;
    setOptimisticBlockContent((current) => {
      let changed = false;
      const next = { ...current };
      for (const block of blocks) {
        const key = String(block._id);
        const optimistic = next[key];
        if (optimistic && chipsEqual(optimistic, block.content)) {
          delete next[key];
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [blocks, optimisticBlockContent]);

  const registerEditorHandle = useCallback(
    (blockId: Id<"productBlocks">, handle: NotebookBlockEditorHandle | null) => {
      const key = String(blockId);
      if (handle) {
        editorHandlesRef.current.set(key, handle);
      } else {
        editorHandlesRef.current.delete(key);
      }
    },
    [],
  );

  const handleLocalContentChange = useCallback((blockId: Id<"productBlocks">, content: BlockChip[]) => {
    setOptimisticBlockContent((current) => ({ ...current, [String(blockId)]: content }));
    setRuntimeError(null);
  }, []);

  const handleEnter = useCallback(
    async (block: LiveBlock, blockIndex: number) => {
      if (!blocks) return;
      if (block.accessMode === "read") {
        notifyReadOnly("insert after");
        return;
      }
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
    [blocks, insertBlockBetween, anonymousSessionId, entitySlug, notifyReadOnly],
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
      if (block.accessMode !== "edit") {
        notifyReadOnly("add mentions to");
        return;
      }
      try {
        const handle = editorHandlesRef.current.get(String(targetBlockId));
        if (handle) {
          handle.insertMention(match);
          handle.focus();
        } else if (!isSyncEditableBlock(block)) {
          await updateBlock({
            anonymousSessionId,
            blockId: targetBlockId,
            content: [
              ...block.content,
              ...(block.content.length > 0 ? ([{ type: "text", value: " " }] as BlockChip[]) : []),
              {
                type: "mention",
                value: match.name,
                mentionTrigger: "@",
                mentionTarget: match.slug,
              },
            ],
            expectedRevision: block.revision,
          });
        } else {
          throw new Error("Focused notebook editor was not available for this mention.");
        }
        // Record the relation so backlinks work.
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
        reportNotebookMutationFailure("mention", err);
      }
    },
    [
      anonymousSessionId,
      blocks,
      createBlockRelation,
      editorHandlesRef,
      mentionFor,
      notifyReadOnly,
      reportNotebookMutationFailure,
      updateBlock,
    ],
  );

  const runSlashCommand = useCallback(
    async (command: SlashCommand, block: LiveBlock) => {
      setSlashFor(null);
      const prompt = command.prompt ?? "";
      if (!prompt.trim() && command.id !== "mention") return;
      if (block.accessMode === "read") {
        notifyReadOnly("run notebook commands from");
        return;
      }

      if (command.id === "ai" || command.id === "search" || command.id === "deepresearch") {
        // Insert a lightweight progress callout so the user sees work start immediately.
        const progressBlockId = await appendBlock({
          anonymousSessionId,
          entitySlug,
          parentBlockId: block.parentBlockId,
          kind: "callout",
          content: [
            { type: "text", value: `${command.label}: ${prompt}` },
            { type: "text", value: " - working..." },
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
                content: [{ type: "text", value: `[done] ${command.label}: ${prompt}` }],
                expectedRevision: 1,
              });
            } catch (err) {
              reportNotebookMutationFailure("command", err);
            }
          },
          onError: (message) => {
            updateBlock({
              anonymousSessionId,
              blockId: progressBlockId,
              content: [{ type: "text", value: `[error] ${command.label}: ${prompt} - ${message}` }],
              expectedRevision: 1,
            }).catch((err) => reportNotebookMutationFailure("command", err));
            setRuntimeError({ title: `Notebook command failed`, detail: message });
            toast.error("Notebook command failed", message);
          },
        });
      } else if (command.id === "mention") {
        // Open the entity picker seeded with whatever the user typed.
        setMentionFor({ blockId: block._id, initial: prompt });
      }
    },
    [
      anonymousSessionId,
      appendBlock,
      entitySlug,
      notifyReadOnly,
      reportNotebookMutationFailure,
      streaming,
      toast,
      updateBlock,
    ],
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

  const notebookLoadState = getNotebookLoadState({
    loadedCount: blocks?.length ?? 0,
    totalCount: blockSummary?.blockCount,
    paginationStatus: blocksPagination.status,
  });

  if (blocksPagination.status === "LoadingFirstPage" || blocks === undefined || snapshot === undefined) {
    return <div className="py-16 text-center text-sm text-gray-500">Loading notebookâ€¦</div>;
  }

  if (!blocks || blocks.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-gray-500">
        <p>No persisted blocks yet.</p>
        <button
          type="button"
          onClick={() => void runBackfill()}
          disabled={backfillPending}
          className="mt-3 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 transition-colors hover:border-gray-300 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-300"
        >
          {backfillPending ? "Seeding..." : "Seed blocks from latest report"}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6">
      {runtimeError ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="font-medium">{runtimeError.title}</div>
              {runtimeError.detail ? <div className="mt-1 text-xs opacity-80">{runtimeError.detail}</div> : null}
            </div>
            <button
              type="button"
              onClick={() => setRuntimeError(null)}
              className="rounded border border-amber-300/70 px-2 py-1 text-[11px] transition-colors hover:bg-amber-100/70 dark:border-amber-400/30 dark:hover:bg-amber-400/10"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      {!notebookLoadState.fullyLoaded ? (
        <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50/80 px-4 py-3 text-sm text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="font-medium">
                Live notebook loaded {blocks.length} of {notebookLoadState.totalCount} block
                {notebookLoadState.totalCount === 1 ? "" : "s"}
              </div>
              <div className="mt-1 text-xs opacity-80">
                Editing stays locked until the full notebook is loaded so inserts and saves cannot target a partial block list.
              </div>
            </div>
            {notebookLoadState.canLoadMore ? (
              <button
                type="button"
                onClick={() =>
                  blocksPagination.loadMore(
                    Math.min(Math.max(notebookLoadState.remainingCount, 1), 150),
                  )
                }
                disabled={notebookLoadState.isLoadingMore}
                className="shrink-0 rounded border border-sky-300/70 px-2 py-1 text-[11px] transition-colors hover:bg-sky-100/70 disabled:cursor-not-allowed disabled:opacity-60 dark:border-sky-400/30 dark:hover:bg-sky-400/10"
              >
                {notebookLoadState.isLoadingMore
                  ? "Loading..."
                  : `Load ${Math.min(notebookLoadState.remainingCount, 150)} more`}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="mb-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>
          {blocks.length} block{blocks.length === 1 ? "" : "s"} - live - press <kbd className="rounded border border-gray-200 bg-white px-1 dark:border-white/10 dark:bg-white/[0.05]">/</kbd>{" "}
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
            displayContent={optimisticBlockContent[String(block._id)] ?? block.content}
            isEditable={notebookLoadState.fullyLoaded && block.accessMode === "edit"}
            accessMode={notebookLoadState.fullyLoaded ? (block.accessMode ?? "edit") : "read"}
            isFocused={focusedBlockId === block._id}
            showSlash={slashFor === block._id}
            syncDocumentId={buildProductBlockSyncId({
              blockId: String(block._id),
              anonymousSessionId,
            })}
            onFocus={() => setFocusedBlockId(block._id)}
            onBlur={() => {
              if (focusedBlockId === block._id) setFocusedBlockId(null);
            }}
            onLocalContentChange={(content) => handleLocalContentChange(block._id, content)}
            registerEditorHandle={(handle) => registerEditorHandle(block._id, handle)}
            onEnter={() => void handleEnter(block, blockIndex)}
            onBackspaceAtStart={async () => {
              if (blockIndex === 0) return;
              if (block.accessMode !== "edit") {
                notifyReadOnly("delete");
                return;
              }
              await deleteBlock({ anonymousSessionId, blockId: block._id });
            }}
            onOpenSlash={() => setSlashFor(block._id)}
            onCloseSlash={() => setSlashFor(null)}
            onSlashCommand={(cmd) => void runSlashCommand(cmd, block)}
            navigate={navigate}
          />
        ))}
      </div>

      {notebookLoadState.canLoadMore ? (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() =>
              blocksPagination.loadMore(Math.min(Math.max(notebookLoadState.remainingCount, 1), 150))
            }
            disabled={notebookLoadState.isLoadingMore}
            className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 transition-colors hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-300"
          >
            {notebookLoadState.isLoadingMore
              ? "Loading more blocks..."
              : `Load ${Math.min(notebookLoadState.remainingCount, 150)} more block${Math.min(notebookLoadState.remainingCount, 150) === 1 ? "" : "s"}`}
          </button>
        </div>
      ) : null}

      {/* Backlinks */}
      {/* Mention picker â€” modal overlay when active */}
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
            Linked from - {backlinks.length} place{backlinks.length === 1 ? "" : "s"}
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

// ---------------------------------------------------------------------------
// BlockRow - per-block inline editor / renderer
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type BlockRowProps = {
  block: LiveBlock;
  prev?: LiveBlock;
  next?: LiveBlock;
  sourcesById: Map<string, { id: string; label: string; href?: string; confidence?: number; domain?: string }>;
  displayContent: BlockChip[];
  isEditable: boolean;
  accessMode: AccessMode;
  isFocused: boolean;
  showSlash: boolean;
  // Encoded sync id combining anonymousSessionId + blockId; drives
  // useTiptapSync inside NotebookBlockEditor. Must be stable across renders.
  syncDocumentId: string;
  onFocus: () => void;
  onBlur: () => void;
  onLocalContentChange: (content: BlockChip[]) => void;
  registerEditorHandle: (handle: NotebookBlockEditorHandle | null) => void;
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
  displayContent,
  isEditable,
  accessMode,
  isFocused,
  showSlash,
  syncDocumentId,
  onFocus,
  onBlur,
  onLocalContentChange,
  registerEditorHandle,
  onEnter,
  onBackspaceAtStart,
  onOpenSlash,
  onCloseSlash,
  onSlashCommand,
}: BlockRowProps) {
  const isEvidence = block.kind === "evidence";
  const supportsSyncEditing = isSyncEditableBlock(block);
  const shouldMountSyncEditor = supportsSyncEditing && isFocused;

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
    const href = displayContent.find((c) => c.type === "link")?.url ?? displayContent[0]?.url;
    const label =
      displayContent.find((c) => c.type === "link")?.value ?? chipsToPlainText(displayContent);
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
          title={`${block.authorKind === "agent" ? "Agent" : block.authorKind === "user" ? "You" : "Anonymous"} - rev ${block.revision}`}
          className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${authorDotClass(block.authorKind)}`}
        >
          {authorLetter(block.authorKind)}
        </span>
      </div>
      <div className="relative min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {shouldMountSyncEditor ? (
              <NotebookBlockEditor
                ref={registerEditorHandle}
                syncDocumentId={syncDocumentId}
                chips={displayContent}
                className={classesForKind()}
                isEditable={isEditable}
                ariaLabel={`Block - ${block.kind}`}
                autoFocus={isFocused}
                onFocus={onFocus}
                onBlur={onBlur}
                onLocalContentChange={onLocalContentChange}
                onEnter={onEnter}
                onBackspaceAtStart={onBackspaceAtStart}
                onOpenSlash={onOpenSlash}
                onCloseSlash={onCloseSlash}
              />
            ) : (
              <div
                className={`outline-none focus-visible:outline-none ${classesForKind()} ${
                  !isEditable ? "cursor-default opacity-80" : supportsSyncEditing ? "cursor-text" : ""
                }`}
                onFocus={shouldMountSyncEditor ? undefined : onFocus}
                onBlur={shouldMountSyncEditor ? undefined : onBlur}
                role="textbox"
                aria-readonly={!isEditable}
                aria-label={`Block - ${block.kind}`}
                tabIndex={supportsSyncEditing ? 0 : undefined}
              >
                <BlockChipRenderer chips={displayContent} />
              </div>
            )}
            {/* Render inline citations (sourceRefIds) after the editable surface */}
            {block.sourceRefIds && block.sourceRefIds.length > 0 ? (
              <span className="ml-1 inline-flex gap-0.5 align-super">
                {block.sourceRefIds.map((refId, idx) => {
                  const source = sourcesById.get(refId);
                  const tooltip = source
                    ? `${source.domain ?? source.label}${
                        source.confidence != null ? ` - confidence ${source.confidence.toFixed(2)}` : ""
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
          <div className="flex shrink-0 items-start gap-2">
            {accessMode !== "edit" ? (
              <span
                className="mt-2 inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] text-amber-600 bg-amber-500/10"
                title={accessMode === "read" ? "Read-only block" : "Append-only block"}
              >
                <Lock className="h-2.5 w-2.5" />
                {accessMode}
              </span>
            ) : null}
            <BlockProvenance block={block} />
          </div>
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
