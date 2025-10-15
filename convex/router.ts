"use node";
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { PersistentTextStreaming, StreamId } from "@convex-dev/persistent-text-streaming";
import { components } from "./_generated/api";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { Agent } from "@convex-dev/agent";

const http = httpRouter();

const persistentTextStreaming = new PersistentTextStreaming(
  components.persistentTextStreaming
);

// Helper: Base64 encode ASCII strings without relying on Node or browser globals.
// Used for HTTP Basic Authorization headers in environments without btoa/Buffer.
function base64EncodeAscii(input: string): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let output = "";
  let i = 0;
  while (i < input.length) {
    const c1 = input.charCodeAt(i++);
    const c2 = input.charCodeAt(i++);
    const c3 = input.charCodeAt(i++);

    const enc1 = c1 >> 2;
    const enc2 = ((c1 & 0x03) << 4) | (isNaN(c2) ? 0 : (c2 >> 4));
    const enc3 = isNaN(c2) ? 64 : (((c2 & 0x0f) << 2) | (isNaN(c3) ? 0 : (c3 >> 6)));
    const enc4 = isNaN(c3) ? 64 : (c3 & 0x3f);

    output += chars.charAt(enc1);
    output += chars.charAt(enc2);
    output += enc3 === 64 ? "=" : chars.charAt(enc3);
    output += enc4 === 64 ? "=" : chars.charAt(enc4);
  }
  return output;
}

// JSON-RPC 2.0 MCP-compatible endpoint (minimal, JSON-only)
// Methods supported:
// - initialize
// - tools/list
// - tools/call
// - resources/list (files metadata as resources)
http.route({
  path: "/api/mcp",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return new Response(
        JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message: "Not authenticated" }, id: null }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Helper builders
    const ok = (id: string | number | null, result: any, extraHeaders: Record<string, string> = {}) =>
      new Response(
        JSON.stringify({ jsonrpc: "2.0", id, result }),
        { status: 200, headers: { "Content-Type": "application/json", ...extraHeaders } }
      );
    const err = (id: string | number | null, code: number, message: string, data?: any, status = 400) =>
      new Response(
        JSON.stringify({ jsonrpc: "2.0", id, error: { code, message, data } }),
        { status, headers: { "Content-Type": "application/json" } }
      );

    let body: any;
    try {
      body = await request.json();
    } catch {
      return err(null, -32700, "Parse error", undefined, 400);
    }

    // Support only single-message (no batch) for now
    if (!body || body.jsonrpc !== "2.0" || typeof body.method !== "string") {
      return err(body?.id ?? null, -32600, "Invalid Request");
    }

    const { id, method, params } = body as { id: string | number | null; method: string; params?: any };

    // Static tool registry (schemas kept lightweight for now)
    const toolList = [
      {
        name: "list_files",
        description: "List the current user's files (optionally by fileType)",
        schema: {
          type: "object",
          properties: {
            fileType: { type: "string", description: "Filter by fileType (e.g. 'pdf','csv','video')" },
            limit: { type: "number", description: "Max number of files to return" },
          },
        },
      },
      {
        name: "get_file_metadata",
        description: "Get metadata for a specific file the user owns",
        schema: {
          type: "object",
          required: ["fileId"],
          properties: {
            fileId: { type: "string", description: "Id of the file (Convex Id<\"files\">)" },
          },
        },
      },
      {
        name: "get_recent_analyses",
        description: "List recent file analyses for the current user",
        schema: {
          type: "object",
          properties: {
            limit: { type: "number", description: "Max number of analyses to return" },
          },
        },
      },
      {
        name: "semantic_search",
        description: "Vector search via RAG over the global namespace",
        schema: {
          type: "object",
          required: ["query"],
          properties: {
            query: { type: "string", description: "Search query" },
            limit: { type: "number", description: "Number of results" },
          },
        },
      },
      {
        name: "ask_rag",
        description: "Answer a question using hybrid RAG (vector + keyword)",
        schema: {
          type: "object",
          required: ["prompt"],
          properties: {
            prompt: { type: "string", description: "User question" },
          },
        },
      },
    ];

    try {
      switch (method) {
        case "initialize": {
          // Minimal init; no session handling yet
          return ok(id ?? null, {
            protocolVersion: "2025-03-26",
            capabilities: { tools: {}, resources: {} },
          });
        }
        case "tools/list": {
          return ok(id ?? null, { tools: toolList });
        }
        case "tools/call": {
          const name = params?.name as string | undefined;
          const args: any = params?.arguments ?? {};
          if (!name) return err(id ?? null, -32602, "Missing tool name");

          // Dispatch tools
          if (name === "list_files") {
            const { fileType, limit } = args as { fileType?: string; limit?: number };
            const files = await ctx.runQuery(api.files.getUserFiles, {
              fileType: fileType,
              limit: limit,
            });
            return ok(id ?? null, { tool: name, data: files });
          }

          if (name === "get_file_metadata") {
            const { fileId } = args as { fileId?: string };
            if (!fileId) return err(id ?? null, -32602, "fileId is required");
            const file = await ctx.runQuery(internal.files.getFile, { fileId: fileId as unknown as Id<"files"> });
            if (!file || file.userId !== identity.subject) {
              return err(id ?? null, -32001, "File not found or access denied", undefined, 404);
            }
            return ok(id ?? null, { tool: name, data: file });
          }

          if (name === "get_recent_analyses") {
            const { limit } = args as { limit?: number };
            const analyses = await ctx.runQuery(api.files.getRecentAnalyses, { limit });
            return ok(id ?? null, { tool: name, data: analyses });
          }

          if (name === "semantic_search") {
            const { query, limit } = args as { query?: string; limit?: number };
            if (!query) return err(id ?? null, -32602, "query is required");
            const results = await ctx.runAction(api.rag.semanticSearch, { query, limit });
            return ok(id ?? null, { tool: name, data: results });
          }

          if (name === "ask_rag") {
            const { prompt } = args as { prompt?: string };
            if (!prompt) return err(id ?? null, -32602, "prompt is required");
            const result = await ctx.runAction(api.rag.askQuestion, { prompt });
            return ok(id ?? null, { tool: name, data: result });
          }

          return err(id ?? null, -32601, `Method not found: tool '${name}'`);
        }
        case "resources/list": {
          // Expose user files as resources (metadata only for now)
          const files = await ctx.runQuery(api.files.getUserFiles, { limit: 100 });
          const resources = files.map((f: any) => ({
            uri: `nodebench://file/${f._id}`,
            name: f.fileName,
            mimeType: f.mimeType,
            description: `User file (${f.fileType})`,
          }));
          return ok(id ?? null, { resources });
        }
        default:
          return err(id ?? null, -32601, `Method not found: ${method}`);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Internal error";
      return err(id ?? null, -32000, message, undefined, 500);
    }
  }),
});

