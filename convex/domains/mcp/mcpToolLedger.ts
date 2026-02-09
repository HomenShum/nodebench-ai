/**
 * MCP Tool Call Ledger + Policy Enforcement
 *
 * This is the "trusted access" layer for NodeBench MCP:
 * - Every tool call creates a ledger row (who/what/why/when/result).
 * - A lightweight policy engine evaluates risk tiers + budgets before execution.
 * - Budget enforcement is configurable (enforce=false logs only; enforce=true blocks).
 *
 * IMPORTANT:
 * - We store *redacted* previews only (never raw secrets).
 * - This is designed to be used by the /api/mcpGateway dispatcher and by the
 *   unified gateway service for "direct" tools (financial tools that bypass Convex).
 */

import { v } from "convex/values";
import { query, mutation, internalMutation } from "../../_generated/server";
import type { Id, Doc } from "../../_generated/dataModel";
import { hashSync } from "../../../shared/artifacts";

type RiskTier =
  | "read_only"
  | "external_read"
  | "write_internal"
  | "external_side_effect"
  | "destructive"
  | "unknown";

type PolicyConfig = {
  _id?: Id<"mcpPolicyConfigs">;
  name: string;
  enforce: boolean;
  dailyLimitsByTier?: Record<string, number>;
  dailyLimitsByTool?: Record<string, number>;
  blockedTools?: Record<string, boolean>;
  notes?: string;
  createdAt?: number;
  updatedAt?: number;
};

function stableStringify(value: unknown): string {
  const seen = new WeakSet<object>();
  return JSON.stringify(value, (_key, v) => {
    if (!v || typeof v !== "object") return v;
    if (seen.has(v as object)) return "[Circular]";
    seen.add(v as object);
    if (Array.isArray(v)) return v;
    const obj = v as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(obj).sort()) out[k] = obj[k];
    return out;
  });
}

const SECRET_KEY_RE = /(token|secret|api[_-]?key|password|authorization)/i;
const SECRET_VALUE_RE = /^(hf_[a-zA-Z0-9]+|sk-[a-zA-Z0-9]+|AIza[a-zA-Z0-9_-]+)$/;

function sanitizeForPreview(
  value: unknown,
  opts: { maxDepth: number; maxString: number; maxArray: number },
  depth = 0,
  seen = new WeakSet<object>(),
): unknown {
  if (value == null) return value;
  if (typeof value === "string") {
    const s = value.trim();
    if (SECRET_VALUE_RE.test(s)) return "[REDACTED]";
    if (/^bearer\s+/i.test(s)) return "[REDACTED]";
    if (s.length > opts.maxString) return `${s.slice(0, opts.maxString)}...(truncated)`;
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value !== "object") return String(value);

  if (seen.has(value as object)) return "[Circular]";
  seen.add(value as object);

  if (Array.isArray(value)) {
    if (depth >= opts.maxDepth) return `[Array(${value.length})]`;
    const out: unknown[] = [];
    const slice = value.slice(0, opts.maxArray);
    for (const item of slice) {
      out.push(sanitizeForPreview(item, opts, depth + 1, seen));
    }
    if (value.length > opts.maxArray) {
      out.push(`...(omitted ${value.length - opts.maxArray} items)`);
    }
    return out;
  }

  if (depth >= opts.maxDepth) return "[Object]";
  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(obj).sort()) {
    const raw = obj[k];
    out[k] = SECRET_KEY_RE.test(k)
      ? "[REDACTED]"
      : sanitizeForPreview(raw, opts, depth + 1, seen);
  }
  return out;
}

function todayDateKeyUtc(nowMs = Date.now()): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

const DEFAULT_POLICY: PolicyConfig = {
  name: "default",
  enforce: false,
  dailyLimitsByTier: {
    read_only: 20_000,
    external_read: 2_000,
    write_internal: 1_000,
    external_side_effect: 100,
    destructive: 50,
    unknown: 1_000,
  },
};

