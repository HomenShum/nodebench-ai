import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Utility function to safely extract user ID from authentication
 * Returns null if user is not found (indicating need to re-authenticate)
 */
async function getSafeUserId(ctx: any): Promise<Id<"users"> | null> {
  const rawUserId = await getAuthUserId(ctx);
  if (!rawUserId) {
    return null; // Not authenticated
  }

  // Handle malformed user IDs with pipe characters
  let userId: Id<"users">;
  if (typeof rawUserId === 'string' && rawUserId.includes('|')) {
    const userIdPart = rawUserId.split('|')[0];
    if (!userIdPart || userIdPart.length < 10) {
      return null; // Invalid format, needs re-authentication
    }
    userId = userIdPart as Id<"users">;
  } else {
    userId = rawUserId as Id<"users">;
  }

  // Verify the user exists in the database
  const user = await ctx.db.get(userId);
  if (!user) {
    return null; // User not found, needs re-authentication
  }

  return userId;
}

/**
 * Get user preferences for sidebar customizations
 */
export const getUserPreferences = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getSafeUserId(ctx);

    // If user is not found, return a special state indicating re-authentication needed
    if (!userId) {
      return {
        needsReauth: true,
        sidebarPinned: true,
        showFileSizes: true,
        organizationMode: 'folders' as const,
        ungroupedSectionName: 'Ungrouped',
        ungroupedSectionExpanded: true,
        iconOrder: [
          'flow', 'tools', 'mcp', 'sms', 'email', 'gmail', 'phone',
          'slack', 'discord', 'webhook', 'zapier'
        ] as const,
        docOrderByGroup: {},
        linkReminderOptOut: false,
      };
    }

    const preferences = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!preferences) {
      // Return default values if no preferences exist
      return {
        sidebarPinned: true,
        showFileSizes: true,
        organizationMode: "folders" as const,
        ungroupedSectionName: "Ungrouped Documents",
        ungroupedSectionExpanded: true,
        iconOrder: [
          'flow', 'tools', 'mcp', 'sms', 'email', 'gmail', 'phone',
          'slack', 'discord', 'webhook', 'zapier'
        ] as const,
        docOrderByGroup: {},
        linkReminderOptOut: false,
      };
    }

    return {
      ungroupedSectionName: preferences.ungroupedSectionName || "Ungrouped Documents",
      isUngroupedExpanded: preferences.isUngroupedExpanded ?? true,
      organizationMode: preferences.organizationMode || "folders",
      iconOrder: (preferences.iconOrder && preferences.iconOrder.length > 0)
        ? preferences.iconOrder
        : [
            'flow', 'tools', 'mcp', 'sms', 'email', 'gmail', 'phone',
            'slack', 'discord', 'webhook', 'zapier'
          ],
      docOrderByGroup: preferences.docOrderByGroup ?? {},
      linkReminderOptOut: preferences.linkReminderOptOut ?? false,
    };
  },
});

/**
 * Get persisted document order preferences for Documents grid.
 * - docOrderByFilter: per-filter order used by list/cards views, keyed by filter string (e.g. "all", "calendar", ...)
 * - docOrderBySegmented: per-group order used by segmented view, keyed by group ("favorites","calendar","text","files")
 */
export const getDocOrders = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getSafeUserId(ctx);
    if (!userId) {
      // Not authenticated: let client fall back to localStorage
      return { docOrderByFilter: undefined, docOrderBySegmented: undefined } as const;
    }

    const preferences = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    return {
      docOrderByFilter: preferences?.docOrderByFilter ?? undefined,
      docOrderBySegmented: preferences?.docOrderBySegmented ?? undefined,
    } as const;
  },
});

/**
 * Merge/update the order for a single filter key for Documents grid list/cards views.
 */