http.route({
  path: "/api/stream/:runId",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const runIdParam = url.pathname.split("/").pop();

    if (!runIdParam) {
      return new Response("Missing runId", { status: 400 });
    }

    const runId = runIdParam as Id<"agentRuns">;
    const run = await ctx.runQuery(api.aiAgents.getAgentRun, { runId });
    if (!run) {
      return new Response("Run not found", { status: 404 });
    }

    const encoder = new TextEncoder();
    let lastSeq: number | undefined = undefined;
    let isClosed = false;

    const sendEvent = (controller: ReadableStreamDefaultController<Uint8Array>, payload: any) => {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
    };

    const loadEvents = async () => {
      const events = await ctx.runQuery(api.aiAgents.listAgentRunEvents, { runId });
      return events
        .filter((event: any) => (lastSeq === undefined ? true : event.seq > lastSeq))
        .sort((a: any, b: any) => a.seq - b.seq)
        .slice(-100);
    };

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        sendEvent(controller, { kind: "sse.hello", message: "connected" });

        const dispatchInitial = async () => {
          try {
            const initialEvents = await loadEvents();
            for (const event of initialEvents) {
              lastSeq = event.seq;
              sendEvent(controller, {
                kind: event.kind,
                message: event.message,
                data: event.data,
                seq: event.seq,
                createdAt: event.createdAt,
              });
            }
          } catch (error: any) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ kind: "error", message: String(error?.message ?? "Failed to load events") })}\n\n`));
            controller.close();
            isClosed = true;
            return;
          }
        };

        void dispatchInitial();

        const interval = setInterval(() => {
          void (async () => {
            if (isClosed) return;
            try {
              const newEvents = await loadEvents();
              if (!newEvents.length) {
                controller.enqueue(encoder.encode(`: heartbeat\n\n`));
                return;
              }
              for (const event of newEvents) {
                lastSeq = event.seq;
                sendEvent(controller, {
                  kind: event.kind,
                  message: event.message,
                  data: event.data,
                  seq: event.seq,
                  createdAt: event.createdAt,
                });
              }
            } catch (error: any) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ kind: "error", message: String(error?.message ?? "Failed to load events") })}\n\n`));
              controller.close();
              isClosed = true;
            }
          })();
        }, 1500);

        controller.enqueue(encoder.encode(`retry: 5000\n\n`));

        return () => {
          clearInterval(interval);
          isClosed = true;
        };
      },
      cancel() {
        isClosed = true;
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }),
});

