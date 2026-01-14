/**
 * Email Admin Queries - For CLI testing and debugging
 */

import { v } from "convex/values";
import { query, internalQuery, mutation } from "../../../_generated/server";

/**
 * Find user by email (internal query for admin actions)
 * Returns the user with a Google account if one exists, otherwise the first user
 */
export const findUserByEmail = internalQuery({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Find all users with this email
    const users = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .collect();

    if (users.length === 0) return null;
    if (users.length === 1) return users[0];

    // Multiple users - prefer the one with a Google account
    for (const user of users) {
      const googleAccount = await ctx.db
        .query("googleAccounts")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();
      if (googleAccount) {
        return user;
      }
    }

    // No Google account found, return first user
    return users[0];
  },
});

/**
 * Find all users by email (for debugging duplicates)
 */
export const findAllUsersByEmail = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const users = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .collect();

    const results = [];
    for (const user of users) {
      const googleAccount = await ctx.db
        .query("googleAccounts")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();

      results.push({
        userId: user._id,
        email: user.email,
        name: user.name,
        hasGoogleAccount: !!googleAccount,
        googleEmail: googleAccount?.email,
        tokenExpiry: googleAccount?.expiryDate,
      });
    }

    return results;
  },
});

/**
 * Get Google account for a user by userId
 */
export const getGoogleAccountByUserId = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("googleAccounts")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});

/**
 * Get email stats for a user by their email address
 * For admin/testing purposes only
 */
export const getEmailStatsByEmail = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the user by email
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();

    if (!user) {
      return { error: "User not found", email: args.email };
    }

    // Get email threads for this user
    const threads = await ctx.db
      .query("emailThreads")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Get email sync state
    const syncState = await ctx.db
      .query("emailSyncState")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    // Get daily reports
    const reports = await ctx.db
      .query("emailDailyReports")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(5);

    // Calculate stats
    const unreadCount = threads.reduce((sum, t) => sum + (t.unreadCount || 0), 0);
    const actionRequiredCount = threads.filter((t) => t.aiActionRequired).length;

    // Group by category
    const categoryMap = new Map<string, number>();
    for (const thread of threads) {
      const cat = thread.aiCategory || "Uncategorized";
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
    }

    const categories = Array.from(categoryMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return {
      userId: user._id,
      email: user.email,
      name: user.name,
      stats: {
        totalThreads: threads.length,
        unreadCount,
        actionRequiredCount,
        categories,
      },
      syncState: syncState ? {
        lastFullSyncAt: syncState.lastFullSyncAt,
        lastIncrementalSyncAt: syncState.lastIncrementalSyncAt,
        syncStatus: syncState.syncStatus,
        historyId: syncState.historyId,
      } : null,
      recentReports: reports.map((r) => ({
        date: r.date,
        totalReceived: r.totalReceived,
        totalUnread: r.totalUnread,
        totalActionRequired: r.totalActionRequired,
        executiveSummary: r.executiveSummary?.slice(0, 200),
        deliveredVia: r.deliveredVia,
      })),
      sampleThreads: threads.slice(0, 10).map((t) => ({
        id: t._id,
        subject: t.subject,
        from: t.participants?.[0] || "Unknown",
        aiCategory: t.aiCategory,
        aiPriority: t.aiPriority,
        unreadCount: t.unreadCount,
        lastMessageAt: t.lastMessageAt,
      })),
    };
  },
});

/**
 * List all users with Gmail connected
 */
export const listGmailUsers = query({
  args: {},
  handler: async (ctx) => {
    // Find Google OAuth accounts
    const googleAccounts = await ctx.db
      .query("googleAccounts")
      .collect();

    const results = [];

    for (const account of googleAccounts) {
      const user = await ctx.db.get(account.userId);
      if (user) {
        // Get thread count
        const threads = await ctx.db
          .query("emailThreads")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .take(1);

        // Get sync state
        const syncState = await ctx.db
          .query("emailSyncState")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .first();

        results.push({
          userId: user._id,
          email: user.email || account.email,
          name: user.name,
          hasGoogleAccount: true,
          hasAccessToken: !!account.accessToken,
          hasRefreshToken: !!account.refreshToken,
          tokenExpiry: account.expiryDate,
          scope: account.scope,
          hasEmailThreads: threads.length > 0,
          lastSyncAt: syncState?.lastIncrementalSyncAt || syncState?.lastFullSyncAt,
        });
      }
    }

    return results;
  },
});

/**
 * Check Google account status for a specific user email
 */
export const checkGoogleAccountByEmail = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the user by email
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();

    if (!user) {
      return { error: "User not found", email: args.email };
    }

    // Find Google account
    const googleAccount = await ctx.db
      .query("googleAccounts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!googleAccount) {
      return {
        userId: user._id,
        email: user.email,
        hasGoogleAccount: false,
        message: "No Google account connected. User needs to connect Gmail via OAuth.",
        connectUrl: "/settings/integrations",
      };
    }

    return {
      userId: user._id,
      email: user.email,
      hasGoogleAccount: true,
      googleEmail: googleAccount.email,
      hasAccessToken: !!googleAccount.accessToken,
      hasRefreshToken: !!googleAccount.refreshToken,
      tokenExpiry: googleAccount.expiryDate,
      tokenExpired: googleAccount.expiryDate ? googleAccount.expiryDate < Date.now() : false,
      scope: googleAccount.scope,
      historyId: googleAccount.historyId,
    };
  },
});

/**
 * Generate OAuth URL for a user (bypasses login requirement)
 * Admin query for testing
 */
export const getOAuthUrlForUser = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the user
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();

    if (!user) {
      return { error: "User not found" };
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return { error: "GOOGLE_CLIENT_ID not configured" };
    }

    // Use agile-caribou-964 (production) for redirect
    const siteUrl = "https://agile-caribou-964.convex.site";
    const redirectUri = `${siteUrl}/api/google/oauth/callback`;

    const scope = [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/userinfo.email",
    ].join(" ");

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", scope);
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("include_granted_scopes", "true");
    authUrl.searchParams.set("prompt", "consent");
    // Use user ID as state - this is what the callback uses to identify the user
    authUrl.searchParams.set("state", user._id);

    return {
      success: true,
      userId: user._id,
      email: user.email,
      oauthUrl: authUrl.toString(),
      instructions: "Open this URL in your browser to connect Gmail",
    };
  },
});

/**
 * Delete expired Google account so user can re-connect
 * Admin mutation for fixing auth issues
 */
export const deleteExpiredGoogleAccount = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Find all users with this email
    const users = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .collect();

    if (users.length === 0) {
      return { success: false, error: "User not found" };
    }

    let deleted = 0;
    for (const user of users) {
      const googleAccount = await ctx.db
        .query("googleAccounts")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();

      if (googleAccount) {
        await ctx.db.delete(googleAccount._id);
        deleted++;
      }
    }

    return {
      success: true,
      message: `Deleted ${deleted} Google account(s). User can now re-connect at /api/google/oauth/start`,
      oauthUrl: "/api/google/oauth/start",
    };
  },
});