async function getOrCreatePolicyConfig(
  ctx: { db: any },
  name = "default",
): Promise<Doc<"mcpPolicyConfigs">> {
  const existing = await ctx.db
    .query("mcpPolicyConfigs")
    .withIndex("by_name", (q: any) => q.eq("name", name))
    .first();

  if (existing) return existing;

  const now = Date.now();
  const id = await ctx.db.insert("mcpPolicyConfigs", {
    name,
    enforce: DEFAULT_POLICY.enforce,
    dailyLimitsByTier: DEFAULT_POLICY.dailyLimitsByTier,
    dailyLimitsByTool: {},
    blockedTools: {},
    notes: "Auto-created default. Edit via UI or Convex dashboard.",
    createdAt: now,
    updatedAt: now,
  });
  return (await ctx.db.get(id)) as Doc<"mcpPolicyConfigs">;
}

async function getUsageCount(
  ctx: { db: any },
  dateKey: string,
  scope: "tier" | "tool",
  key: string,
): Promise<{ row: Doc<"mcpToolUsageDaily"> | null; count: number }> {
  const row = await ctx.db
    .query("mcpToolUsageDaily")
    .withIndex("by_date_scope_key", (q: any) =>
      q.eq("dateKey", dateKey).eq("scope", scope).eq("key", key)
    )
    .first();
  return { row: row ?? null, count: row?.count ?? 0 };
}

async function incrementUsage(
  ctx: { db: any },
  dateKey: string,
  scope: "tier" | "tool",
  key: string,
): Promise<void> {
  const now = Date.now();
  const { row } = await getUsageCount(ctx, dateKey, scope, key);
  if (row) {
    await ctx.db.patch(row._id, { count: row.count + 1, updatedAt: now });
    return;
  }
  await ctx.db.insert("mcpToolUsageDaily", {
    dateKey,
    scope,
    key,
    count: 1,
    updatedAt: now,
  });
}

function toRiskTier(input?: string): RiskTier {
  switch (input) {
    case "read_only":
    case "external_read":
    case "write_internal":
    case "external_side_effect":
    case "destructive":
      return input;
    default:
      return "unknown";
  }
}

export const startToolCallInternal = internalMutation({
  args: {
    toolName: v.string(),
    toolType: v.optional(v.string()),
    riskTier: v.optional(v.string()),
    args: v.optional(v.any()),
    idempotencyKey: v.optional(v.string()),
    requestMeta: v.optional(v.any()),
  },
  returns: v.object({
    allowed: v.boolean(),
    callId: v.id("mcpToolCallLedger"),
    argsHash: v.string(),
    policy: v.any(),
  }),
  handler: async (ctx, input) => {
    const now = Date.now();
    const dateKey = todayDateKeyUtc(now);

    const cfg = await getOrCreatePolicyConfig(ctx, "default");

    const toolName = input.toolName;
    const toolType = input.toolType ?? "unknown";
    const riskTier = toRiskTier(input.riskTier);

    const argsValue = input.args ?? {};
    const argsString = stableStringify(argsValue);
    const argsHash = `args_${hashSync(argsString)}`;

    const argsKeys =
      argsValue && typeof argsValue === "object" && !Array.isArray(argsValue)
        ? Object.keys(argsValue as Record<string, unknown>).sort()
        : [];

    const argsPreview = (() => {
      try {
        const sanitized = sanitizeForPreview(argsValue, {
          maxDepth: 4,
          maxString: 240,
          maxArray: 20,
        });
        const s = stableStringify(sanitized);
        return s.length > 4_000 ? `${s.slice(0, 4_000)}...(truncated)` : s;
      } catch {
        return undefined;
      }
    })();

    const blockedByDenylist = Boolean(cfg.blockedTools?.[toolName]);

    const tierKey = riskTier;
    const toolKey = toolName;

    const { count: tierCount } = await getUsageCount(ctx, dateKey, "tier", tierKey);
    const { count: toolCount } = await getUsageCount(ctx, dateKey, "tool", toolKey);

    const tierLimit =
      (cfg.dailyLimitsByTier?.[tierKey] ?? DEFAULT_POLICY.dailyLimitsByTier?.[tierKey]) ??
      undefined;
    const toolLimit = cfg.dailyLimitsByTool?.[toolKey] ?? undefined;

    const budgetWouldExceed =
      (typeof tierLimit === "number" && tierCount >= tierLimit) ||
      (typeof toolLimit === "number" && toolCount >= toolLimit);

    const enforce = Boolean(cfg.enforce);

    // Denylist always blocks. Budget only blocks when enforce=true.
    const allowed = !blockedByDenylist && (!enforce || !budgetWouldExceed);

    const policy = {
      config: {
        name: cfg.name,
        enforce,
      },
      denylist: {
        blockedByDenylist,
      },
      budgets: {
        dateKey,
        tier: { tierKey, count: tierCount, limit: tierLimit ?? null },
        tool: { toolKey, count: toolCount, limit: toolLimit ?? null },
        wouldExceed: budgetWouldExceed,
      },
    };

    const callId = await ctx.db.insert("mcpToolCallLedger", {
      toolName,
      toolType,
      riskTier,
      allowed,
      policy,
      argsHash,
      argsKeys,
      argsPreview,
      idempotencyKey: input.idempotencyKey,
      requestMeta: input.requestMeta,
      startedAt: now,
    });

    if (allowed) {
      await incrementUsage(ctx, dateKey, "tier", tierKey);
      await incrementUsage(ctx, dateKey, "tool", toolKey);
    }

    return { allowed, callId, argsHash, policy };
  },
});