// Google OAuth start
http.route({
  path: "/api/google/oauth/start",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return new Response("Unauthorized", { status: 401 });
    }
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const scope = [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
    ].join(" ");
    const url = new URL(request.url);
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${url.origin}/api/google/oauth/callback`;
    if (!clientId) {
      return new Response("Missing GOOGLE_CLIENT_ID env", { status: 500 });
    }

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", scope);
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("include_granted_scopes", "true");
    authUrl.searchParams.set("prompt", "consent");
    authUrl.searchParams.set("state", identity.subject);

    return new Response(null, {
      status: 302,
      headers: { Location: authUrl.toString() },
    });
  }),
});

  // Google OAuth callback
  http.route({
    path: "/api/google/oauth/callback",
    method: "GET",
    handler: httpAction(async (ctx, request) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return new Response("Unauthorized", { status: 401 });
    }
    const url = new URL(request.url);
    // no-op
    const code = url.searchParams.get("code");
    const err = url.searchParams.get("error");
    if (err) {
      return new Response(`OAuth error: ${err}`, { status: 400 });
    }
    if (!code) {
      return new Response("Missing code", { status: 400 });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${url.origin}/api/google/oauth/callback`;
    if (!clientId || !clientSecret) {
      return new Response("Missing Google OAuth env vars", { status: 500 });
    }

    const tokenEndpoint = "https://oauth2.googleapis.com/token";
    const body = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });
    const tokenRes = await fetch(tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      return new Response(`Token exchange failed: ${text}`, { status: 500 });
    }
    const tokenJson = await tokenRes.json();
    const accessToken: string | undefined = tokenJson.access_token;
    const refreshToken: string | undefined = tokenJson.refresh_token;
    const expiresIn: number | undefined = tokenJson.expires_in;
    const tokenType: string | undefined = tokenJson.token_type;
    const scope: string | undefined = tokenJson.scope;
    const expiryDate = expiresIn ? Date.now() + expiresIn * 1000 : undefined;

    if (!accessToken) {
      return new Response("No access token in response", { status: 500 });
    }

    // Fetch user email
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    let email: string | undefined;
    if (userInfoRes.ok) {
      const info = await userInfoRes.json();
      email = info.email as string | undefined;
    }

    const refs = await import("./_generated/api");
    await ctx.runMutation((refs as any).internal.gmail.saveTokens, {
      email,
      accessToken,
      refreshToken,
      scope,
      expiryDate,
      tokenType,
    });
    // Enqueue Gmail sync
    await ctx.runMutation((refs as any).internal.sync_mutations.enqueueGmailSync, {});

    const postRedirect = process.env.GOOGLE_POST_LOGIN_REDIRECT || "/";
    return new Response(null, { status: 302, headers: { Location: postRedirect } });
  }),
});

// Slack OAuth start
http.route({
  path: "/api/slack/oauth/start",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return new Response("Unauthorized", { status: 401 });
    const url = new URL(request.url);
    const clientId = process.env.SLACK_CLIENT_ID;
    const scope = process.env.SLACK_SCOPES || "chat:write users:read channels:read";
    const redirectUri = process.env.SLACK_REDIRECT_URI || `${url.origin}/api/slack/oauth/callback`;
    if (!clientId) return new Response("Missing SLACK_CLIENT_ID env", { status: 500 });

    const authUrl = new URL("https://slack.com/oauth/v2/authorize");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("scope", scope);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("state", identity.subject);

    return new Response(null, { status: 302, headers: { Location: authUrl.toString() } });
  }),
});

