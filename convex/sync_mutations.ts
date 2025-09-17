import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { syncPool } from "./work";
// Use a type-only import to avoid circular value imports with generated API
// and to provide strong typing for dynamic imports below.
type ApiModule = typeof import("./_generated/api");

// Enqueue helpers (mutations) – called from OAuth callback routes
export const enqueueSlackSync = internalMutation({
  args: {},
  returns: v.object({ workId: v.string() }),
  handler: async (ctx): Promise<{ workId: string }> => {
    const refs: ApiModule = (await import("./_generated/api")) as ApiModule;
    const workId = await syncPool.enqueueAction(
      ctx,
      refs.internal.sync.runSlackSync,
      {},
      {}
    );
    return { workId };
  },
});

export const enqueueGithubSync = internalMutation({
  args: {},
  returns: v.object({ workId: v.string() }),
  handler: async (ctx): Promise<{ workId: string }> => {
    const refs: ApiModule = (await import("./_generated/api")) as ApiModule;
    const workId = await syncPool.enqueueAction(
      ctx,
      refs.internal.sync.runGithubSync,
      {},
      {}
    );
    return { workId };
  },
});

export const enqueueNotionSync = internalMutation({
  args: {},
  returns: v.object({ workId: v.string() }),
  handler: async (ctx): Promise<{ workId: string }> => {
    const refs: ApiModule = (await import("./_generated/api")) as ApiModule;
    const workId = await syncPool.enqueueAction(
      ctx,
      refs.internal.sync.runNotionSync,
      {},
      {}
    );
    return { workId };
  },
});

export const enqueueGmailSync = internalMutation({
  args: {},
  returns: v.object({ workId: v.string() }),
  handler: async (ctx): Promise<{ workId: string }> => {
    const refs: ApiModule = (await import("./_generated/api")) as ApiModule;
    const workId = await syncPool.enqueueAction(
      ctx,
      refs.internal.sync.runGmailSync,
      {},
      {}
    );
    return { workId };
  },
});
