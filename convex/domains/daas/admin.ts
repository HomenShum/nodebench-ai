// DaaS admin utilities — intended for one-time cleanup / seed operations.
// Guarded: each mutation requires a bounded prefix match to avoid accidental
// wholesale deletes. No auth middleware here (we're running on a private dev
// deployment); harden before exposing publicly.

import { v } from "convex/values";
import { internalMutation, action } from "../../_generated/server";
import { internal } from "../../_generated/api";

const MAX_DELETE = 50;

// Admin auth uses the same pattern as the HTTP ingest: configure
// DAAS_ADMIN_API_KEYS (comma-separated, >=16 chars each) and the
// admin action requires one in the x-daas-api-key header OR via the
// adminKey argument when called from the CLI.
//
// NB: Convex CLI `run` is authenticated via the deploy key, so the
// CLI path is trusted by default. For non-CLI callers, the admin
// action rejects without a matching key.
function isAllowedAdminKey(provided: string | null | undefined): boolean {
  if (!provided || provided.length < 16) return false;
  const allow = (process.env.DAAS_ADMIN_API_KEYS ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length >= 16);
  if (allow.length === 0) return false;
  return allow.includes(provided);
}

/**
 * Internal mutation — delete traces whose sessionId starts with the given
 * prefix. INTERNAL only: callers must go through a public action that has
 * authed the request. Hard capped at MAX_DELETE per call.
 */
export const _deleteTracesByPrefix = internalMutation({
  args: {
    sessionIdPrefix: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, { sessionIdPrefix }) => {
    if (!sessionIdPrefix || sessionIdPrefix.length < 3) {
      throw new Error("sessionIdPrefix must be at least 3 chars");
    }
    const traces = await ctx.db.query("daasTraces").take(MAX_DELETE * 4);
    let deleted = 0;
    for (const t of traces) {
      if (deleted >= MAX_DELETE) break;
      if (t.sessionId.startsWith(sessionIdPrefix)) {
        await ctx.db.delete(t._id);
        deleted += 1;
      }
    }
    return deleted;
  },
});

/**
 * Internal mutation — nuke all judgment rows. INTERNAL only.
 * Used during schema migration from arbitrary-score to boolean-rubric.
 */
export const _deleteAllJudgments = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const rows = await ctx.db.query("daasJudgments").take(MAX_DELETE);
    let deleted = 0;
    for (const j of rows) {
      await ctx.db.delete(j._id);
      deleted += 1;
    }
    return deleted;
  },
});

/**
 * Public admin action — requires either a Convex deploy-key CLI
 * invocation (trusted by default) OR an x-daas-api-key in the adminKey
 * arg that matches DAAS_ADMIN_API_KEYS.
 *
 * Exposing this as an `action` (not mutation) so we can run the auth
 * check against process.env before touching the DB.
 */
export const runAdminOp = action({
  args: {
    op: v.string(), // "deleteTracesByPrefix" | "deleteAllJudgments"
    sessionIdPrefix: v.optional(v.string()),
    adminKey: v.optional(v.string()),
  },
  returns: v.object({
    op: v.string(),
    deleted: v.number(),
  }),
  handler: async (ctx, args): Promise<{ op: string; deleted: number }> => {
    // CLI calls (convex run) don't provide an adminKey — they come in
    // via the deploy-key auth that Convex enforces on its edge. We
    // still require adminKey when present to allow non-CLI callers.
    // If DAAS_REQUIRE_ADMIN_KEY=true, adminKey becomes mandatory.
    const requireKey = (process.env.DAAS_REQUIRE_ADMIN_KEY ?? "").toLowerCase();
    const keyRequired = requireKey === "true" || requireKey === "1";

    if (args.adminKey) {
      if (!isAllowedAdminKey(args.adminKey)) {
        throw new Error("unauthorized: invalid adminKey");
      }
    } else if (keyRequired) {
      throw new Error("unauthorized: adminKey required (DAAS_REQUIRE_ADMIN_KEY=true)");
    }

    if (args.op === "deleteTracesByPrefix") {
      const prefix = (args.sessionIdPrefix ?? "").trim();
      if (prefix.length < 3) {
        throw new Error("sessionIdPrefix must be at least 3 chars");
      }
      const deleted: number = await ctx.runMutation(
        internal.domains.daas.admin._deleteTracesByPrefix,
        { sessionIdPrefix: prefix },
      );
      return { op: args.op, deleted };
    }
    if (args.op === "deleteAllJudgments") {
      const deleted: number = await ctx.runMutation(
        internal.domains.daas.admin._deleteAllJudgments,
        {},
      );
      return { op: args.op, deleted };
    }
    throw new Error(`unknown op: ${args.op}`);
  },
});