// Slack OAuth callback
http.route({
  path: "/api/slack/oauth/callback",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return new Response("Unauthorized", { status: 401 });
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const err = url.searchParams.get("error");
    if (err) return new Response(`OAuth error: ${err} `, { status: 400 });
    if (!code) return new Response("Missing code", { status: 400 });

    const clientId = process.env.SLACK_CLIENT_ID;
    const clientSecret = process.env.SLACK_CLIENT_SECRET;
    const redirectUri = process.env.SLACK_REDIRECT_URI || `${url.origin}/api/slack/oauth/callback`;
    if (!clientId || !clientSecret) return new Response("Missing Slack OAuth env", { status: 500 });

    const body = new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri });
    const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok || !tokenJson.ok) {
      return new Response(`Token exchange failed: ${JSON.stringify(tokenJson)}`, { status: 500 });
    }

    const access_token = tokenJson.access_token as string;
    const scope = tokenJson.scope as string | undefined;
    const token_type = tokenJson.token_type as string | undefined;
    const bot_user_id = tokenJson.bot_user_id as string | undefined;
    const team = tokenJson.team as { id?: string; name?: string } | undefined;
    const authed_user = tokenJson.authed_user as { id?: string; access_token?: string } | undefined;

    const refs = await import("./_generated/api");
    await ctx.runMutation((refs as any).internal.integrations.slackSaveTokens, {
      teamId: team?.id,
      teamName: team?.name,
      botUserId: bot_user_id,
      authedUserId: authed_user?.id,
      accessToken: access_token,
      userAccessToken: authed_user?.access_token,
      scope,
      tokenType: token_type,
    });
    // Enqueue Slack sync
    await ctx.runMutation((refs as any).internal.sync_mutations.enqueueSlackSync, {});

    const postRedirect = process.env.SLACK_POST_LOGIN_REDIRECT || "/";
    return new Response(null, { status: 302, headers: { Location: postRedirect } });
  }),
});

// GitHub OAuth start
http.route({
  path: "/api/github/oauth/start",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return new Response("Unauthorized", { status: 401 });
    const url = new URL(request.url);
    const clientId = process.env.GITHUB_CLIENT_ID;
    const scope = process.env.GITHUB_SCOPES || "read:user";
    const redirectUri = process.env.GITHUB_REDIRECT_URI || `${url.origin}/api/github/oauth/callback`;
    if (!clientId) return new Response("Missing GITHUB_CLIENT_ID env", { status: 500 });

    const authUrl = new URL("https://github.com/login/oauth/authorize");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", scope);
    authUrl.searchParams.set("state", identity.subject);
    authUrl.searchParams.set("allow_signup", "true");

    return new Response(null, { status: 302, headers: { Location: authUrl.toString() } });
  }),
});

