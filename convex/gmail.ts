import { action, internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const DEFAULT_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

export const getConnection = query({
  args: {},
  returns: v.object({
    connected: v.boolean(),
    email: v.optional(v.string()),
    expiryDate: v.optional(v.number()),
  }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { connected: false };
    }
    const account = await ctx.db
      .query("googleAccounts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!account) return { connected: false };
    return {
      connected: true,
      email: account.email,
      expiryDate: account.expiryDate,
    };
  },
});

// Update Gmail profile fields post-sync (idempotent)
export const updateProfile = internalMutation({
  args: {
    email: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("googleAccounts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!existing) return null;
    await ctx.db.patch(existing._id, {
      email: args.email ?? existing.email,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const saveTokens = internalMutation({
  args: {
    email: v.optional(v.string()),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    scope: v.optional(v.string()),
    expiryDate: v.optional(v.number()),
    tokenType: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("googleAccounts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email ?? existing.email,
        accessToken: args.accessToken,
        refreshToken: args.refreshToken ?? existing.refreshToken,
        scope: args.scope ?? existing.scope,
        expiryDate: args.expiryDate ?? existing.expiryDate,
        tokenType: args.tokenType ?? existing.tokenType,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("googleAccounts", {
        userId,
        provider: "google",
        email: args.email,
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        scope: args.scope ?? DEFAULT_SCOPES,
        expiryDate: args.expiryDate,
        tokenType: args.tokenType,
        createdAt: now,
        updatedAt: now,
      });
    }
    return null;
  },
});

export const updateTokens = internalMutation({
  args: {
    accessToken: v.string(),
    expiryDate: v.optional(v.number()),
    refreshToken: v.optional(v.string()),
    tokenType: v.optional(v.string()),
    scope: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("googleAccounts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!existing) throw new Error("No Google account connected");

    await ctx.db.patch(existing._id, {
      accessToken: args.accessToken,
      expiryDate: args.expiryDate ?? existing.expiryDate,
      refreshToken: args.refreshToken ?? existing.refreshToken,
      tokenType: args.tokenType ?? existing.tokenType,
      scope: args.scope ?? existing.scope,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const getAccount = internalQuery({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      email: v.optional(v.string()),
      accessToken: v.string(),
      refreshToken: v.optional(v.string()),
      expiryDate: v.optional(v.number()),
      tokenType: v.optional(v.string()),
      scope: v.optional(v.string()),
    })
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const account = await ctx.db
      .query("googleAccounts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!account) return null;
    return {
      email: account.email,
      accessToken: account.accessToken,
      refreshToken: account.refreshToken,
      expiryDate: account.expiryDate,
      tokenType: account.tokenType,
      scope: account.scope,
    };
  },
});

const tokenEndpoint = "https://oauth2.googleapis.com/token";

async function refreshAccessTokenIfNeeded(ctx: any, account: any) {
  const now = Date.now();
  const expiresSoon = account.expiryDate && account.expiryDate - now < 60_000; // 1 min buffer
  if (!expiresSoon) return account.accessToken;
  if (!account.refreshToken) return account.accessToken;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.CONVEX_SITE_URL}/api/google/oauth/callback`;
  if (!clientId || !clientSecret || !redirectUri) {
    console.warn("Missing Google OAuth env vars; cannot refresh token");
    return account.accessToken;
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: account.refreshToken,
  });

  const res = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    console.warn("Failed to refresh token", await res.text());
    return account.accessToken;
  }
  const data = await res.json();
  const newAccess = data.access_token as string;
  const expiresIn = data.expires_in as number | undefined;
  const expiryDate = expiresIn ? Date.now() + expiresIn * 1000 : undefined;

  const refs = await import("./_generated/api");
  await ctx.runMutation((refs as any).internal.gmail.updateTokens, {
    accessToken: newAccess,
    expiryDate,
    tokenType: data.token_type,
    scope: data.scope,
  });

  return newAccess;
}

export const fetchInbox = action({
  args: {
    maxResults: v.optional(v.number()),
  },
  returns: v.object({
    success: v.boolean(),
    messages: v.optional(
      v.array(
        v.object({
          id: v.string(),
          threadId: v.optional(v.string()),
          snippet: v.optional(v.string()),
          subject: v.optional(v.string()),
          from: v.optional(v.string()),
          date: v.optional(v.string()),
        })
      )
    ),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, { maxResults }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { success: false, error: "Not authenticated" };

    const refs = await import("./_generated/api");
    const account = await ctx.runQuery((refs as any).internal.gmail.getAccount, {});
    if (!account) {
      return { success: false, error: "No Google account connected" };
    }

    const accessToken = await refreshAccessTokenIfNeeded(ctx, account);

    // List message IDs
    const listUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
    listUrl.searchParams.set("maxResults", String(maxResults ?? 15));
    listUrl.searchParams.set("q", "-category:promotions");

    const listRes = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!listRes.ok) {
      const text = await listRes.text();
      return { success: false, error: `Failed to list messages: ${text}` };
    }
    const listData = await listRes.json();
    const messages = (listData.messages || []) as Array<{ id: string; threadId: string }>;

    // Fetch metadata for each message
    const details = await Promise.all(
      messages.slice(0, maxResults ?? 15).map(async (m) => {
        const u = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}`);
        u.searchParams.set("format", "metadata");
        for (const h of ["Subject", "From", "Date"]) {
          u.searchParams.append("metadataHeaders", h);
        }
        const r = await fetch(u, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (!r.ok) {
          return { id: m.id, threadId: m.threadId };
        }
        const j = await r.json();
        const headers: Array<{ name: string; value: string }> = j.payload?.headers ?? [];
        const find = (n: string) => headers.find((h) => h.name === n)?.value;
        return {
          id: m.id,
          threadId: m.threadId,
          snippet: j.snippet as string | undefined,
          subject: find("Subject"),
          from: find("From"),
          date: find("Date"),
        };
      })
    );

    return { success: true, messages: details };
  },
});
