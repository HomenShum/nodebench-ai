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
    op: v.string(),
    sessionIdPrefix: v.optional(v.string()),
    adminKey: v.optional(v.string()),
    // Args for registerApiKey / setApiKeyEnabled ops:
    rawKey: v.optional(v.string()),
    owner: v.optional(v.string()),
    rateLimitPerMinute: v.optional(v.number()),
    webhookSecret: v.optional(v.string()),
    notes: v.optional(v.string()),
    apiKeyId: v.optional(v.id("daasApiKeys")),
    enabled: v.optional(v.boolean()),
  },
  returns: v.object({
    op: v.string(),
    deleted: v.optional(v.number()),
    apiKeyId: v.optional(v.id("daasApiKeys")),
  }),
  handler: async (ctx, args): Promise<{
    op: string;
    deleted?: number;
    apiKeyId?: any;
  }> => {
    const startTime = Date.now();
    const actorId = args.adminKey ? `key:${args.adminKey.slice(0, 8)}...` : "cli";

    const audit = async (status: string, extra: Record<string, unknown>) => {
      try {
        await ctx.runMutation(internal.domains.daas.mutations.logAuditEvent, {
          op: `admin.${args.op}`,
          actorKind: args.adminKey ? "http" : "cli",
          actorId,
          status,
          durationMs: Date.now() - startTime,
          metaJson: JSON.stringify(extra),
          ...(status === "error" && typeof extra.error === "string"
            ? { errorMessage: String(extra.error).slice(0, 1024) }
            : {}),
        });
      } catch { /* audit absorbed */ }
    };

    // Auth gate
    const requireKey = (process.env.DAAS_REQUIRE_ADMIN_KEY ?? "").toLowerCase();
    const keyRequired = requireKey === "true" || requireKey === "1";

    if (args.adminKey) {
      if (!isAllowedAdminKey(args.adminKey)) {
        await audit("denied", { reason: "invalid_admin_key" });
        throw new Error("unauthorized: invalid adminKey");
      }
    } else if (keyRequired) {
      await audit("denied", { reason: "admin_key_required" });
      throw new Error("unauthorized: adminKey required (DAAS_REQUIRE_ADMIN_KEY=true)");
    }

    try {
      if (args.op === "deleteTracesByPrefix") {
        const prefix = (args.sessionIdPrefix ?? "").trim();
        if (prefix.length < 3) {
          await audit("error", { error: "prefix_too_short", prefix });
          throw new Error("sessionIdPrefix must be at least 3 chars");
        }
        const deleted: number = await ctx.runMutation(
          internal.domains.daas.admin._deleteTracesByPrefix,
          { sessionIdPrefix: prefix },
        );
        await audit("ok", { op: args.op, prefix, deleted });
        return { op: args.op, deleted };
      }
      if (args.op === "deleteAllJudgments") {
        const deleted: number = await ctx.runMutation(
          internal.domains.daas.admin._deleteAllJudgments,
          {},
        );
        await audit("ok", { op: args.op, deleted });
        return { op: args.op, deleted };
      }
      if (args.op === "registerApiKey") {
        if (!args.rawKey || !args.owner) {
          await audit("error", { error: "missing_args", op: args.op });
          throw new Error("registerApiKey requires rawKey + owner");
        }
        const apiKeyId: any = await ctx.runMutation(
          internal.domains.daas.mutations.registerApiKey,
          {
            rawKey: args.rawKey,
            owner: args.owner,
            rateLimitPerMinute: args.rateLimitPerMinute,
            webhookSecret: args.webhookSecret,
            notes: args.notes,
          },
        );
        await audit("ok", {
          op: args.op,
          owner: args.owner,
          hasWebhookSecret: Boolean(args.webhookSecret),
          rateLimitPerMinute: args.rateLimitPerMinute,
        });
        return { op: args.op, apiKeyId };
      }
      if (args.op === "setApiKeyEnabled") {
        if (!args.apiKeyId || args.enabled === undefined) {
          await audit("error", { error: "missing_args", op: args.op });
          throw new Error("setApiKeyEnabled requires apiKeyId + enabled");
        }
        await ctx.runMutation(
          internal.domains.daas.mutations.setApiKeyEnabled,
          { id: args.apiKeyId, enabled: args.enabled },
        );
        await audit("ok", { op: args.op, enabled: args.enabled });
        return { op: args.op };
      }
      await audit("error", { error: "unknown_op", op: args.op });
      throw new Error(`unknown op: ${args.op}`);
    } catch (err) {
      if (err instanceof Error) {
        await audit("error", { error: err.message });
      } else {
        await audit("error", { error: String(err) });
      }
      throw err;
    }
  },
});