// GitHub OAuth callback
http.route({
  path: "/api/github/oauth/callback",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return new Response("Unauthorized", { status: 401 });
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const err = url.searchParams.get("error");
    if (err) return new Response(`OAuth error: ${err}`, { status: 400 });
    if (!code) return new Response("Missing code", { status: 400 });

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    const redirectUri = process.env.GITHUB_REDIRECT_URI || `${url.origin}/api/github/oauth/callback`;
    if (!clientId || !clientSecret) return new Response("Missing GitHub OAuth env", { status: 500 });

    const body = new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri });
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body,
    });
    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      return new Response(`Token exchange failed: ${text}`, { status: 500 });
    }
    const tokenJson = await tokenRes.json();
    const access_token = tokenJson.access_token as string | undefined;
    const token_type = tokenJson.token_type as string | undefined;
    const scope = tokenJson.scope as string | undefined;
    if (!access_token) return new Response("No access token", { status: 500 });

    // Fetch username
    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${access_token}`, Accept: "application/vnd.github+json" },
    });
    let username: string | undefined;
    if (userRes.ok) {
      const info = await userRes.json();
      username = info.login as string | undefined;
    }

    const refs = await import("./_generated/api");
    await ctx.runMutation((refs as any).internal.integrations.githubSaveTokens, {
      username,
      accessToken: access_token,
      scope,
      tokenType: token_type,
    });
    // Enqueue GitHub sync
    await ctx.runMutation((refs as any).internal.sync_mutations.enqueueGithubSync, {});

    const postRedirect = process.env.GITHUB_POST_LOGIN_REDIRECT || "/";
    return new Response(null, { status: 302, headers: { Location: postRedirect } });
  }),
});

// Notion OAuth start
http.route({
  path: "/api/notion/oauth/start",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return new Response("Unauthorized", { status: 401 });
    const url = new URL(request.url);
    const clientId = process.env.NOTION_CLIENT_ID;
    const redirectUri = process.env.NOTION_REDIRECT_URI || `${url.origin}/api/notion/oauth/callback`;
    if (!clientId) return new Response("Missing NOTION_CLIENT_ID env", { status: 500 });

    const authUrl = new URL("https://api.notion.com/v1/oauth/authorize");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("owner", "user");
    authUrl.searchParams.set("state", identity.subject);

    return new Response(null, { status: 302, headers: { Location: authUrl.toString() } });
  }),
});

// Notion OAuth callback
http.route({
  path: "/api/notion/oauth/callback",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return new Response("Unauthorized", { status: 401 });
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const err = url.searchParams.get("error");
    if (err) return new Response(`OAuth error: ${err}`, { status: 400 });
    if (!code) return new Response("Missing code", { status: 400 });

    const clientId = process.env.NOTION_CLIENT_ID;
    const clientSecret = process.env.NOTION_CLIENT_SECRET;
    const redirectUri = process.env.NOTION_REDIRECT_URI || `${url.origin}/api/notion/oauth/callback`;
    if (!clientId || !clientSecret) return new Response("Missing Notion OAuth env", { status: 500 });

    const tokenRes = await fetch("https://api.notion.com/v1/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + base64EncodeAscii(`${clientId}:${clientSecret}`),
      },
      body: JSON.stringify({ grant_type: "authorization_code", code, redirect_uri: redirectUri }),
    });
    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      return new Response(`Token exchange failed: ${text}`, { status: 500 });
    }
    const tokenJson = await tokenRes.json();
    const access_token = tokenJson.access_token as string | undefined;
    const workspace_id = tokenJson.workspace_id as string | undefined;
    const workspace_name = tokenJson.workspace_name as string | undefined;
    const bot_id = tokenJson.bot_id as string | undefined;
    if (!access_token) return new Response("No access token", { status: 500 });

    const refs = await import("./_generated/api");
    await ctx.runMutation((refs as any).internal.integrations.notionSaveTokens, {
      workspaceId: workspace_id,
      workspaceName: workspace_name,
      botId: bot_id,
      accessToken: access_token,
    });
    // Enqueue Notion sync
    await ctx.runMutation((refs as any).internal.sync_mutations.enqueueNotionSync, {});

    const postRedirect = process.env.NOTION_POST_LOGIN_REDIRECT || "/";
    return new Response(null, { status: 302, headers: { Location: postRedirect } });
  }),
});

// MCP endpoints
http.route({
  path: "/api/mcp/connect",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const { url, name } = await request.json();
      
      if (!url || !name) {
        return new Response(
          JSON.stringify({ error: "URL and name are required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // For now, mock the MCP connection
      // In a real implementation, you would connect to the MCP server
      const sessionId = `mcp_session_${Date.now()}`;
      const mockTools = [
        {
          name: "search",
          description: "Search for information",
          schema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Search query" }
            }
          }
        },
        {
          name: "get_news",
          description: "Get latest news",
          schema: {
            type: "object",
            properties: {
              topic: { type: "string", description: "News topic" }
            }
          }
        }
      ];

      return new Response(
        JSON.stringify({ 
          sessionId,
          tools: mockTools,
          message: "Connected to MCP server"
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch {
      return new Response(
        JSON.stringify({ error: "Failed to connect to MCP server" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

http.route({
  path: "/api/mcp/disconnect",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const { sessionId: _sessionId } = await request.json();
        
        // For now, mock the disconnection
        // In a real implementation, you would disconnect from the MCP server
        
        return new Response(
          JSON.stringify({ message: "Disconnected from MCP server" }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
    } catch {
        return new Response(
          JSON.stringify({ error: "Failed to disconnect from MCP server" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }),
  });

  http.route({
    path: "/api/mcp/invoke",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
      try {
      const { sessionId, toolName, args } = await request.json();
      
      if (!sessionId || !toolName) {
        return new Response(
          JSON.stringify({ error: "Session ID and tool name are required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // For now, mock the tool invocation
      // In a real implementation, you would invoke the actual MCP tool
      let mockResult;
      
      switch (toolName) {
        case "search":
          mockResult = {
            results: [
              {
                title: "AI Startups See Record Growth in 2024",
                url: "https://example.com/ai-startups-2024",
                snippet: "Recent analysis shows AI startups have raised over $50B in funding this year..."
              },
              {
                title: "Top 10 AI Companies to Watch",
                url: "https://example.com/top-ai-companies",
                snippet: "These emerging AI companies are disrupting traditional industries..."
              }
            ],
            query: args?.query || "default search"
          };
          break;
        case "get_news":
          mockResult = {
            articles: [
              {
                headline: "Breaking: New AI Model Achieves Human-Level Performance",
                source: "Tech News",
                timestamp: new Date().toISOString()
              },
              {
                headline: "Major Tech Company Announces AI Partnership",
                source: "Business Journal",
                timestamp: new Date().toISOString()
              }
            ],
            topic: args?.topic || "general"
          };
          break;
        default:
          mockResult = {
            message: `Tool '${toolName}' executed successfully`,
            args: args || {},
            timestamp: new Date().toISOString()
          };
      }

      return new Response(
        JSON.stringify({ 
          result: mockResult,
          toolName,
          sessionId,
          message: "Tool invoked successfully"
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch {
      return new Response(
        JSON.stringify({ error: "Failed to invoke MCP tool" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

// Persistent Text Streaming endpoint for FastAgentPanel

// CORS preflight handler
http.route({
  path: "/api/chat-stream",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("Origin");
    const headers = new Headers();
    headers.set("Access-Control-Allow-Origin", origin ?? "*");
    headers.set("Vary", "Origin");
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type, Accept");
    headers.set("Access-Control-Max-Age", "600");
    return new Response(null, { status: 204, headers });
  }),
});

http.route({
  path: "/api/chat-stream",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("Origin");
    const body = (await request.json()) as {
      streamId: string;
      model?: string;
    };

    try {
      // Get the streaming message to find thread and last user message
      const streamingMessage = await ctx.runQuery(api.fastAgentPanelStreaming.getMessageByStreamId, {
        streamId: body.streamId,
      });
      
      if (!streamingMessage) {
        return new Response(JSON.stringify({ error: "Message not found" }), {
          status: 404,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": origin ?? "*",
          },
        });
      }

      // Get the streaming thread to find the linked agent thread
      const streamingThread = await ctx.runQuery(api.fastAgentPanelStreaming.getThreadByStreamId, {
        threadId: streamingMessage.threadId,
      });

      if (!streamingThread || !streamingThread.agentThreadId) {
        return new Response(JSON.stringify({ error: "Thread configuration error" }), {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": origin ?? "*",
          },
        });
      }

      const agentThreadId = streamingThread.agentThreadId;

      // Get all messages to find the last user message
      const messages = await ctx.runQuery(internal.fastAgentPanelStreaming.getThreadMessagesForStreaming, {
        threadId: streamingMessage.threadId,
      });

      // Find the last user message (the prompt for this response)
      const userMessages = messages.filter((m: any) => 
        m.role === "user" && m._id !== streamingMessage._id && m.content?.trim()
      );
      const lastUserMessage = userMessages[userMessages.length - 1];

      if (!lastUserMessage || !lastUserMessage.content) {
        return new Response(JSON.stringify({ error: "No user message found" }), {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": origin ?? "*",
          },
        });
      }

      const prompt = lastUserMessage.content;
      const modelName = body.model || "gpt-5-chat-latest";
      console.log(`[chat-stream-agent] Prompt: "${prompt.substring(0, 50)}..." for thread ${agentThreadId} with model ${modelName}`);

      // Create agent instance with selected model
      const chatAgent = new Agent(components.agent, {
        chat: openai.chat(modelName),
        textEmbedding: openai.embedding("text-embedding-3-small"),
        instructions: "You are a helpful AI assistant. Respond naturally and helpfully to user questions.",
      });

      // Stream using persistent-text-streaming with agent
      const generateChat = async (
        ctx: any,
        request: any,
        streamId: StreamId,
        chunkAppender: (chunk: string) => Promise<void>
      ) => {
        let fullResponse = "";
        try {
          // Use agent's native streaming
          const result = await chatAgent.streamText(
            ctx,
            { threadId: agentThreadId },
            { prompt }
          );

          // Stream text chunks through persistent-text-streaming
          for await (const chunk of result.textStream) {
            fullResponse += chunk;
            await chunkAppender(chunk);
          }

          console.log(`[chat-stream-agent] Streaming complete: ${fullResponse.length} chars`);
          
          // Update the streaming message with final content
          await ctx.runMutation(internal.fastAgentPanelStreaming.markStreamComplete, {
            messageId: streamingMessage._id,
            finalContent: fullResponse,
            status: "complete",
          });
        } catch (error) {
          console.error(`[chat-stream-agent] ERROR:`, error);
          const errorMsg = error instanceof Error ? error.message : String(error);
          await chunkAppender(`Error: ${errorMsg}`);
          
          await ctx.runMutation(internal.fastAgentPanelStreaming.markStreamComplete, {
            messageId: streamingMessage._id,
            finalContent: fullResponse || `Error: ${errorMsg}`,
            status: "error",
          });
        }
      };

      const response = await persistentTextStreaming.stream(
        ctx,
        request,
        body.streamId as StreamId,
        generateChat
      );
      
      // Set CORS headers
      response.headers.set("Access-Control-Allow-Origin", origin ?? "*");
      response.headers.set("Vary", "Origin");
      response.headers.set("Access-Control-Allow-Credentials", "true");
      response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      response.headers.set("Access-Control-Allow-Headers", "Content-Type, Accept");
      
      return response;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[chat-stream-agent] ERROR:`, error);
      return new Response(JSON.stringify({ error: msg }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": origin ?? "*",
        },
      });
    }
  }),
});