export const finishToolCallInternal = internalMutation({
  args: {
    callId: v.id("mcpToolCallLedger"),
    success: v.boolean(),
    durationMs: v.number(),
    errorMessage: v.optional(v.string()),
    result: v.optional(v.any()),
  },
  returns: v.null(),
  handler: async (ctx, input) => {
    const now = Date.now();

    const resultPreview = (() => {
      try {
        const sanitized = sanitizeForPreview(input.result, {
          maxDepth: 4,
          maxString: 240,
          maxArray: 30,
        });
        const s = stableStringify(sanitized);
        return s.length > 6_000 ? `${s.slice(0, 6_000)}...(truncated)` : s;
      } catch {
        return undefined;
      }
    })();

    const resultBytes = (() => {
      try {
        const s = stableStringify(input.result);
        return s.length;
      } catch {
        return undefined;
      }
    })();

    await ctx.db.patch(input.callId, {
      finishedAt: now,
      durationMs: input.durationMs,
      success: input.success,
      errorMessage: input.errorMessage,
      resultPreview: resultPreview,
      resultBytes: resultBytes,
    });

    return null;
  },
});

export const listToolCalls = query({
  args: {
    // Optional UTC date filter (YYYY-MM-DD). When provided, only rows whose startedAt
    // falls within that UTC day are returned.
    dateKey: v.optional(v.string()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
    toolName: v.optional(v.string()),
    riskTier: v.optional(v.string()),
    allowed: v.optional(v.boolean()),
    success: v.optional(v.boolean()),
  },
  returns: v.object({
    calls: v.array(v.object({
      _id: v.id("mcpToolCallLedger"),
      toolName: v.string(),
      toolType: v.string(),
      riskTier: v.string(),
      allowed: v.boolean(),
      policy: v.optional(v.any()),
      argsHash: v.string(),
      argsKeys: v.array(v.string()),
      argsPreview: v.optional(v.string()),
      idempotencyKey: v.optional(v.string()),
      requestMeta: v.optional(v.any()),
      startedAt: v.number(),
      finishedAt: v.optional(v.number()),
      durationMs: v.optional(v.number()),
      success: v.optional(v.boolean()),
      errorMessage: v.optional(v.string()),
      resultPreview: v.optional(v.string()),
      resultBytes: v.optional(v.number()),
    })),
    nextCursor: v.optional(v.string()),
    hasMore: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const cursor = typeof args.cursor === "string" ? args.cursor : null;

    const requestedDateKey = typeof args.dateKey === "string" ? args.dateKey.trim() : "";
    const hasValidDateKey = /^\d{4}-\d{2}-\d{2}$/.test(requestedDateKey);
    const dayStartMs = hasValidDateKey ? Date.parse(`${requestedDateKey}T00:00:00.000Z`) : NaN;
    const hasDateRange = Number.isFinite(dayStartMs);
    const dayEndMs = hasDateRange ? dayStartMs + 24 * 60 * 60 * 1000 : NaN;

    let q;
    if (args.toolName) {
      q = ctx.db
        .query("mcpToolCallLedger")
        .withIndex("by_tool_startedAt", (qq) => {
          let out = qq.eq("toolName", args.toolName!);
          if (hasDateRange) out = out.gte("startedAt", dayStartMs).lt("startedAt", dayEndMs);
          return out;
        })
        .order("desc");
    } else if (args.riskTier) {
      q = ctx.db
        .query("mcpToolCallLedger")
        .withIndex("by_risk_startedAt", (qq) => {
          let out = qq.eq("riskTier", args.riskTier!);
          if (hasDateRange) out = out.gte("startedAt", dayStartMs).lt("startedAt", dayEndMs);
          return out;
        })
        .order("desc");
    } else if (typeof args.allowed === "boolean") {
      q = ctx.db
        .query("mcpToolCallLedger")
        .withIndex("by_allowed_startedAt", (qq) => {
          let out = qq.eq("allowed", args.allowed!);
          if (hasDateRange) out = out.gte("startedAt", dayStartMs).lt("startedAt", dayEndMs);
          return out;
        })
        .order("desc");
    } else {
      q = ctx.db.query("mcpToolCallLedger");
      if (hasDateRange) {
        q = q.withIndex("by_startedAt", (qq) => qq.gte("startedAt", dayStartMs).lt("startedAt", dayEndMs));
      } else {
        q = q.withIndex("by_startedAt");
      }
      q = q.order("desc");
    }

    // Over-fetch; we apply optional in-memory filters (success) after.
    const page = await q.paginate({ cursor, numItems: Math.min(limit * 3, 300) });
    let rows = page.page;

    if (typeof args.success === "boolean") {
      rows = rows.filter((r) => r.success === args.success);
    }
    if (typeof args.allowed === "boolean" && !args.toolName && !args.riskTier) {
      // no-op; index already applied
    }

    const calls = rows.slice(0, limit).map((r) => ({
      _id: r._id,
      toolName: r.toolName,
      toolType: r.toolType,
      riskTier: r.riskTier,
      allowed: r.allowed,
      policy: r.policy,
      argsHash: r.argsHash,
      argsKeys: r.argsKeys,
      argsPreview: r.argsPreview,
      idempotencyKey: r.idempotencyKey,
      requestMeta: r.requestMeta,
      startedAt: r.startedAt,
      finishedAt: r.finishedAt,
      durationMs: r.durationMs,
      success: r.success,
      errorMessage: r.errorMessage,
      resultPreview: r.resultPreview,
      resultBytes: r.resultBytes,
    }));

    return {
      calls,
      nextCursor: page.isDone ? undefined : page.continueCursor,
      hasMore: !page.isDone,
    };
  },
});

export const getPolicyAndUsage = query({
  args: {
    // Allow inspecting historical usage (e.g. when ledger rows exist for a prior day).
    // Default remains "today" (UTC).
    dateKey: v.optional(v.string()),
  },
  returns: v.object({
    dateKey: v.string(),
    config: v.object({
      name: v.string(),
      enforce: v.boolean(),
      dailyLimitsByTier: v.optional(v.record(v.string(), v.number())),
      dailyLimitsByTool: v.optional(v.record(v.string(), v.number())),
      blockedTools: v.optional(v.record(v.string(), v.boolean())),
      notes: v.optional(v.string()),
      updatedAt: v.optional(v.number()),
    }),
    usageByTier: v.array(v.object({
      tier: v.string(),
      count: v.number(),
      limit: v.optional(v.number()),
    })),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const requested = typeof args.dateKey === "string" ? args.dateKey.trim() : "";
    const dateKey = /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : todayDateKeyUtc(now);
    const cfg =
      (await ctx.db
        .query("mcpPolicyConfigs")
        .withIndex("by_name", (q: any) => q.eq("name", "default"))
        .first()) ??
      ({
        name: "default",
        enforce: DEFAULT_POLICY.enforce,
        dailyLimitsByTier: DEFAULT_POLICY.dailyLimitsByTier,
        dailyLimitsByTool: {},
        blockedTools: {},
        notes: "Missing config; using in-memory defaults (will be created on first tool call).",
        updatedAt: undefined,
      } as any);

    const tierRows = await ctx.db
      .query("mcpToolUsageDaily")
      .withIndex("by_date_scope", (q) => q.eq("dateKey", dateKey).eq("scope", "tier"))
      .collect();

    const usageByTier = tierRows
      .map((r) => ({
        tier: r.key,
        count: r.count,
        limit: cfg.dailyLimitsByTier?.[r.key] ?? DEFAULT_POLICY.dailyLimitsByTier?.[r.key],
      }))
      .sort((a, b) => b.count - a.count);

    return {
      dateKey,
      config: {
        name: cfg.name,
        enforce: cfg.enforce,
        dailyLimitsByTier: cfg.dailyLimitsByTier,
        dailyLimitsByTool: cfg.dailyLimitsByTool,
        blockedTools: cfg.blockedTools,
        notes: cfg.notes,
        updatedAt: cfg.updatedAt,
      },
      usageByTier,
    };
  },
});

async function requireAdmin(ctx: any): Promise<Id<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");

  const user = await ctx.db
    .query("users")
    .filter((q: any) => q.eq(q.field("tokenIdentifier"), identity.tokenIdentifier))
    .first();
  if (!user) throw new Error("User not found");

  const adminUser = await ctx.db
    .query("adminUsers")
    .withIndex("by_userId", (q: any) => q.eq("userId", user._id))
    .first();
  if (!adminUser) throw new Error("Access denied: Not an admin");

  return user._id;
}

export const upsertPolicyConfig = mutation({
  args: {
    name: v.optional(v.string()),
    enforce: v.optional(v.boolean()),
    dailyLimitsByTier: v.optional(v.record(v.string(), v.number())),
    dailyLimitsByTool: v.optional(v.record(v.string(), v.number())),
    blockedTools: v.optional(v.record(v.string(), v.boolean())),
    notes: v.optional(v.string()),
  },
  returns: v.object({
    ok: v.boolean(),
    configId: v.id("mcpPolicyConfigs"),
  }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const name = args.name ?? "default";
    const existing = await ctx.db
      .query("mcpPolicyConfigs")
      .withIndex("by_name", (q: any) => q.eq("name", name))
      .first();

    const now = Date.now();
    if (!existing) {
      const id = await ctx.db.insert("mcpPolicyConfigs", {
        name,
        enforce: args.enforce ?? false,
        dailyLimitsByTier: args.dailyLimitsByTier ?? DEFAULT_POLICY.dailyLimitsByTier,
        dailyLimitsByTool: args.dailyLimitsByTool ?? {},
        blockedTools: args.blockedTools ?? {},
        notes: args.notes,
        createdAt: now,
        updatedAt: now,
      });
      return { ok: true, configId: id };
    }

    await ctx.db.patch(existing._id, {
      enforce: args.enforce ?? existing.enforce,
      dailyLimitsByTier: args.dailyLimitsByTier ?? existing.dailyLimitsByTier,
      dailyLimitsByTool: args.dailyLimitsByTool ?? existing.dailyLimitsByTool,
      blockedTools: args.blockedTools ?? existing.blockedTools,
      notes: args.notes ?? existing.notes,
      updatedAt: now,
    });

    return { ok: true, configId: existing._id };
  },
});