export const setDocOrderForFilter = mutation({
  args: {
    filterKey: v.string(),
    order: v.array(v.id("documents")),
  },
  handler: async (ctx, args) => {
    const userId = await getSafeUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated. Please sign out and sign back in.");
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      const current = existing.docOrderByFilter ?? {};
      current[args.filterKey] = args.order;
      await ctx.db.patch(existing._id, { docOrderByFilter: current, updatedAt: now });
    } else {
      await ctx.db.insert("userPreferences", {
        userId,
        ungroupedSectionName: "Ungrouped Documents",
        isUngroupedExpanded: true,
        organizationMode: "folders",
        iconOrder: [
          "flow", "tools", "mcp", "sms", "email", "gmail", "phone",
          "slack", "discord", "webhook", "zapier",
        ],
        linkReminderOptOut: false,
        docOrderByFilter: { [args.filterKey]: args.order },
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true } as const;
  },
});

/**
 * Merge/update the order for a single segmented group key (favorites/calendar/text/files).
 */
export const setDocOrderForSegmented = mutation({
  args: {
    groupKey: v.string(),
    order: v.array(v.id("documents")),
  },
  handler: async (ctx, args) => {
    const userId = await getSafeUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated. Please sign out and sign back in.");
    }
    const now = Date.now();
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();




    if (existing) {
      const current = existing.docOrderBySegmented ?? {};
      current[args.groupKey] = args.order;
      await ctx.db.patch(existing._id, { docOrderBySegmented: current, updatedAt: now });
    } else {
      await ctx.db.insert("userPreferences", {
        userId,
        ungroupedSectionName: "Ungrouped Documents",
        isUngroupedExpanded: true,
        organizationMode: "folders",
        iconOrder: [
          "flow", "tools", "mcp", "sms", "email", "gmail", "phone",
          "slack", "discord", "webhook", "zapier",
        ],
        linkReminderOptOut: false,
        docOrderBySegmented: { [args.groupKey]: args.order },
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true } as const;
  },
});

/**
 * Update user preferences for sidebar customizations
 */
export const updateUserPreferences = mutation({
  args: {
    ungroupedSectionName: v.optional(v.string()),
    isUngroupedExpanded: v.optional(v.boolean()),
    organizationMode: v.optional(v.string()),
    iconOrder: v.optional(v.array(v.string())),
    docOrderByGroup: v.optional(v.record(v.string(), v.array(v.id("documents")))),
    linkReminderOptOut: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getSafeUserId(ctx);

    if (!userId) {
      throw new Error("Not authenticated. Please sign out and sign back in.");
    }

    // Check if preferences already exist
    const existingPreferences = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const now = Date.now();

    if (existingPreferences) {
      // Update existing preferences
      const updates: any = { updatedAt: now };
      if (args.ungroupedSectionName !== undefined) {
        updates.ungroupedSectionName = args.ungroupedSectionName;
      }
      if (args.isUngroupedExpanded !== undefined) {
        updates.isUngroupedExpanded = args.isUngroupedExpanded;
      }
      if (args.organizationMode !== undefined) {
        updates.organizationMode = args.organizationMode;
      }
      if (args.iconOrder !== undefined) {
        updates.iconOrder = args.iconOrder;
      }
      if (args.docOrderByGroup !== undefined) {
        updates.docOrderByGroup = args.docOrderByGroup;
      }
      if (args.linkReminderOptOut !== undefined) {
        updates.linkReminderOptOut = args.linkReminderOptOut;
      }

      await ctx.db.patch(existingPreferences._id, updates);
    } else {
      // Create new preferences record
      await ctx.db.insert("userPreferences", {
        userId,
        ungroupedSectionName: args.ungroupedSectionName || "Ungrouped Documents",
        isUngroupedExpanded: args.isUngroupedExpanded ?? true,
        organizationMode: args.organizationMode || "folders",
        iconOrder: args.iconOrder ?? [
          'flow', 'tools', 'mcp', 'sms', 'email', 'gmail', 'phone',
          'slack', 'discord', 'webhook', 'zapier'
        ],
        docOrderByGroup: args.docOrderByGroup ?? {},



        linkReminderOptOut: args.linkReminderOptOut ?? false,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

/**
 * Set upcoming view preferences: upcomingMode ("list" | "mini").
 */
export const setUpcomingViewPrefs = mutation({
  args: {
    upcomingMode: v.union(v.literal("list"), v.literal("mini")),
  },
  handler: async (ctx, { upcomingMode }) => {
    const userId = await getSafeUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated. Please sign out and sign back in.");
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { upcomingMode, updatedAt: now });
    } else {
      await ctx.db.insert("userPreferences", {
        userId,
        ungroupedSectionName: "Ungrouped Documents",
        isUngroupedExpanded: true,
        organizationMode: "folders",
        iconOrder: [
          "flow", "tools", "mcp", "sms", "email", "gmail", "phone",
          "slack", "discord", "webhook", "zapier",
        ],
        linkReminderOptOut: false,
        calendarHubSizePct: 45,
        plannerMode: "list",
        plannerDensity: "comfortable",
        showWeekInAgenda: true,
        agendaMode: "list",
        upcomingMode,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true } as const;
  },
});

/**
 * Set per-user Kanban lane titles for the four statuses.
 */
export const setKanbanLaneTitles = mutation({
  args: {
    titles: v.object({
      todo: v.string(),
      in_progress: v.string(),
      done: v.string(),
      blocked: v.string(),
    }),
  },
  handler: async (ctx, { titles }) => {
    const userId = await getSafeUserId(ctx);
    if (!userId) throw new Error("Not authenticated. Please sign out and sign back in.");

    const now = Date.now();
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { kanbanLaneTitles: titles, updatedAt: now });
    } else {
      await ctx.db.insert("userPreferences", {
        userId,
        ungroupedSectionName: "Ungrouped Documents",
        isUngroupedExpanded: true,
        organizationMode: "folders",
        iconOrder: [
          "flow", "tools", "mcp", "sms", "email", "gmail", "phone",
          "slack", "discord", "webhook", "zapier",
        ],
        linkReminderOptOut: false,
        calendarHubSizePct: 45,
        plannerMode: "list",
        plannerDensity: "comfortable",
        showWeekInAgenda: true,
        agendaMode: "list",
        kanbanLaneTitles: titles,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true } as const;
  },
});

/**
 * Get persisted list order preferences for Today's Agenda and Upcoming lists
 */
export const getAgendaUpcomingOrders = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getSafeUserId(ctx);
    if (!userId) {
      // Not authenticated: return empty so client can fall back to localStorage/defaults
      return { agendaListOrder: undefined, upcomingListOrder: undefined } as const;
    }

    const preferences = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    return {
      agendaListOrder: preferences?.agendaListOrder,
      upcomingListOrder: preferences?.upcomingListOrder,
    } as const;
  },
});

/**
 * Set persisted list order preferences for Today's Agenda and Upcoming lists
 */
export const setAgendaUpcomingOrders = mutation({
  args: {
    agendaListOrder: v.optional(v.array(v.string())),
    upcomingListOrder: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getSafeUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated. Please sign out and sign back in.");
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const updates: any = { updatedAt: now };
    if (args.agendaListOrder !== undefined) updates.agendaListOrder = args.agendaListOrder;
    if (args.upcomingListOrder !== undefined) updates.upcomingListOrder = args.upcomingListOrder;

    if (existing) {
      await ctx.db.patch(existing._id, updates);
    } else {
      await ctx.db.insert("userPreferences", {
        userId,
        ungroupedSectionName: "Ungrouped Documents",
        isUngroupedExpanded: true,
        organizationMode: "folders",
        iconOrder: [
          "flow", "tools", "mcp", "sms", "email", "gmail", "phone",
          "slack", "discord", "webhook", "zapier",
        ],
        linkReminderOptOut: false,
        calendarHubSizePct: 45,
        plannerMode: "list",
        plannerDensity: "comfortable",
        showWeekInAgenda: true,
        agendaMode: "list",
        agendaListOrder: args.agendaListOrder,
        upcomingListOrder: args.upcomingListOrder,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true } as const;
  },
});

/**
 * Set planner view preferences: density and showWeekInAgenda
 */
export const setPlannerViewPrefs = mutation({
  args: {
    density: v.optional(v.union(v.literal("comfortable"), v.literal("compact"))),
    showWeekInAgenda: v.optional(v.boolean()),
    agendaMode: v.optional(v.union(v.literal("list"), v.literal("kanban"), v.literal("weekly"), v.literal("mini"))),
    agendaSelectedDateMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getSafeUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated. Please sign out and sign back in.");
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const updates: any = { updatedAt: now };
    if (args.density !== undefined) updates.plannerDensity = args.density;
    if (args.showWeekInAgenda !== undefined) updates.showWeekInAgenda = args.showWeekInAgenda;
    if (args.agendaMode !== undefined) updates.agendaMode = args.agendaMode;
    if (args.agendaSelectedDateMs !== undefined) updates.agendaSelectedDateMs = args.agendaSelectedDateMs;

    if (existing) {
      await ctx.db.patch(existing._id, updates);
    } else {
      await ctx.db.insert("userPreferences", {
        userId,
        ungroupedSectionName: "Ungrouped Documents",
        isUngroupedExpanded: true,
        organizationMode: "folders",
        iconOrder: [
          "flow", "tools", "mcp", "sms", "email", "gmail", "phone",
          "slack", "discord", "webhook", "zapier",
        ],
        linkReminderOptOut: false,
        calendarHubSizePct: 45,
        plannerMode: "list",
        plannerDensity: args.density ?? "comfortable",
        showWeekInAgenda: args.showWeekInAgenda ?? true,
        agendaMode: args.agendaMode ?? "list",
        agendaSelectedDateMs: args.agendaSelectedDateMs,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

/**
 * Get calendar UI preferences (calendarHubSizePct and plannerMode)
 */
export const getCalendarUiPrefs = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getSafeUserId(ctx);

    // Not authenticated: return defaults with a reauth hint
    if (!userId) {
      return {
        needsReauth: true,
        calendarHubSizePct: 45,
        plannerMode: "list" as const,
        timeZone: undefined,
      };
    }

    const preferences = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    return {
      calendarHubSizePct: preferences?.calendarHubSizePct ?? 45,
      plannerMode: preferences?.plannerMode ?? "list",
      plannerDensity: preferences?.plannerDensity ?? "comfortable",
      showWeekInAgenda: preferences?.showWeekInAgenda ?? true,
      agendaMode: preferences?.agendaMode ?? "list",
      upcomingMode: preferences?.upcomingMode ?? undefined,
      kanbanLaneTitles: preferences?.kanbanLaneTitles ?? undefined,
      agendaSelectedDateMs: preferences?.agendaSelectedDateMs ?? undefined,
      timeZone: preferences?.timeZone,
    } as const;
  },
});

/**
 * Set preferred time zone (IANA name, e.g., "America/Los_Angeles").
 */
export const setTimeZonePreference = mutation({
  args: { timeZone: v.string() },
  handler: async (ctx, { timeZone }) => {
    const userId = await getSafeUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated. Please sign out and sign back in.");
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { timeZone, updatedAt: now });
    } else {
      await ctx.db.insert("userPreferences", {
        userId,
        ungroupedSectionName: "Ungrouped Documents",
        isUngroupedExpanded: true,
        organizationMode: "folders",
        iconOrder: [
          "flow", "tools", "mcp", "sms", "email", "gmail", "phone",
          "slack", "discord", "webhook", "zapier",
        ],
        linkReminderOptOut: false,
        calendarHubSizePct: 45,
        plannerMode: "list",
        timeZone,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true } as const;
  },
});

/**
 * Upsert calendarHubSizePct (clamped to 20-80)
 */
export const upsertCalendarHubSizePct = mutation({
  args: { pct: v.number() },
  handler: async (ctx, { pct }) => {
    const userId = await getSafeUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated. Please sign out and sign back in.");
    }

    const clamped = Math.max(20, Math.min(80, Math.round(pct)));
    const now = Date.now();
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { calendarHubSizePct: clamped, updatedAt: now });
    } else {
      await ctx.db.insert("userPreferences", {
        userId,
        ungroupedSectionName: "Ungrouped Documents",
        isUngroupedExpanded: true,
        organizationMode: "folders",
        iconOrder: [
          "flow", "tools", "mcp", "sms", "email", "gmail", "phone",
          "slack", "discord", "webhook", "zapier",
        ],
        linkReminderOptOut: false,
        calendarHubSizePct: clamped,
        plannerMode: "list",
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true, value: clamped };
  },
});

/**
 * Set plannerMode ("list" | "calendar" | "kanban")
 */
export const setPlannerMode = mutation({
  args: { mode: v.union(v.literal("list"), v.literal("calendar"), v.literal("kanban"), v.literal("weekly")) },
  handler: async (ctx, { mode }) => {
    const userId = await getSafeUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated. Please sign out and sign back in.");
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { plannerMode: mode, updatedAt: now });
    } else {
      await ctx.db.insert("userPreferences", {
        userId,
        ungroupedSectionName: "Ungrouped Documents",
        isUngroupedExpanded: true,
        organizationMode: "folders",
        iconOrder: [
          "flow", "tools", "mcp", "sms", "email", "gmail", "phone",
          "slack", "discord", "webhook", "zapier",
        ],
        linkReminderOptOut: false,
        calendarHubSizePct: 45,
        plannerMode: mode,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

/**
 * Update only the ungrouped section name
 */
export const updateUngroupedSectionName = mutation({
  args: {
    sectionName: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getSafeUserId(ctx);

    if (!userId) {
      throw new Error("Not authenticated. Please sign out and sign back in.");
    }

    const existingPreferences = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const now = Date.now();

    if (existingPreferences) {
      await ctx.db.patch(existingPreferences._id, {
        ungroupedSectionName: args.sectionName,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("userPreferences", {
        userId,
        ungroupedSectionName: args.sectionName,
        isUngroupedExpanded: true,
        organizationMode: "folders",
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

/**
 * Update only the ungrouped section expanded state
 */
export const updateUngroupedExpandedState = mutation({
  args: {
    isExpanded: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getSafeUserId(ctx);

    if (!userId) {
      throw new Error("Not authenticated. Please sign out and sign back in.");
    }

    const existingPreferences = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const now = Date.now();

    if (existingPreferences) {
      await ctx.db.patch(existingPreferences._id, {
        isUngroupedExpanded: args.isExpanded,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("userPreferences", {
        userId,
        ungroupedSectionName: "Ungrouped Documents",
        isUngroupedExpanded: args.isExpanded,
        organizationMode: "folders",
        createdAt: now,
        updatedAt: now,
      });

    }

    return { success: true };
  },
});