export default http;
// Billing: Dev upgrade (no Stripe)
http.route({
  path: "/api/billing/dev-upgrade",
  method: "GET",
  handler: httpAction(async (ctx, _request) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return new Response("Unauthorized", { status: 401 });
    }
    try {
      const refs = await import("./_generated/api");
      await ctx.runMutation((refs as any).internal.billing.activateSubscription, {
        userId: identity.subject as Id<"users">,
        source: "dev",
      });
      return new Response(null, { status: 302, headers: { Location: "/?billing=upgraded" } });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return new Response(`Upgrade failed: ${msg}`, { status: 500 });
    }
  }),
});

// Billing: Stripe success redirect
http.route({
  path: "/api/billing/success",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("session_id");
    const identity = await ctx.auth.getUserIdentity();
    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

    if (!sessionId) {
      return new Response("Missing session_id", { status: 400 });
    }

    let targetUserId: Id<"users"> | null = null;
    let paymentIntentId: string | undefined;

    if (STRIPE_SECRET_KEY) {
      try {
        const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
        });
        if (!res.ok) {
          const text = await res.text();
          return new Response(`Stripe fetch error: ${text}`, { status: 500 });
        }
        const data: any = await res.json();
        paymentIntentId = data.payment_intent ?? undefined;
        const metaUserId: string | undefined = data.metadata?.userId;
        if (metaUserId) {
          targetUserId = metaUserId as unknown as Id<"users">;
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return new Response(`Stripe verify failed: ${msg}`, { status: 500 });
      }
    } else {
      // No Stripe configured; fall back to current user
      if (identity) targetUserId = identity.subject as Id<"users">;
    }

    if (!targetUserId) {
      // Fallback: use current identity if available
      if (identity) {
        targetUserId = identity.subject as Id<"users">;
      } else {
        return new Response("Unable to determine user", { status: 400 });
      }
    }

    try {
      const refs = await import("./_generated/api");
      await ctx.runMutation((refs as any).internal.billing.activateSubscription, {
        userId: targetUserId,
        source: STRIPE_SECRET_KEY ? "stripe" : "dev",
        sessionId,
        paymentIntentId,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return new Response(`Activation failed: ${msg}`, { status: 500 });
    }

    return new Response(null, { status: 302, headers: { Location: "/?billing=upgraded" } });
  }),
});
