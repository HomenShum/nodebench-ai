import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getApiKeyStatus = query({
  args: { provider: v.string() },
  returns: v.object({
    provider: v.string(),
    hasKey: v.boolean(),
    createdAt: v.optional(v.number()),
  }),
  handler: async (ctx, { provider }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { provider, hasKey: false };
    const rec = await ctx.db
      .query("userApiKeys")
      .withIndex("by_user_provider", (q) =>
        q.eq("userId", userId).eq("provider", provider)
      )
      .first();
    return {
      provider,
      hasKey: Boolean(rec?.encryptedApiKey && rec.encryptedApiKey.length > 0),
      createdAt: rec?.createdAt,
    };
  },
});

// Public: retrieve the encrypted API key for the authenticated user.
// Note: returns the stored encrypted string; decryption must happen on the client with user's passphrase.
export const getEncryptedApiKeyPublic = query({
  args: { provider: v.string() },
  returns: v.union(
    v.object({ encryptedApiKey: v.string(), createdAt: v.optional(v.number()) }),
    v.null()
  ),
  handler: async (ctx, { provider }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const rec = await ctx.db
      .query("userApiKeys")
      .withIndex("by_user_provider", (q) => q.eq("userId", userId).eq("provider", provider))
      .first();
    if (!rec || !rec.encryptedApiKey) return null;
    return { encryptedApiKey: rec.encryptedApiKey, createdAt: rec.createdAt };
  },
});

// Public: list formats to support migration UX (detect legacy/plaintext vs v2 tokens).
export const listApiKeyFormats = query({
  args: { providers: v.array(v.string()) },
  returns: v.array(
    v.object({
      provider: v.string(),
      hasKey: v.boolean(),
      isLegacy: v.boolean(), // true if present and not starting with "v2:"
      createdAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, { providers }) => {
    const userId = await getAuthUserId(ctx);
    const out: Array<{ provider: string; hasKey: boolean; isLegacy: boolean; createdAt?: number }> = [];
    for (const provider of providers) {
      if (!userId) {
        out.push({ provider, hasKey: false, isLegacy: false });
        continue;
      }
      const rec = await ctx.db
        .query("userApiKeys")
        .withIndex("by_user_provider", (q) => q.eq("userId", userId).eq("provider", provider))
        .first();
      const encrypted = rec?.encryptedApiKey ?? "";
      const hasKey = encrypted.length > 0;
      const isLegacy = hasKey ? !encrypted.startsWith("v2:") : false;
      out.push({ provider, hasKey, isLegacy, createdAt: rec?.createdAt });
    }
    return out;
  },
});

// Public: upsert the already-encrypted API key (client-side E2E encryption)
export const saveEncryptedApiKeyPublic = mutation({
  args: { provider: v.string(), encryptedApiKey: v.string() },
  returns: v.null(),
  handler: async (ctx, { provider, encryptedApiKey }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("userApiKeys")
      .withIndex("by_user_provider", (q) => q.eq("userId", userId).eq("provider", provider))
      .first();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { encryptedApiKey, updatedAt: now });
    } else {
      await ctx.db.insert("userApiKeys", { userId, provider, encryptedApiKey, createdAt: now, updatedAt: now });
    }
    return null;
  },
});

export const listApiKeyStatuses = query({
  args: { providers: v.array(v.string()) },
  returns: v.array(
    v.object({ provider: v.string(), hasKey: v.boolean(), createdAt: v.optional(v.number()) })
  ),
  handler: async (ctx, { providers }) => {
    const results: Array<{ provider: string; hasKey: boolean; createdAt?: number }> = [];
    const userId = await getAuthUserId(ctx);
    for (const provider of providers) {
      if (!userId) {
        results.push({ provider, hasKey: false });
        continue;
      }
      const rec = await ctx.db
        .query("userApiKeys")
        .withIndex("by_user_provider", (q) =>
          q.eq("userId", userId).eq("provider", provider)
        )
        .first();
      results.push({ provider, hasKey: Boolean(rec?.encryptedApiKey && rec.encryptedApiKey.length > 0), createdAt: rec?.createdAt });
    }
    return results;
  },
});

export const saveApiKey = mutation({
  args: {
    provider: v.string(),
    apiKey: v.string(),
  },
  returns: v.null(),
  handler: async (_ctx, { provider: _provider, apiKey: _apiKey }) => {
    // Deprecated in favor of client-side E2E encryption via saveEncryptedApiKeyPublic.
    // Keeping the endpoint for backward compatibility but fail fast with guidance.
    throw new Error(
      "api.apiKeys.saveApiKey is deprecated. Use api.apiKeys.saveEncryptedApiKeyPublic with a client-encrypted value (see src/lib/e2eCrypto.ts)."
    );
  },
});

export const deleteApiKey = mutation({
  args: { provider: v.string() },
  returns: v.null(),
  handler: async (ctx, { provider }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("userApiKeys")
      .withIndex("by_user_provider", (q) =>
        q.eq("userId", userId).eq("provider", provider)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return null;
  },
});

// Internal: fetch the encrypted API key string (for server-side decryption)
export const getEncryptedApiKey = internalQuery({
  args: { provider: v.string() },
  returns: v.union(v.object({ encryptedApiKey: v.string(), createdAt: v.optional(v.number()) }), v.null()),
  handler: async (ctx, { provider }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const rec = await ctx.db
      .query("userApiKeys")
      .withIndex("by_user_provider", (q) => q.eq("userId", userId).eq("provider", provider))
      .first();
    if (!rec || !rec.encryptedApiKey) return null;
    return { encryptedApiKey: rec.encryptedApiKey, createdAt: rec.createdAt };
  },
});

// Internal: upsert the encrypted API key (value already encrypted by an action)
export const saveEncryptedApiKey = internalMutation({
  args: { provider: v.string(), encryptedApiKey: v.string() },
  returns: v.null(),
  handler: async (ctx, { provider, encryptedApiKey }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const existing = await ctx.db
      .query("userApiKeys")
      .withIndex("by_user_provider", (q) => q.eq("userId", userId).eq("provider", provider))
      .first();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { encryptedApiKey, updatedAt: now });
    } else {
      await ctx.db.insert("userApiKeys", { userId, provider, encryptedApiKey, createdAt: now, updatedAt: now });
    }
    return null;
  },
});
