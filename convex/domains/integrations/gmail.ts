import { action, internalAction, internalMutation, internalQuery, query } from "../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api, internal } from "../../_generated/api";
import { getLlmModel } from "../../../shared/llm/modelCatalog";

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
    historyId: v.optional(v.string()),
    gcalSyncToken: v.optional(v.string()),
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
      historyId: args.historyId ?? existing.historyId,
      gcalSyncToken: args.gcalSyncToken ?? existing.gcalSyncToken,
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
      historyId: v.optional(v.string()),
      gcalSyncToken: v.optional(v.string()),
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
      historyId: account.historyId,
      gcalSyncToken: account.gcalSyncToken,
    };
  },
});

const tokenEndpoint = "https://oauth2.googleapis.com/token";

export async function refreshAccessTokenIfNeeded(ctx: any, account: any) {
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

  await ctx.runMutation(internal.domains.integrations.gmail.updateTokens, {
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

    const account = await ctx.runQuery(internal.domains.integrations.gmail.getAccount, {});
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

function decodeBase64Url(data: string): string {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf-8");
}

function extractIcsParts(payload: any): string[] {
  const out: string[] = [];
  const walk = (part: any) => {
    if (!part) return;
    const mime = part.mimeType || "";
    const filename = part.filename || "";
    if (mime === "text/calendar" || filename.endsWith(".ics")) {
      const data = part.body?.data;
      if (typeof data === "string" && data.length > 0) {
        out.push(decodeBase64Url(data));
      }
    }
    if (Array.isArray(part.parts)) {
      part.parts.forEach(walk);
    }
  };
  walk(payload);
  return out;
}

function parseIcsEvent(icsText: string): { title?: string; startTime?: number; endTime?: number; allDay?: boolean; location?: string } | null {
  const getLine = (tag: string) => {
    const re = new RegExp(`^${tag}[:]([^\\r\\n]+)`, "mi");
    const m = icsText.match(re);
    return m ? m[1].trim() : undefined;
  };
  const dtstart = getLine("DTSTART(?:;[^:]*)?");
  if (!dtstart) return null;
  const dtend = getLine("DTEND(?:;[^:]*)?");
  const summary = getLine("SUMMARY");
  const location = getLine("LOCATION");

  const parseDt = (dt: string) => {
    if (/^\\d{8}$/.test(dt)) {
      const y = Number(dt.slice(0, 4));
      const m = Number(dt.slice(4, 6)) - 1;
      const d = Number(dt.slice(6, 8));
      return { ms: Date.UTC(y, m, d), allDay: true };
    }
    const iso = dt.length === 15 && dt.endsWith("Z")
      ? `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}T${dt.slice(9, 11)}:${dt.slice(11, 13)}:${dt.slice(13, 15)}Z`
      : dt.length === 15
        ? `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}T${dt.slice(9, 11)}:${dt.slice(11, 13)}:${dt.slice(13, 15)}`
        : dt;
    const ms = Date.parse(iso);
    return Number.isFinite(ms) ? { ms, allDay: false } : null;
  };

  const startParsed = parseDt(dtstart);
  if (!startParsed) return null;
  const endParsed = dtend ? parseDt(dtend) : null;
  return {
    title: summary,
    startTime: startParsed.ms,
    endTime: endParsed?.ms,
    allDay: startParsed.allDay || endParsed?.allDay || false,
    location,
  };
}

function heuristicParse(subject?: string, snippet?: string): { title: string; startTime: number; endTime?: number; confidence: number } | null {
  const text = [subject, snippet].filter(Boolean).join(" ");
  const dateRe = /(\\b\\d{1,2}[\\/.-]\\d{1,2}[\\/.-]\\d{2,4})/i;
  const timeRe = /(\\d{1,2}:\\d{2}\\s?(am|pm)?)/i;
  const dateMatch = text.match(dateRe);
  const timeMatch = text.match(timeRe);
  if (!dateMatch || !timeMatch) return null;
  const dateStr = dateMatch[1];
  const timeStr = timeMatch[1];
  const parsed = Date.parse(`${dateStr} ${timeStr}`);
  if (!Number.isFinite(parsed)) return null;
  return {
    title: subject || "Meeting",
    startTime: parsed,
    confidence: 0.55,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Gmail watch + history ingest
// ────────────────────────────────────────────────────────────────────────────

export const startWatch = action({
  args: {},
  returns: v.object({ success: v.boolean(), historyId: v.optional(v.string()), error: v.optional(v.string()) }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { success: false, error: "Not authenticated" };
    const account = await ctx.runQuery(internal.domains.integrations.gmail.getAccount, {});
    if (!account) return { success: false, error: "No Google account connected" };

    const accessToken = await refreshAccessTokenIfNeeded(ctx, account);

    // Use profile endpoint to grab current historyId (avoids Pub/Sub requirement).
    const profileRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!profileRes.ok) {
      const text = await profileRes.text();
      return { success: false, error: `Failed to fetch profile: ${text}` };
    }
    const profile = await profileRes.json();
    const historyId: string | undefined = profile.historyId ? String(profile.historyId) : undefined;

    if (historyId) {
      await ctx.runMutation(internal.domains.integrations.gmail.updateTokens, {
        accessToken,
        historyId,
      });
    }

    return { success: true, historyId };
  },
});

export const stopWatch = action({
  args: {},
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { success: false };
    const account = await ctx.runQuery(internal.domains.integrations.gmail.getAccount, {});
    if (!account) return { success: true };
    await ctx.runMutation(internal.domains.integrations.gmail.updateTokens, {
      accessToken: account.accessToken,
      historyId: undefined,
    });
    return { success: true };
  },
});

export const fetchHistory = action({
  args: {
    startHistoryId: v.optional(v.string()),
    maxResults: v.optional(v.number()),
  },
  returns: v.object({
    success: v.boolean(),
    historyId: v.optional(v.string()),
    messageIds: v.optional(v.array(v.string())),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, { startHistoryId, maxResults }): Promise<{ success: boolean; historyId?: string; messageIds?: string[]; error?: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { success: false, error: "Not authenticated" };
    const account = await ctx.runQuery(internal.domains.integrations.gmail.getAccount, {});
    if (!account) return { success: false, error: "No Google account connected" };

    const effectiveStart = startHistoryId || account.historyId;
    if (!effectiveStart) return { success: false, error: "No historyId available; run startWatch first" };

    const accessToken = await refreshAccessTokenIfNeeded(ctx, account);
    const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/history");
    url.searchParams.set("startHistoryId", effectiveStart);
    url.searchParams.set("historyTypes", "messageAdded");
    url.searchParams.set("maxResults", String(maxResults ?? 50));

    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: `Failed to fetch history: ${text}` };
    }
    const data: any = await res.json();
    const history = Array.isArray(data.history) ? data.history : [];
    const messageIds = history.flatMap((h: any) =>
      (h.messagesAdded || []).map((m: any) => m?.message?.id).filter(Boolean)
    );

    const newestHistoryId: string | undefined = data.historyId ? String(data.historyId) : effectiveStart;
    if (newestHistoryId) {
      await ctx.runMutation(internal.domains.integrations.gmail.updateTokens, {
        accessToken,
        historyId: newestHistoryId,
      });
    }

    return { success: true, historyId: newestHistoryId, messageIds };
  },
});

export const ingestMessages = action({
  args: {
    historyId: v.optional(v.string()),
    maxResults: v.optional(v.number()),
  },
  returns: v.object({
    success: v.boolean(),
    created: v.number(),
    updated: v.number(),
    skipped: v.number(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args): Promise<{ success: boolean; created: number; updated: number; skipped: number; error?: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { success: false, created: 0, updated: 0, skipped: 0, error: "Not authenticated" };

    const account = await ctx.runQuery(internal.domains.integrations.gmail.getAccount, {});
    if (!account) return { success: false, created: 0, updated: 0, skipped: 0, error: "No Google account connected" };

    const db = (ctx as any).db;
    const prefs = db
      ? await db.query("userPreferences").withIndex("by_user", (q: any) => q.eq("userId", userId)).first()
      : null;
    if (prefs && prefs.gmailIngestEnabled === false) {
      return { success: true, created: 0, updated: 0, skipped: 0 };
    }
    const autoAddMode = prefs?.calendarAutoAddMode ?? "propose";

    const historyResult = await ctx.runAction(api.domains.integrations.gmail.fetchHistory, {
      startHistoryId: args.historyId,
      maxResults: args.maxResults ?? 25,
    });
    if (!historyResult.success || !historyResult.messageIds) {
      return { success: false, created: 0, updated: 0, skipped: 0, error: historyResult.error };
    }

    const accessToken = await refreshAccessTokenIfNeeded(ctx, account);
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const id of historyResult.messageIds) {
      try {
        const detailUrl = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}`);
        detailUrl.searchParams.set("format", "full");
        for (const h of ["Subject", "From", "Date", "To"]) {
          detailUrl.searchParams.append("metadataHeaders", h);
        }
        const r = await fetch(detailUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (!r.ok) {
          skipped++;
          continue;
        }
        const j = await r.json();
        const headers: Array<{ name: string; value: string }> = j.payload?.headers ?? [];
        const find = (n: string) => headers.find((h) => h.name === n)?.value;
        const subject = find("Subject") || "New Event";
        const from = find("From");
        const dateHeader = find("Date");
        const snippet: string | undefined = j.snippet;

        let eventCandidate: any = null;

        const icsParts = extractIcsParts(j.payload);
        for (const ics of icsParts) {
          const parsed = parseIcsEvent(ics);
          if (parsed && parsed.startTime) {
            eventCandidate = {
              title: parsed.title || subject,
              startTime: parsed.startTime,
              endTime: parsed.endTime,
              allDay: parsed.allDay,
              location: parsed.location,
              confidence: 0.95,
              rawSummary: parsed.title || subject,
            };
            break;
          }
        }

        if (!eventCandidate) {
          const heur = heuristicParse(subject, snippet);
          if (heur) {
            eventCandidate = {
              title: heur.title,
              startTime: heur.startTime,
              endTime: heur.endTime,
              confidence: heur.confidence,
              rawSummary: subject,
            };
          }
        }

        if (!eventCandidate) {
          const extraction = await ctx.runAction(internal.tools.calendar.emailEventExtractor.extractFromEmail, {
            subject,
            snippet,
            headers,
            sourceId: id,
          });
          if (extraction.success && extraction.event) {
            eventCandidate = extraction.event;
          }
        }

        if (!eventCandidate || !eventCandidate.startTime) {
          skipped++;
          continue;
        }

        const ev = eventCandidate;
        const start = ev.startTime;
        const end = ev.endTime;
        const hash = `${ev.title.toLowerCase().trim()}::${start}::${from ?? ""}`;

        // Dedup within ±2 hours
        const window = 2 * 60 * 60 * 1000;
        const candidates = db
          ? await db
              .query("events")
              .withIndex("by_user_start", (q: any) =>
                q.eq("userId", userId).gte("startTime", start - window).lte("startTime", start + window)
              )
              .collect()
          : [];

        const existing = candidates.find((e: any) => (e.meta as any)?.hash === hash || e.sourceId === id);

        const baseEvent = {
          userId,
          title: ev.title,
          description: ev.rawSummary,
          startTime: start,
          endTime: end,
          allDay: ev.allDay || false,
          location: ev.location,
          status: ev.allDay ? "confirmed" : "tentative",
          sourceType: "gmail" as const,
          sourceId: id,
          ingestionConfidence: ev.confidence >= 0.7 ? "high" : ev.confidence >= 0.4 ? "med" : "low",
          proposed: autoAddMode === "propose" ? true : ev.confidence < 0.7 || !end,
          rawSummary: ev.rawSummary,
          meta: { hash, people: ev.people, from, dateHeader },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        if (existing && db) {
          await db.patch(existing._id, {
            ...baseEvent,
            createdAt: existing.createdAt,
          });
          updated++;
        } else if (db) {
          await db.insert("events", baseEvent);
          created++;
        } else {
          skipped++;
        }
      } catch (err) {
        skipped++;
        console.warn("[gmail.ingestMessages] failed for", id, err);
      }
    }

    return { success: true, created, updated, skipped };
  },
});

// Internal wrapper for cron usage
export const ingestMessagesCron = internalAction({
  args: {},
  handler: async (ctx) => {
    await ctx.runAction(api.domains.integrations.gmail.ingestMessages, {});
    return null;
  },
});
