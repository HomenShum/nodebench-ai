import { ProsemirrorSync } from "@convex-dev/prosemirror-sync";
import { components } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import { query, mutation, type MutationCtx, type QueryCtx } from "../../_generated/server";
import { v } from "convex/values";

import { requireProductIdentity } from "./helpers";
import { parseProductBlockSyncId } from "../../../shared/productBlockSync";
import { prosemirrorDocToChips } from "../../../shared/notebookBlockProsemirror";

const prosemirrorSync = new ProsemirrorSync(components.prosemirrorSync);

type BlockLookup = {
  block: Doc<"productBlocks">;
  anonymousSessionId: string | null;
};

function parseSyncIdentityOrThrow(id: string) {
  const parsed = parseProductBlockSyncId(id);
  if (!parsed) {
    throw new Error("Invalid notebook block sync id");
  }
  return parsed;
}

async function getBlockForRead(ctx: QueryCtx, syncId: string): Promise<BlockLookup> {
  const parsed = parseSyncIdentityOrThrow(syncId);
  const identity = await requireProductIdentity(ctx, parsed.anonymousSessionId);
  const block = await ctx.db.get(parsed.blockId as Id<"productBlocks">);
  if (!block || block.ownerKey !== identity.ownerKey || block.deletedAt) {
    throw new Error("Notebook block not found");
  }
  return {
    block,
    anonymousSessionId: parsed.anonymousSessionId,
  };
}

async function getBlockForWrite(ctx: MutationCtx, syncId: string): Promise<BlockLookup> {
  const parsed = parseSyncIdentityOrThrow(syncId);
  const identity = await requireProductIdentity(ctx, parsed.anonymousSessionId);
  const block = await ctx.db.get(parsed.blockId as Id<"productBlocks">);
  if (!block || block.ownerKey !== identity.ownerKey || block.deletedAt) {
    throw new Error("Notebook block not found");
  }
  return {
    block,
    anonymousSessionId: parsed.anonymousSessionId,
  };
}

export async function mirrorNotebookSnapshotIntoBlock(
  ctx: MutationCtx,
  syncId: string,
  snapshot: string,
): Promise<void> {
  const { block, anonymousSessionId } = await getBlockForWrite(ctx, syncId);
  const identity = await requireProductIdentity(ctx, anonymousSessionId);
  const chips = prosemirrorDocToChips(JSON.parse(snapshot));
  if (JSON.stringify(chips) === JSON.stringify(block.content)) {
    return;
  }
  await ctx.db.patch(block._id, {
    content: chips,
    revision: block.revision + 1,
    authorKind: "user",
    authorId:
      typeof identity.rawUserId === "string"
        ? identity.rawUserId
        : identity.anonymousSessionId ?? block.authorId,
    updatedAt: Date.now(),
  });
}

export const {
  getSnapshot,
  submitSnapshot,
  latestVersion,
  getSteps,
  submitSteps,
} = prosemirrorSync.syncApi({
  async checkRead(ctx, id) {
    await getBlockForRead(ctx as QueryCtx, id);
  },
  async checkWrite(ctx, id) {
    await getBlockForWrite(ctx as MutationCtx, id);
  },
  async onSnapshot(ctx, id, snapshot) {
    await mirrorNotebookSnapshotIntoBlock(ctx as MutationCtx, id, snapshot);
  },
});

export const getBlockSyncSeed = query({
  args: {
    id: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      blockId: v.id("productBlocks"),
      revision: v.number(),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const { block } = await getBlockForRead(ctx, args.id);
    return {
      blockId: block._id,
      revision: block.revision,
      updatedAt: block.updatedAt,
    };
  },
});
