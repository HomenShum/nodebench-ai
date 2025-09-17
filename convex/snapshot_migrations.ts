import { internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

// Server-side PM JSON normalizer for existing snapshots.
// - Unwrap wrapper nodes: blockGroup/blockContainer
// - Map legacy list item names at top-level: checkListItem -> taskItem; bulletListItem -> listItem
// - Group consecutive taskItem into taskList, listItem into bulletList
// - Wrap stray top-level text nodes into paragraphs
// - Always ensure a { type: "doc", content: [...] } root

type PMNode = {
  type?: string;
  content?: PMNode[];
  text?: string;
  attrs?: Record<string, unknown>;
  [k: string]: unknown;
};

const WRAPPERS = new Set(["blockGroup", "blockContainer"]);

function clone<T>(n: T): T {
  return JSON.parse(JSON.stringify(n));
}

function coerceDoc(c: unknown): PMNode {
  const maybeObj = (c ?? {}) as PMNode;
  if (maybeObj && typeof maybeObj === "object" && maybeObj.type === "doc") {
    if (!Array.isArray(maybeObj.content)) maybeObj.content = [];
    return maybeObj;
  }
  const wrapped: PMNode = { type: "doc", content: [] };
  if (maybeObj && typeof (maybeObj as { type?: unknown }).type === "string") {
    wrapped.content = [maybeObj];
  } else if (
    Array.isArray((maybeObj as { content?: unknown }).content)
  ) {
    wrapped.content = (maybeObj as { content: PMNode[] }).content;
  }
  return wrapped;
}

function flattenWrappers(nodes: PMNode[] | undefined): PMNode[] {
  if (!Array.isArray(nodes)) return [];
  const out: PMNode[] = [];
  for (const raw of nodes) {
    const n = clone(raw);
    if (n && WRAPPERS.has(String(n.type))) {
      out.push(...flattenWrappers(n.content));
      continue;
    }
    if (Array.isArray(n.content)) n.content = flattenWrappers(n.content);
    out.push(n);
  }
  return out;
}

function mapListItemNames(n: PMNode): PMNode {
  if (!n || typeof n !== "object") return n;
  const node = clone(n);
  if (node.type === "checkListItem") node.type = "taskItem";
  if (node.type === "bulletListItem") node.type = "listItem";
  if (Array.isArray(node.content)) node.content = node.content.map(mapListItemNames);
  return node;
}

function wrapTextAsParagraph(n: PMNode): PMNode {
  if (n?.type === "text") {
    return { type: "paragraph", content: [clone(n)] };
  }
  return n;
}

function normalizeSnapshotContent(json: unknown): PMNode {
  const doc = coerceDoc(json);
  // 1) Remove wrappers and map legacy names in top-level
  const top = flattenWrappers(doc.content).map(mapListItemNames).map(wrapTextAsParagraph);

  // 2) Group consecutive taskItem/listItem runs into list containers
  const grouped: PMNode[] = [];
  const pushRun = (kind: "taskItem" | "listItem", run: PMNode[]) => {
    if (run.length === 0) return;
    if (kind === "taskItem") grouped.push({ type: "taskList", content: run });
    else grouped.push({ type: "bulletList", content: run });
  };
  let i = 0;
  while (i < top.length) {
    const cur = top[i];
    if (cur?.type === "taskItem") {
      const run: PMNode[] = [];
      while (i < top.length && top[i]?.type === "taskItem") {
        const itm = clone(top[i]);
        if (!Array.isArray(itm.content) || itm.content.length === 0) {
          itm.content = [{ type: "paragraph", content: [] }];
        }
        run.push(itm);
        i++;
      }
      pushRun("taskItem", run);
      continue;
    }
    if (cur?.type === "listItem") {
      const run: PMNode[] = [];
      while (i < top.length && top[i]?.type === "listItem") {
        const itm = clone(top[i]);
        if (!Array.isArray(itm.content) || itm.content.length === 0) {
          itm.content = [{ type: "paragraph", content: [] }];
        }
        run.push(itm);
        i++;
      }
      pushRun("listItem", run);
      continue;
    }
    grouped.push(cur);
    i++;
  }

  return { type: "doc", content: grouped };
}

export const normalizeSnapshot = internalMutation({
  args: { snapshotId: v.id("documentSnapshots") },
  returns: v.null(),
  handler: async (ctx, { snapshotId }) => {
    const snap = await ctx.db.get(snapshotId);
    if (!snap) return null;
    try {
      const parsed = JSON.parse(snap.content);
      const normalized = normalizeSnapshotContent(parsed);
      const content = JSON.stringify(normalized);
      await ctx.db.patch(snapshotId, {
        content,
        contentSize: content.length,
      });
    } catch {
      // If it's not valid JSON, leave it; server-side validation will reject on use
    }
    return null;
  },
});

export const normalizeAllSnapshots = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const snapshots = await ctx.db.query("documentSnapshots").collect();
    for (const s of snapshots) {
      await ctx.scheduler.runAfter(0, internal.snapshot_migrations.normalizeSnapshot, {
        snapshotId: s._id as Id<"documentSnapshots">,
      });
    }
    return null;
  },
});
