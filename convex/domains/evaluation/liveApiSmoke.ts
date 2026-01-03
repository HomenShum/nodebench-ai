"use node";

import { action } from "../../_generated/server";
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { discoverToolsWithSdk, executeToolWithSdk } from "../../lib/mcpTransport";

type SmokeCheckResult = {
  ok: boolean;
  elapsedMs: number;
  details?: any;
  error?: string;
};

function requireSecret(argsSecret: string) {
  const expected = process.env.MCP_SECRET || "";
  if (!expected) {
    throw new Error("MCP_SECRET is not set on this deployment");
  }
  if (argsSecret !== expected) {
    throw new Error("Unauthorized (invalid secret)");
  }
}

async function timed<T>(fn: () => Promise<T>): Promise<{ elapsedMs: number; value: T }> {
  const start = Date.now();
  const value = await fn();
  return { elapsedMs: Date.now() - start, value };
}

function toErrString(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

export const run = action({
  args: {
    secret: v.string(),
    includePublicApiChecks: v.optional(v.boolean()),
    requireMcpChecks: v.optional(v.boolean()),
    tryLocalhostDefaults: v.optional(v.boolean()),
    includeMcpToolExec: v.optional(v.boolean()),
    includeLinkup: v.optional(v.boolean()),
    linkupQuery: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    requireSecret(args.secret);

    const results: Record<string, SmokeCheckResult> = {};

    const tryLocalhost = args.tryLocalhostDefaults === true;
    const coreAgentUrl =
      process.env.CORE_AGENT_MCP_SERVER_URL || (tryLocalhost ? "http://127.0.0.1:4001" : "");
    const coreAgentToken = process.env.CORE_AGENT_MCP_AUTH_TOKEN || "";
    const openbbUrl =
      process.env.OPENBB_MCP_SERVER_URL || (tryLocalhost ? "http://127.0.0.1:8001" : "");
    const researchUrl =
      process.env.RESEARCH_MCP_SERVER_URL || (tryLocalhost ? "http://127.0.0.1:8002" : "");
    const requireMcp = args.requireMcpChecks === true;
    const includeMcpToolExec = args.includeMcpToolExec !== false;

    // 0) Public API key checks (no/low cost, deterministic)
    if (args.includePublicApiChecks !== false) {
      results.openai_modelsList = await (async (): Promise<SmokeCheckResult> => {
        const key = process.env.OPENAI_API_KEY || "";
        if (!key) return { ok: false, elapsedMs: 0, error: "OPENAI_API_KEY is not set" };
        try {
          const { elapsedMs, value } = await timed(async () => {
            const resp = await fetch("https://api.openai.com/v1/models", {
              headers: { Authorization: `Bearer ${key}` },
            });
            const text = await resp.text();
            if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
            const parsed = JSON.parse(text);
            const count = Array.isArray(parsed?.data) ? parsed.data.length : null;
            const sample = Array.isArray(parsed?.data)
              ? parsed.data.slice(0, 5).map((m: any) => m?.id).filter(Boolean)
              : null;
            return { count, sample };
          });
          return { ok: true, elapsedMs, details: value };
        } catch (err) {
          return { ok: false, elapsedMs: 0, error: toErrString(err) };
        }
      })();

      results.anthropic_modelsList = await (async (): Promise<SmokeCheckResult> => {
        const key = process.env.ANTHROPIC_API_KEY || "";
        if (!key) return { ok: false, elapsedMs: 0, error: "ANTHROPIC_API_KEY is not set" };
        try {
          const { elapsedMs, value } = await timed(async () => {
            const resp = await fetch("https://api.anthropic.com/v1/models", {
              headers: {
                "x-api-key": key,
                "anthropic-version": "2023-06-01",
              },
            });
            const text = await resp.text();
            if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
            const parsed = JSON.parse(text);
            const data = Array.isArray(parsed?.data) ? parsed.data : [];
            const sample = data.slice(0, 5).map((m: any) => m?.id).filter(Boolean);
            return { count: data.length, sample };
          });
          return { ok: true, elapsedMs, details: value };
        } catch (err) {
          return { ok: false, elapsedMs: 0, error: toErrString(err) };
        }
      })();

      results.gemini_modelsList = await (async (): Promise<SmokeCheckResult> => {
        const key = process.env.GEMINI_API_KEY || "";
        if (!key) return { ok: false, elapsedMs: 0, error: "GEMINI_API_KEY is not set" };
        try {
          const { elapsedMs, value } = await timed(async () => {
            const resp = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`
            );
            const text = await resp.text();
            if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
            const parsed = JSON.parse(text);
            const models = Array.isArray(parsed?.models) ? parsed.models : [];
            const sample = models
              .slice(0, 5)
              .map((m: any) => m?.name)
              .filter(Boolean);
            return { count: models.length, sample };
          });
          return { ok: true, elapsedMs, details: value };
        } catch (err) {
          return { ok: false, elapsedMs: 0, error: toErrString(err) };
        }
      })();

      results.youtube_search = await (async (): Promise<SmokeCheckResult> => {
        const key = process.env.YOUTUBE_API_KEY || "";
        if (!key) return { ok: false, elapsedMs: 0, error: "YOUTUBE_API_KEY is not set" };
        try {
          const { elapsedMs, value } = await timed(async () => {
            const q = encodeURIComponent("OpenAI");
            const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${q}&key=${encodeURIComponent(
              key
            )}`;
            const resp = await fetch(url);
            const text = await resp.text();
            if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
            const parsed = JSON.parse(text);
            const items = Array.isArray(parsed?.items) ? parsed.items : [];
            const firstTitle = items[0]?.snippet?.title ?? null;
            return { items: items.length, firstTitle };
          });
          return { ok: true, elapsedMs, details: value };
        } catch (err) {
          return { ok: false, elapsedMs: 0, error: toErrString(err) };
        }
      })();
    }

    // 1) Core Agent MCP tools/list (JSON-RPC)
    results.coreAgentMcp_toolsList = await (async (): Promise<SmokeCheckResult> => {
      if (!coreAgentUrl) {
        return requireMcp
          ? { ok: false, elapsedMs: 0, error: "CORE_AGENT_MCP_SERVER_URL is not set" }
          : { ok: true, elapsedMs: 0, details: { skipped: true, reason: "CORE_AGENT_MCP_SERVER_URL not set" } };
      }
      try {
        const { elapsedMs, value } = await timed(async () => {
          const tools = await discoverToolsWithSdk(coreAgentUrl, coreAgentToken || undefined);
          const toolNames = tools.map((t) => t.name).sort();
          const required = [
            "createPlan",
            "updatePlanStep",
            "getPlan",
            "writeAgentMemory",
            "readAgentMemory",
            "listAgentMemory",
            "deleteAgentMemory",
          ];
          const missing = required.filter((name) => !toolNames.includes(name));
          return { toolCount: toolNames.length, missing, toolNames: toolNames.slice(0, 50) };
        });
        const ok = (value.missing as string[]).length === 0;
        return { ok: ok || !requireMcp, elapsedMs, details: value, ...(ok ? {} : { error: "Missing required tools" }) };
      } catch (err) {
        return requireMcp
          ? { ok: false, elapsedMs: 0, error: toErrString(err) }
          : { ok: true, elapsedMs: 0, details: { skipped: true, error: toErrString(err) } };
      }
    })();

    // 1b) Core Agent MCP tools/call (createPlan + getPlan + memory roundtrip)
    results.coreAgentMcp_toolsCall = await (async (): Promise<SmokeCheckResult> => {
      if (!coreAgentUrl) {
        return requireMcp
          ? { ok: false, elapsedMs: 0, error: "CORE_AGENT_MCP_SERVER_URL is not set" }
          : { ok: true, elapsedMs: 0, details: { skipped: true, reason: "CORE_AGENT_MCP_SERVER_URL not set" } };
      }
      if (!includeMcpToolExec) {
        return { ok: true, elapsedMs: 0, details: { skipped: true, reason: "includeMcpToolExec=false" } };
      }
      try {
        const { elapsedMs, value } = await timed(async () => {
          const toolArgs = {
            goal: `MCP-1 E2E Plan ${Date.now()}`,
            steps: [
              { step: "Create plan", status: "completed" },
              { step: "Write memory", status: "in_progress" },
              { step: "Read memory", status: "pending" },
            ],
          };
          const planRes = await executeToolWithSdk(coreAgentUrl, "createPlan", toolArgs, coreAgentToken || undefined);
          const planId = (planRes as any)?.planId;
          if (!planId) throw new Error("createPlan did not return planId");

          const getRes = await executeToolWithSdk(coreAgentUrl, "getPlan", { planId }, coreAgentToken || undefined);
          const gotPlan = (getRes as any)?.plan;
          if (!gotPlan?.id) throw new Error("getPlan did not return a plan");

          const memKey = `mcp1:e2e:${Date.now()}`;
          await executeToolWithSdk(
            coreAgentUrl,
            "writeAgentMemory",
            { key: memKey, content: JSON.stringify({ planId, ts: Date.now() }) },
            coreAgentToken || undefined,
          );
          const readRes = await executeToolWithSdk(
            coreAgentUrl,
            "readAgentMemory",
            { key: memKey },
            coreAgentToken || undefined,
          );
          const content = (readRes as any)?.content;
          if (typeof content !== "string" || !content.includes(planId)) {
            throw new Error("readAgentMemory did not return expected content");
          }
          await executeToolWithSdk(coreAgentUrl, "deleteAgentMemory", { key: memKey }, coreAgentToken || undefined);

          return { planId, memKey };
        });
        return { ok: true, elapsedMs, details: value };
      } catch (err) {
        return requireMcp
          ? { ok: false, elapsedMs: 0, error: toErrString(err) }
          : { ok: true, elapsedMs: 0, details: { skipped: true, error: toErrString(err) } };
      }
    })();

    // 2) OpenBB MCP health + tool listing
    results.openbb_health = await (async (): Promise<SmokeCheckResult> => {
      if (!openbbUrl) {
        return requireMcp
          ? { ok: false, elapsedMs: 0, error: "OPENBB_MCP_SERVER_URL is not set" }
          : { ok: true, elapsedMs: 0, details: { skipped: true, reason: "OPENBB_MCP_SERVER_URL not set" } };
      }
      try {
        const { elapsedMs, value } = await timed(async () => {
          const data = await ctx.runAction(internal.actions.openbbActions.openbbHealth, {});
          return { data };
        });
        return { ok: true, elapsedMs, details: value };
      } catch (err) {
        return requireMcp
          ? { ok: false, elapsedMs: 0, error: toErrString(err) }
          : { ok: true, elapsedMs: 0, details: { skipped: true, error: toErrString(err) } };
      }
    })();

    results.openbb_listTools = await (async (): Promise<SmokeCheckResult> => {
      if (!openbbUrl) {
        return requireMcp
          ? { ok: false, elapsedMs: 0, error: "OPENBB_MCP_SERVER_URL is not set" }
          : { ok: true, elapsedMs: 0, details: { skipped: true, reason: "OPENBB_MCP_SERVER_URL not set" } };
      }
      try {
        const { elapsedMs, value } = await timed(async () => {
          const tools = await ctx.runAction(internal.actions.openbbActions.openbbListTools, {});
          const toolCount = Array.isArray(tools) ? tools.length : undefined;
          return { toolCount, sample: Array.isArray(tools) ? tools.slice(0, 20) : tools };
        });
        return { ok: true, elapsedMs, details: value };
      } catch (err) {
        return requireMcp
          ? { ok: false, elapsedMs: 0, error: toErrString(err) }
          : { ok: true, elapsedMs: 0, details: { skipped: true, error: toErrString(err) } };
      }
    })();

    results.openbb_executeTool = await (async (): Promise<SmokeCheckResult> => {
      if (!openbbUrl) {
        return requireMcp
          ? { ok: false, elapsedMs: 0, error: "OPENBB_MCP_SERVER_URL is not set" }
          : { ok: true, elapsedMs: 0, details: { skipped: true, reason: "OPENBB_MCP_SERVER_URL not set" } };
      }
      if (!includeMcpToolExec) {
        return { ok: true, elapsedMs: 0, details: { skipped: true, reason: "includeMcpToolExec=false" } };
      }
      try {
        const { elapsedMs, value } = await timed(async () => {
          // Prefer equity quote, fall back to news_world.
          let toolName = "equity_price_quote";
          let parameters: any = { symbol: "CRM" };
          try {
            const res = await ctx.runAction(internal.actions.openbbActions.openbbExecuteTool, {
              toolName,
              parameters,
            });
            return { toolName, ok: true, sample: res };
          } catch {
            toolName = "news_world";
            parameters = { limit: 1 };
            const res = await ctx.runAction(internal.actions.openbbActions.openbbExecuteTool, {
              toolName,
              parameters,
            });
            return { toolName, ok: true, sample: res };
          }
        });
        return { ok: true, elapsedMs, details: value };
      } catch (err) {
        return requireMcp
          ? { ok: false, elapsedMs: 0, error: toErrString(err) }
          : { ok: true, elapsedMs: 0, details: { skipped: true, error: toErrString(err) } };
      }
    })();

    // 3) Research MCP health + tool listing
    results.research_health = await (async (): Promise<SmokeCheckResult> => {
      if (!researchUrl) {
        return requireMcp
          ? { ok: false, elapsedMs: 0, error: "RESEARCH_MCP_SERVER_URL is not set" }
          : { ok: true, elapsedMs: 0, details: { skipped: true, reason: "RESEARCH_MCP_SERVER_URL not set" } };
      }
      try {
        const { elapsedMs, value } = await timed(async () => {
          const data = await ctx.runAction(internal.actions.researchMcpActions.researchHealth, {});
          return { data };
        });
        return { ok: true, elapsedMs, details: value };
      } catch (err) {
        return requireMcp
          ? { ok: false, elapsedMs: 0, error: toErrString(err) }
          : { ok: true, elapsedMs: 0, details: { skipped: true, error: toErrString(err) } };
      }
    })();

    results.research_listTools = await (async (): Promise<SmokeCheckResult> => {
      if (!researchUrl) {
        return requireMcp
          ? { ok: false, elapsedMs: 0, error: "RESEARCH_MCP_SERVER_URL is not set" }
          : { ok: true, elapsedMs: 0, details: { skipped: true, reason: "RESEARCH_MCP_SERVER_URL not set" } };
      }
      try {
        const { elapsedMs, value } = await timed(async () => {
          const tools = await ctx.runAction(internal.actions.researchMcpActions.researchListTools, {});
          const toolCount = Array.isArray(tools) ? tools.length : undefined;
          return { toolCount, sample: Array.isArray(tools) ? tools.slice(0, 50) : tools };
        });
        return { ok: true, elapsedMs, details: value };
      } catch (err) {
        return requireMcp
          ? { ok: false, elapsedMs: 0, error: toErrString(err) }
          : { ok: true, elapsedMs: 0, details: { skipped: true, error: toErrString(err) } };
      }
    })();

    results.research_executeTool = await (async (): Promise<SmokeCheckResult> => {
      if (!researchUrl) {
        return requireMcp
          ? { ok: false, elapsedMs: 0, error: "RESEARCH_MCP_SERVER_URL is not set" }
          : { ok: true, elapsedMs: 0, details: { skipped: true, reason: "RESEARCH_MCP_SERVER_URL not set" } };
      }
      if (!includeMcpToolExec) {
        return { ok: true, elapsedMs: 0, details: { skipped: true, reason: "includeMcpToolExec=false" } };
      }
      try {
        const { elapsedMs, value } = await timed(async () => {
          // Exercise a tool that calls back into Convex (fusion_search -> convex fusionSearch -> linkup/youtube/etc).
          const res = await ctx.runAction(internal.actions.researchMcpActions.researchExecuteTool, {
            toolName: "fusion_search",
            parameters: {
              query: "OpenAI GPT-5.2 model availability",
              mode: "fast",
              sources: ["linkup", "news"],
            },
          });
          return { toolName: "fusion_search", sample: res };
        });
        return { ok: true, elapsedMs, details: value };
      } catch (err) {
        return requireMcp
          ? { ok: false, elapsedMs: 0, error: toErrString(err) }
          : { ok: true, elapsedMs: 0, details: { skipped: true, error: toErrString(err) } };
      }
    })();

    // 4) Linkup live query (optional, costs money)
    results.linkup_search = await (async (): Promise<SmokeCheckResult> => {
      if (!args.includeLinkup) {
        return { ok: true, elapsedMs: 0, details: { skipped: true } };
      }
      const key = process.env.LINKUP_API_KEY || "";
      if (!key) return { ok: false, elapsedMs: 0, error: "LINKUP_API_KEY is not set" };
      try {
        const { elapsedMs, value } = await timed(async () => {
          const response = await fetch("https://api.linkup.so/v1/search", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              q: args.linkupQuery || "OpenAI API status",
              depth: "standard",
              outputType: "sourcedAnswer",
              includeInlineCitations: true,
              maxResults: 3,
              includeSources: true,
              includeImages: false,
            }),
          });
          const text = await response.text();
          if (!response.ok) {
            const snippet = text.slice(0, 300);
            throw new Error(`HTTP ${response.status} ${response.statusText}: ${snippet}`);
          }
          const parsed = JSON.parse(text);
          const sourcesCount = Array.isArray(parsed?.sources) ? parsed.sources.length : 0;
          const resultsCount = Array.isArray(parsed?.results) ? parsed.results.length : 0;
          const hasAnswer = typeof parsed?.answer === "string" && parsed.answer.length > 0;
          return { hasAnswer, sourcesCount, resultsCount };
        });
        return { ok: (value.sourcesCount as number) >= 1 || (value.resultsCount as number) >= 1, elapsedMs, details: value };
      } catch (err) {
        return { ok: false, elapsedMs: 0, error: toErrString(err) };
      }
    })();

    const envPresence = {
      MCP_SECRET: Boolean(process.env.MCP_SECRET),
      CORE_AGENT_MCP_SERVER_URL: Boolean(process.env.CORE_AGENT_MCP_SERVER_URL),
      CORE_AGENT_MCP_AUTH_TOKEN: Boolean(process.env.CORE_AGENT_MCP_AUTH_TOKEN),
      OPENBB_MCP_SERVER_URL: Boolean(process.env.OPENBB_MCP_SERVER_URL),
      OPENBB_API_KEY: Boolean(process.env.OPENBB_API_KEY || process.env.OPENBB_MCP_AUTH_TOKEN),
      RESEARCH_MCP_SERVER_URL: Boolean(process.env.RESEARCH_MCP_SERVER_URL),
      RESEARCH_API_KEY: Boolean(process.env.RESEARCH_API_KEY || process.env.MCP_SECRET),
      LINKUP_API_KEY: Boolean(process.env.LINKUP_API_KEY),
      OPENAI_API_KEY: Boolean(process.env.OPENAI_API_KEY),
      ANTHROPIC_API_KEY: Boolean(process.env.ANTHROPIC_API_KEY),
      GEMINI_API_KEY: Boolean(process.env.GEMINI_API_KEY),
      YOUTUBE_API_KEY: Boolean(process.env.YOUTUBE_API_KEY),
    };

    const requiredKeys = Object.keys(results).filter((k) => {
      if (k.startsWith("coreAgentMcp_")) return requireMcp;
      if (k.startsWith("openbb_")) return requireMcp;
      if (k.startsWith("research_")) return requireMcp;
      if (k === "linkup_search") return args.includeLinkup === true;
      return true; // public api checks always required when enabled
    });
    const ok = requiredKeys.every((k) => results[k]?.ok);
    return {
      ok,
      checkedAt: Date.now(),
      mode: {
        includePublicApiChecks: args.includePublicApiChecks !== false,
        includeLinkup: args.includeLinkup === true,
        requireMcpChecks: requireMcp,
        tryLocalhostDefaults: tryLocalhost,
        resolved: {
          coreAgentUrl: coreAgentUrl ? new URL(coreAgentUrl).origin : null,
          openbbUrl: openbbUrl ? new URL(openbbUrl).origin : null,
          researchUrl: researchUrl ? new URL(researchUrl).origin : null,
        },
      },
      envPresence,
      results,
    };
  },
});
